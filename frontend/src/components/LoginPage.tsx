import React, { useState } from 'react';
import { useAuthStore } from '../store';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const { login } = useAuthStore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password, rememberMe);
    } catch (err: any) {
      setError(err.response?.data?.error || 'שגיאה בהתחברות');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // Use fetch instead of axios to avoid global Authorization header
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, password }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw { response: { data } };
      }
      
      setSuccess('ההרשמה הצליחה! הבקשה שלך ממתינה לאישור מנהל.');
      setEmail('');
      setPassword('');
      setName('');
      
      // Switch back to login after successful registration
      setTimeout(() => {
        setIsLogin(true);
        setSuccess('');
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'שגיאה בהרשמה');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🍽️</div>
          <h1 className="text-2xl font-bold text-white mb-2">מעקב משימות</h1>
          <p className="text-slate-400">ניהול תפעול מסעדה</p>
        </div>

        {/* Toggle Login/Register */}
        <div className="flex mb-6 bg-slate-800 rounded-xl p-1">
          <button
            onClick={() => { setIsLogin(true); setError(''); setSuccess(''); }}
            className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${
              isLogin ? 'bg-teal-600 text-white' : 'text-slate-400'
            }`}
          >
            התחברות
          </button>
          <button
            onClick={() => { setIsLogin(false); setError(''); setSuccess(''); }}
            className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${
              !isLogin ? 'bg-teal-600 text-white' : 'text-slate-400'
            }`}
          >
            הרשמה
          </button>
        </div>

        {/* Login Form */}
        {isLogin ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-teal-400 mb-2">אימייל</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-slate-800 border-2 border-slate-600 rounded-xl text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none"
                placeholder="הכנס אימייל"
                required
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-teal-400 mb-2">סיסמה</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-800 border-2 border-slate-600 rounded-xl text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none"
                placeholder="הכנס סיסמה"
                required
                dir="ltr"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-teal-500"
              />
              <label htmlFor="rememberMe" className="text-sm text-slate-400">
                זכור אותי
              </label>
            </div>

            {error && (
              <div className="p-4 bg-orange-500/20 border border-orange-500 rounded-xl text-orange-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-teal-600 text-white rounded-xl font-bold text-lg disabled:opacity-50 active:bg-teal-700"
            >
              {loading ? 'מתחבר...' : 'התחברות'}
            </button>
          </form>
        ) : (
          /* Register Form */
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-teal-400 mb-2">שם מלא</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 bg-slate-800 border-2 border-slate-600 rounded-xl text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none"
                placeholder="השם שלך"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-teal-400 mb-2">אימייל</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-slate-800 border-2 border-slate-600 rounded-xl text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none"
                placeholder="האימייל שלך"
                required
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-teal-400 mb-2">סיסמה</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-800 border-2 border-slate-600 rounded-xl text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none"
                placeholder="בחר סיסמה (לפחות 6 תווים)"
                required
                minLength={6}
                dir="ltr"
              />
            </div>

            {error && (
              <div className="p-4 bg-orange-500/20 border border-orange-500 rounded-xl text-orange-400 text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="p-4 bg-teal-500/20 border border-teal-500 rounded-xl text-teal-400 text-sm">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-teal-600 text-white rounded-xl font-bold text-lg disabled:opacity-50 active:bg-teal-700"
            >
              {loading ? 'נרשם...' : 'הרשמה'}
            </button>

            <p className="text-center text-slate-500 text-sm">
              לאחר ההרשמה, הבקשה שלך תמתין לאישור מנהל
            </p>
          </form>
        )}

        {/* Demo Credentials - Only show on login */}
        {isLogin && (
          <div className="mt-8 p-4 bg-slate-800 rounded-xl border border-slate-700">
            <p className="text-sm font-bold text-teal-400 mb-3">פרטי התחברות לדוגמה:</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-400">
                <span>מנהל ראשי:</span>
                <span className="text-slate-300 font-mono text-xs" dir="ltr">admin@restaurant.com</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>עובד:</span>
                <span className="text-slate-300 font-mono text-xs" dir="ltr">worker@restaurant.com</span>
              </div>
              <p className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-700">
                סיסמה: password123
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
