import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface DashboardStats {
  total_tasks: number;
  completed_tasks: number;
  pending_tasks: number;
  overdue_tasks: number;
  completion_rate: number;
}

interface StaffPerformance {
  user_id: number;
  user_name: string;
  total_assigned: number;
  completed: number;
  completion_rate: number;
}

interface TaskByPriority {
  priority: string;
  count: number;
}

export default function Dashboard() {
  const { user, token } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [staffPerformance, setStaffPerformance] = useState<StaffPerformance[]>([]);
  const [tasksByPriority, setTasksByPriority] = useState<TaskByPriority[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role !== 'admin' && user?.role !== 'maintainer') return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const [statsRes, staffRes, priorityRes] = await Promise.all([
          axios.get(`${API_BASE}/dashboard/stats/overview`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${API_BASE}/dashboard/stats/staff-performance`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${API_BASE}/dashboard/stats/by-priority`, {
            headers: { Authorization: `Bearer ${token}` },
          }).catch(() => ({ data: [] })),
        ]);
        setStats(statsRes.data);
        setStaffPerformance(staffRes.data);
        setTasksByPriority(priorityRes.data);
      } catch (error) {
        console.error('שגיאה בטעינת נתונים:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, token]);

  if (user?.role !== 'admin' && user?.role !== 'maintainer') {
    return (
      <div className="p-4 text-center">
        <p className="text-slate-400 dark:text-slate-400">אין גישה לעמוד זה</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-teal-500">טוען נתונים...</p>
        </div>
      </div>
    );
  }

  const priorityLabels: Record<string, string> = {
    low: 'נמוכה',
    medium: 'בינונית',
    high: 'גבוהה',
    critical: 'קריטית',
  };

  const priorityColors: Record<string, string> = {
    low: 'bg-emerald-500',
    medium: 'bg-amber-500',
    high: 'bg-orange-500',
    critical: 'bg-red-500',
  };

  return (
    <div className="p-4 pb-24 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">סטטיסטיקה</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">סקירה כללית של ביצועי המשימות</p>
      </div>

      {/* Main Stats - Clean card design */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 mb-6">
          {/* Total Tasks */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xl">
                📋
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">סה"כ משימות</p>
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{stats.total_tasks}</p>
          </div>

          {/* Completed */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-xl">
                ✅
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">הושלמו</p>
            </div>
            <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{stats.completed_tasks}</p>
          </div>

          {/* Pending */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xl">
                ⏳
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">ממתינות</p>
            </div>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.pending_tasks}</p>
          </div>

          {/* Overdue */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-xl">
                ⚠️
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">באיחור</p>
            </div>
            <p className="text-3xl font-bold text-red-600 dark:text-red-400">{stats.overdue_tasks}</p>
          </div>
        </div>
      )}

      {/* Completion Rate - Clean progress bar */}
      {stats && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 mb-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">📊</span>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">אחוז השלמה כולל</p>
            </div>
            <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">{stats.completion_rate}%</p>
          </div>
          <div className="h-4 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${stats.completion_rate}%` }}
            />
          </div>
        </div>
      )}

      {/* Tasks by Priority */}
      {tasksByPriority.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 mb-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <span>🎯</span>
            <span>משימות לפי עדיפות</span>
          </h2>
          <div className="space-y-3">
            {tasksByPriority.map((item) => (
              <div key={item.priority} className="flex items-center gap-3">
                <span className={`w-3 h-3 rounded-full ${priorityColors[item.priority] || 'bg-slate-500'}`} />
                <span className="flex-1 text-sm text-slate-600 dark:text-slate-300">
                  {priorityLabels[item.priority] || item.priority}
                </span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Staff Performance - Modern cards */}
      <div className="mb-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <span>👥</span>
          <span>ביצועי עובדים</span>
        </h2>
        {staffPerformance.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 text-center shadow-sm border border-slate-200 dark:border-slate-700">
            <p className="text-slate-400">אין נתונים להצגה</p>
            <p className="text-sm text-slate-500 mt-1">הקצה משימות לעובדים כדי לראות סטטיסטיקות</p>
          </div>
        ) : (
          <div className="space-y-3">
            {staffPerformance.map((staff, index) => (
              <div 
                key={staff.user_id} 
                className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-700"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                    index === 0 ? 'bg-amber-500' : index === 1 ? 'bg-slate-400' : index === 2 ? 'bg-orange-700' : 'bg-slate-500'
                  }`}>
                    {staff.user_name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-900 dark:text-white">{staff.user_name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {staff.completed} מתוך {staff.total_assigned} משימות
                    </p>
                  </div>
                  <div className="text-left">
                    <p className="text-xl font-bold text-teal-600 dark:text-teal-400">{staff.completion_rate}%</p>
                  </div>
                </div>
                <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${staff.completion_rate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
