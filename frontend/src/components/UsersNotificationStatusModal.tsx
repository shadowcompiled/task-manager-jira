import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE } from '../store';

interface UserStatus {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  notificationsEnabled: boolean;
  subscriptionCount: number;
}

interface Response {
  total: number;
  withNotifications: number;
  withoutNotifications: number;
  users: UserStatus[];
}

export default function UsersNotificationStatusModal({ onClose }: { onClose: () => void }) {
  const [data, setData] = useState<Response | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    axios
      .get<Response>(`${API_BASE}/push/users-status`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.error || 'הטעינה נכשלה'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-slate-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col border border-teal-500/30" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-slate-600 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">משתמשים והתראות</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg" aria-label="סגור">✕</button>
        </div>
        <div className="p-4 overflow-auto flex-1">
          {loading && <p className="text-teal-400 text-center py-8">טוען...</p>}
          {error && <p className="text-red-400 text-center py-4">{error}</p>}
          {data && !loading && (
            <>
              <div className="flex gap-4 mb-4 text-sm">
                <span className="text-teal-400">סה״כ: {data.total}</span>
                <span className="text-green-400">עם התראות: {data.withNotifications}</span>
                <span className="text-slate-400">בלי התראות: {data.withoutNotifications}</span>
              </div>
              <div className="space-y-2">
                {data.users.map((u) => (
                  <div key={u.id} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-xl">
                    <div className="min-w-0">
                      <p className="font-bold text-white truncate">{u.name}</p>
                      <p className="text-xs text-slate-400 truncate">{u.email}</p>
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      <span className="text-xs text-slate-400 capitalize">{u.role}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${u.notificationsEnabled ? 'bg-green-600/80 text-white' : 'bg-slate-600 text-slate-300'}`}>
                        {u.notificationsEnabled ? '🔔 פעיל' : '🔕 כבוי'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
