import { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const roleLabels: Record<string, string> = {
  worker: 'עובד',
  maintainer: 'מנהל',
  admin: 'מנהל ראשי',
};

interface PendingUser {
  id: number;
  name: string;
  email: string;
  role: string;
  created_at: string;
}

interface UserApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string;
}

export function UserApprovalModal({ isOpen, onClose, token }: UserApprovalModalProps) {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchPendingUsers();
    }
  }, [isOpen]);

  const fetchPendingUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await axios.get(`${API_BASE}/auth/pending-users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Backend returns { pendingUsers: [...] }
      const data = response.data;
      if (Array.isArray(data)) {
        setPendingUsers(data);
      } else if (data && Array.isArray(data.pendingUsers)) {
        setPendingUsers(data.pendingUsers);
      } else {
        setPendingUsers([]);
      }
    } catch (err: any) {
      console.error('Error fetching pending users:', err);
      setError('שגיאה בטעינת משתמשים ממתינים');
      setPendingUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId: number) => {
    try {
      setError('');
      await axios.put(
        `${API_BASE}/auth/approve-user/${userId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess('משתמש אושר בהצלחה');
      fetchPendingUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Error approving user:', err);
      setError(err.response?.data?.error || 'שגיאה באישור משתמש');
    }
  };

  const handleDeny = async (userId: number) => {
    if (!confirm('האם לדחות את המשתמש?')) return;

    try {
      setError('');
      await axios.put(
        `${API_BASE}/auth/deny-user/${userId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess('המשתמש נדחה');
      fetchPendingUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Error denying user:', err);
      setError(err.response?.data?.error || 'שגיאה בדחיית משתמש');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-end justify-center z-50">
      <div className="bg-slate-800 w-full max-h-[90vh] rounded-t-2xl overflow-hidden animate-slideUp">
        {/* Header */}
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">אישור משתמשים</h2>
          <button onClick={onClose} className="text-slate-400 text-2xl">✕</button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading && (
            <div className="text-center py-8">
              <p className="text-teal-400">טוען...</p>
            </div>
          )}

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

          {!loading && (!Array.isArray(pendingUsers) || pendingUsers.length === 0) && (
            <div className="text-center py-8">
              <p className="text-slate-400 text-lg mb-2">אין משתמשים ממתינים</p>
              <p className="text-slate-500 text-sm">כל הבקשות טופלו</p>
            </div>
          )}

          {Array.isArray(pendingUsers) && pendingUsers.map((user) => (
            <div key={user.id} className="bg-slate-700 rounded-xl p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-bold text-white">{user.name}</p>
                  <p className="text-sm text-slate-400" dir="ltr">{user.email}</p>
                </div>
                <span className="px-2 py-1 bg-slate-600 text-slate-300 rounded-lg text-xs font-bold">
                  {roleLabels[user.role] || user.role}
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-3">
                נרשם: {new Date(user.created_at).toLocaleDateString('he-IL')}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleDeny(user.id)}
                  className="flex-1 py-2 bg-orange-500/20 text-orange-400 rounded-lg font-bold text-sm"
                >
                  דחייה
                </button>
                <button
                  onClick={() => handleApprove(user.id)}
                  className="flex-1 py-2 bg-teal-600 text-white rounded-lg font-bold text-sm"
                >
                  אישור
                </button>
              </div>
            </div>
          ))}
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
