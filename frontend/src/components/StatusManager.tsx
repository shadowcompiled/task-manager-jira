import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store';

interface Status {
  id: number;
  name: string;
  display_name: string;
  color: string;
  order_index: number;
}

interface StatusManagerProps {
  onClose: () => void;
  restaurantId: number;
  onStatusesChanged: () => void;
}

export default function StatusManager({ onClose, restaurantId, onStatusesChanged }: StatusManagerProps) {
  const { user } = useAuthStore();
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [loading, setLoading] = useState(false);
  const [newStatus, setNewStatus] = useState({
    name: '',
    displayName: '',
    color: '#808080',
  });
  const [error, setError] = useState('');
  const [deleteError, setDeleteError] = useState<{ id: number; message: string } | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ name: '', displayName: '', color: '#808080' });

  const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3000/api' : '/api');

  useEffect(() => {
    fetchStatuses();
  }, []);

  const fetchStatuses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE}/statuses/restaurant/${restaurantId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStatuses(response.data);
    } catch (err: any) {
      setError('טעינת הסטטוסים נכשלה');
    }
  };

  const handleAddStatus = async () => {
    if (!newStatus.name || !newStatus.displayName) {
      setError('שם ותווית נדרשים');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await axios.post(
        `${API_BASE}/statuses`,
        {
          restaurantId,
          name: newStatus.name.toLowerCase().replace(/\s+/g, '_'),
          displayName: newStatus.displayName,
          color: newStatus.color,
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }
      );
      setNewStatus({ name: '', displayName: '', color: '#808080' });
      await fetchStatuses();
      onStatusesChanged();
    } catch (err: any) {
      setError(err.response?.data?.error || 'יצירת הסטטוס נכשלה');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (status: Status) => {
    setEditingId(status.id);
    setEditForm({ name: status.name, displayName: status.display_name, color: status.color });
    setError('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ name: '', displayName: '', color: '#808080' });
  };

  const handleUpdateStatus = async () => {
    if (editingId == null || !editForm.displayName.trim()) {
      setError('תווית נדרשת');
      return;
    }
    try {
      setLoading(true);
      setError('');
      await axios.put(
        `${API_BASE}/statuses/${editingId}`,
        {
          displayName: editForm.displayName.trim(),
          color: editForm.color,
          ...(editForm.name.trim() ? { name: editForm.name.trim().toLowerCase().replace(/\s+/g, '_') } : {}),
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      await fetchStatuses();
      onStatusesChanged();
      cancelEdit();
    } catch (err: any) {
      setError(err.response?.data?.error || 'עדכון הסטטוס נכשל');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStatus = async (id: number) => {
    if (!confirm('למחוק את הסטטוס הזה?')) return;

    try {
      setLoading(true);
      setDeleteError(null);
      await axios.delete(`${API_BASE}/statuses/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      await fetchStatuses();
      onStatusesChanged();
    } catch (err: any) {
      const message = err.response?.data?.error || 'מחיקת הסטטוס נכשלה';
      setDeleteError({ id, message });
    } finally {
      setLoading(false);
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 safe-area-padding">
        <div className="bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 text-center border border-slate-600">
          <p className="text-slate-200">רק מנהלי מערכת יכולים לנהל סטטוסים</p>
          <button
            onClick={onClose}
            className="mt-4 min-h-[48px] px-4 py-3 bg-slate-600 text-white rounded-xl hover:bg-slate-500 transition font-semibold"
          >
            סגור
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 safe-area-padding">
      <div className="bg-slate-800 rounded-t-2xl sm:rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92dvh] sm:max-h-[90vh] flex flex-col border border-slate-600 sm:border-teal-500/30">
        <div className="p-4 sm:p-6 border-b border-slate-600 flex justify-between items-center shrink-0">
          <h2 className="text-xl font-bold text-white">⚙️ ניהול סטטוסים</h2>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-white rounded-full text-xl"
            aria-label="סגור"
          >
            ✕
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-6 overflow-y-auto flex-1">
          {/* Add New Status */}
          <div className="border border-slate-600 rounded-xl p-4 bg-slate-700/50">
            <h3 className="font-semibold text-white mb-4">הוסף סטטוס חדש</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-1">שם סטטוס (עברית)</label>
                <input
                  type="text"
                  value={newStatus.name}
                  onChange={(e) => setNewStatus({ ...newStatus, name: e.target.value })}
                  placeholder="למשל, בהמתנה"
                  className="w-full px-3 py-3 border border-slate-600 rounded-xl bg-slate-700 text-white placeholder-slate-500 focus:ring-2 focus:ring-teal-500 focus:outline-none min-h-[44px]"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-1">תווית (עברית)</label>
                <input
                  type="text"
                  value={newStatus.displayName}
                  onChange={(e) => setNewStatus({ ...newStatus, displayName: e.target.value })}
                  placeholder="למשל, בהמתנה"
                  className="w-full px-3 py-3 border border-slate-600 rounded-xl bg-slate-700 text-white placeholder-slate-500 focus:ring-2 focus:ring-teal-500 focus:outline-none min-h-[44px]"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-1">צבע</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={newStatus.color}
                    onChange={(e) => setNewStatus({ ...newStatus, color: e.target.value })}
                    className="w-12 h-10 border border-slate-600 rounded-xl cursor-pointer bg-slate-700"
                  />
                  <input
                    type="text"
                    value={newStatus.color}
                    onChange={(e) => setNewStatus({ ...newStatus, color: e.target.value })}
                    className="flex-1 px-3 py-3 border border-slate-600 rounded-xl bg-slate-700 text-white text-sm min-h-[44px] focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>
              {error && (
                <div className="bg-red-500/20 text-red-300 p-3 rounded-xl text-sm border border-red-500/30">
                  {error}
                </div>
              )}
              <button
                onClick={handleAddStatus}
                disabled={loading}
                className="w-full min-h-[48px] px-4 py-3 bg-teal-600 text-white rounded-xl hover:bg-teal-500 disabled:opacity-50 font-semibold transition"
              >
                {loading ? 'הוספה...' : 'הוסף סטטוס'}
              </button>
            </div>
          </div>

          {/* Current Statuses - admins can edit and delete ALL statuses */}
          <div>
            <h3 className="font-semibold text-white mb-4">סטטוסים קיימים</h3>
            <div className="space-y-2">
              {statuses.map((status) => (
                <div
                  key={status.id}
                  className="p-4 border border-slate-600 rounded-xl bg-slate-700/50 transition"
                >
                  {editingId === status.id ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1">שם פנימי (אנגלית)</label>
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                          placeholder="למשל in_progress"
                          className="w-full px-3 py-2.5 border border-slate-600 rounded-xl bg-slate-700 text-white text-sm min-h-[44px] focus:ring-2 focus:ring-teal-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1">תווית (עברית)</label>
                        <input
                          type="text"
                          value={editForm.displayName}
                          onChange={(e) => setEditForm((f) => ({ ...f, displayName: e.target.value }))}
                          className="w-full px-3 py-2.5 border border-slate-600 rounded-xl bg-slate-700 text-white text-sm min-h-[44px] focus:ring-2 focus:ring-teal-500 focus:outline-none"
                        />
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <label className="text-xs font-semibold text-slate-400">צבע</label>
                        <input
                          type="color"
                          value={editForm.color}
                          onChange={(e) => setEditForm((f) => ({ ...f, color: e.target.value }))}
                          className="w-10 h-9 rounded-lg border border-slate-600 cursor-pointer bg-slate-700"
                        />
                        <input
                          type="text"
                          value={editForm.color}
                          onChange={(e) => setEditForm((f) => ({ ...f, color: e.target.value }))}
                          className="flex-1 min-w-0 px-2 py-2 border border-slate-600 rounded-xl bg-slate-700 text-white text-sm min-h-[40px] focus:ring-2 focus:ring-teal-500 focus:outline-none"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleUpdateStatus}
                          disabled={loading}
                          className="min-h-[44px] px-4 py-2 bg-teal-600 text-white rounded-xl text-sm font-medium disabled:opacity-50 hover:bg-teal-500"
                        >
                          {loading ? 'שומר...' : 'שמור'}
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="min-h-[44px] px-4 py-2 bg-slate-600 text-white rounded-xl text-sm font-medium hover:bg-slate-500"
                        >
                          ביטול
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="w-6 h-6 rounded border-2 border-slate-500 shrink-0"
                            style={{ backgroundColor: status.color }}
                          />
                          <div className="min-w-0">
                            <p className="font-semibold text-white truncate">{status.display_name}</p>
                            <p className="text-xs text-slate-400 truncate">{status.name}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => startEdit(status)}
                            disabled={loading}
                            className="min-h-[44px] px-3 py-2 bg-teal-600/80 text-white hover:bg-teal-500 rounded-xl text-sm font-medium disabled:opacity-50 transition"
                          >
                            עריכה
                          </button>
                          <button
                            onClick={() => handleDeleteStatus(status.id)}
                            disabled={loading}
                            className="min-h-[44px] px-3 py-2 bg-red-600/80 text-white hover:bg-red-500 rounded-xl text-sm font-medium disabled:opacity-50 transition"
                          >
                            מחק
                          </button>
                        </div>
                      </div>
                      {deleteError?.id === status.id && (
                        <div className="mt-2 bg-red-500/20 text-red-300 p-2.5 rounded-xl text-sm border border-red-500/30">
                          {deleteError.message}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 border-t border-slate-600 flex gap-3 justify-end pb-[env(safe-area-inset-bottom)] sm:pb-6">
          <button
            onClick={onClose}
            className="min-h-[48px] px-4 py-3 bg-slate-600 text-white rounded-xl hover:bg-slate-500 transition font-semibold"
          >
            סגור
          </button>
        </div>
      </div>
    </div>
  );
}
