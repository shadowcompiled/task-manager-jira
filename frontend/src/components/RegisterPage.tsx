import React, { useState } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { getTransition, useReducedMotion, quickTransition } from '../utils/motion';
import { API_BASE } from '../store';

type Props = {
  onShowLogin: () => void;
  onRegistered?: () => void;
};

export default function RegisterPage({ onShowLogin, onRegistered }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const reducedMotion = useReducedMotion();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const { data } = await axios.post(`${API_BASE}/auth/register`, { email, name, password });
      setSuccess(data.message || 'נרשמת בהצלחה. כעת התחבר.');
      onRegistered?.();
    } catch (err: any) {
      setError(err.response?.data?.error || 'אירעה שגיאה בהרשמה');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4 relative overflow-hidden safe-area-padding">
      <div className="absolute top-10 left-10 w-40 h-40 bg-teal-500/10 rounded-full animate-pulse" />
      <div className="absolute bottom-10 right-10 w-32 h-32 bg-teal-500/10 rounded-full animate-pulse delay-1000" />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={getTransition(reducedMotion, quickTransition)}
        className="bg-gradient-to-br from-slate-800 to-slate-900 backdrop-blur rounded-2xl shadow-2xl w-full max-w-md p-6 sm:p-8 relative z-10 border border-teal-500/30"
      >
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="flex items-center justify-center gap-1.5 text-3xl sm:text-4xl font-bold mb-2">
            <span className="emoji-icon">🍽️</span>
            <span className="bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">מעקב משימות</span>
          </h1>
          <p className="text-teal-300/80 text-base sm:text-lg">הרשמה</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-teal-300 mb-2">שם</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3.5 text-base border-2 border-teal-500/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-all duration-300 bg-slate-700/50 text-white placeholder-slate-400"
              placeholder="הכנס שם"
              required
              dir="rtl"
              autoComplete="name"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-teal-300 mb-2">דוא״ל</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3.5 text-base border-2 border-teal-500/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-all duration-300 bg-slate-700/50 text-white placeholder-slate-400"
              placeholder="הכנס דוא״ל"
              required
              dir="ltr"
              autoComplete="email"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-teal-300 mb-2">סיסמה</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3.5 text-base border-2 border-teal-500/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-all duration-300 bg-slate-700/50 text-white placeholder-slate-400"
              placeholder="הכנס סיסמה"
              required
              dir="ltr"
              autoComplete="new-password"
            />
          </div>

          {error && (
            <div className="bg-gradient-to-r from-red-400 to-pink-400 text-white p-4 rounded-xl text-sm font-semibold">
              ⚠️ {error}
            </div>
          )}
          {success && (
            <div className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white p-4 rounded-xl text-sm font-semibold">
              ✓ {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[48px] bg-gradient-to-r from-teal-500 to-cyan-500 text-white py-3.5 rounded-xl font-bold hover:shadow-lg hover:shadow-teal-500/40 disabled:opacity-50 transition-all duration-200"
          >
            {loading ? '⏳ נרשם...' : '📝 הרשם'}
          </button>
        </form>

        <p className="mt-6 text-center text-slate-300 text-sm">
          <button type="button" onClick={onShowLogin} className="text-teal-400 hover:text-teal-300 font-semibold underline">
            יש לך חשבון? התחבר
          </button>
        </p>
      </motion.div>
    </div>
  );
}
