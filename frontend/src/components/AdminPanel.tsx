import React, { useState } from 'react';
import { useAuthStore } from '../store';
import axios from 'axios';

export default function AdminPanel({ onClose }: { onClose: () => void }) {
  const { user, token } = useAuthStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'staff' | 'manager' | 'admin'>('staff');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3000/api' : '/api')}/auth/register`,
        {
          name,
          email,
          password,
          role,
          restaurantId: user?.restaurant_id,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setSuccess(`✅ משתמש ${name} נוצר בהצלחה!`);
      setName('');
      setEmail('');
      setPassword('');
      setRole('staff');
    } catch (err: any) {
      setError(err.response?.data?.error || 'שגיאה בעת יצירת המשתמש');
    } finally {
      setLoading(false);
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
          <p className="text-red-600 font-bold text-center">❌ אתה חייב להיות מנהל מערכת כדי לגשת לפאנל זה</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            👤 יצירת משתמש חדש
          </h2>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-900 text-2xl font-bold transition"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">שם</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 border-2 border-blue-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="הכנס שם"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">דוא"ל</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border-2 border-blue-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="הכנס דוא״ל"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">סיסמה</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border-2 border-blue-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="הכנס סיסמה"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">תפקיד</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'staff' | 'manager' | 'admin')}
              className="w-full px-4 py-3 border-2 border-blue-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="staff">👤 עובד</option>
              <option value="manager">👨‍💼 מנהל</option>
              <option value="admin">👑 מנהל מערכת</option>
            </select>
          </div>

          {error && (
            <div className="bg-red-100 border-2 border-red-300 text-red-700 p-4 rounded-xl text-sm font-semibold">
              ⚠️ {error}
            </div>
          )}

          {success && (
            <div className="bg-green-100 border-2 border-green-300 text-green-700 p-4 rounded-xl text-sm font-semibold">
              {success}
            </div>
          )}

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-bold hover:shadow-lg disabled:opacity-50 transition-all duration-300 transform hover:scale-105 active:scale-95"
            >
              {loading ? '⏳ יוצר...' : '✨ יצור משתמש'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300 transition-all duration-300"
            >
              ❌ סגור
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
