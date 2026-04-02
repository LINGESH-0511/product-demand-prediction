import React, { useState } from 'react';
import axios from 'axios';

const API_URL = 'http://127.0.0.1:5000/api';

function App() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dataPreview, setDataPreview] = useState(null);
  const [edaResults, setEdaResults] = useState(null);
  const [modelResults, setModelResults] = useState(null);
  const [bestModel, setBestModel] = useState(null);
  const [stores, setStores] = useState([]);
  const [items, setItems] = useState([]);
  const [selectedStore, setSelectedStore] = useState('');
  const [selectedItem, setSelectedItem] = useState('');
  const [days, setDays] = useState(7);
  const [predictions, setPredictions] = useState(null);
  const [predicting, setPredicting] = useState(false);
  const [error, setError] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Days options
  const daysOptions = [7, 14, 21, 28, 30, 45, 60, 90];

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setError(null);
    setUploadSuccess(false);
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    setError(null);

    try {
      const response = await axios.post(`${API_URL}/upload`, formData);
      
      if (response.data.success) {
        setDataPreview(response.data.data_preview);
        setEdaResults(response.data.eda_results);
        setModelResults(response.data.model_results);
        setBestModel(response.data.best_model);
        
        const itemsResponse = await axios.get(`${API_URL}/items`);
        if (itemsResponse.data.success) {
          setStores(itemsResponse.data.stores);
          setItems(itemsResponse.data.items);
        }
        
        setUploadSuccess(true);
      } else {
        setError(response.data.error);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error uploading file');
    } finally {
      setUploading(false);
    }
  };

  const handlePredict = async () => {
    if (!selectedStore || !selectedItem) {
      setError('Please select store and product');
      return;
    }

    if (!days) {
      setError('Please select days');
      return;
    }

    setPredicting(true);
    setError(null);

    try {
      const response = await axios.post(`${API_URL}/predict`, {
        store: selectedStore,
        item: selectedItem,
        days: days
      });

      if (response.data.success) {
        setPredictions(response.data);
      } else {
        setError(response.data.error);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error making prediction');
    } finally {
      setPredicting(false);
    }
  };

  const handleDownload = async () => {
    if (!predictions) return;

    try {
      const response = await axios.post(`${API_URL}/download`, predictions, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `predictions_${new Date().toISOString().slice(0,19)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError('Error downloading file');
    }
  };

  const getModelExplanation = (modelName, metrics) => {
    if (modelName === 'Linear Regression') {
      return {
        title: '📐 Linear Regression - Best for Linear Patterns',
        description: `This model works best when data follows a straight-line pattern. It has the lowest prediction error (MAE: ${metrics.mae}) and highest accuracy (${metrics.accuracy}%).`,
        why: '✓ Lowest Mean Absolute Error\n✓ Highest R² Score\n✓ Best for stable, predictable demand patterns\n✓ Fastest training time'
      };
    } else if (modelName === 'Random Forest') {
      return {
        title: '🌲 Random Forest - Best for Complex Patterns',
        description: `This model uses multiple decision trees to make predictions. It handles non-linear patterns well with accuracy of ${metrics.accuracy}%.`,
        why: '✓ Handles non-linear relationships\n✓ Resistant to outliers\n✓ Works well with small datasets\n✓ Provides feature importance'
      };
    } else {
      return {
        title: '⚡ XGBoost - Best for High Accuracy',
        description: `This is the most advanced model that combines multiple weak learners. It achieves ${metrics.accuracy}% accuracy by learning from previous errors.`,
        why: '✓ Highest prediction accuracy\n✓ Handles missing values well\n✓ Prevents overfitting\n✓ Best for complex demand patterns'
      };
    }
  };

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', maxWidth: '1400px', margin: '0 auto', padding: '20px', background: '#f5f7fa', minHeight: '100vh' }}>
      
      <h1 style={{ textAlign: 'center', color: '#1a1a2e', marginBottom: '10px' }}>📊 Product Demand Prediction System</h1>
      <p style={{ textAlign: 'center', color: '#666', marginBottom: '30px' }}>Upload CSV • Train 3 ML Models • Get Accurate Forecasts</p>

      {/* Upload Section */}
      <div style={{ background: 'white', borderRadius: '12px', padding: '25px', marginBottom: '25px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        <h2 style={{ marginBottom: '15px', color: '#1a1a2e' }}>📁 1. Upload Dataset</h2>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input type="file" accept=".csv" onChange={handleFileChange} id="file-input" style={{ display: 'none' }} />
          <label htmlFor="file-input" style={{ background: '#e0e7ff', color: '#4f46e5', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' }}>
            📂 Choose CSV File
          </label>
          {file && <span style={{ color: '#10b981' }}>✓ {file.name}</span>}
          <button onClick={handleUpload} disabled={uploading || !file} style={{ background: '#4f46e5', color: 'white', padding: '10px 24px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '500', opacity: uploading || !file ? 0.6 : 1 }}>
            {uploading ? '⏳ Training Models...' : '🚀 Upload & Train'}
          </button>
        </div>
        {error && <div style={{ marginTop: '15px', padding: '12px', background: '#fee', borderRadius: '8px', color: '#dc2626' }}>❌ {error}</div>}
        {uploadSuccess && <div style={{ marginTop: '15px', padding: '12px', background: '#d1fae5', borderRadius: '8px', color: '#065f46' }}>✅ Models trained successfully! Ready for predictions.</div>}
      </div>

      {/* Data Preview */}
      {dataPreview && (
        <div style={{ background: 'white', borderRadius: '12px', padding: '25px', marginBottom: '25px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <h2 style={{ marginBottom: '15px', color: '#1a1a2e' }}>📋 2. Data Preview (First 5 Rows)</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e2e8f0' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  {dataPreview[0] && Object.keys(dataPreview[0]).map(key => (
                    <th key={key} style={{ padding: '12px', textAlign: 'left', border: '1px solid #e2e8f0', fontWeight: '600' }}>{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dataPreview.map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    {Object.values(row).map((val, i) => (
                      <td key={i} style={{ padding: '12px', border: '1px solid #e2e8f0' }}>{val} </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Statistics */}
      {edaResults && (
        <div style={{ background: 'white', borderRadius: '12px', padding: '25px', marginBottom: '25px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <h2 style={{ marginBottom: '15px', color: '#1a1a2e' }}>📊 3. Dataset Overview</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '25px' }}>
            <div style={{ padding: '15px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}><strong>Total Records:</strong><br/>{edaResults.basic_stats.total_records.toLocaleString()}</div>
            <div style={{ padding: '15px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}><strong>Unique Stores:</strong><br/>{edaResults.basic_stats.unique_stores}</div>
            <div style={{ padding: '15px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}><strong>Unique Products:</strong><br/>{edaResults.basic_stats.unique_items}</div>
            <div style={{ padding: '15px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}><strong>Total Sales:</strong><br/>{edaResults.basic_stats.total_sales.toLocaleString()}</div>
            <div style={{ padding: '15px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}><strong>Average Sales:</strong><br/>{edaResults.basic_stats.avg_sales}</div>
            <div style={{ padding: '15px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}><strong>Date Range:</strong><br/>{edaResults.basic_stats.date_range_start} → {edaResults.basic_stats.date_range_end}</div>
          </div>
          
          <h3 style={{ marginBottom: '15px' }}>🏆 Top 5 Products by Sales</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {Object.entries(edaResults.top_products)
              .sort((a, b) => b[1] - a[1])
              .map(([product, sales]) => {
                const maxSales = Math.max(...Object.values(edaResults.top_products));
                const percentage = (sales / maxSales) * 100;
                return (
                  <div key={product}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                      <span style={{ fontWeight: 'bold' }}>{product}</span>
                      <span style={{ fontWeight: '600' }}>{sales.toLocaleString()} units</span>
                    </div>
                    <div style={{ background: '#e2e8f0', borderRadius: '10px', height: '8px', overflow: 'hidden' }}>
                      <div style={{ width: `${percentage}%`, background: '#4f46e5', height: '100%', borderRadius: '10px' }}></div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Model Comparison */}
      {modelResults && (
        <div style={{ background: 'white', borderRadius: '12px', padding: '25px', marginBottom: '25px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <h2 style={{ marginBottom: '15px', color: '#1a1a2e' }}>🤖 4. Model Performance Comparison</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '25px' }}>
            {Object.entries(modelResults).map(([name, metrics]) => {
              const isBest = name === bestModel;
              return (
                <div key={name} style={{ 
                  padding: '20px', 
                  borderRadius: '12px', 
                  background: isBest ? 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' : '#f8fafc',
                  color: isBest ? 'white' : '#333',
                  border: isBest ? 'none' : '1px solid #e2e8f0',
                  boxShadow: isBest ? '0 4px 15px rgba(79, 70, 229, 0.3)' : 'none'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h3 style={{ margin: 0 }}>{name}</h3>
                    {isBest && <span style={{ background: 'rgba(255,255,255,0.2)', padding: '4px 12px', borderRadius: '20px', fontSize: '12px' }}>🏆 BEST</span>}
                  </div>
                  
                  <div style={{ marginBottom: '15px', paddingBottom: '10px', borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
                    <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '8px' }}>📈 Regression Metrics</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                      <div><div style={{ fontSize: '11px', opacity: 0.7 }}>MAE</div><div style={{ fontSize: '18px', fontWeight: 'bold' }}>{metrics.mae}</div></div>
                      <div><div style={{ fontSize: '11px', opacity: 0.7 }}>RMSE</div><div style={{ fontSize: '18px', fontWeight: 'bold' }}>{metrics.rmse}</div></div>
                      <div><div style={{ fontSize: '11px', opacity: 0.7 }}>R²</div><div style={{ fontSize: '18px', fontWeight: 'bold' }}>{metrics.r2}</div></div>
                    </div>
                  </div>
                  
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '8px' }}>🎯 Classification Metrics</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                      <div><div style={{ fontSize: '11px', opacity: 0.7 }}>Accuracy</div><div style={{ fontSize: '16px', fontWeight: 'bold' }}>{metrics.accuracy}%</div></div>
                      <div><div style={{ fontSize: '11px', opacity: 0.7 }}>Precision</div><div style={{ fontSize: '16px', fontWeight: 'bold' }}>{metrics.precision}%</div></div>
                      <div><div style={{ fontSize: '11px', opacity: 0.7 }}>Recall</div><div style={{ fontSize: '16px', fontWeight: 'bold' }}>{metrics.recall}%</div></div>
                      <div><div style={{ fontSize: '11px', opacity: 0.7 }}>F1 Score</div><div style={{ fontSize: '16px', fontWeight: 'bold' }}>{metrics.f1_score}%</div></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {bestModel && modelResults[bestModel] && (
            <div style={{ background: '#f0fdf4', borderRadius: '12px', padding: '20px', borderLeft: '4px solid #10b981' }}>
              <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '24px' }}>💡</span>
                <div>
                  <h3 style={{ color: '#065f46', marginBottom: '10px' }}>{getModelExplanation(bestModel, modelResults[bestModel]).title}</h3>
                  <p style={{ color: '#047857', lineHeight: '1.6', marginBottom: '10px' }}>
                    {getModelExplanation(bestModel, modelResults[bestModel]).description}
                  </p>
                  <div style={{ background: '#d1fae5', padding: '10px', borderRadius: '8px', marginTop: '10px' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>✅ Why this model was selected:</div>
                    <div style={{ whiteSpace: 'pre-line', fontSize: '13px' }}>
                      {getModelExplanation(bestModel, modelResults[bestModel]).why}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Prediction Section - WITH DAYS DROPDOWN */}
      {stores.length > 0 && (
        <div style={{ background: 'white', borderRadius: '12px', padding: '25px', marginBottom: '25px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <h2 style={{ marginBottom: '20px', color: '#1a1a2e' }}>🔮 5. Predict Future Demand</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '25px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151' }}>🏪 Select Store</label>
              <select 
                value={selectedStore} 
                onChange={(e) => setSelectedStore(e.target.value)} 
                style={{ width: '100%', padding: '12px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', background: 'white' }}
              >
                <option value="">Choose a store...</option>
                {stores.map(store => <option key={store} value={store}>Store {store}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151' }}>📦 Select Product</label>
              <select 
                value={selectedItem} 
                onChange={(e) => setSelectedItem(e.target.value)} 
                style={{ width: '100%', padding: '12px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', background: 'white' }}
              >
                <option value="">Choose a product...</option>
                {items.map(item => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151' }}>📅 Days to Predict</label>
              <select 
                value={days} 
                onChange={(e) => setDays(parseInt(e.target.value))} 
                style={{ width: '100%', padding: '12px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', background: 'white' }}
              >
                {daysOptions.map(option => (
                  <option key={option} value={option}>{option} days</option>
                ))}
              </select>
            </div>
          </div>
          
          <button 
            onClick={handlePredict} 
            disabled={predicting || !selectedStore || !selectedItem} 
            style={{ 
              width: '100%', 
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', 
              color: 'white', 
              padding: '14px', 
              border: 'none', 
              borderRadius: '8px', 
              cursor: 'pointer', 
              fontWeight: '600', 
              fontSize: '16px',
              opacity: predicting || !selectedStore || !selectedItem ? 0.6 : 1
            }}
          >
            {predicting ? '⏳ Generating Forecast...' : '🔮 Predict Demand'}
          </button>

          {predictions && (
            <div style={{ marginTop: '30px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '30px' }}>
                <div style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)', color: 'white', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '14px', opacity: 0.9 }}>📊 Total Demand</div>
                  <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{predictions.total_demand.toLocaleString()}</div>
                  <div style={{ fontSize: '12px' }}>units</div>
                </div>
                <div style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)', color: 'white', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '14px', opacity: 0.9 }}>📈 Average Daily</div>
                  <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{predictions.avg_daily}</div>
                  <div style={{ fontSize: '12px' }}>units/day</div>
                </div>
                <div style={{ background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)', color: 'white', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '14px', opacity: 0.9 }}>🤖 Best Model</div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{bestModel}</div>
                  <div style={{ fontSize: '12px' }}>used for prediction</div>
                </div>
              </div>

              <h3 style={{ marginBottom: '15px' }}>📅 Daily Demand Forecast</h3>
              <div style={{ overflowX: 'auto', maxHeight: '400px', overflowY: 'auto', border: '2px solid #e2e8f0', borderRadius: '12px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ position: 'sticky', top: 0 }}>
                    <tr style={{ background: '#4f46e5', color: 'white' }}>
                      <th style={{ padding: '12px', border: '1px solid #6366f1' }}>Date</th>
                      <th style={{ padding: '12px', border: '1px solid #6366f1' }}>Predicted Sales</th>
                      <th style={{ padding: '12px', border: '1px solid #6366f1' }}>Demand Level</th>
                    </tr>
                  </thead>
                  <tbody>
                    {predictions.dates.map((date, idx) => {
                      const sales = predictions.sales[idx];
                      const avg = predictions.avg_daily;
                      let demandLevel = '';
                      let levelColor = '';
                      let levelBg = '';
                      
                      // 5% threshold
                      if (sales > avg * 1.05) { 
                        demandLevel = '🔥 High Demand'; 
                        levelColor = '#dc2626';
                        levelBg = '#fef2f2';
                      } else if (sales < avg * 0.95) { 
                        demandLevel = '⚠️ Low Demand'; 
                        levelColor = '#f59e0b';
                        levelBg = '#fffbeb';
                      } else { 
                        demandLevel = '✅ Normal Demand'; 
                        levelColor = '#10b981';
                        levelBg = '#f0fdf4';
                      }
                      
                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>{date}</td>
                          <td style={{ padding: '10px', border: '1px solid #e2e8f0', fontWeight: 'bold' }}>{sales} units</td>
                          <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>
                            <span style={{ background: levelBg, color: levelColor, padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '500', display: 'inline-block' }}>
                              {demandLevel}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <button onClick={handleDownload} style={{ width: '100%', background: '#10b981', color: 'white', padding: '12px', border: 'none', borderRadius: '8px', cursor: 'pointer', marginTop: '20px', fontWeight: 'bold' }}>
                📥 Download Predictions as CSV
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;