import React, { useState, useEffect } from 'react';
import { AdminServices } from '../services/AdminApi';

export const DashboardHome = () => {
  const [stats, setStats] = useState({ users: 0, activeProviders: 0, ordersCount: 0 });

  useEffect(() => {
    AdminServices.getDashboardStats().then(data => {
      if (data) setStats(data);
    }).catch(err => {
      console.error("Failed to fetch dashboard stats", err);
    });
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h2>Control Center - Real-Time Analytics</h2>
      <div style={{ display: 'flex', gap: 20, marginTop: 20 }}>
        <div style={{ padding: 20, border: '1px solid #ccc', borderRadius: 8, flex: 1 }}>
          <h3>Total Users</h3>
          <p style={{ fontSize: 32, fontWeight: 'bold' }}>{stats.users}</p>
        </div>
        <div style={{ padding: 20, border: '1px solid #ccc', borderRadius: 8, flex: 1 }}>
          <h3>Active Providers</h3>
          <p style={{ fontSize: 32, fontWeight: 'bold' }}>{stats.activeProviders}</p>
        </div>
        <div style={{ padding: 20, border: '1px solid #ccc', borderRadius: 8, flex: 1 }}>
          <h3>Total Orders</h3>
          <p style={{ fontSize: 32, fontWeight: 'bold' }}>{stats.ordersCount}</p>
        </div>
      </div>
    </div>
  );
};
