import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { API_BASE } from '../store';
import { modalTransition, quickTransition, getTransition, useReducedMotion } from '../utils/motion';

interface ChangeRow {
  id: number;
  task_id: number;
  task_title: string;
  changed_by_name: string | null;
  new_status: string;
  status_display_name: string | null;
  changed_at: string;
}

interface Response {
  changes: ChangeRow[];
}

const STATUS_TO_HEBREW: Record<string, string> = {
  planned: 'מתוכנן',
  assigned: 'הוקצה',
  in_progress: 'בתהליך',
  waiting: 'בהמתנה',
  completed: 'הושלם',
  verified: 'אומת',
  overdue: 'באיחור',
};

const STATUS_COLORS: Record<string, string> = {
  planned: 'bg-slate-500/80 text-slate-100',
  assigned: 'bg-blue-600/80 text-white',
  in_progress: 'bg-violet-600/80 text-white',
  waiting: 'bg-amber-600/80 text-white',
  completed: 'bg-emerald-600/80 text-white',
  verified: 'bg-teal-600/80 text-white',
  overdue: 'bg-red-600/80 text-white',
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'עכשיו';
  if (diffMins < 60) return `לפני ${diffMins} דקות`;
  if (diffHours < 24) return `לפני ${diffHours} שעות`;
  if (diffDays < 7) return `לפני ${diffDays} ימים`;
  return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function ChangesHistoryModal({ onClose }: { onClose: () => void }) {
  const reducedMotion = useReducedMotion();
  const [changes, setChanges] = useState<ChangeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    axios
      .get<Response>(`${API_BASE}/dashboard/changes-history`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: 100, offset: 0 }
      })
      .then((res) => setChanges(res.data.changes || []))
      .catch((err) => setError(err.response?.data?.error || 'הטעינה נכשלה'))
      .finally(() => setLoading(false));
  }, []);

  const statusLabel = (row: ChangeRow) =>
    row.status_display_name || STATUS_TO_HEBREW[row.new_status] || row.new_status;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={getTransition(reducedMotion, quickTransition)}
      className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={getTransition(reducedMotion, modalTransition)}
        className="bg-slate-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[92dvh] flex flex-col border border-teal-500/30"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        <div className="p-4 border-b border-slate-600 flex items-center justify-between shrink-0">
          <h2 className="text-lg font-bold text-white">היסטוריית שינויים</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-white rounded-lg"
            aria-label="סגור"
          >
            ✕
          </button>
        </div>
        <div className="p-4 overflow-auto flex-1 -webkit-overflow-scrolling-touch">
          {loading && (
            <p className="text-teal-400 text-center py-8">טוען...</p>
          )}
          {error && (
            <p className="text-red-400 text-center py-4">{error}</p>
          )}
          {!loading && !error && changes.length === 0 && (
            <p className="text-slate-400 text-center py-8">אין עדיין שינויי סטטוס.</p>
          )}
          {!loading && !error && changes.length > 0 && (
            <ul className="space-y-2.5">
              {changes.map((row) => (
                <li
                  key={row.id}
                  className="p-3.5 rounded-xl border border-slate-600/50 bg-slate-700/40 hover:bg-slate-700/60 transition-colors text-right"
                >
                  <p className="font-bold text-white text-sm truncate mb-2" title={row.task_title}>
                    {row.task_title}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {row.changed_by_name && (
                      <span className="text-slate-300 font-medium">👤 {row.changed_by_name}</span>
                    )}
                    <span className={`px-2 py-0.5 rounded-md font-medium ${STATUS_COLORS[row.new_status] ?? 'bg-slate-600/80 text-slate-200'}`}>
                      {statusLabel(row)}
                    </span>
                    <span className="text-slate-400 font-medium" title={formatDateTime(row.changed_at)}>
                      {formatTime(row.changed_at)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
