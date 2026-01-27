import { useState, useEffect, useRef } from 'react';
import { useTaskStore, useAuthStore, useTagStore } from '../store';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const statusLabels: Record<string, string> = {
  planned: 'מתוכנן',
  assigned: 'הוקצה',
  in_progress: 'בביצוע',
  waiting: 'ממתין',
  completed: 'הושלם',
  verified: 'אומת',
};

const priorityLabels: Record<string, string> = {
  low: 'נמוך',
  medium: 'בינוני',
  high: 'גבוה',
  critical: 'דחוף',
};

const priorityColors: Record<string, string> = {
  low: 'bg-emerald-500',
  medium: 'bg-amber-500',
  high: 'bg-orange-500',
  critical: 'bg-red-500',
};

export default function TaskDetail({ taskId, onClose, onTaskUpdate }: any) {
  const { currentTask, fetchTask, completeTask, verifyTask, updateTask } = useTaskStore();
  const { user, token } = useAuthStore();
  const { tags, fetchTags } = useTagStore();
  const [comment, setComment] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (taskId) {
      setError('');
      fetchTask(taskId).catch(() => setError('שגיאה בטעינת משימה'));
      fetchTeamMembers();
    }
  }, [taskId]);

  useEffect(() => {
    if (user?.restaurant_id) {
      fetchTags(user.restaurant_id);
    }
  }, [user?.restaurant_id]);

  const fetchTeamMembers = async () => {
    try {
      const response = await axios.get(`${API_BASE}/tasks/team/members`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTeamMembers(response.data);
    } catch (error) {
      console.error('שגיאה בטעינת צוות:', error);
    }
  };

  const handleStartEdit = () => {
    setIsEditing(true);
    setEditData({
      title: currentTask.title,
      description: currentTask.description,
      status: currentTask.status,
      priority: currentTask.priority,
      assigned_to: currentTask.assigned_to,
      due_date: currentTask.due_date,
      tags: currentTask.tags ? currentTask.tags.map((t: any) => t.id) : [],
    });
    // Scroll to top when entering edit mode
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  };

  if (error) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-end justify-center z-50">
        <div className="bg-slate-800 w-full rounded-t-2xl p-6 text-center">
          <p className="text-orange-400 font-bold mb-4">{error}</p>
          <button onClick={onClose} className="w-full py-3 bg-slate-700 text-white rounded-xl font-bold">
            סגירה
          </button>
        </div>
      </div>
    );
  }

  if (!currentTask) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <div className="animate-pulse flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-teal-400">טוען...</p>
        </div>
      </div>
    );
  }

  const handleComplete = async () => {
    try {
      setLoading(true);
      await completeTask(currentTask.id);
      onTaskUpdate?.();
    } catch (err) {
      setError('שגיאה בסימון משימה');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    try {
      setLoading(true);
      await verifyTask(currentTask.id, comment);
      setComment('');
      onTaskUpdate?.();
    } catch (err) {
      setError('שגיאה באימות');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    try {
      setLoading(true);
      await updateTask(currentTask.id, editData);
      setIsEditing(false);
      setEditData(null);
      onTaskUpdate?.();
    } catch (err) {
      setError('שגיאה בעדכון');
    } finally {
      setLoading(false);
    }
  };

  const isManager = user?.role === 'admin' || user?.role === 'maintainer';
  const canEdit = isManager || user?.id === currentTask.assigned_to;
  const isOverdue = currentTask.due_date && new Date(currentTask.due_date) < new Date() && !['completed', 'verified'].includes(currentTask.status);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-end justify-center z-50" onClick={onClose}>
      <div 
        className="bg-slate-800 dark:bg-slate-800 light:bg-white w-full max-h-[92vh] rounded-t-3xl overflow-hidden animate-slideUp flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{ willChange: 'transform' }}
      >
        {/* Header - Always visible with quick actions */}
        <div className="p-4 border-b border-slate-700/50 flex items-center gap-3 sticky top-0 bg-slate-800 z-20 backdrop-blur-lg bg-opacity-95">
          <button 
            onClick={onClose} 
            className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-700/50 text-slate-400 hover:bg-slate-600 transition-colors"
          >
            ✕
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-white truncate">{currentTask.title}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2 py-0.5 rounded text-xs font-bold text-white ${priorityColors[currentTask.priority]}`}>
                {priorityLabels[currentTask.priority]}
              </span>
              {isOverdue && (
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-500/20 text-red-400">
                  באיחור
                </span>
              )}
            </div>
          </div>
          
          {/* Quick Edit Button - Always visible in header */}
          {canEdit && !isEditing && (
            <button
              onClick={handleStartEdit}
              className="px-4 py-2 bg-teal-600 text-white rounded-xl font-bold text-sm hover:bg-teal-500 transition-colors flex items-center gap-2"
            >
              <span>✏️</span>
              <span>עריכה</span>
            </button>
          )}
        </div>

        {/* Content - Optimized scrolling */}
        <div 
          ref={contentRef}
          className="flex-1 overflow-y-auto overscroll-contain"
          style={{ 
            WebkitOverflowScrolling: 'touch',
            scrollBehavior: 'smooth',
          }}
        >
          <div className="p-4 space-y-4 pb-6">
            {/* Status Bar */}
            <div className="flex gap-2">
              <span className="px-4 py-2 bg-slate-700/50 text-teal-400 rounded-xl text-sm font-bold flex-1 text-center border border-slate-600/50">
                {statusLabels[currentTask.status] || currentTask.status}
              </span>
            </div>

            {/* Edit Mode */}
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-teal-400 mb-2">כותרת</label>
                  <input
                    type="text"
                    value={editData.title}
                    onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:border-teal-500 focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-teal-400 mb-2">תיאור</label>
                  <textarea
                    value={editData.description || ''}
                    onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white resize-none focus:border-teal-500 focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-teal-400 mb-2">סטטוס</label>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setEditData({ ...editData, status: value })}
                        className={`py-2 px-3 rounded-xl text-sm font-bold transition-all ${
                          editData.status === value 
                            ? 'bg-teal-600 text-white ring-2 ring-teal-400' 
                            : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-teal-400 mb-2">עדיפות</label>
                  <div className="grid grid-cols-4 gap-2">
                    {Object.entries(priorityLabels).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setEditData({ ...editData, priority: value })}
                        className={`py-2 rounded-xl text-sm font-bold text-white transition-all ${
                          editData.priority === value 
                            ? `${priorityColors[value]} ring-2 ring-white/50` 
                            : 'bg-slate-700/50 opacity-60 hover:opacity-100'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-teal-400 mb-2">הקצאה</label>
                  <select
                    value={editData.assigned_to || ''}
                    onChange={(e) => setEditData({ ...editData, assigned_to: e.target.value ? parseInt(e.target.value) : null })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:border-teal-500 focus:outline-none"
                  >
                    <option value="">ללא הקצאה</option>
                    {teamMembers.map((member) => (
                      <option key={member.id} value={member.id}>{member.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-teal-400 mb-2">תאריך יעד</label>
                  <input
                    type="date"
                    value={editData.due_date ? editData.due_date.split('T')[0] : ''}
                    onChange={(e) => setEditData({ ...editData, due_date: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:border-teal-500 focus:outline-none"
                    dir="ltr"
                  />
                </div>

                {/* Tags */}
                {tags.length > 0 && (
                  <div>
                    <label className="block text-sm font-bold text-teal-400 mb-2">תגיות</label>
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag) => (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => {
                            const currentTags = editData.tags || [];
                            const newTags = currentTags.includes(tag.id)
                              ? currentTags.filter((id: number) => id !== tag.id)
                              : [...currentTags, tag.id];
                            setEditData({ ...editData, tags: newTags });
                          }}
                          className={`px-3 py-2 rounded-xl text-sm font-bold text-white transition-all ${
                            (editData.tags || []).includes(tag.id) ? 'ring-2 ring-white scale-105' : 'opacity-50 hover:opacity-75'
                          }`}
                          style={{ 
                            background: tag.color2 
                              ? `linear-gradient(135deg, ${tag.color} 0%, ${tag.color2} 100%)`
                              : tag.color 
                          }}
                        >
                          {tag.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Description */}
                <div className="bg-slate-700/30 rounded-xl p-4">
                  <label className="block text-sm font-bold text-slate-500 mb-2">תיאור</label>
                  <p className="text-slate-300 leading-relaxed">{currentTask.description || 'אין תיאור'}</p>
                </div>

                {/* Meta Info - Clean grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-700/30 rounded-xl p-4">
                    <p className="text-xs text-slate-500 mb-1">הוקצה ל</p>
                    <p className="text-white font-bold">{currentTask.assigned_to_name || 'לא הוקצה'}</p>
                  </div>
                  <div className="bg-slate-700/30 rounded-xl p-4">
                    <p className="text-xs text-slate-500 mb-1">תאריך יעד</p>
                    <p className={`font-bold ${isOverdue ? 'text-red-400' : 'text-white'}`}>
                      {currentTask.due_date 
                        ? new Date(currentTask.due_date).toLocaleDateString('he-IL') 
                        : 'לא נקבע'}
                    </p>
                  </div>
                  {currentTask.estimated_time && (
                    <div className="bg-slate-700/30 rounded-xl p-4">
                      <p className="text-xs text-slate-500 mb-1">זמן מוערך</p>
                      <p className="text-white font-bold">
                        {currentTask.estimated_time < 60 
                          ? `${currentTask.estimated_time} דקות` 
                          : `${Math.round(currentTask.estimated_time / 60)} שעות`}
                      </p>
                    </div>
                  )}
                  <div className="bg-slate-700/30 rounded-xl p-4">
                    <p className="text-xs text-slate-500 mb-1">חזרה</p>
                    <p className="text-white font-bold">
                      {currentTask.recurrence === 'once' ? 'פעם אחת' 
                        : currentTask.recurrence === 'daily' ? 'יומי'
                        : currentTask.recurrence === 'weekly' ? 'שבועי' : 'חודשי'}
                    </p>
                  </div>
                </div>

                {/* Tags */}
                {currentTask.tags && currentTask.tags.length > 0 && (
                  <div>
                    <label className="block text-sm font-bold text-slate-500 mb-2">תגיות</label>
                    <div className="flex flex-wrap gap-2">
                      {currentTask.tags.map((tag: any) => (
                        <span
                          key={tag.id}
                          className="px-3 py-1.5 rounded-xl text-sm font-bold text-white"
                          style={{ 
                            background: tag.color2 
                              ? `linear-gradient(135deg, ${tag.color} 0%, ${tag.color2} 100%)`
                              : tag.color 
                          }}
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Checklists */}
                {currentTask.checklists && currentTask.checklists.length > 0 && (
                  <div>
                    <label className="block text-sm font-bold text-slate-500 mb-2">רשימת בדיקה</label>
                    <div className="space-y-2">
                      {currentTask.checklists.map((item: any) => (
                        <label key={item.id} className="flex items-center gap-3 bg-slate-700/30 p-3 rounded-xl">
                          <input type="checkbox" checked={item.completed} readOnly className="w-5 h-5 accent-teal-500" />
                          <span className={item.completed ? 'line-through text-slate-500' : 'text-white'}>
                            {item.item}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Comments */}
                {currentTask.comments && currentTask.comments.length > 0 && (
                  <div>
                    <label className="block text-sm font-bold text-slate-500 mb-2">הערות</label>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {currentTask.comments.map((c: any) => (
                        <div key={c.id} className="bg-slate-700/30 p-3 rounded-xl">
                          <p className="text-sm font-bold text-teal-400">{c.user_name}</p>
                          <p className="text-slate-300 text-sm mt-1">{c.content}</p>
                          <p className="text-xs text-slate-500 mt-1">{new Date(c.created_at).toLocaleString('he-IL')}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Verification comment input */}
                {isManager && currentTask.status === 'completed' && (
                  <div>
                    <label className="block text-sm font-bold text-teal-400 mb-2">הערה לאימות</label>
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="הוסף משוב..."
                      rows={2}
                      className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white resize-none focus:border-teal-500 focus:outline-none"
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Sticky Action Bar - Always visible at bottom */}
        <div className="p-4 border-t border-slate-700/50 bg-slate-800/95 backdrop-blur-lg safe-area-inset-bottom">
          {isEditing ? (
            <div className="flex gap-3">
              <button
                onClick={() => { setIsEditing(false); setEditData(null); }}
                className="flex-1 py-3.5 bg-slate-700 text-slate-300 rounded-xl font-bold hover:bg-slate-600 transition-colors"
              >
                ביטול
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={loading}
                className="flex-1 py-3.5 bg-teal-600 text-white rounded-xl font-bold disabled:opacity-50 hover:bg-teal-500 transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>שומר...</span>
                  </>
                ) : (
                  <>
                    <span>✓</span>
                    <span>שמירה</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="flex gap-3">
              {user?.id === currentTask.assigned_to && ['assigned', 'in_progress'].includes(currentTask.status) && (
                <button
                  onClick={handleComplete}
                  disabled={loading}
                  className="flex-1 py-3.5 bg-teal-600 text-white rounded-xl font-bold disabled:opacity-50 hover:bg-teal-500 transition-colors"
                >
                  {loading ? 'מסמן...' : '✓ סיום משימה'}
                </button>
              )}

              {isManager && currentTask.status === 'completed' && (
                <button
                  onClick={handleVerify}
                  disabled={loading}
                  className="flex-1 py-3.5 bg-emerald-600 text-white rounded-xl font-bold disabled:opacity-50 hover:bg-emerald-500 transition-colors"
                >
                  {loading ? 'מאמת...' : '✓ אישור משימה'}
                </button>
              )}

              {!['assigned', 'in_progress'].includes(currentTask.status) && currentTask.status !== 'completed' && (
                <button
                  onClick={onClose}
                  className="flex-1 py-3.5 bg-slate-700 text-slate-300 rounded-xl font-bold hover:bg-slate-600 transition-colors"
                >
                  סגירה
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
