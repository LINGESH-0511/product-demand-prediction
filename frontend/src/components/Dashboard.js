import React from 'react';
import './Dashboard.css';

const Dashboard = ({ stats }) => {
  if (!stats) return null;

  const cards = [
    { title: 'Total Sales', value: stats.total_sales.toLocaleString(), icon: '💰', color: '#FF6B6B' },
    { title: 'Average Daily Sales', value: stats.avg_sales, icon: '📈', color: '#4ECDC4' },
    { title: 'Top Product', value: stats.top_product, icon: '🏆', color: '#45B7D1' },
    { title: 'Top Store', value: `Store ${stats.top_store}`, icon: '🏪', color: '#96CEB4' },
    { title: 'Total Records', value: stats.total_records.toLocaleString(), icon: '📊', color: '#FFEAA7' },
    { title: 'Best Model', value: stats.best_model, icon: '🤖', color: '#DDA0DD' }
  ];

  return (
    <div className="dashboard">
      <h2>📊 Key Statistics</h2>
      <div className="stats-grid">
        {cards.map((card, index) => (
          <div key={index} className="stat-card" style={{ borderTop: `4px solid ${card.color}` }}>
            <div className="stat-icon">{card.icon}</div>
            <h3>{card.title}</h3>
            <div className="stat-value">{card.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
