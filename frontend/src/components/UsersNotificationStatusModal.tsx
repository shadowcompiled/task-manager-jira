import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { API_BASE, useAuthStore } from '../store';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { modalTransition, quickTransition, getTransition, useReducedMotion } from '../utils/motion';

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
  const reducedMotion = useReducedMotion();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'admin';
  const { isSupported, isSubscribed, permission, loading: pushLoading, subscribe, unsubscribe } = usePushNotifications();
  const [data, setData] = useState<Response | null>(null);
  const [loading, setLoading] = useState(isAdmin);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    const token = localStorage.getItem('token');
    axios
      .get<Response>(`${API_BASE}/push/users-status`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.error || 'הטעינה נכשלה'))
      .finally(() => setLoading(false));
  }, [isAdmin]);

  const handleSubscribe = async () => {
    const ok = await subscribe();
    if (ok) setError(null);
    else setError('לא ניתן להפעיל התראות. בדוק שהדפדפן מאפשר התראות לאתר.');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={getTransition(reducedMotion, quickTransition)}
      className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={getTransition(reducedMotion, modalTransition)}
        className="bg-slate-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col border border-teal-500/30"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-slate-600 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">{isAdmin ? 'משתמשים והתראות' : 'התראות'}</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg" aria-label="סגור">✕</button>
        </div>
        <div className="p-4 overflow-auto flex-1 space-y-4">
          {/* Current device: enable push for "mission assigned to me" */}
          <div className="p-4 bg-slate-700/50 rounded-xl">
            <h3 className="font-bold text-white mb-2">התראות במכשיר זה</h3>
            <p className="text-sm text-slate-400 mb-3">כשמקצים לך משימה חדשה תקבל התראה בדפדפן.</p>
            {!isSupported ? (
              <p className="text-sm text-amber-400">הדפדפן לא תומך בהתראות (HTTPS או localhost נדרש).</p>
            ) : permission === 'denied' ? (
              <p className="text-sm text-amber-400">ההתראות חסומות בהגדרות הדפדפן. אפשר להתראות לאתר ונסה שוב.</p>
            ) : isSubscribed ? (
              <button
                type="button"
                onClick={() => unsubscribe()}
                disabled={pushLoading}
                className="px-4 py-2 rounded-lg bg-slate-600 hover:bg-slate-500 text-white text-sm font-bold disabled:opacity-50"
              >
                {pushLoading ? '...' : '🔕 כבה התראות'}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubscribe}
                disabled={pushLoading}
                className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-sm font-bold disabled:opacity-50"
              >
                {pushLoading ? '...' : '🔔 הפעל התראות'}
              </button>
            )}
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          {/* Admin: list of users notification status */}
          {isAdmin && (
            <>
              {loading && <p className="text-teal-400 text-center py-4">טוען...</p>}
              {data && !loading && (
                <>
                  <div className="flex gap-4 text-sm">
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
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
