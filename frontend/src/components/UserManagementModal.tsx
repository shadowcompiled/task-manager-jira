import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store';
import axios from 'axios';
import { modalTransition, quickTransition, getTransition, useReducedMotion } from '../utils/motion';

export default function UserManagementModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { user } = useAuthStore();
  const reducedMotion = useReducedMotion();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3000/api' : '/api');

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/tasks/team/members`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'טעינת המשתמשים נכשלה');
    } finally {
      setLoading(false);
    }
  };

  const handlePromoteToAdmin = async (userId: number, userName: string) => {
    if (!window.confirm(`להעלות את ${userName} למנהל?`)) {
      return;
    }

    try {
      setError('');
      setSuccessMessage('');
      const token = localStorage.getItem('token');
      
      await axios.post(
        `${API_URL}/auth/promote`,
        { userId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccessMessage(`${userName} הועלה למנהל בהצלחה!`);
      setTimeout(() => {
        setSuccessMessage('');
        fetchUsers();
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'העלאת המשתמש נכשלה');
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={getTransition(reducedMotion, quickTransition)}
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={getTransition(reducedMotion, modalTransition)}
        onClick={(e) => e.stopPropagation()}
        className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-teal-500/30 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">👥 ניהול משתמשים</h2>
          <button
            onClick={onClose}
            className="text-3xl text-slate-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="bg-teal-500/20 border border-teal-500/50 text-teal-200 px-4 py-3 rounded-lg mb-4">
            ✓ {successMessage}
          </div>
        )}

        {loading ? (
          <div className="text-center py-8">
            <p className="text-slate-300 text-lg">טוען משתמשים...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-400">לא נמצאו חברי צוות</p>
          </div>
        ) : (
          <div className="space-y-3">
            {users.map((u) => (
              <div
                key={u.id}
                className="bg-slate-700/50 border border-slate-600 rounded-lg p-4 flex items-center justify-between hover:bg-slate-700 transition-colors"
              >
                <div>
                  <p className="font-bold text-white">{u.name}</p>
                  <p className="text-sm text-slate-400">{u.email}</p>
                  <p className="text-xs text-teal-300 mt-1">
                    תפקיד: <span className="font-semibold">{u.role === 'admin' ? 'מנהל' : u.role === 'manager' ? 'מנהל צוות' : 'עובד'}</span>
                  </p>
                </div>

                {u.id !== user?.id && u.role !== 'admin' && (
                  <button
                    onClick={() => handlePromoteToAdmin(u.id, u.name)}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg transition-all duration-300 transform hover:scale-105 active:scale-95 whitespace-nowrap ml-4"
                  >
                    📈 העלה למנהל
                  </button>
                )}

                {u.role === 'admin' && (
                  <span className="px-4 py-2 bg-emerald-600/30 text-emerald-300 font-bold rounded-lg border border-emerald-500/50">
                    👑 מנהל
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full mt-6 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg transition-all duration-300"
        >
          סגירה
        </button>
      </motion.div>
    </motion.div>
  );
}
