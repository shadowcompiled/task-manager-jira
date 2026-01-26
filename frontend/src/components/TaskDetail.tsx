import { useState, useEffect } from 'react';
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
        <p className="text-teal-400">טוען...</p>
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

  return (
    <div className="fixed inset-0 bg-black/80 flex items-end justify-center z-50">
      <div className="bg-slate-800 w-full max-h-[90vh] rounded-t-2xl overflow-hidden animate-slideUp">
        {/* Header */}
        <div className="p-4 border-b border-slate-700 flex items-center justify-between sticky top-0 bg-slate-800 z-10">
          <h2 className="text-lg font-bold text-white truncate flex-1">{currentTask.title}</h2>
          <button onClick={onClose} className="text-slate-400 text-2xl p-1 mr-2">✕</button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Status & Priority */}
          <div className="flex gap-2">
            <span className="px-3 py-2 bg-slate-700 text-teal-400 rounded-lg text-sm font-bold flex-1 text-center">
              {statusLabels[currentTask.status] || currentTask.status}
            </span>
            <span className={`px-3 py-2 rounded-lg text-sm font-bold flex-1 text-center text-white ${
              currentTask.priority === 'critical' || currentTask.priority === 'high' 
                ? 'bg-orange-500' 
                : 'bg-teal-600'
            }`}>
              {priorityLabels[currentTask.priority] || currentTask.priority}
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
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-teal-400 mb-2">תיאור</label>
                <textarea
                  value={editData.description || ''}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-teal-400 mb-2">סטטוס</label>
                <select
                  value={editData.status}
                  onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white"
                >
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-teal-400 mb-2">עדיפות</label>
                <div className="grid grid-cols-4 gap-2">
                  {Object.entries(priorityLabels).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setEditData({ ...editData, priority: value })}
                      className={`py-2 rounded-lg text-sm font-bold text-white ${
                        editData.priority === value 
                          ? value === 'critical' || value === 'high' ? 'bg-orange-500' : 'bg-teal-600'
                          : 'bg-slate-700'
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
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white"
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
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white"
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
                        className={`px-3 py-2 rounded-lg text-sm font-bold text-white transition-all ${
                          (editData.tags || []).includes(tag.id) ? 'ring-2 ring-white' : 'opacity-60'
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
              <div>
                <label className="block text-sm font-bold text-slate-500 mb-2">תיאור</label>
                <p className="text-slate-300">{currentTask.description || 'אין תיאור'}</p>
              </div>

              {/* Meta Info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-700 rounded-xl p-3">
                  <p className="text-xs text-slate-500 mb-1">הוקצה ל</p>
                  <p className="text-white font-bold">{currentTask.assigned_to_name || 'לא הוקצה'}</p>
                </div>
                <div className="bg-slate-700 rounded-xl p-3">
                  <p className="text-xs text-slate-500 mb-1">תאריך יעד</p>
                  <p className="text-white font-bold">
                    {currentTask.due_date 
                      ? new Date(currentTask.due_date).toLocaleDateString('he-IL') 
                      : 'לא נקבע'}
                  </p>
                </div>
                {currentTask.estimated_time && (
                  <div className="bg-slate-700 rounded-xl p-3">
                    <p className="text-xs text-slate-500 mb-1">זמן מוערך לביצוע</p>
                    <p className="text-white font-bold">
                      {currentTask.estimated_time < 60 
                        ? `${currentTask.estimated_time} דקות` 
                        : `${Math.round(currentTask.estimated_time / 60)} שעות`}
                    </p>
                  </div>
                )}
                <div className="bg-slate-700 rounded-xl p-3">
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
                        className="px-3 py-1 rounded-lg text-sm font-bold text-white"
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
                      <label key={item.id} className="flex items-center gap-3 bg-slate-700 p-3 rounded-xl">
                        <input type="checkbox" checked={item.completed} readOnly className="w-5 h-5" />
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
                      <div key={c.id} className="bg-slate-700 p-3 rounded-xl">
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
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white resize-none"
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-slate-700 sticky bottom-0 bg-slate-800">
          {isEditing ? (
            <div className="flex gap-3">
              <button
                onClick={() => setIsEditing(false)}
                className="flex-1 py-3 bg-slate-700 text-slate-300 rounded-xl font-bold"
              >
                ביטול
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={loading}
                className="flex-1 py-3 bg-teal-600 text-white rounded-xl font-bold disabled:opacity-50"
              >
                {loading ? 'שומר...' : 'שמירה'}
              </button>
            </div>
          ) : (
            <div className="flex gap-3">
              {canEdit && (
                <button
                  onClick={() => {
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
                  }}
                  className="flex-1 py-3 bg-slate-700 text-teal-400 rounded-xl font-bold"
                >
                  עריכה
                </button>
              )}

              {user?.id === currentTask.assigned_to && ['assigned', 'in_progress'].includes(currentTask.status) && (
                <button
                  onClick={handleComplete}
                  disabled={loading}
                  className="flex-1 py-3 bg-teal-600 text-white rounded-xl font-bold disabled:opacity-50"
                >
                  {loading ? 'מסמן...' : 'סיום משימה'}
                </button>
              )}

              {isManager && currentTask.status === 'completed' && (
                <button
                  onClick={handleVerify}
                  disabled={loading}
                  className="flex-1 py-3 bg-teal-600 text-white rounded-xl font-bold disabled:opacity-50"
                >
                  {loading ? 'מאמת...' : 'אישור'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
