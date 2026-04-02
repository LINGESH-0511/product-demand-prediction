import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Area, ComposedChart
} from 'recharts';
import './PredictionForm.css';

const API_URL = 'http://127.0.0.1:5000/api';

const PredictionForm = () => {
  const [stores, setStores] = useState([]);
  const [items, setItems] = useState([]);
  const [selectedStore, setSelectedStore] = useState('');
  const [selectedItem, setSelectedItem] = useState('');
  const [days, setDays] = useState(30);
  const [predictions, setPredictions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API_URL}/products`);
      setStores(response.data.stores);
      setItems(response.data.items);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const handlePredict = async () => {
    if (!selectedStore || !selectedItem) {
      setError('Please select both store and product');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(`${API_URL}/predict`, {
        store: parseInt(selectedStore),
        item: selectedItem,
        days: parseInt(days)
      });

      if (response.data.success) {
        setPredictions(response.data);
      } else {
        setError(response.data.error);
      }
    } catch (error) {
      setError('Error making prediction. Please try again.');
      console.error('Prediction error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="prediction-form">
      <h2>🔮 Predict Future Demand</h2>
      
      <div className="form-container">
        <div className="form-group">
          <label>Select Store:</label>
          <select 
            value={selectedStore} 
            onChange={(e) => setSelectedStore(e.target.value)}
            className="form-control"
          >
            <option value="">Choose a store...</option>
            {stores.map(store => (
              <option key={store} value={store}>Store {store}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Select Product:</label>
          <select 
            value={selectedItem} 
            onChange={(e) => setSelectedItem(e.target.value)}
            className="form-control"
          >
            <option value="">Choose a product...</option>
            {items.map(item => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Prediction Days (7-90):</label>
          <input 
            type="number" 
            value={days} 
            onChange={(e) => setDays(Math.min(90, Math.max(7, parseInt(e.target.value) || 30)))}
            min="7"
            max="90"
            className="form-control"
          />
        </div>

        <button 
          onClick={handlePredict} 
          disabled={loading || !selectedStore || !selectedItem}
          className="predict-btn"
        >
          {loading ? 'Predicting...' : 'Predict Demand'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {predictions && (
        <div className="results">
          <div className="prediction-summary">
            <div className="summary-card">
              <div className="summary-icon">📊</div>
              <div className="summary-info">
                <div className="summary-label">Total Predicted Demand</div>
                <div className="summary-value">{predictions.total_demand} units</div>
              </div>
            </div>
            <div className="summary-card">
              <div className="summary-icon">📈</div>
              <div className="summary-info">
                <div className="summary-label">Average Daily Demand</div>
                <div className="summary-value">{predictions.avg_daily} units/day</div>
              </div>
            </div>
            <div className="summary-card">
              <div className="summary-icon">🤖</div>
              <div className="summary-info">
                <div className="summary-label">Best Model Used</div>
                <div className="summary-value">{predictions.best_model}</div>
              </div>
            </div>
          </div>

          <div className="prediction-chart">
            <h3>Demand Forecast Chart</h3>
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={predictions.dates.map((date, idx) => ({
                date: date.slice(5),
                demand: predictions.sales[idx]
              }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="demand" fill="#667eea" stroke="#764ba2" fillOpacity={0.3} />
                <Line type="monotone" dataKey="demand" stroke="#764ba2" strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="prediction-table">
            <h3>Detailed Daily Predictions</h3>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Predicted Sales</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {predictions.dates.map((date, idx) => (
                    <tr key={idx}>
                      <td>{date}</td>
                      <td>{predictions.sales[idx]} units</td>
                      <td>
                        {predictions.sales[idx] > predictions.avg_daily * 1.2 ? '🔥 High Demand' :
                         predictions.sales[idx] < predictions.avg_daily * 0.8 ? '⚠️ Low Demand' :
                         '✅ Normal'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PredictionForm;
