import pandas as pd
import numpy as np
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score, precision_score, recall_score, f1_score, accuracy_score
import xgboost as xgb
import warnings
import os
from werkzeug.utils import secure_filename
import io
from datetime import datetime
import traceback

warnings.filterwarnings('ignore')

app = Flask(__name__)
CORS(app)

app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024
ALLOWED_EXTENSIONS = {'csv'}

os.makedirs('uploads', exist_ok=True)

# Global variables
current_data = None
current_model = None
current_results = None
feature_columns = []
le_store = None
le_item = None
scaler = None
eda_results = {}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def validate_data(df):
    required_columns = ['Date', 'Store', 'Item', 'Sales']
    missing_columns = [col for col in required_columns if col not in df.columns]
    
    if missing_columns:
        return False, f"Missing required columns: {', '.join(missing_columns)}. Your file has: {list(df.columns)}"
    
    if df.empty:
        return False, "The uploaded file is empty"
    
    try:
        df['Date'] = pd.to_datetime(df['Date'])
    except Exception as e:
        return False, f"Date column must be in valid date format. Error: {str(e)}"
    
    try:
        df['Store'] = df['Store'].astype(int)
    except:
        return False, "Store column must contain numeric values"
    
    try:
        df['Sales'] = pd.to_numeric(df['Sales'])
    except:
        return False, "Sales column must contain numeric values"
    
    return True, "Data is valid"

def perform_eda(df):
    global eda_results
    
    print("\n" + "="*60)
    print("📊 PERFORMING EDA ON UPLOADED DATA")
    print("="*60)
    
    df['Date'] = pd.to_datetime(df['Date'])
    
    product_sales = df.groupby('Item')['Sales'].sum().sort_values(ascending=False)
    
    eda_results = {
        'basic_stats': {
            'total_records': len(df),
            'unique_stores': int(df['Store'].nunique()),
            'unique_items': int(df['Item'].nunique()),
            'date_range_start': str(df['Date'].min().date()),
            'date_range_end': str(df['Date'].max().date()),
            'total_sales': int(df['Sales'].sum()),
            'avg_sales': round(df['Sales'].mean(), 2),
            'median_sales': round(df['Sales'].median(), 2),
            'std_sales': round(df['Sales'].std(), 2),
            'min_sales': int(df['Sales'].min()),
            'max_sales': int(df['Sales'].max())
        },
        'top_products': product_sales.head(5).to_dict()
    }
    
    print(f"✅ Top Products by Sales:")
    for product, sales in product_sales.head(5).items():
        print(f"   {product}: {sales:,} units")
    
    return eda_results

def prepare_data(df):
    global le_store, le_item, feature_columns, scaler
    
    df = df.copy()
    df['Date'] = pd.to_datetime(df['Date'])
    df = df.sort_values('Date')
    
    df['DayOfWeek'] = df['Date'].dt.dayofweek
    df['Month'] = df['Date'].dt.month
    df['Day'] = df['Date'].dt.day
    df['Year'] = df['Date'].dt.year
    df['IsWeekend'] = (df['DayOfWeek'] >= 5).astype(int)
    
    le_store = LabelEncoder()
    le_item = LabelEncoder()
    df['Store_Encoded'] = le_store.fit_transform(df['Store'].astype(str))
    df['Item_Encoded'] = le_item.fit_transform(df['Item'].astype(str))
    
    df = df.sort_values(['Store', 'Item', 'Date'])
    df['Prev_Day_Sales'] = df.groupby(['Store', 'Item'])['Sales'].shift(1)
    df['Prev_Week_Sales'] = df.groupby(['Store', 'Item'])['Sales'].shift(7)
    df['Rolling_Mean_3'] = df.groupby(['Store', 'Item'])['Sales'].transform(lambda x: x.rolling(3, min_periods=1).mean())
    df['Rolling_Mean_7'] = df.groupby(['Store', 'Item'])['Sales'].transform(lambda x: x.rolling(7, min_periods=1).mean())
    
    mean_sales = df['Sales'].mean()
    df['Prev_Day_Sales'] = df['Prev_Day_Sales'].fillna(mean_sales)
    df['Prev_Week_Sales'] = df['Prev_Week_Sales'].fillna(mean_sales)
    
    feature_columns = ['Store_Encoded', 'Item_Encoded', 'DayOfWeek', 'Month', 
                       'Day', 'Year', 'IsWeekend', 'Prev_Day_Sales', 
                       'Prev_Week_Sales', 'Rolling_Mean_3', 'Rolling_Mean_7']
    
    return df

def calculate_classification_metrics(y_true, y_pred):
    """Convert regression to classification for metrics (above/below average)"""
    threshold = np.mean(y_true)
    y_true_class = (y_true > threshold).astype(int)
    y_pred_class = (y_pred > threshold).astype(int)
    
    accuracy = accuracy_score(y_true_class, y_pred_class)
    precision = precision_score(y_true_class, y_pred_class, zero_division=0)
    recall = recall_score(y_true_class, y_pred_class, zero_division=0)
    f1 = f1_score(y_true_class, y_pred_class, zero_division=0)
    
    return {
        'accuracy': round(accuracy * 100, 2),
        'precision': round(precision * 100, 2),
        'recall': round(recall * 100, 2),
        'f1_score': round(f1 * 100, 2)
    }

def train_models(df):
    global scaler
    
    X = df[feature_columns]
    y = df['Sales']
    
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    X_train, X_test, y_train, y_test = train_test_split(X_scaled, y, test_size=0.2, random_state=42)
    
    models = {
        'Linear Regression': LinearRegression(),
        'Random Forest': RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1),
    }
    
    try:
        models['XGBoost'] = xgb.XGBRegressor(n_estimators=100, random_state=42, n_jobs=-1, verbosity=0)
    except:
        print("⚠️ XGBoost not available, using 2 models only")
    
    results = {}
    best_model = None
    best_model_name = None
    best_mae = float('inf')
    
    print("\n" + "="*60)
    print("🤖 TRAINING MODELS")
    print("="*60)
    
    for name, model in models.items():
        print(f"\nTraining {name}...")
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)
        
        mae = mean_absolute_error(y_test, y_pred)
        rmse = np.sqrt(mean_squared_error(y_test, y_pred))
        r2 = r2_score(y_test, y_pred)
        
        # Calculate classification metrics
        class_metrics = calculate_classification_metrics(y_test, y_pred)
        
        results[name] = {
            'mae': round(mae, 2),
            'rmse': round(rmse, 2),
            'r2': round(r2, 4),
            'accuracy': class_metrics['accuracy'],
            'precision': class_metrics['precision'],
            'recall': class_metrics['recall'],
            'f1_score': class_metrics['f1_score'],
            'model': model
        }
        
        print(f"  ✓ MAE: {mae:.2f}")
        print(f"  ✓ RMSE: {rmse:.2f}")
        print(f"  ✓ R²: {r2:.4f}")
        print(f"  ✓ Accuracy: {class_metrics['accuracy']}%")
        print(f"  ✓ Precision: {class_metrics['precision']}%")
        print(f"  ✓ Recall: {class_metrics['recall']}%")
        print(f"  ✓ F1 Score: {class_metrics['f1_score']}%")
        
        if mae < best_mae:
            best_mae = mae
            best_model = model
            best_model_name = name
    
    print("\n" + "="*60)
    print(f"🏆 BEST MODEL: {best_model_name}")
    print(f"   MAE: {results[best_model_name]['mae']}")
    print(f"   RMSE: {results[best_model_name]['rmse']}")
    print(f"   R²: {results[best_model_name]['r2']}")
    print("="*60)
    
    return best_model, best_model_name, results

def predict_future(store, item, days=30):
    global current_data, current_model, scaler
    
    last_date = current_data['Date'].max()
    future_dates = pd.date_range(last_date + pd.Timedelta(days=1), periods=days)
    
    predictions = []
    
    store_encoded = le_store.transform([str(store)])[0]
    item_encoded = le_item.transform([str(item)])[0]
    
    product_history = current_data[(current_data['Store'] == store) & (current_data['Item'] == item)].copy()
    
    if len(product_history) == 0:
        return [(date, np.random.randint(20, 60)) for date in future_dates]
    
    last_7_sales = product_history['Sales'].tail(7).tolist()
    prev_day_sales = product_history['Sales'].iloc[-1] if len(product_history) > 0 else 40
    prev_week_sales = product_history['Sales'].iloc[-7] if len(product_history) >= 7 else prev_day_sales
    rolling_mean_3 = np.mean(last_7_sales[-3:]) if len(last_7_sales) >= 3 else 40
    rolling_mean_7 = np.mean(last_7_sales) if last_7_sales else 40
    
    for date in future_dates:
        features = np.array([[
            store_encoded, item_encoded,
            date.dayofweek, date.month, date.day, date.year,
            1 if date.dayofweek >= 5 else 0,
            prev_day_sales, prev_week_sales, rolling_mean_3, rolling_mean_7
        ]])
        
        features_scaled = scaler.transform(features)
        pred = current_model.predict(features_scaled)[0]
        predictions.append((date, max(0, int(round(pred)))))
        
        prev_day_sales = pred
        last_7_sales = last_7_sales[1:] + [pred] if len(last_7_sales) >= 7 else last_7_sales + [pred]
        rolling_mean_3 = np.mean(last_7_sales[-3:]) if len(last_7_sales) >= 3 else rolling_mean_3
        rolling_mean_7 = np.mean(last_7_sales) if last_7_sales else rolling_mean_7
    
    return predictions

# API Routes
@app.route('/api/upload', methods=['POST'])
def upload_file():
    global current_data, current_model, current_results, eda_results
    
    try:
        if 'file' not in request.files:
            return jsonify({'success': False, 'error': 'No file uploaded'}), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({'success': False, 'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'success': False, 'error': 'Invalid file type. Please upload a CSV file'}), 400
        
        df = pd.read_csv(file)
        print(f"\n📁 File loaded: {file.filename}")
        print(f"   Shape: {df.shape}")
        
        is_valid, message = validate_data(df)
        if not is_valid:
            return jsonify({'success': False, 'error': message}), 400
        
        eda_results = perform_eda(df)
        current_data = prepare_data(df)
        current_model, best_model_name, current_results = train_models(current_data)
        
        # Get data preview - ONLY 5 ROWS with DATE only (no time)
        data_preview = df.head(5).to_dict('records')
        for row in data_preview:
            if 'Date' in row:
                row['Date'] = str(pd.to_datetime(row['Date']).date())
        
        return jsonify({
            'success': True,
            'message': f'✅ Data uploaded successfully! Best model: {best_model_name}',
            'best_model': best_model_name,
            'model_results': {k: {kk: vv for kk, vv in v.items() if kk != 'model'} for k, v in current_results.items()},
            'eda_results': eda_results,
            'data_preview': data_preview,
            'total_records': len(df)
        })
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        traceback.print_exc()
        return jsonify({'success': False, 'error': f'Error processing file: {str(e)}'}), 500

@app.route('/api/predict', methods=['POST'])
def predict():
    if current_data is None:
        return jsonify({'success': False, 'error': 'Please upload data first'}), 400
    
    try:
        data = request.get_json()
        store = int(data['store'])
        item = data['item']
        days = int(data.get('days', 30))
        
        predictions = predict_future(store, item, days)
        
        return jsonify({
            'success': True,
            'dates': [str(p[0].date()) for p in predictions],
            'sales': [p[1] for p in predictions],
            'total_demand': sum(p[1] for p in predictions),
            'avg_daily': round(sum(p[1] for p in predictions) / len(predictions), 2),
            'store': store,
            'item': item
        })
        
    except Exception as e:
        print(f"❌ Prediction error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/api/download', methods=['POST'])
def download():
    data = request.get_json()
    
    df = pd.DataFrame({
        'Date': data['dates'],
        'Predicted_Sales': data['sales'],
        'Store': data['store'],
        'Item': data['item'],
        'Total_Demand': data['total_demand'],
        'Average_Daily': data['avg_daily']
    })
    
    output = io.StringIO()
    df.to_csv(output, index=False)
    output.seek(0)
    
    return send_file(
        io.BytesIO(output.getvalue().encode('utf-8')),
        mimetype='text/csv',
        as_attachment=True,
        download_name=f'predictions_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
    )

@app.route('/api/items', methods=['GET'])
def get_items():
    if current_data is None:
        return jsonify({'success': False, 'error': 'No data loaded'}), 400
    
    stores = sorted(current_data['Store'].unique())
    items = sorted(current_data['Item'].unique())
    
    return jsonify({
        'success': True,
        'stores': [int(s) for s in stores],
        'items': items
    })

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})

if __name__ == '__main__':
    print("\n" + "="*60)
    print("🎯 PRODUCT DEMAND PREDICTION API")
    print("="*60)
    print("📍 Server: http://127.0.0.1:5000")
    print("="*60 + "\n")
    
    app.run(debug=True, host='127.0.0.1', port=5000)