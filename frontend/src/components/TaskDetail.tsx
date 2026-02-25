import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useTaskStore, useAuthStore } from '../store';
import axios from 'axios';
import { modalTransition, quickTransition, getTransition, useReducedMotion, useIsMobile } from '../utils/motion';

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export default function TaskDetail({ taskId, onClose, onTaskUpdate, startInEditMode }: any) {
  const { currentTask, fetchTask, completeTask, verifyTask, updateTask } = useTaskStore();
  const { user } = useAuthStore();
  const [comment, setComment] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (taskId) {
      setError('');
      fetchTask(taskId).catch(() => setError('טעינת המשימה נכשלה'));
      fetchTeamMembers();
    }
  }, [taskId]);

  useEffect(() => {
    if (currentTask && startInEditMode) {
      setIsEditing(true);
      setEditData({
        title: currentTask.title,
        description: currentTask.description ?? '',
        priority: currentTask.priority,
        status: currentTask.status,
        due_date: currentTask.due_date ?? '',
        assigned_to: currentTask.assigned_to ?? undefined,
      });
    }
  }, [currentTask, startInEditMode]);

  // Focus trap when modal is open
  useEffect(() => {
    if (!currentTask || !panelRef.current) return;
    const el = panelRef.current;
    const focusables = el.querySelectorAll<HTMLElement>(FOCUSABLE);
    const first = focusables[0];
    if (first) first.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const list = Array.from(focusables).filter((n) => n.tabIndex !== -1 && !n.hasAttribute('disabled'));
      if (list.length === 0) return;
      const i = list.indexOf(document.activeElement as HTMLElement);
      if (e.shiftKey) {
        e.preventDefault();
        const next = i <= 0 ? list[list.length - 1] : list[i - 1];
        next?.focus();
      } else {
        if (i === list.length - 1) {
          e.preventDefault();
          list[0]?.focus();
        }
      }
    };
    el.addEventListener('keydown', onKeyDown);
    return () => el.removeEventListener('keydown', onKeyDown);
  }, [currentTask]);

  const fetchTeamMembers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${(import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3000/api' : '/api'))}/tasks/team/members`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTeamMembers(response.data);
    } catch (error) {
      console.error('Failed to fetch team members:', error);
    }
  };

  if (error) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 safe-area-padding">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-slate-800 border border-red-500/30 text-white rounded-2xl p-6 max-w-md w-full"
        >
          <p className="font-bold mb-4">{error}</p>
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={onClose}
            className="w-full min-h-[48px] bg-red-600 hover:bg-red-700 px-4 py-3 rounded-xl text-white font-bold"
          >
            סגירה
          </motion.button>
        </motion.div>
      </div>
    );
  }

  if (!currentTask) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 safe-area-padding">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-slate-800 rounded-2xl p-6 text-slate-300"
        >
          טוען משימה...
        </motion.div>
      </div>
    );
  }

  const handleComplete = async () => {
    try {
      await completeTask(currentTask.id);
      setSuccessMessage('משימה הושלמה!');
      setTimeout(() => { setSuccessMessage(null); onTaskUpdate?.(); }, 1500);
    } catch (err) {
      console.error('Failed to complete task');
    }
  };

  const handleVerify = async () => {
    try {
      await verifyTask(currentTask.id, comment);
      setComment('');
      setSuccessMessage('אומת!');
      setTimeout(() => { setSuccessMessage(null); onTaskUpdate?.(); }, 1500);
    } catch (err) {
      console.error('Failed to verify task');
    }
  };

  const handleSaveEdit = async () => {
    try {
      await updateTask(currentTask.id, editData);
      setIsEditing(false);
      setEditData(null);
      onTaskUpdate?.();
    } catch (err) {
      console.error('Failed to update task');
    }
  };

  const priorityColors = {
    critical: 'text-red-700 bg-red-50 dark:bg-red-900/30 dark:text-red-200',
    high: 'text-orange-700 bg-orange-50 dark:bg-orange-900/30 dark:text-orange-200',
    medium: 'text-amber-700 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-200',
    low: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-200',
  };

  const statusColors = {
    planned: 'text-gray-600 bg-gray-50',
    assigned: 'text-blue-600 bg-blue-50',
    in_progress: 'text-purple-600 bg-purple-50',
    waiting: 'text-yellow-600 bg-yellow-50',
    completed: 'text-green-600 bg-green-50',
    verified: 'text-emerald-600 bg-emerald-50',
    overdue: 'text-red-600 bg-red-50',
  };

  const backdropTransition = getTransition(reducedMotion, quickTransition);
  const panelTransition = getTransition(reducedMotion, modalTransition);
  const panelY = isMobile ? '100%' : 40;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={backdropTransition}
      className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 overflow-y-auto safe-area-padding"
      onClick={onClose}
    >
      <motion.div
        ref={panelRef}
        initial={{ opacity: 0, y: panelY }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: panelY }}
        transition={panelTransition}
        drag={isMobile ? 'y' : false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.2, bottom: 0.5 }}
        onDragEnd={(_, info) => {
          if (info.offset.y > 80 || info.velocity.y > 300) onClose();
        }}
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-800 rounded-t-2xl sm:rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92dvh] sm:max-h-[90vh] my-0 sm:my-8 flex flex-col border border-teal-500/20 touch-pan-y"
      >
        {successMessage && (
          <div className="mx-4 mt-4 py-3 px-4 bg-emerald-600/20 border border-emerald-500/50 rounded-xl text-emerald-300 font-bold text-center animate-success-pulse">
            {successMessage}
          </div>
        )}
        <div className="p-4 sm:p-6 border-b border-slate-600 flex justify-between items-start shrink-0">
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <input
                type="text"
                value={editData.title}
                onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                className="text-xl sm:text-2xl font-bold w-full border border-slate-600 rounded-xl px-3 py-2 bg-slate-700 text-white"
              />
            ) : (
              <h2 className="text-xl sm:text-2xl font-bold text-white">{currentTask.title}</h2>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-white text-2xl rounded-full shrink-0"
            aria-label="סגור"
          >
            ✕
          </button>
        </div>

        <div className="p-4 sm:p-6 pb-10 sm:pb-12 space-y-6 overflow-y-auto flex-1">
          {/* Status & Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">סטטוס</label>
              {isEditing ? (
                <select
                  value={editData.status}
                  onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-600 rounded-xl bg-slate-700 text-white min-h-[44px]"
                >
                  {['planned', 'assigned', 'in_progress', 'waiting', 'completed'].map((s) => {
                    const labels: Record<string, string> = {
                      planned: 'מתוכנן',
                      assigned: 'הוקצה',
                      in_progress: 'בתהליך',
                      waiting: 'בהמתנה',
                      completed: 'הושלם',
                      verified: 'הושלם'
                    };
                    return <option key={s} value={s}>{labels[s]}</option>;
                  })}
                </select>
              ) : (
                <span className={`inline-block px-4 py-2 rounded-lg font-semibold ${statusColors[currentTask.status as keyof typeof statusColors]}`}>
                  {currentTask.status === 'planned' ? 'מתוכנן' : currentTask.status === 'assigned' ? 'הוקצה' : currentTask.status === 'in_progress' ? 'בתהליך' : currentTask.status === 'waiting' ? 'בהמתנה' : currentTask.status === 'completed' || currentTask.status === 'verified' ? 'הושלם' : currentTask.status}
                </span>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">עדיפות</label>
              {isEditing ? (
                <select
                  value={editData.priority}
                  onChange={(e) => setEditData({ ...editData, priority: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-600 rounded-xl bg-slate-700 text-white min-h-[44px]"
                >
                  {['low', 'medium', 'high', 'critical'].map((p) => {
                    const labels: Record<string, string> = {
                      low: 'נמוך',
                      medium: 'בינוני',
                      high: 'גבוה',
                      critical: 'דחוף ביותר'
                    };
                    return <option key={p} value={p}>{labels[p]}</option>;
                  })}
                </select>
              ) : (
                <span className={`inline-block px-4 py-2 rounded-lg font-semibold ${priorityColors[currentTask.priority as keyof typeof priorityColors]}`}>
                  {currentTask.priority === 'critical' ? 'דחוף ביותר' : currentTask.priority === 'high' ? 'גבוה' : currentTask.priority === 'medium' ? 'בינוני' : 'נמוך'}
                </span>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">תיאור</label>
            {isEditing ? (
              <textarea
                value={editData.description || ''}
                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                className="w-full px-3 py-2 border border-slate-600 rounded-xl bg-slate-700 text-white h-24"
              />
            ) : (
              <p className="text-slate-300 whitespace-pre-wrap">{currentTask.description || 'אין תיאור'}</p>
            )}
          </div>

          {/* Assignment & Due Date */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <label className="font-semibold text-slate-300 block mb-2">הוקצה ל:</label>
              {isEditing ? (
                <select
                  value={editData.assigned_to || ''}
                  onChange={(e) => setEditData({ ...editData, assigned_to: e.target.value ? parseInt(e.target.value) : null })}
                  className="w-full px-3 py-2.5 border border-slate-600 rounded-xl bg-slate-700 text-white min-h-[44px]"
                >
                  <option value="">לא הוקצה</option>
                  {teamMembers.map((member) => (
                    <option key={member.id} value={member.id}>{member.name}</option>
                  ))}
                </select>
              ) : (
                <p className="text-slate-400">{currentTask.assigned_to_name || 'לא הוקצה'}</p>
              )}
            </div>
            <div>
              <label className="font-semibold text-slate-300 block mb-2">תאריך יעד:</label>
              {isEditing ? (
                <input
                  type="date"
                  value={editData.due_date ? editData.due_date.split('T')[0] : ''}
                  onChange={(e) => setEditData({ ...editData, due_date: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-600 rounded-xl bg-slate-700 text-white min-h-[44px]"
                />
              ) : (
                <p className="text-slate-400">
                  {currentTask.due_date ? new Date(currentTask.due_date).toLocaleDateString('he-IL') : 'אין תאריך יעד'}
                </p>
              )}
            </div>
          </div>

          {/* Checklists */}
          {currentTask.checklists && currentTask.checklists.length > 0 && (
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-3">רשימת בדיקה</label>
              <div className="space-y-2">
                {currentTask.checklists.map((item: any) => (
                  <label key={item.id} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={item.completed}
                      readOnly
                      className="w-5 h-5"
                    />
                    <span className={item.completed ? 'line-through text-slate-500' : 'text-slate-300'}>
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
              <label className="block text-sm font-semibold text-slate-300 mb-3">הערות</label>
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {currentTask.comments.map((c: any) => (
                  <div key={c.id} className="bg-slate-700/50 p-3 rounded-xl">
                    <p className="font-semibold text-sm text-white">{c.user_name}</p>
                    <p className="text-slate-300 text-sm mt-1">{c.content}</p>
                    <p className="text-xs text-slate-500 mt-1">{new Date(c.created_at).toLocaleString('he-IL')}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add comment for verification */}
          {user?.role === 'manager' && currentTask.status === 'completed' && (
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">הערת אימות</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="הוסף משוב לפני אימות..."
                className="w-full px-3 py-2 border border-slate-600 rounded-xl bg-slate-700 text-white h-20"
              />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-4 sm:p-6 pt-5 border-t border-slate-600 flex gap-3 justify-end flex-wrap pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:pb-6">
          {isEditing ? (
            <>
              <motion.button
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsEditing(false)}
                className="min-h-[48px] px-4 py-3 bg-slate-600 text-white rounded-xl hover:bg-slate-500 transition"
              >
                ביטול
              </motion.button>
              <motion.button
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={handleSaveEdit}
                className="min-h-[48px] px-4 py-3 bg-teal-500 text-white rounded-xl hover:bg-teal-400 transition"
              >
                שמירת שינויים
              </motion.button>
            </>
          ) : (
            <>
              {(user?.role !== 'staff' || user?.id === currentTask.assigned_to) && (
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setIsEditing(true);
                    setEditData({
                      title: currentTask.title,
                      description: currentTask.description,
                      status: currentTask.status,
                      priority: currentTask.priority,
                      assigned_to: currentTask.assigned_to,
                      due_date: currentTask.due_date
                    });
                  }}
                  className="min-h-[48px] px-4 py-3 bg-teal-500 text-white rounded-xl hover:bg-teal-400 transition"
                >
                  עריכה
                </motion.button>
              )}
              {user?.id === currentTask.assigned_to && currentTask.status === 'assigned' && (
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  onClick={handleComplete}
                  className="min-h-[48px] px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-500 transition"
                >
                  סימון כמושלם
                </motion.button>
              )}
              {user?.role === 'manager' && currentTask.status === 'completed' && (
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  onClick={handleVerify}
                  className="min-h-[48px] px-4 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 transition"
                >
                  ✓ אימות
                </motion.button>
              )}
            </>
          )}
          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={onClose}
            className="min-h-[48px] px-4 py-3 bg-slate-600 text-white rounded-xl hover:bg-slate-500 transition"
          >
            סגירה
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
