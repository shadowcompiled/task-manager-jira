import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { modalTransition, quickTransition, getTransition, useReducedMotion } from '../utils/motion';

const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3000/api' : '/api');

interface PendingUser {
  id: number;
  email: string;
  name: string;
  role: string;
  status: string;
  created_at: string;
}

interface UserApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string;
}

export const UserApprovalModal: React.FC<UserApprovalModalProps> = ({ isOpen, onClose, token }) => {
  const reducedMotion = useReducedMotion();
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [approving, setApproving] = useState<number | null>(null);
  const [denying, setDenying] = useState<number | null>(null);
  const [denyReason, setDenyReason] = useState<string>('');
  const [showDenyReason, setShowDenyReason] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchPendingUsers();
    }
  }, [isOpen]);

  const fetchPendingUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get(`${API_BASE}/auth/pending-users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPendingUsers(response.data.pendingUsers);
    } catch (err: any) {
      setError(err.response?.data?.error || 'טעינת המשתמשים הממתינים נכשלה');
      console.error('Error fetching pending users:', err);
    } finally {
      setLoading(false);
    }
  };

  const approveUser = async (userId: number) => {
    setApproving(userId);
    try {
      await axios.put(`${API_BASE}/auth/approve-user/${userId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Remove user from list and show success
      setPendingUsers(pendingUsers.filter(u => u.id !== userId));
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'אישור המשתמש נכשל');
      console.error('Error approving user:', err);
    } finally {
      setApproving(null);
    }
  };

  const denyUser = async (userId: number) => {
    setDenying(userId);
    try {
await axios.put(`${API_BASE}/auth/deny-user/${userId}`,
        { reason: denyReason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Remove user from list and show success
      setPendingUsers(pendingUsers.filter(u => u.id !== userId));
      setDenyReason('');
      setShowDenyReason(null);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'דחיית המשתמש נכשלה');
      console.error('Error denying user:', err);
    } finally {
      setDenying(null);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={getTransition(reducedMotion, quickTransition)}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={getTransition(reducedMotion, modalTransition)}
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-800 rounded-lg shadow-2xl max-w-md w-full border border-teal-500/30"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-700 to-slate-600 px-6 py-4 border-b border-teal-500/30 rounded-t-lg">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-white">👥 ממתינים לאישור</h2>
            <button
              type="button"
              onClick={onClose}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-white transition-colors rounded-full"
              aria-label="סגור"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-900/20 border border-red-500/50 rounded text-red-400 text-sm">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-slate-400 mt-3">טוען משתמשים...</p>
            </div>
          ) : pendingUsers.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-400">✓ אין משתמשים ממתינים</p>
              <p className="text-slate-500 text-sm mt-2">כל ההרשמות אושרו</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {pendingUsers.map((user) => (
                <div
                  key={user.id}
                  className="bg-slate-700/50 border border-teal-500/20 rounded-lg p-3"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <p className="font-semibold text-white">{user.name}</p>
                      <p className="text-sm text-slate-400">{user.email}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        נרשם: {new Date(user.created_at).toLocaleDateString('he-IL')}
                      </p>
                    </div>
                  </div>

                  {showDenyReason === user.id ? (
                    <div className="mt-3 space-y-2">
                      <textarea
                        value={denyReason}
                        onChange={(e) => setDenyReason(e.target.value)}
                        placeholder="סיבת הדחייה (אופציונלי)..."
                        className="w-full px-3 py-2 bg-slate-600 border border-slate-500 text-white rounded text-sm focus:outline-none focus:border-red-500"
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => denyUser(user.id)}
                          disabled={denying === user.id}
                          className="flex-1 px-3 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-slate-600 disabled:to-slate-600 text-white font-semibold rounded transition-all duration-200 text-sm"
                        >
                          {denying === user.id ? '⏳ דוחה...' : '✕ דחייה'}
                        </button>
                        <button
                          onClick={() => {
                            setShowDenyReason(null);
                            setDenyReason('');
                          }}
                          className="flex-1 px-3 py-2 bg-slate-600 hover:bg-slate-500 text-white font-semibold rounded transition-all duration-200 text-sm"
                        >
                          ביטול
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => approveUser(user.id)}
                        disabled={approving === user.id}
                        className="flex-1 px-3 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 disabled:from-slate-600 disabled:to-slate-600 text-white font-semibold rounded transition-all duration-200 text-sm"
                      >
                        {approving === user.id ? '⏳ מאשר...' : '✓ אשר'}
                      </button>
                      <button
                        onClick={() => setShowDenyReason(user.id)}
                        disabled={denying === user.id}
                        className="flex-1 px-3 py-2 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 disabled:from-slate-600 disabled:to-slate-600 text-white font-semibold rounded transition-all duration-200 text-sm"
                      >
                        ✕ Deny
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {pendingUsers.length > 0 && (
            <button
              onClick={fetchPendingUsers}
              className="w-full mt-4 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white font-semibold rounded transition-all duration-200 text-sm"
            >
              🔄 רענן
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-700/30 px-6 py-3 border-t border-teal-500/20 rounded-b-lg">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded transition-all duration-200"
          >
            סגירה
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
