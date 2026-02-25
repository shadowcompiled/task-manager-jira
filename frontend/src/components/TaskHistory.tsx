import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store';

const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3000/api' : '/api');

interface HistoryRow {
  id: number;
  task_id: number;
  task_title: string;
  old_status: string | null;
  new_status: string;
  changed_at: string;
  changed_by_name: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  planned: 'מתוכנן',
  assigned: 'הוקצה',
  in_progress: 'בתהליך',
  waiting: 'בהמתנה',
  completed: 'הושלם',
  verified: 'מאומת',
  overdue: 'בפיגור',
};

function statusLabel(s: string | null) {
  if (!s) return '—';
  return STATUS_LABELS[s] || s;
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function TaskHistory({ onClose }: { onClose: () => void }) {
  const { token } = useAuthStore();
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  useEffect(() => {
    fetchHistory();
  }, [page]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/dashboard/history`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: PAGE_SIZE, offset: page * PAGE_SIZE },
      });
      setRows(res.data.rows);
      setTotal(res.data.total);
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
      <div className="bg-slate-800 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92dvh] sm:max-h-[85vh] flex flex-col border border-slate-600 sm:border-teal-500/30">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-600 flex justify-between items-center shrink-0">
          <h2 className="text-lg sm:text-xl font-bold text-white">📜 היסטוריית שינויים</h2>
          <button
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-white rounded-full text-xl"
          >
            ✕
          </button>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto p-3 sm:p-5">
          {loading ? (
            <div className="text-center py-12 text-teal-400 font-bold">⏳ טוען...</div>
          ) : rows.length === 0 ? (
            <div className="text-center py-12 text-slate-400 font-semibold">אין היסטוריה עדיין</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" dir="rtl">
                <thead>
                  <tr className="border-b border-slate-600 text-slate-300">
                    <th className="py-3 px-3 text-right font-bold whitespace-nowrap">שם משימה</th>
                    <th className="py-3 px-3 text-right font-bold whitespace-nowrap">שונה ע״י</th>
                    <th className="py-3 px-3 text-right font-bold whitespace-nowrap">זמן</th>
                    <th className="py-3 px-3 text-right font-bold whitespace-nowrap">מסטטוס</th>
                    <th className="py-3 px-3 text-right font-bold whitespace-nowrap">לסטטוס</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-b border-slate-700 hover:bg-slate-700/50 transition-colors">
                      <td className="py-2.5 px-3 text-white font-semibold max-w-[200px] truncate">{row.task_title}</td>
                      <td className="py-2.5 px-3 text-slate-300">{row.changed_by_name || '—'}</td>
                      <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap text-xs">{formatDate(row.changed_at)}</td>
                      <td className="py-2.5 px-3">
                        <span className="inline-block px-2 py-0.5 rounded text-xs font-bold bg-slate-600 text-slate-200">
                          {statusLabel(row.old_status)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="inline-block px-2 py-0.5 rounded text-xs font-bold bg-teal-600 text-white">
                          {statusLabel(row.new_status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination + footer */}
        <div className="p-4 border-t border-slate-600 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-400 font-semibold">{total} שינויים</span>
          {totalPages > 1 && (
            <div className="flex gap-2 items-center">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1.5 rounded-lg text-sm font-bold bg-slate-700 text-white disabled:opacity-30 hover:bg-slate-600 transition min-h-[36px]"
              >
                ← הקודם
              </button>
              <span className="text-xs text-slate-300 font-semibold">{page + 1} / {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="px-3 py-1.5 rounded-lg text-sm font-bold bg-slate-700 text-white disabled:opacity-30 hover:bg-slate-600 transition min-h-[36px]"
              >
                הבא →
              </button>
            </div>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-600 text-white rounded-xl hover:bg-slate-500 transition font-semibold text-sm min-h-[40px]"
          >
            סגור
          </button>
        </div>
      </div>
    </div>
  );
}
