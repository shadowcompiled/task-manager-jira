import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store';
import { quickTransition, getTransition, useReducedMotion } from '../utils/motion';

const container = {
  hidden: { opacity: 0 },
  visible: (reduced: boolean) => ({
    opacity: 1,
    transition: reduced ? { duration: 0.01 } : { staggerChildren: 0.08, delayChildren: 0.05 },
  }),
};
const item = {
  hidden: { opacity: 0, y: 16 },
  visible: (reduced: boolean) => ({
    opacity: 1,
    y: 0,
    transition: reduced ? { duration: 0.01 } : getTransition(reduced, quickTransition),
  }),
};

type Props = { onShowRegister?: () => void };

export default function LoginPage({ onShowRegister }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const reducedMotion = useReducedMotion();
  const { login } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password, rememberMe);
    } catch (err: any) {
      setError(err.response?.data?.error || 'אירעה שגיאה בהתחברות');
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
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={getTransition(reducedMotion, quickTransition)}
          className="text-center mb-6 sm:mb-8"
        >
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent mb-2">🍽️ מעקב משימות</h1>
          <p className="text-teal-300/80 text-base sm:text-lg">ניהול משימות במסעדה</p>
        </motion.div>

        <motion.form
          onSubmit={handleSubmit}
          className="space-y-4"
          variants={container}
          initial="hidden"
          animate="visible"
          custom={reducedMotion ?? false}
        >
          <motion.div variants={item} custom={reducedMotion ?? false}>
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
          </motion.div>

          <motion.div variants={item} custom={reducedMotion ?? false}>
            <label className="block text-sm font-semibold text-teal-300 mb-2">סיסמה</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3.5 text-base border-2 border-teal-500/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-all duration-300 bg-slate-700/50 text-white placeholder-slate-400"
              placeholder="הכנס סיסמה"
              required
              dir="ltr"
              autoComplete="current-password"
            />
          </motion.div>

          <motion.div className="flex items-center gap-2" variants={item} custom={reducedMotion ?? false}>
            <input
              type="checkbox"
              id="rememberMe"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-5 h-5 min-w-[20px] min-h-[20px] text-teal-500 border-2 border-teal-400 rounded focus:ring-2 focus:ring-teal-400 cursor-pointer"
            />
            <label htmlFor="rememberMe" className="text-sm text-slate-300 cursor-pointer font-medium">
              זכור אותי
            </label>
          </motion.div>

          {error && (
            <div className="bg-gradient-to-r from-red-400 to-pink-400 text-white p-4 rounded-xl text-sm font-semibold animate-shake">
              ⚠️ {error}
            </div>
          )}

          <motion.button
            type="submit"
            disabled={loading}
            variants={item}
            custom={reducedMotion ?? false}
            whileTap={{ scale: 0.98 }}
            className="w-full min-h-[48px] bg-gradient-to-r from-teal-500 to-cyan-500 text-white py-3.5 rounded-xl font-bold hover:shadow-lg hover:shadow-teal-500/40 disabled:opacity-50 transition-all duration-200"
          >
            {loading ? '⏳ מתחבר...' : '🔓 התחבר'}
          </motion.button>

          {onShowRegister && (
            <motion.p className="mt-6 text-center text-slate-300 text-sm" variants={item} custom={reducedMotion ?? false}>
              <button type="button" onClick={onShowRegister} className="text-teal-400 hover:text-teal-300 font-semibold underline">
                אין לך חשבון? הרשם
              </button>
            </motion.p>
          )}
        </motion.form>
      </motion.div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }
        
        .animate-slideDown {
          animation: slideDown 0.5s ease-out;
        }
        
        .animate-slideUp {
          animation: slideUp 0.5s ease-out forwards;
          opacity: 0;
        }
        
        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }
        
        .delay-1000 {
          animation-delay: 1s;
        }
      `}</style>
    </div>
  );
}
