import { useState, useEffect } from 'react';
import { useTaskStore, useTagStore, useAuthStore } from '../store';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export default function CreateTaskModal({ onClose, onTaskCreated }: any) {
  const { user, token } = useAuthStore();
  const { createTask, fetchTasks } = useTaskStore();
  const { tags, fetchTags } = useTagStore();
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

  useEffect(() => {
    if (user?.restaurant_id) {
      fetchTags(user.restaurant_id);
      fetchTeamMembers();
    }
  }, [user?.restaurant_id, fetchTags]);

  const fetchTeamMembers = async () => {
    try {
      const response = await axios.get(`${API_BASE}/tasks/team/members`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTeamMembers(response.data);
    } catch (error) {
      console.error('שגיאה בטעינת חברי צוות:', error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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
      onTaskCreated();
    } catch (err: any) {
      setError(err.response?.data?.error || 'שגיאה ביצירת משימה');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-end justify-center z-50">
      <div className="bg-slate-800 w-full max-w-lg rounded-t-2xl max-h-[90vh] overflow-hidden animate-slideUp">
        {/* Header */}
        <div className="p-4 border-b border-slate-700 flex items-center justify-between sticky top-0 bg-slate-800">
          <h2 className="text-lg font-bold text-white">משימה חדשה</h2>
          <button onClick={onClose} className="text-slate-400 text-2xl p-1">✕</button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto max-h-[calc(90vh-60px)]">
          {/* Title */}
          <div>
            <label className="block text-sm font-bold text-teal-400 mb-2">כותרת *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="שם המשימה"
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-bold text-teal-400 mb-2">תיאור</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="פרטים נוספים..."
              rows={3}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none resize-none"
            />
          </div>

          {/* Assign To */}
          <div>
            <label className="block text-sm font-bold text-teal-400 mb-2">הקצה לעובד</label>
            <select
              name="assigned_to"
              value={formData.assigned_to}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white focus:border-teal-500 focus:outline-none"
            >
              <option value="">בחר עובד...</option>
              {teamMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-bold text-teal-400 mb-2">עדיפות</label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { value: 'low', label: 'נמוך', color: 'bg-teal-600' },
                { value: 'medium', label: 'בינוני', color: 'bg-teal-500' },
                { value: 'high', label: 'גבוה', color: 'bg-orange-400' },
                { value: 'critical', label: 'דחוף', color: 'bg-orange-500' },
              ].map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, priority: p.value }))}
                  className={`py-2 rounded-lg text-sm font-bold text-white transition-all ${
                    formData.priority === p.value ? p.color : 'bg-slate-700'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Recurrence */}
          <div>
            <label className="block text-sm font-bold text-teal-400 mb-2">חזרה</label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { value: 'once', label: 'פעם' },
                { value: 'daily', label: 'יומי' },
                { value: 'weekly', label: 'שבועי' },
                { value: 'monthly', label: 'חודשי' },
              ].map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, recurrence: r.value }))}
                  className={`py-2 rounded-lg text-sm font-bold transition-all ${
                    formData.recurrence === r.value ? 'bg-teal-600 text-white' : 'bg-slate-700 text-slate-400'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-sm font-bold text-teal-400 mb-2">תאריך יעד</label>
            <input
              type="datetime-local"
              name="due_date"
              value={formData.due_date}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white focus:border-teal-500 focus:outline-none"
              dir="ltr"
            />
          </div>

          {/* Estimated Time */}
          <div>
            <label className="block text-sm font-bold text-teal-400 mb-2">זמן מוערך לביצוע</label>
            <div className="relative">
              <input
                type="number"
                name="estimated_time"
                value={formData.estimated_time}
                onChange={handleChange}
                placeholder="30"
                min="1"
                className="w-full px-4 py-3 pl-16 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none"
                dir="ltr"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">דקות</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">כמה זמן המשימה אמורה לקחת?</p>
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
                    onClick={() => handleTagToggle(tag.id)}
                    className={`px-3 py-2 rounded-lg text-sm font-bold text-white transition-all ${
                      formData.tags.includes(tag.id) ? 'ring-2 ring-white' : 'opacity-60'
                    }`}
                    style={{ backgroundColor: tag.color }}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 bg-orange-500/20 border border-orange-500 rounded-xl text-orange-400 text-sm">
              {error}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-2 pb-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-slate-700 text-slate-300 rounded-xl font-bold"
            >
              ביטול
            </button>
            <button
              type="submit"
              disabled={loading || !formData.title}
              className="flex-1 py-3 bg-teal-600 text-white rounded-xl font-bold disabled:opacity-50"
            >
              {loading ? 'יוצר...' : 'יצירה'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
