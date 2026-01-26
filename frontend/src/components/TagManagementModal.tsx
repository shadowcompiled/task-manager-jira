import { useState, useEffect } from 'react';
import { useTagStore, useAuthStore } from '../store';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Predefined color options for tags
const colorOptions = [
  { name: 'ירוק', color: '#10b981' },
  { name: 'כחול', color: '#3b82f6' },
  { name: 'סגול', color: '#8b5cf6' },
  { name: 'כתום', color: '#f97316' },
  { name: 'אדום', color: '#ef4444' },
  { name: 'ורוד', color: '#ec4899' },
  { name: 'טורקיז', color: '#14b8a6' },
  { name: 'צהוב', color: '#eab308' },
];

export default function TagManagementModal({ onClose }: any) {
  const { user, token } = useAuthStore();
  const { tags, fetchTags } = useTagStore();
  const [newTagName, setNewTagName] = useState('');
  const [selectedColor, setSelectedColor] = useState(colorOptions[0].color);
  const [selectedColor2, setSelectedColor2] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (user?.restaurant_id) {
      fetchTags(user.restaurant_id);
    }
  }, [user?.restaurant_id, fetchTags]);

  const handleAddTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) {
      setError('יש להזין שם לתגית');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await axios.post(
        `${API_BASE}/tags`,
        {
          restaurantId: user?.restaurant_id,
          name: newTagName.trim(),
          color: selectedColor,
          color2: selectedColor2 || null,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccess('תגית נוצרה בהצלחה');
      setNewTagName('');
      setSelectedColor(colorOptions[0].color);
      setSelectedColor2('');
      
      if (user?.restaurant_id) {
        fetchTags(user.restaurant_id);
      }

      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'שגיאה ביצירת תגית');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTag = async (tagId: number) => {
    if (!window.confirm('האם למחוק את התגית?')) return;

    try {
      await axios.delete(`${API_BASE}/tags/${tagId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setSuccess('התגית נמחקה');
      
      if (user?.restaurant_id) {
        fetchTags(user.restaurant_id);
      }

      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'שגיאה במחיקת תגית');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-end justify-center z-50">
      <div className="bg-slate-800 w-full max-h-[90vh] rounded-t-2xl overflow-hidden animate-slideUp">
        {/* Header */}
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">ניהול תגיות</h2>
          <button onClick={onClose} className="text-slate-400 text-2xl">✕</button>
        </div>

        <div className="p-4 space-y-6 overflow-y-auto max-h-[calc(90vh-60px)]">
          {/* Add New Tag Form */}
          <div className="bg-slate-700 rounded-xl p-4">
            <h3 className="text-sm font-bold text-teal-400 mb-4">תגית חדשה</h3>
            <form onSubmit={handleAddTag} className="space-y-4">
              <input
                type="text"
                placeholder="שם התגית"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                className="w-full px-4 py-3 bg-slate-600 border border-slate-500 rounded-xl text-white placeholder-slate-400"
              />

              {/* Primary Color */}
              <div>
                <label className="block text-sm text-slate-400 mb-2">צבע ראשי</label>
                <div className="grid grid-cols-4 gap-2">
                  {colorOptions.map((c) => (
                    <button
                      key={c.color}
                      type="button"
                      onClick={() => setSelectedColor(c.color)}
                      className={`h-10 rounded-lg transition-all ${
                        selectedColor === c.color ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-700' : ''
                      }`}
                      style={{ backgroundColor: c.color }}
                    />
                  ))}
                </div>
              </div>

              {/* Secondary Color (for gradient) */}
              <div>
                <label className="block text-sm text-slate-400 mb-2">צבע שני (אופציונלי - ליצירת גרדיאנט)</label>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedColor2('')}
                    className={`h-10 rounded-lg border-2 border-dashed border-slate-500 text-slate-500 text-xs ${
                      !selectedColor2 ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-700' : ''
                    }`}
                  >
                    ללא
                  </button>
                  {colorOptions.map((c) => (
                    <button
                      key={c.color + '2'}
                      type="button"
                      onClick={() => setSelectedColor2(c.color)}
                      className={`h-10 rounded-lg transition-all ${
                        selectedColor2 === c.color ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-700' : ''
                      }`}
                      style={{ backgroundColor: c.color }}
                    />
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div>
                <label className="block text-sm text-slate-400 mb-2">תצוגה מקדימה</label>
                <span
                  className="inline-block px-4 py-2 rounded-lg text-white font-bold"
                  style={{
                    background: selectedColor2
                      ? `linear-gradient(135deg, ${selectedColor} 0%, ${selectedColor2} 100%)`
                      : selectedColor,
                  }}
                >
                  {newTagName || 'שם התגית'}
                </span>
              </div>

              {error && (
                <div className="p-3 bg-orange-500/20 border border-orange-500 rounded-xl text-orange-400 text-sm">
                  {error}
                </div>
              )}

              {success && (
                <div className="p-3 bg-teal-500/20 border border-teal-500 rounded-xl text-teal-400 text-sm">
                  {success}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-teal-600 text-white rounded-xl font-bold disabled:opacity-50"
              >
                {loading ? 'יוצר...' : 'יצירת תגית'}
              </button>
            </form>
          </div>

          {/* Existing Tags */}
          <div>
            <h3 className="text-sm font-bold text-slate-400 mb-3">תגיות קיימות ({tags.length})</h3>
            {tags.length === 0 ? (
              <div className="bg-slate-700 rounded-xl p-6 text-center">
                <p className="text-slate-500">אין תגיות עדיין</p>
              </div>
            ) : (
              <div className="space-y-2">
                {tags.map((tag) => (
                  <div
                    key={tag.id}
                    className="flex items-center justify-between p-3 bg-slate-700 rounded-xl"
                  >
                    <span
                      className="px-3 py-1 rounded-lg text-white font-bold text-sm"
                      style={{
                        background: tag.color2
                          ? `linear-gradient(135deg, ${tag.color} 0%, ${tag.color2} 100%)`
                          : tag.color,
                      }}
                    >
                      {tag.name}
                    </span>
                    <button
                      onClick={() => handleDeleteTag(tag.id)}
                      className="px-3 py-1 bg-orange-500/20 text-orange-400 rounded-lg text-sm font-bold"
                    >
                      מחיקה
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700">
          <button
            onClick={onClose}
            className="w-full py-3 bg-slate-700 text-slate-300 rounded-xl font-bold"
          >
            סגירה
          </button>
        </div>
      </div>
    </div>
  );
}
