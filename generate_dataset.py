import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import random

# Set seed for reproducibility
np.random.seed(42)
random.seed(42)

print("="*60)
print("📊 GENERATING HIGH-QUALITY DATASET")
print("="*60)

# Parameters
start_date = datetime(2023, 1, 1)
end_date = datetime(2025, 12, 31)
stores = [1, 2, 3, 4, 5]
items = ['Rice', 'Eggs', 'Bread', 'Milk', 'Sugar']

# Base demand patterns for each product (units per day)
base_demand = {
    'Rice': 55,
    'Eggs': 48,
    'Bread': 42,
    'Milk': 38,
    'Sugar': 30
}

# Seasonal factors (monthly multiplier)
seasonal_factors = {
    1: 0.92,   # January - post holidays
    2: 0.95,   # February
    3: 1.00,   # March
    4: 1.02,   # April
    5: 1.05,   # May
    6: 1.08,   # June
    7: 1.10,   # July - summer peak
    8: 1.10,   # August
    9: 1.05,   # September
    10: 1.08,  # October - Diwali season
    11: 1.12,  # November - holiday prep
    12: 1.15   # December - peak season
}

# Day of week factors
day_factors = {
    0: 0.95,   # Monday
    1: 0.95,   # Tuesday
    2: 0.95,   # Wednesday
    3: 0.98,   # Thursday
    4: 1.05,   # Friday
    5: 1.15,   # Saturday - high demand
    6: 1.10    # Sunday - high demand
}

# Store popularity factors
store_factors = {
    1: 1.20,   # Store 1 - Busiest
    2: 1.10,   # Store 2 - Busy
    3: 1.00,   # Store 3 - Average
    4: 0.90,   # Store 4 - Quiet
    5: 0.85    # Store 5 - Quietest
}

# Holiday dates (Indian holidays + major holidays)
holidays = [
    '2023-01-26', '2023-03-08', '2023-04-07', '2023-04-14', '2023-05-01',
    '2023-08-15', '2023-09-07', '2023-10-02', '2023-10-24', '2023-11-12',
    '2023-12-25', '2024-01-01', '2024-01-26', '2024-03-25', '2024-04-11',
    '2024-04-17', '2024-05-01', '2024-08-15', '2024-10-02', '2024-10-31',
    '2024-11-15', '2024-12-25', '2025-01-01', '2025-01-26', '2025-03-14',
    '2025-04-10', '2025-04-18', '2025-05-01', '2025-08-15', '2025-10-02',
    '2025-10-20', '2025-11-05', '2025-12-25'
]

# Special promotion periods (high demand)
promotions = [
    ('2023-11-20', '2023-12-10'),  # Christmas promotion
    ('2024-10-15', '2024-11-05'),  # Diwali promotion
    ('2025-08-01', '2025-08-20'),  # Independence Day sale
    ('2024-01-20', '2024-01-30'),  # New Year sale
    ('2025-05-15', '2025-05-30')   # Summer sale
]

def is_holiday(date):
    """Check if date is a holiday"""
    date_str = date.strftime('%Y-%m-%d')
    return date_str in holidays

def get_promotion_factor(date):
    """Get promotion multiplier if date falls in promotion period"""
    for start, end in promotions:
        if start <= date.strftime('%Y-%m-%d') <= end:
            return 1.25  # 25% increase during promotions
    return 1.0

def generate_sales(base, seasonal, day_factor, store_factor, holiday_factor, promo_factor, random_noise):
    """Generate final sales value"""
    sales = base * seasonal * day_factor * store_factor * holiday_factor * promo_factor
    sales = sales + np.random.normal(0, random_noise)  # Add random variation
    return max(5, int(round(sales)))  # Minimum 5 units, return integer

# Generate data
data = []
date_range = pd.date_range(start_date, end_date, freq='D')

print(f"\n📅 Date Range: {start_date.date()} to {end_date.date()}")
print(f"📊 Total Days: {len(date_range)}")
print(f"🏪 Stores: {stores}")
print(f"📦 Products: {items}")

total_records = 0

for date in date_range:
    month = date.month
    day_of_week = date.dayofweek
    
    # Get factors
    seasonal = seasonal_factors[month]
    day_factor = day_factors[day_of_week]
    holiday_factor = 1.25 if is_holiday(date) else 1.0
    promo_factor = get_promotion_factor(date)
    
    for store in stores:
        store_factor = store_factors[store]
        
        for item in items:
            base = base_demand[item]
            
            # Random noise based on product type
            if item == 'Rice':
                noise = 8
            elif item == 'Eggs':
                noise = 7
            elif item == 'Bread':
                noise = 6
            elif item == 'Milk':
                noise = 5
            else:
                noise = 4
            
            sales = generate_sales(base, seasonal, day_factor, store_factor, 
                                  holiday_factor, promo_factor, noise)
            
            data.append({
                'Date': date,
                'Store': store,
                'Item': item,
                'Sales': sales
            })
            total_records += 1

# Create DataFrame
df = pd.DataFrame(data)

print(f"\n✅ Total Records Generated: {total_records:,}")
print(f"📊 DataFrame Shape: {df.shape}")

# Save to CSV
output_file = 'product_demand_dataset_best.csv'
df.to_csv(output_file, index=False)
print(f"\n💾 Dataset saved to: {output_file}")

# Display statistics
print("\n" + "="*60)
print("📊 DATASET STATISTICS")
print("="*60)

print(f"\n📅 Date Range: {df['Date'].min().date()} to {df['Date'].max().date()}")
print(f"📊 Total Records: {len(df):,}")
print(f"🏪 Unique Stores: {df['Store'].nunique()}")
print(f"📦 Unique Products: {df['Item'].nunique()}")

print("\n📈 Sales by Product:")
product_sales = df.groupby('Item')['Sales'].sum().sort_values(ascending=False)
for product, sales in product_sales.items():
    print(f"   {product}: {sales:,} units")

print("\n🏪 Sales by Store:")
store_sales = df.groupby('Store')['Sales'].sum().sort_values(ascending=False)
for store, sales in store_sales.items():
    print(f"   Store {store}: {sales:,} units")

print("\n📅 Average Sales by Day of Week:")
day_names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
df['DayOfWeek'] = df['Date'].dt.dayofweek
daily_avg = df.groupby('DayOfWeek')['Sales'].mean()
for i, avg in daily_avg.items():
    print(f"   {day_names[i]}: {avg:.1f} units")

print("\n📊 Overall Statistics:")
print(f"   Mean Sales: {df['Sales'].mean():.2f}")
print(f"   Median Sales: {df['Sales'].median():.2f}")
print(f"   Std Deviation: {df['Sales'].std():.2f}")
print(f"   Min Sales: {df['Sales'].min()}")
print(f"   Max Sales: {df['Sales'].max()}")

# Sample of the data
print("\n📋 Sample Data (First 10 rows):")
print(df.head(10).to_string())

print("\n" + "="*60)
print("✅ Dataset generation complete!")
print("="*60)