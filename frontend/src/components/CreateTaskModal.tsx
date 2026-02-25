import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useTaskStore, useTagStore, useAuthStore } from '../store';
import axios from 'axios';
import { modalTransition, quickTransition, getTransition, useReducedMotion, useIsMobile } from '../utils/motion';
import { useToast } from '../contexts/ToastContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export default function CreateTaskModal({ onClose, onTaskCreated }: any) {
  const { user, token } = useAuthStore();
  const { createTask, fetchTasks } = useTaskStore();
  const { tags, fetchTags } = useTagStore();
  const panelRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const isMobile = useIsMobile();
  const toast = useToast();
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assigned_to: '',
    priority: 'medium',
    due_date: '',
    estimated_time: '',
    recurrence: 'once',
    tags: [] as number[],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const orgId = user?.organization_id ?? user?.restaurant_id;
    if (orgId) {
      fetchTags(orgId);
      fetchTeamMembers();
    }
  }, [user?.organization_id, user?.restaurant_id, fetchTags]);

  // Focus trap: focus first input when modal opens
  useEffect(() => {
    if (!panelRef.current) return;
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
  }, []);

  const fetchTeamMembers = async () => {
    try {
      const response = await axios.get(`${API_BASE}/tasks/team/members`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTeamMembers(response.data);
    } catch (error) {
      console.error('Failed to fetch team members:', error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleTagToggle = (tagId: number) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.includes(tagId)
        ? prev.tags.filter((id) => id !== tagId)
        : [...prev.tags, tagId],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await createTask({
        ...formData,
        priority: formData.priority as 'low' | 'medium' | 'high' | 'critical',
        recurrence: formData.recurrence as 'once' | 'daily' | 'weekly' | 'monthly',
        assigned_to: formData.assigned_to ? parseInt(formData.assigned_to) : undefined,
        estimated_time: formData.estimated_time ? parseInt(formData.estimated_time) : undefined,
      });
      await fetchTasks();
      setSuccess(true);
      setTimeout(() => onTaskCreated(), 600);
    } catch (err: any) {
      const msg = err.response?.data?.error || 'יצירת המשימה נכשלה';
      setError(msg);
      toast?.showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
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
      className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 safe-area-padding"
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
        className="bg-slate-800 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-md max-h-[92dvh] sm:max-h-[90vh] flex flex-col border border-teal-500/20 touch-pan-y"
      >
          <div className="p-4 sm:p-6 border-b border-slate-600 flex justify-between items-center shrink-0">
            <h2 className={`text-xl font-bold ${success ? 'text-teal-400 animate-success-pulse' : 'text-white'}`}>
              {success ? '✓ הצלחה!' : '➕ יצירת משימה'}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-white text-xl rounded-full"
              aria-label="סגור"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-4 sm:p-6 pb-10 sm:pb-12 space-y-4 overflow-y-auto flex-1">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-1">כותרת משימה *</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="למשל, ניקוי תחנות המטבח"
                className="w-full px-4 py-3 border border-slate-600 rounded-xl bg-slate-700/50 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-1">תיאור</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="הוראות שלב אחר שלב..."
                rows={3}
                className="w-full px-4 py-3 border border-slate-600 rounded-xl bg-slate-700/50 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-1">הקצה אל</label>
                <select
                  name="assigned_to"
                  value={formData.assigned_to}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-slate-600 rounded-xl bg-slate-700/50 text-white focus:outline-none focus:ring-2 focus:ring-teal-500 min-h-[44px]"
                >
                  <option value="">בחר עובד...</option>
                {teamMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name} ({member.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-1">עדיפות</label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-slate-600 rounded-xl bg-slate-700/50 text-white focus:outline-none focus:ring-2 focus:ring-teal-500 min-h-[44px]"
              >
                <option value="low">נמוך</option>
                <option value="medium">בינוני</option>
                <option value="high">גבוה</option>
                <option value="critical">דחוף ביותר</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-1">חזרה על</label>
              <select
                name="recurrence"
                value={formData.recurrence}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-slate-600 rounded-xl bg-slate-700/50 text-white focus:outline-none focus:ring-2 focus:ring-teal-500 min-h-[44px]"
              >
                <option value="once">פעם אחת</option>
                <option value="daily">יומי</option>
                <option value="weekly">שבועי</option>
                <option value="monthly">חודשי</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-1">זמן משוער (דק')</label>
              <input
                type="number"
                name="estimated_time"
                value={formData.estimated_time}
                onChange={handleChange}
                placeholder="15"
                min="1"
                className="w-full px-4 py-3 border border-slate-600 rounded-xl bg-slate-700/50 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 min-h-[44px]"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-1">תאריך יעד</label>
            <input
              type="datetime-local"
              name="due_date"
              value={formData.due_date}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-slate-600 rounded-xl bg-slate-700/50 text-white focus:outline-none focus:ring-2 focus:ring-teal-500 min-h-[44px]"
            />
          </div>

          {tags.length > 0 && (
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">תגיות</label>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => handleTagToggle(tag.id)}
                    className={`min-h-[40px] px-3 py-2 rounded-full text-sm font-medium transition ${
                      formData.tags.includes(tag.id)
                        ? 'ring-2 ring-teal-400 ring-offset-2 ring-offset-slate-800 opacity-100'
                        : 'opacity-60 hover:opacity-80'
                    }`}
                    style={{
                      backgroundColor: tag.color,
                      color: '#fff',
                    }}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-500/20 text-red-300 p-3 rounded-xl text-sm border border-red-500/30">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:pb-0">
            <motion.button
              type="button"
              onClick={onClose}
              whileTap={{ scale: 0.98 }}
              className="flex-1 min-h-[48px] px-4 py-3 bg-slate-600 text-white rounded-xl hover:bg-slate-500 font-semibold transition"
            >
              ביטול
            </motion.button>
            <motion.button
              type="submit"
              disabled={loading || !formData.title}
              whileTap={{ scale: loading || !formData.title ? 1 : 0.98 }}
              className="flex-1 min-h-[48px] px-4 py-3 bg-teal-500 text-white rounded-xl hover:bg-teal-400 disabled:opacity-50 font-semibold transition"
            >
              {loading ? 'יוצר...' : 'יצירה'}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
