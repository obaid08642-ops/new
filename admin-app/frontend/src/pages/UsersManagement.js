import React, { useState, useEffect } from 'react';
import { AdminServices } from '../services/AdminApi';

export const UsersManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await AdminServices.getUsers();
      setUsers(data || []);
    } catch (err) {
      console.error("Failed to fetch users from backend", err);
      setUsers([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const banUser = async (id) => {
    try {
      await AdminServices.banUser(id, 'Violation of terms');
      fetchUsers();
    } catch (e) {
      alert('Failed to ban user or route missing in backend');
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Users Management</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 20 }}>
        <thead>
          <tr>
            <th style={styles.th}>Name</th>
            <th style={styles.th}>Phone</th>
            <th style={styles.th}>Status</th>
            <th style={styles.th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id}>
              <td style={styles.td}>{u.name}</td>
              <td style={styles.td}>{u.phone}</td>
              <td style={styles.td}>{u.status}</td>
              <td style={styles.td}>
                <button onClick={() => banUser(u.id)} style={{ padding: '5px 10px', background: 'red', color: 'white', border: 'none', borderRadius: 4 }}>
                  Ban User
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
