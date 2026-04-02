import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import './EDASection.css';

const API_URL = 'http://127.0.0.1:5000/api';

const EDASection = () => {
  const [edaData, setEdaData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEDAData();
  }, []);

  const fetchEDAData = async () => {
    try {
      const response = await axios.get(`${API_URL}/eda`);
      setEdaData(response.data);
    } catch (error) {
      console.error('Error fetching EDA data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="eda-loading">Loading EDA data...</div>;
  if (!edaData) return null;

  // Prepare data for charts
  const productData = Object.entries(edaData.product_sales || {}).map(([name, value]) => ({
    name, value
  }));

  const storeData = Object.entries(edaData.store_sales || {}).map(([name, value]) => ({
    name: `Store ${name}`, value
  }));

  const monthlyData = Object.entries(edaData.monthly_sales || {}).map(([month, sales]) => ({
    month: `Month ${month}`, sales
  }));

  const dailyData = Object.entries(edaData.daily_sales || {}).map(([day, sales]) => ({
    day: edaData.weekday_names[day], sales
  }));

  const trendData = Object.entries(edaData.daily_trend || {}).slice(-30).map(([date, sales]) => ({
    date: date.slice(5), sales
  }));

  const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'];

  return (
    <div className="eda-section">
      <h2>📈 Exploratory Data Analysis (EDA)</h2>
      
      <div className="eda-stats">
        <h3>Statistical Summary</h3>
        <div className="stats-summary">
          <div className="stat-item">
            <span className="stat-label">Mean Sales:</span>
            <span className="stat-number">{edaData.statistics.mean.toFixed(2)}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Median Sales:</span>
            <span className="stat-number">{edaData.statistics.median.toFixed(2)}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Std Deviation:</span>
            <span className="stat-number">{edaData.statistics.std.toFixed(2)}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Min/Max Sales:</span>
            <span className="stat-number">{edaData.statistics.min} / {edaData.statistics.max}</span>
          </div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <h3>Sales by Product</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={productData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#FF6B6B" name="Total Sales" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>Sales by Store</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={storeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={entry => entry.name}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {storeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>Monthly Sales Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="sales" stroke="#45B7D1" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>Sales by Day of Week</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="sales" fill="#96CEB4" name="Average Sales" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card full-width">
          <h3>Daily Sales Trend (Last 30 Days)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="sales" stroke="#FF6B6B" strokeWidth={2} name="Daily Sales" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="insights">
        <h3>🔍 Key Insights</h3>
        <ul>
          <li>📦 Top performing product: <strong>{Object.entries(edaData.product_sales || {}).sort((a,b) => b[1] - a[1])[0]?.[0]}</strong></li>
          <li>🏪 Best performing store: <strong>Store {Object.entries(edaData.store_sales || {}).sort((a,b) => b[1] - a[1])[0]?.[0]}</strong></li>
          <li>📅 Best sales day: <strong>{edaData.weekday_names[Object.entries(edaData.daily_sales || {}).sort((a,b) => b[1] - a[1])[0]?.[0]]}</strong></li>
          <li>📈 Weekend vs Weekday: Weekend sales are <strong>{((edaData.weekend_vs_weekday.weekend - edaData.weekend_vs_weekday.weekday) / edaData.weekend_vs_weekday.weekday * 100).toFixed(1)}%</strong> {edaData.weekend_vs_weekday.weekend > edaData.weekend_vs_weekday.weekday ? 'higher' : 'lower'} than weekdays</li>
        </ul>
      </div>
    </div>
  );
};

export default EDASection;
