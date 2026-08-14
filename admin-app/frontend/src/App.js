import React, { useState } from 'react';
import { DashboardHome } from './pages/DashboardHome';
import { UsersManagement } from './pages/UsersManagement';
import { ProvidersManagement } from './pages/ProvidersManagement';
import './App.css';

export default function App() {
  const [activePage, setActivePage] = useState('dashboard');

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard': return <DashboardHome />;
      case 'users': return <UsersManagement />;
      case 'providers': return <ProvidersManagement />;
      default: return <DashboardHome />;
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'sans-serif' }}>
      {/* Sidebar */}
      <div style={{ width: 250, background: '#1e293b', color: 'white', padding: 20 }}>
        <h2>Nabd Admin</h2>
        <ul style={{ listStyle: 'none', padding: 0, marginTop: 40 }}>
          <li 
            onClick={() => setActivePage('dashboard')}
            style={{ padding: 15, cursor: 'pointer', background: activePage === 'dashboard' ? '#334155' : 'transparent', borderRadius: 8 }}
          >
            📊 Dashboard
          </li>
          <li 
            onClick={() => setActivePage('users')}
            style={{ padding: 15, cursor: 'pointer', background: activePage === 'users' ? '#334155' : 'transparent', borderRadius: 8, marginTop: 10 }}
          >
            👥 Users Management
          </li>
          <li 
            onClick={() => setActivePage('providers')}
            style={{ padding: 15, cursor: 'pointer', background: activePage === 'providers' ? '#334155' : 'transparent', borderRadius: 8, marginTop: 10 }}
          >
            🏥 Providers Approval
          </li>
        </ul>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, background: '#f8fafc', overflowY: 'auto' }}>
        {renderPage()}
      </div>
    </div>
  );
}
