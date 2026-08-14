import { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';

export default function UsersManagementPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/admin/users');
      setUsers(Array.isArray(res) ? res : res?.data || []);
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleBanUser = async (id: string) => {
    if (!confirm('هل أنت تأكد من إيقاف/حظر هذا المستخدم؟')) return;
    try {
      await apiFetch(`/admin/users/${id}/ban`, { method: 'POST' });
      alert('تم حظر المستخدم بنجاح');
      fetchUsers();
    } catch (err) {
      alert('حدث خطأ أثناء حظر المستخدم');
    }
  };

  const filteredUsers = users.filter(u => 
    (u.full_name || u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.phone || '').includes(searchTerm)
  );

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">إدارة المستخدمين والمرضى (Users Management)</h1>
        <input
          type="text"
          placeholder="بحث بالاسم أو رقم الهاتف..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="border border-gray-300 rounded px-4 py-2 w-72"
        />
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-500">جاري التحميل...</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الاسم</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الهاتف</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الدور</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الحالة</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((u) => (
                <tr key={u.id || u._id}>
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{u.full_name || u.name || 'مستخدم'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">{u.phone || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">{u.role || 'PATIENT'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${u.isBanned ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                      {u.isBanned ? 'محظور' : 'نشط'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleBanUser(u.id || u._id)}
                      className="text-red-600 hover:text-red-900 font-bold"
                    >
                      حظر / إيقاف
                    </button>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">لا يوجد مستخدمين مطابقين.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
