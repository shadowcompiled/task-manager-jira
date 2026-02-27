import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTagStore, useAuthStore } from '../store';
import axios from 'axios';
import { modalTransition, quickTransition, getTransition, useReducedMotion } from '../utils/motion';

const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3000/api' : '/api');

export default function TagManagementModal({ onClose }: any) {
  const { user, token } = useAuthStore();
  const reducedMotion = useReducedMotion();
  const { tags, fetchTags } = useTagStore();
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3b82f6');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const orgId = user?.organization_id ?? user?.restaurant_id;
    if (orgId) {
      fetchTags(orgId);
    }
  }, [user?.organization_id, user?.restaurant_id, fetchTags]);

  const handleAddTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) {
      setError('יש להכניס שם לתגיה');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await axios.post(
        `${API_BASE}/tags`,
        {
          organizationId: user?.organization_id ?? user?.restaurant_id,
          name: newTagName.trim(),
          color: newTagColor,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccess('✓ תגיה נוצרה בהצלחה!');
      setNewTagName('');
      setNewTagColor('#3b82f6');
      
      // Refresh tags list
      const orgId = user?.organization_id ?? user?.restaurant_id;
      if (orgId) {
        fetchTags(orgId);
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'יצירת התגית נכשלה');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTag = async (tagId: number) => {
    if (!window.confirm('למחוק את התגית?')) return;

    try {
      await axios.delete(`${API_BASE}/tags/${tagId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setSuccess('✓ התגיה נמחקה בהצלחה!');
      
      // Refresh tags list
      const orgId = user?.organization_id ?? user?.restaurant_id;
      if (orgId) {
        fetchTags(orgId);
      }

      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'מחיקת התגית נכשלה');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={getTransition(reducedMotion, quickTransition)}
      className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 safe-area-padding"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={getTransition(reducedMotion, modalTransition)}
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-800 rounded-t-2xl sm:rounded-2xl shadow-2xl max-w-md w-full max-h-[92dvh] sm:max-h-[90vh] flex flex-col border border-slate-600 sm:border-teal-500/30"
      >
        <div className="p-4 sm:p-6 border-b border-slate-600 flex justify-between items-center shrink-0">
          <h2 className="text-xl font-bold text-white">🏷️ ניהול תגיות</h2>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-white rounded-full text-xl"
            aria-label="סגור"
          >
            ✕
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          <div className="bg-slate-700/50 border border-slate-600 rounded-xl p-4">
            <h3 className="text-lg font-bold text-white mb-3">➕ יצירת תגיה חדשה</h3>
            <form onSubmit={handleAddTag} className="space-y-3">
              <input
                type="text"
                placeholder="שם התגיה"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                className="w-full px-4 py-3 border border-slate-600 rounded-xl bg-slate-700 text-white placeholder-slate-500 focus:ring-2 focus:ring-teal-500 focus:outline-none min-h-[44px]"
              />
              <div className="flex gap-2 items-center flex-wrap">
                <input
                  type="color"
                  value={newTagColor}
                  onChange={(e) => setNewTagColor(e.target.value)}
                  className="w-12 h-10 rounded-xl cursor-pointer border border-slate-600 bg-slate-700"
                  title="בחר צבע לתגיה"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 min-h-[48px] px-4 py-3 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold disabled:opacity-50"
                >
                  {loading ? '⏳ יוצר...' : '✓ צור תגיה'}
                </button>
              </div>
              {error && (
                <div className="bg-red-500/20 text-red-300 p-3 rounded-xl text-sm border border-red-500/30">
                  ⚠️ {error}
                </div>
              )}
              {success && (
                <div className="bg-teal-500/20 text-teal-300 p-3 rounded-xl text-sm border border-teal-500/30">
                  {success}
                </div>
              )}
            </form>
          </div>

          <div>
            <h3 className="text-lg font-bold text-white mb-3">📋 תגיות קיימות</h3>
            {tags && tags.length > 0 ? (
              <div className="space-y-2">
                {tags.map((tag) => (
                  <div
                    key={tag.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-600 bg-slate-700/50"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-6 h-6 rounded-full border-2 border-slate-500 shrink-0"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span className="font-semibold text-white truncate">{tag.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteTag(tag.id)}
                      className="min-h-[44px] px-3 py-2 text-sm bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold shrink-0"
                    >
                      ✕ מחק
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-slate-400 py-6 font-semibold">אין תגיות עדיין</p>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-slate-600 flex justify-center pb-[env(safe-area-inset-bottom)] sm:pb-4">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[48px] px-6 py-3 bg-slate-600 hover:bg-slate-500 text-white rounded-xl font-bold"
          >
            סגור
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
