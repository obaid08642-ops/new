import React, { useState, useEffect } from 'react';
import { AdminServices } from '../services/AdminApi';

export const ProvidersManagement = () => {
  const [providers, setProviders] = useState([]);
  const [deltas, setDeltas] = useState([]);
  const [loading, setLoading] = useState(false);
  const fetchProvidersAndDeltas = async () => {
    setLoading(true);
    try {
      const data = await AdminServices.getProviders('pending');
      setProviders(data || []);
      
      const deltaData = await AdminServices.getProviderDeltas();
      setDeltas(deltaData || []);
    } catch (err) {
      console.error("Failed to fetch providers or deltas from backend", err);
      setProviders([]);
      setDeltas([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProvidersAndDeltas();
  }, []);

  const approve = async (id) => {
    try {
      await AdminServices.approveProvider(id);
      fetchProvidersAndDeltas();
    } catch (e) {
      alert('Failed to approve');
    }
  };

  const reject = async (id) => {
    try {
      await AdminServices.rejectProvider(id);
      fetchProvidersAndDeltas();
    } catch (e) {
      alert('Failed to reject');
    }
  };

  const approveDelta = async (id) => {
    try {
      await AdminServices.approveDelta(id);
      fetchProvidersAndDeltas();
    } catch (e) {
      alert('Failed to approve delta');
    }
  };

  const rejectDelta = async (id) => {
    try {
      await AdminServices.rejectDelta(id);
      fetchProvidersAndDeltas();
    } catch (e) {
      alert('Failed to reject delta');
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Delta Audit Guard (Profile & Pricing Changes)</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 20, marginBottom: 40 }}>
        <thead>
          <tr style={{ backgroundColor: '#f9fafb' }}>
            <th style={styles.th}>Provider</th>
            <th style={styles.th}>Requested Changes</th>
            <th style={styles.th}>Status</th>
            <th style={styles.th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {deltas.map(d => (
            <tr key={d.id || d._id}>
              <td style={styles.td}>{d.providerName || d.provider_id}</td>
              <td style={styles.td}>{JSON.stringify(d.requested_changes || d.changes)}</td>
              <td style={styles.td}>
                <span style={{ padding: '4px 8px', backgroundColor: '#fef3c7', color: '#92400e', borderRadius: 4 }}>
                  {d.status}
                </span>
              </td>
              <td style={styles.td}>
                <button onClick={() => approveDelta(d.id)} style={{ padding: '5px 10px', background: '#059669', color: 'white', border: 'none', borderRadius: 4, marginRight: 10 }}>
                  Approve Delta
                </button>
                <button onClick={() => rejectDelta(d.id)} style={{ padding: '5px 10px', background: '#dc2626', color: 'white', border: 'none', borderRadius: 4 }}>
                  Reject Delta
                </button>
              </td>
            </tr>
          ))}
          {deltas.length === 0 && (
            <tr><td colSpan="4" style={{ padding: 20, textAlign: 'center' }}>No pending delta requests.</td></tr>
          )}
        </tbody>
      </table>

      <h2>Providers Onboarding (Pending)</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 20 }}>
        <thead>
          <tr>
            <th style={styles.th}>Name</th>
            <th style={styles.th}>Type</th>
            <th style={styles.th}>Specialty</th>
            <th style={styles.th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {providers.map(p => (
            <tr key={p.id}>
              <td style={styles.td}>{p.name}</td>
              <td style={styles.td}>{p.type}</td>
              <td style={styles.td}>{p.specialty}</td>
              <td style={styles.td}>
                <button onClick={() => approve(p.id)} style={{ padding: '5px 10px', background: 'green', color: 'white', border: 'none', borderRadius: 4, marginRight: 10 }}>
                  Approve
                </button>
                <button onClick={() => reject(p.id)} style={{ padding: '5px 10px', background: 'red', color: 'white', border: 'none', borderRadius: 4 }}>
                  Reject
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const styles = {
  th: { borderBottom: '2px solid #ccc', padding: 10, textAlign: 'left' },
  td: { borderBottom: '1px solid #ccc', padding: 10 }
};
