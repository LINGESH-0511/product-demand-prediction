
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import './ModelComparison.css';

const API_URL = 'http://127.0.0.1:5000/api';

const ModelComparison = () => {
  const [modelData, setModelData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    try {
      const response = await axios.get(`${API_URL}/models`);
      setModelData(response.data);
    } catch (error) {
      console.error('Error fetching model data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="model-loading">Loading model comparison...</div>;
  if (!modelData) return null;

  const modelNames = Object.keys(modelData.models_comparison);
  const maeData = modelNames.map(name => ({
    name,
    MAE: modelData.models_comparison[name].mae
  }));
  
  const rmseData = modelNames.map(name => ({
    name,
    RMSE: modelData.models_comparison[name].rmse
  }));
  
  const r2Data = modelNames.map(name => ({
    name,
    'R² Score': modelData.models_comparison[name].r2
  }));

  return (
    <div className="model-comparison">
      <h2>🤖 Model Performance Comparison</h2>
      
      <div className="best-model-banner">
        <div className="best-model-icon">🏆</div>
        <div className="best-model-info">
          <h3>Best Performing Model</h3>
          <div className="best-model-name">{modelData.best_model}</div>
          <div className="best-model-metrics">
            <span>MAE: {modelData.models_comparison[modelData.best_model].mae}</span>
            <span>RMSE: {modelData.models_comparison[modelData.best_model].rmse}</span>
            <span>R²: {modelData.models_comparison[modelData.best_model].r2}</span>
          </div>
        </div>
      </div>

      <div className="charts-container">
        <div className="model-chart">
          <h3>Mean Absolute Error (MAE) - Lower is Better</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={maeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="MAE" fill="#FF6B6B">
                {maeData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.name === modelData.best_model ? '#4ECDC4' : '#FF6B6B'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="model-chart">
          <h3>Root Mean Square Error (RMSE) - Lower is Better</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={rmseData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="RMSE" fill="#45B7D1">
                {rmseData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.name === modelData.best_model ? '#4ECDC4' : '#45B7D1'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="model-chart">
          <h3>R² Score - Higher is Better</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={r2Data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 1]} />
              <Tooltip />
              <Legend />
              <Bar dataKey="R² Score" fill="#96CEB4">
                {r2Data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.name === modelData.best_model ? '#4ECDC4' : '#96CEB4'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="model-details">
        <h3>Detailed Model Performance Metrics</h3>
        <table className="model-table">
          <thead>
            <tr>
              <th>Model</th>
              <th>MAE ↓</th>
              <th>RMSE ↓</th>
              <th>R² Score ↑</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {modelNames.map(name => (
              <tr key={name} className={name === modelData.best_model ? 'best-row' : ''}>
                <td><strong>{name}</strong></td>
                <td>{modelData.models_comparison[name].mae}</td>
                <td>{modelData.models_comparison[name].rmse}</td>
                <td>{modelData.models_comparison[name].r2}</td>
                <td>{name === modelData.best_model ? '🏆 BEST' : '-'}</td>
               </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ModelComparison;
