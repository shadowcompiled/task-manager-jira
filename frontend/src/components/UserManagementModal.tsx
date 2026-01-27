import { useState, useEffect } from 'react';
import { useAuthStore } from '../store';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const roleLabels: Record<string, string> = {
  worker: 'עובד',
  maintainer: 'מנהל',
  admin: 'מנהל ראשי',
};

export default function UserManagementModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { user, token } = useAuthStore();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await axios.get(`${API_BASE}/tasks/team/members`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(response.data);
    } catch (err: any) {
      setError('שגיאה בטעינת משתמשים');
    } finally {
      setLoading(false);
    }
  };

  const handlePromoteToAdmin = async (userId: number, userName: string) => {
    if (!window.confirm(`לקדם את ${userName} למנהל ראשי?`)) return;

    try {
      setError('');
      setSuccess('');
      
      await axios.post(
        `${API_BASE}/auth/promote`,
        { userId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccess(`${userName} קודם בהצלחה`);
      setTimeout(() => {
        setSuccess('');
        fetchUsers();
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'שגיאה בקידום משתמש');
    }
  };

  const handleDeleteUser = async (userId: number, userName: string) => {
    if (!window.confirm(`האם אתה בטוח שברצונך למחוק את ${userName}? פעולה זו לא ניתנת לביטול.`)) return;

    try {
      setError('');
      setSuccess('');
      
      await axios.delete(
        `${API_BASE}/auth/user/${userId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccess(`${userName} נמחק בהצלחה`);
      setTimeout(() => {
        setSuccess('');
        fetchUsers();
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'שגיאה במחיקת משתמש');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-end justify-center z-50">
      <div className="bg-slate-800 w-full max-h-[90vh] rounded-t-2xl overflow-hidden animate-slideUp">
        {/* Header */}
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">ניהול צוות</h2>
          <button onClick={onClose} className="text-slate-400 text-2xl">✕</button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(90vh-120px)]">
          {error && (
            <div className="p-3 bg-orange-500/20 border border-orange-500 rounded-xl text-orange-400 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-teal-500/20 border border-teal-500 rounded-xl text-teal-400 text-sm">
              {success}
            </div>
          )}

          {loading ? (
            <div className="text-center py-8">
              <p className="text-teal-400">טוען...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-400 text-lg mb-2">אין חברי צוות</p>
              <p className="text-slate-500 text-sm">הוסף משתמשים חדשים</p>
            </div>
          ) : (
            <div className="space-y-3">
              {users.map((u) => (
                <div
                  key={u.id}
                  className="bg-slate-700 rounded-xl p-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-bold text-white">{u.name}</p>
                      <p className="text-sm text-slate-400" dir="ltr">{u.email}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                      u.role === 'admin' 
                        ? 'bg-teal-600 text-white' 
                        : u.role === 'maintainer'
                        ? 'bg-slate-600 text-teal-400'
                        : 'bg-slate-600 text-slate-300'
                    }`}>
                      {roleLabels[u.role] || u.role}
                    </span>
                  </div>

                  {u.id !== user?.id && user?.role === 'admin' && (
                    <div className="flex gap-2">
                      {u.role !== 'admin' && (
                        <button
                          onClick={() => handlePromoteToAdmin(u.id, u.name)}
                          className="flex-1 py-2 bg-teal-600 text-white rounded-lg font-bold text-sm"
                        >
                          קדם למנהל ראשי
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteUser(u.id, u.name)}
                        className="py-2 px-4 bg-red-600 text-white rounded-lg font-bold text-sm"
                      >
                        🗑️ מחק
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700">
          <button
            onClick={onClose}
            className="w-full py-3 bg-slate-700 text-slate-300 rounded-xl font-bold"
          >
            סגירה
          </button>
        </div>
      </div>
    </div>
  );
}
