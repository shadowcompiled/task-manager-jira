import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../contexts/ToastContext';

export interface ToastItem {
  id: number;
  message: string;
  type: 'error' | 'success' | 'info';
}

export default function Toast() {
  const ctx = useToast();
  if (!ctx) return null;
  const { toasts, removeToast } = ctx;
  return (
    <div className="fixed bottom-[max(5rem,calc(5rem+env(safe-area-inset-bottom)))] left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-[100] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <ToastItem key={t.id} item={t} onDismiss={() => removeToast(t.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastItem({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  const bg = item.type === 'error' ? 'bg-red-600/95' : item.type === 'success' ? 'bg-emerald-600/95' : 'bg-slate-700/95';
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className={`${bg} text-white px-4 py-3 rounded-xl shadow-lg font-semibold text-sm pointer-events-auto`}
    >
      {item.message}
    </motion.div>
  );
}
