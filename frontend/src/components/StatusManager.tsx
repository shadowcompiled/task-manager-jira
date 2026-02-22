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
      setError('Failed to load statuses');
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
      setError(err.response?.data?.error || 'Failed to create status');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStatus = async (id: number) => {
    if (!confirm('Are you sure you want to delete this status?')) return;

    try {
      setLoading(true);
      await axios.delete(`${API_BASE}/statuses/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      await fetchStatuses();
      onStatusesChanged();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete status');
    } finally {
      setLoading(false);
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6 text-center">
          <p className="text-gray-700">רק מנהלי מערכת יכולים לנהל סטטוסים</p>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition"
          >
            סגור
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full my-8">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">⚙️ ניהול סטטוסים</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-96 overflow-y-auto">
          {/* Add New Status */}
          <div className="border rounded-lg p-4 bg-blue-50">
            <h3 className="font-semibold text-gray-800 mb-4">הוסף סטטוס חדש</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  שם סטטוס (עברית)
                </label>
                <input
                  type="text"
                  value={newStatus.name}
                  onChange={(e) => setNewStatus({ ...newStatus, name: e.target.value })}
                  placeholder="למשל, בהמתנה"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  תווית (עברית)
                </label>
                <input
                  type="text"
                  value={newStatus.displayName}
                  onChange={(e) => setNewStatus({ ...newStatus, displayName: e.target.value })}
                  placeholder="למשל, בהמתנה"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">צבע</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={newStatus.color}
                    onChange={(e) => setNewStatus({ ...newStatus, color: e.target.value })}
                    className="w-16 h-10 border border-gray-300 rounded-lg cursor-pointer"
                  />
                  <input
                    type="text"
                    value={newStatus.color}
                    onChange={(e) => setNewStatus({ ...newStatus, color: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
              </div>
              {error && (
                <div className="bg-red-100 text-red-700 p-3 rounded-lg text-sm">
                  {error}
                </div>
              )}
              <button
                onClick={handleAddStatus}
                disabled={loading}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-semibold transition"
              >
                {loading ? 'הוספה...' : 'הוסף סטטוס'}
              </button>
            </div>
          </div>

          {/* Current Statuses */}
          <div>
            <h3 className="font-semibold text-gray-800 mb-4">סטטוסים קיימים</h3>
            <div className="space-y-2">
              {statuses.map((status) => (
                <div
                  key={status.id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-gray-50 hover:bg-gray-100 transition"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-6 h-6 rounded border-2 border-gray-300"
                      style={{ backgroundColor: status.color }}
                    />
                    <div>
                      <p className="font-semibold text-gray-800">{status.display_name}</p>
                      <p className="text-xs text-gray-500">{status.name}</p>
                    </div>
                  </div>
                  {!status.name.includes('planned') && !status.name.includes('assigned') && (
                    <button
                      onClick={() => handleDeleteStatus(status.id)}
                      disabled={loading}
                      className="px-3 py-1 bg-red-100 text-red-700 hover:bg-red-200 rounded text-sm font-medium disabled:opacity-50 transition"
                    >
                      מחק
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 border-t flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition font-semibold"
          >
            סגור
          </button>
        </div>
      </div>
    </div>
  );
}
