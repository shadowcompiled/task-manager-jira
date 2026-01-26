import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface Status {
  id: number;
  name: string;
  display_name: string;
  color: string;
  order_index: number;
}

// Predefined colors for statuses
const colorOptions = [
  { name: 'אפור', color: '#64748b' },
  { name: 'כחול', color: '#3b82f6' },
  { name: 'סגול', color: '#8b5cf6' },
  { name: 'ירוק', color: '#10b981' },
  { name: 'טורקיז', color: '#14b8a6' },
  { name: 'כתום', color: '#f97316' },
  { name: 'אדום', color: '#ef4444' },
  { name: 'צהוב', color: '#eab308' },
];

interface StatusManagerProps {
  onClose: () => void;
  restaurantId: number;
  onStatusesChanged: () => void;
}

export default function StatusManager({ onClose, restaurantId, onStatusesChanged }: StatusManagerProps) {
  const { user, token } = useAuthStore();
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [loading, setLoading] = useState(false);
  const [newStatus, setNewStatus] = useState({
    name: '',
    displayName: '',
    color: colorOptions[0].color,
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchStatuses();
  }, []);

  const fetchStatuses = async () => {
    try {
      const response = await axios.get(`${API_BASE}/statuses/restaurant/${restaurantId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStatuses(response.data);
    } catch (err: any) {
      setError('שגיאה בטעינת סטטוסים');
    }
  };

  const handleAddStatus = async () => {
    if (!newStatus.displayName) {
      setError('יש להזין שם לסטטוס');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await axios.post(
        `${API_BASE}/statuses`,
        {
          restaurantId,
          name: newStatus.displayName.toLowerCase().replace(/\s+/g, '_').replace(/[^\w]/g, ''),
          displayName: newStatus.displayName,
          color: newStatus.color,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNewStatus({ name: '', displayName: '', color: colorOptions[0].color });
      setSuccess('סטטוס נוצר בהצלחה');
      await fetchStatuses();
      onStatusesChanged();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'שגיאה ביצירת סטטוס');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStatus = async (id: number) => {
    if (!confirm('האם למחוק את הסטטוס?')) return;

    try {
      setLoading(true);
      await axios.delete(`${API_BASE}/statuses/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuccess('הסטטוס נמחק');
      await fetchStatuses();
      onStatusesChanged();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'שגיאה במחיקת סטטוס');
    } finally {
      setLoading(false);
    }
  };

  if (user?.role !== 'admin' && user?.role !== 'maintainer') {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-end justify-center z-50">
        <div className="bg-slate-800 w-full rounded-t-2xl p-6 text-center">
          <p className="text-slate-400 mb-4">רק מנהלים יכולים לנהל סטטוסים</p>
          <button onClick={onClose} className="w-full py-3 bg-slate-700 text-white rounded-xl font-bold">
            סגירה
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-end justify-center z-50">
      <div className="bg-slate-800 w-full max-h-[90vh] rounded-t-2xl overflow-hidden animate-slideUp">
        {/* Header */}
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">ניהול סטטוסים</h2>
          <button onClick={onClose} className="text-slate-400 text-2xl">✕</button>
        </div>

        <div className="p-4 space-y-6 overflow-y-auto max-h-[calc(90vh-60px)]">
          {/* Add New Status */}
          <div className="bg-slate-700 rounded-xl p-4">
            <h3 className="text-sm font-bold text-teal-400 mb-4">סטטוס חדש</h3>
            <div className="space-y-4">
              <input
                type="text"
                value={newStatus.displayName}
                onChange={(e) => setNewStatus({ ...newStatus, displayName: e.target.value })}
                placeholder="שם הסטטוס (בעברית)"
                className="w-full px-4 py-3 bg-slate-600 border border-slate-500 rounded-xl text-white placeholder-slate-400"
              />

              {/* Color Selection */}
              <div>
                <label className="block text-sm text-slate-400 mb-2">צבע</label>
                <div className="grid grid-cols-4 gap-2">
                  {colorOptions.map((c) => (
                    <button
                      key={c.color}
                      type="button"
                      onClick={() => setNewStatus({ ...newStatus, color: c.color })}
                      className={`h-10 rounded-lg transition-all ${
                        newStatus.color === c.color ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-700' : ''
                      }`}
                      style={{ backgroundColor: c.color }}
                    />
                  ))}
                </div>
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
                onClick={handleAddStatus}
                disabled={loading}
                className="w-full py-3 bg-teal-600 text-white rounded-xl font-bold disabled:opacity-50"
              >
                {loading ? 'יוצר...' : 'הוספת סטטוס'}
              </button>
            </div>
          </div>

          {/* Current Statuses */}
          <div>
            <h3 className="text-sm font-bold text-slate-400 mb-3">סטטוסים קיימים ({statuses.length})</h3>
            <div className="space-y-2">
              {statuses.map((status) => (
                <div
                  key={status.id}
                  className="flex items-center justify-between p-3 bg-slate-700 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: status.color }}
                    />
                    <div>
                      <p className="font-bold text-white">{status.display_name}</p>
                      <p className="text-xs text-slate-500">{status.name}</p>
                    </div>
                  </div>
                  {/* Don't allow deleting core statuses */}
                  {!['planned', 'assigned', 'completed', 'verified'].includes(status.name) && (
                    <button
                      onClick={() => handleDeleteStatus(status.id)}
                      disabled={loading}
                      className="px-3 py-1 bg-orange-500/20 text-orange-400 rounded-lg text-sm font-bold disabled:opacity-50"
                    >
                      מחיקה
                    </button>
                  )}
                </div>
              ))}
            </div>
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
