import { useState } from 'react';
import { useAuthStore } from '../store';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const roleLabels: Record<string, string> = {
  worker: 'עובד',
  maintainer: 'מנהל',
  admin: 'מנהל ראשי',
};

export default function AdminPanel({ onClose }: { onClose: () => void }) {
  const { token } = useAuthStore();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'worker' as 'worker' | 'maintainer' | 'admin',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await axios.post(
        `${API_BASE}/auth/register`,
        {
          ...formData,
          requestedRole: formData.role,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccess('משתמש נוצר בהצלחה');
      setFormData({ name: '', email: '', password: '', role: 'worker' });
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'שגיאה ביצירת משתמש');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-end justify-center z-50">
      <div className="bg-slate-800 w-full max-h-[90vh] rounded-t-2xl overflow-hidden animate-slideUp">
        {/* Header */}
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">הוספת משתמש חדש</h2>
          <button onClick={onClose} className="text-slate-400 text-2xl">✕</button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-sm font-bold text-teal-400 mb-2">שם מלא</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="ישראל ישראלי"
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-teal-400 mb-2">אימייל</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="email@example.com"
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-500"
              required
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-teal-400 mb-2">סיסמה</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="לפחות 6 תווים"
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-500"
              required
              minLength={6}
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-teal-400 mb-2">תפקיד</label>
            <div className="grid grid-cols-3 gap-2">
              {(['worker', 'maintainer', 'admin'] as const).map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, role }))}
                  className={`py-3 rounded-xl text-sm font-bold transition-all ${
                    formData.role === role
                      ? 'bg-teal-600 text-white'
                      : 'bg-slate-700 text-slate-400'
                  }`}
                >
                  {roleLabels[role]}
                </button>
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

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-slate-700 text-slate-300 rounded-xl font-bold"
            >
              ביטול
            </button>
            <button
              type="submit"
              disabled={loading}
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
