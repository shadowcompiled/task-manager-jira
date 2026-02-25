import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { useAuthStore } from '../store';
import { quickTransition, getTransition, useReducedMotion } from '../utils/motion';
import { DashboardSectionSkeleton } from './skeletons';

const SECTION_ORDER = [
  'today',
  'mainStats',
  'completion',
  'weekly',
  'byStatus',
  'byPriority',
  'recurring',
  'tags',
  'staff',
] as const;
type SectionId = (typeof SECTION_ORDER)[number];

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface DashboardStats {
  total_tasks: number;
  completed_tasks: number;
  pending_tasks: number;
  overdue_tasks: number;
  completion_rate: number;
  in_progress_tasks: number;
}

interface StaffPerformance {
  user_id: number;
  user_name: string;
  user_role: string;
  total_assigned: number;
  completed: number;
  in_progress: number;
  overdue: number;
  completion_rate: number;
}

interface TaskByPriority {
  priority: string;
  count: number;
  completed: number;
  in_progress: number;
  overdue: number;
}

interface TaskByStatus {
  status: string;
  count: number;
}

interface TodayStats {
  completed_today: number;
  due_today: number;
  created_today: number;
  due_soon: number;
}

interface WeeklyStats {
  completed_this_week: number;
  created_this_week: number;
  daily_breakdown: { date: string; created: number; completed: number }[];
}

interface RecurringStats {
  total_recurring: number;
  by_type: { recurrence: string; count: number; completed: number }[];
}

interface TagStats {
  id: number;
  name: string;
  color: string;
  color2?: string;
  task_count: number;
}

interface TagTask {
  id: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  due_date: string;
  created_at: string;
  assignees: { id: number; name: string }[];
}

export default function Dashboard() {
  const { user, token } = useAuthStore();
  const reducedMotion = useReducedMotion();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [staffPerformance, setStaffPerformance] = useState<StaffPerformance[]>([]);
  const [tasksByPriority, setTasksByPriority] = useState<TaskByPriority[]>([]);
  const [tasksByStatus, setTasksByStatus] = useState<TaskByStatus[]>([]);
  const [todayStats, setTodayStats] = useState<TodayStats | null>(null);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats | null>(null);
  const [recurringStats, setRecurringStats] = useState<RecurringStats | null>(null);
  const [tagStats, setTagStats] = useState<TagStats[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Tag tasks modal state
  const [selectedTag, setSelectedTag] = useState<TagStats | null>(null);
  const [tagTasks, setTagTasks] = useState<TagTask[]>([]);
  const [loadingTagTasks, setLoadingTagTasks] = useState(false);

  // Worker tasks modal state
  const [selectedWorker, setSelectedWorker] = useState<StaffPerformance | null>(null);
  const [workerTasks, setWorkerTasks] = useState<any[]>([]);
  const [loadingWorkerTasks, setLoadingWorkerTasks] = useState(false);

  // Priority tasks modal state
  const [selectedPriority, setSelectedPriority] = useState<TaskByPriority | null>(null);
  const [priorityTasks, setPriorityTasks] = useState<any[]>([]);
  const [loadingPriorityTasks, setLoadingPriorityTasks] = useState(false);

  useEffect(() => {
    if (user?.role !== 'admin' && user?.role !== 'maintainer') return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const [statsRes, staffRes, priorityRes, statusRes, todayRes, weeklyRes, recurringRes, tagsRes] = await Promise.all([
          axios.get(`${API_BASE}/dashboard/stats/overview`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${API_BASE}/dashboard/stats/staff-performance`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${API_BASE}/dashboard/stats/tasks-by-priority`, {
            headers: { Authorization: `Bearer ${token}` },
          }).catch(() => ({ data: [] })),
          axios.get(`${API_BASE}/dashboard/stats/by-status`, {
            headers: { Authorization: `Bearer ${token}` },
          }).catch(() => ({ data: [] })),
          axios.get(`${API_BASE}/dashboard/stats/today`, {
            headers: { Authorization: `Bearer ${token}` },
          }).catch(() => ({ data: null })),
          axios.get(`${API_BASE}/dashboard/stats/weekly`, {
            headers: { Authorization: `Bearer ${token}` },
          }).catch(() => ({ data: null })),
          axios.get(`${API_BASE}/dashboard/stats/recurring`, {
            headers: { Authorization: `Bearer ${token}` },
          }).catch(() => ({ data: null })),
          axios.get(`${API_BASE}/dashboard/stats/tags`, {
            headers: { Authorization: `Bearer ${token}` },
          }).catch(() => ({ data: [] })),
        ]);
        setStats(statsRes.data);
        setStaffPerformance(staffRes.data);
        setTasksByPriority(priorityRes.data);
        const statusData = (statusRes.data || []).filter((i: TaskByStatus) => i.status !== 'verified');
        const verifiedItem = (statusRes.data || []).find((i: TaskByStatus) => i.status === 'verified');
        const completedItem = statusData.find((i: TaskByStatus) => i.status === 'completed');
        if (completedItem && verifiedItem) completedItem.count += verifiedItem.count;
        setTasksByStatus(statusData);
        setTodayStats(todayRes.data);
        setWeeklyStats(weeklyRes.data);
        setRecurringStats(recurringRes.data);
        setTagStats(tagsRes.data);
      } catch (error) {
        console.error('שגיאה בטעינת נתונים:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, token]);

  // Fetch tasks by tag
  const fetchTagTasks = async (tag: TagStats) => {
    console.log('Fetching tasks for tag:', tag.id, tag.name);
    setSelectedTag(tag);
    setLoadingTagTasks(true);
    try {
      const url = `${API_BASE}/dashboard/stats/tasks-by-tag/${tag.id}`;
      console.log('API URL:', url);
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('Response:', response.data);
      setTagTasks(response.data || []);
    } catch (error: any) {
      console.error('שגיאה בטעינת משימות:', error);
      console.error('Error details:', error.response?.data || error.message);
      setTagTasks([]);
    } finally {
      setLoadingTagTasks(false);
    }
  };

  // Fetch tasks by worker
  const fetchWorkerTasks = async (worker: StaffPerformance) => {
    console.log('Fetching tasks for worker:', worker.user_id, worker.user_name);
    setSelectedWorker(worker);
    setLoadingWorkerTasks(true);
    try {
      const url = `${API_BASE}/dashboard/stats/tasks-by-user/${worker.user_id}`;
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('Worker tasks:', response.data);
      setWorkerTasks(response.data || []);
    } catch (error: any) {
      console.error('שגיאה בטעינת משימות עובד:', error);
      setWorkerTasks([]);
    } finally {
      setLoadingWorkerTasks(false);
    }
  };

  // Fetch tasks by priority
  const fetchPriorityTasks = async (priorityItem: TaskByPriority) => {
    console.log('Fetching tasks for priority:', priorityItem.priority);
    setSelectedPriority(priorityItem);
    setLoadingPriorityTasks(true);
    try {
      const url = `${API_BASE}/dashboard/stats/tasks-by-priority/${priorityItem.priority}`;
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('Priority tasks:', response.data);
      setPriorityTasks(response.data || []);
    } catch (error: any) {
      console.error('שגיאה בטעינת משימות לפי עדיפות:', error);
      setPriorityTasks([]);
    } finally {
      setLoadingPriorityTasks(false);
    }
  };

  if (user?.role !== 'admin' && user?.role !== 'maintainer') {
    return (
      <div className="p-4 text-center">
        <p className="text-slate-400 dark:text-slate-400">אין גישה לעמוד זה</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 sm:p-5 md:p-6 pb-8 max-w-6xl mx-auto w-full min-w-0 overflow-x-hidden">
        <div className="mb-6">
          <div className="h-8 w-48 bg-slate-600/40 rounded animate-pulse mb-1" />
          <div className="h-4 w-64 bg-slate-600/30 rounded animate-pulse" />
        </div>
        <div className="space-y-4">
          {SECTION_ORDER.map((id) => (
            <DashboardSectionSkeleton key={id} />
          ))}
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
    critical: 'bg-red-600',
  };

  const statusLabels: Record<string, string> = {
    planned: 'מתוכנן',
    assigned: 'הוקצה',
    in_progress: 'בביצוע',
    waiting: 'ממתין',
    completed: 'הושלם',
    verified: 'הושלם',
  };

  const statusColors: Record<string, string> = {
    planned: 'bg-slate-500',
    assigned: 'bg-blue-500',
    in_progress: 'bg-purple-500',
    waiting: 'bg-amber-500',
    completed: 'bg-teal-500',
    verified: 'bg-emerald-500',
  };

  const recurrenceLabels: Record<string, string> = {
    daily: 'יומי',
    weekly: 'שבועי',
    monthly: 'חודשי',
  };

  const roleLabels: Record<string, string> = {
    admin: 'מנהל',
    maintainer: 'אחראי',
    worker: 'עובד',
  };

  const EmptySection = ({ title }: { title: string; description?: string }) => (
    <div className="rounded-none p-3 border-0 border-t border-slate-600 bg-slate-800/30 text-center min-h-0">
      <p className="font-semibold text-slate-500 text-xs">{title} — אין נתונים</p>
    </div>
  );

  return (
    <div className="p-4 sm:p-5 md:p-6 pb-8 max-w-6xl mx-auto w-full min-w-0 overflow-x-hidden">
      {/* Header */}
      <div className="mb-6 pt-4 pb-3">
        <h1 className="text-[1.875rem] sm:text-3xl font-bold text-slate-900 dark:text-white mb-1">סטטיסטיקה</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">סקירה כללית של ביצועי המשימות</p>
      </div>

      <div className="space-y-4">
        {SECTION_ORDER.map((sectionId, index) => (
          <motion.div
            key={sectionId}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reducedMotion ? { duration: 0.01 } : { ...getTransition(false, quickTransition), delay: index * 0.05 }}
            className="rounded-2xl overflow-hidden border border-slate-600 bg-slate-800/40"
          >
            <div className="p-0">
              {sectionId === 'today' && (todayStats ? (
        <div className="bg-gradient-to-r from-teal-500 to-emerald-500 rounded-none p-5 text-white shadow-lg min-h-0">
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
            <span>📅</span>
            <span>היום</span>
          </h2>
<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="text-center p-2 rounded-lg bg-white/10">
              <p className="text-2xl font-bold">{todayStats.completed_today}</p>
              <p className="text-xs opacity-80">הושלמו</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-white/10">
              <p className="text-2xl font-bold">{todayStats.due_today}</p>
              <p className="text-xs opacity-80">ליום זה</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-white/10">
              <p className="text-2xl font-bold">{todayStats.created_today}</p>
              <p className="text-xs opacity-80">נוצרו</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-white/10">
              <p className="text-2xl font-bold text-yellow-300">{todayStats.due_soon}</p>
              <p className="text-xs opacity-80">ב-24 שעות</p>
            </div>
          </div>
        </div>
              ) : <EmptySection title="📅 היום" description="" />)}
              {sectionId === 'mainStats' && (stats ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4">
          <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-700 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-lg">📋</div>
              <p className="text-xs text-slate-500 dark:text-slate-400">סה"כ משימות</p>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total_tasks}</p>
          </div>
          <div className="bg-emerald-50 dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-emerald-200 dark:border-slate-700 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-lg">✅</div>
              <p className="text-xs text-slate-500 dark:text-slate-400">הושלמו</p>
            </div>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.completed_tasks}</p>
          </div>
          <div className="bg-blue-50 dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-blue-200 dark:border-slate-700 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-lg">⏳</div>
              <p className="text-xs text-slate-500 dark:text-slate-400">ממתינות</p>
            </div>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.pending_tasks}</p>
          </div>
          <div className="bg-red-50 dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-red-200 dark:border-slate-700 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-lg">⚠️</div>
              <p className="text-xs text-slate-500 dark:text-slate-400">באיחור</p>
            </div>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.overdue_tasks}</p>
          </div>
        </div>
              ) : <EmptySection title="נתונים כלליים" description="" />)}
              {sectionId === 'completion' && (stats ? (
        <div className="bg-teal-50 dark:bg-slate-800 rounded-none p-5 shadow-sm border-0 border-t border-slate-600">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">📊</span>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">אחוז השלמה כולל</p>
            </div>
            <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">{stats.completion_rate}%</p>
          </div>
          <div className="h-4 bg-teal-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${stats.completion_rate}%` }}
            />
          </div>
        </div>
              ) : <EmptySection title="אחוז השלמה" />)}
              {sectionId === 'weekly' && (weeklyStats ? (
        <div className="bg-purple-50 dark:bg-slate-800 rounded-none p-5 shadow-sm border-0 border-t border-slate-600 min-h-0">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <span>📈</span>
            <span>סיכום שבועי</span>
          </h2>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="text-center p-3 bg-white dark:bg-slate-700 rounded-xl min-w-0">
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{weeklyStats.completed_this_week}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">הושלמו השבוע</p>
            </div>
            <div className="text-center p-3 bg-white dark:bg-slate-700 rounded-xl min-w-0">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{weeklyStats.created_this_week}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">נוצרו השבוע</p>
            </div>
          </div>
          {weeklyStats.daily_breakdown.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">פירוט יומי</p>
              {weeklyStats.daily_breakdown.slice(0, 5).map((day) => (
                <div key={day.date} className="flex items-center justify-between text-sm bg-white dark:bg-slate-700 rounded-lg p-2">
                  <span className="text-slate-600 dark:text-slate-300">
                    {new Date(day.date).toLocaleDateString('he-IL', { weekday: 'short', day: 'numeric', month: 'numeric' })}
                  </span>
                  <div className="flex gap-3">
                    <span className="text-blue-600 dark:text-blue-400">+{day.created}</span>
                    <span className="text-emerald-600 dark:text-emerald-400">✓{day.completed}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
              ) : <EmptySection title="📈 סיכום שבועי" />)}
              {sectionId === 'byStatus' && (tasksByStatus.length > 0 ? (
        <div className="bg-indigo-50 dark:bg-slate-800 rounded-none p-5 shadow-sm border-0 border-t border-slate-600 min-h-0">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <span>📌</span>
            <span>משימות לפי סטטוס</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {tasksByStatus.map((item) => {
              const total = tasksByStatus.reduce((sum, i) => sum + i.count, 0);
              const percentage = total > 0 ? Math.round((item.count / total) * 100) : 0;
              return (
                <div key={item.status} className="bg-white dark:bg-slate-700 rounded-xl p-3 border border-slate-200 dark:border-slate-600 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${statusColors[item.status] || 'bg-slate-500'}`} />
                    <span className="text-xs text-slate-600 dark:text-slate-300 truncate">{statusLabels[item.status] || item.status}</span>
                  </div>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">{item.count}</p>
                  <div className="h-1.5 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden mt-1">
                    <div className={`h-full rounded-full transition-all duration-500 ${statusColors[item.status] || 'bg-slate-500'}`} style={{ width: `${percentage}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
              ) : <EmptySection title="📌 לפי סטטוס" description="" />)}
              {sectionId === 'byPriority' && (tasksByPriority.length > 0 ? (
        <div className="bg-amber-50 dark:bg-slate-800 rounded-none p-5 shadow-sm border-0 border-t border-slate-600 min-h-0">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <span>🎯</span>
            <span>משימות לפי עדיפות</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">לחץ על עדיפות לצפייה במשימות</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {tasksByPriority.map((item) => (
              <div 
                key={item.priority} 
                onClick={() => fetchPriorityTasks(item)}
                role="button"
                tabIndex={0}
                className="bg-white dark:bg-slate-700 rounded-xl p-3 cursor-pointer hover:shadow-md hover:border-amber-300 dark:hover:border-amber-600 border border-transparent active:scale-[0.99] transition-all min-w-0"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${priorityColors[item.priority] || 'bg-slate-500'}`} />
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{priorityLabels[item.priority] || item.priority}</span>
                  </div>
                  <span className="text-lg font-bold text-slate-900 dark:text-white">{item.count}</span>
                </div>
                <div className="flex flex-wrap gap-1 text-xs">
                  <span className="px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded">✓ {item.completed || 0}</span>
                  <span className="px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded">🔄 {item.in_progress || 0}</span>
                  {(item.overdue || 0) > 0 && (
                    <span className="px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded">⚠️ {item.overdue}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
              ) : <EmptySection title="🎯 לפי עדיפות" description="" />)}
              {sectionId === 'recurring' && (recurringStats && recurringStats.total_recurring > 0 ? (
        <div className="bg-cyan-50 dark:bg-slate-800 rounded-none p-5 shadow-sm border-0 border-t border-slate-600 min-h-0">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <span>🔄</span>
            <span>משימות חוזרות</span>
            <span className="text-sm font-normal text-slate-500">({recurringStats.total_recurring})</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {recurringStats.by_type.map((item) => (
              <div key={item.recurrence} className="text-center p-3 bg-white dark:bg-slate-700 rounded-xl min-w-0">
                <p className="text-xl font-bold text-cyan-600 dark:text-cyan-400">{item.count}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{recurrenceLabels[item.recurrence] || item.recurrence}</p>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400">✓ {item.completed}</p>
              </div>
            ))}
          </div>
        </div>
              ) : <EmptySection title="🔄 משימות חוזרות" />)}
              {sectionId === 'tags' && (tagStats.length > 0 ? (
        <div className="bg-pink-50 dark:bg-slate-800 rounded-none p-5 shadow-sm border-0 border-t border-slate-600 min-h-0">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <span>🏷️</span>
            <span>שימוש בתגיות</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">לחץ על תגית לצפייה במשימות</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {tagStats.map((tag) => (
              <div
                key={tag.id}
                onClick={() => fetchTagTasks(tag)}
                role="button"
                tabIndex={0}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-white text-sm font-bold cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md select-none min-w-0"
                style={{ 
                  background: tag.color2 
                    ? `linear-gradient(135deg, ${tag.color} 0%, ${tag.color2} 100%)`
                    : tag.color
                }}
              >
                <span>{tag.name}</span>
                <span className="bg-white/30 px-2 py-0.5 rounded-full text-xs">{tag.task_count}</span>
              </div>
            ))}
          </div>
        </div>
              ) : <EmptySection title="🏷️ תגיות" />)}
              {sectionId === 'staff' && (
      <div className="p-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <span>👥</span>
          <span>ביצועי צוות</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">לחץ על עובד לצפייה במשימות שלו</p>
        {staffPerformance.length === 0 ? (
          <div className="rounded-none p-3 border-0 border-t border-slate-600 bg-slate-800/30 text-center min-h-0">
            <p className="font-semibold text-slate-500 text-xs">אין נתונים</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {staffPerformance.map((staff, index) => (
              <div 
                key={staff.user_id} 
                onClick={() => fetchWorkerTasks(staff)}
                role="button"
                tabIndex={0}
                className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-700 cursor-pointer hover:shadow-md hover:border-teal-300 dark:hover:border-teal-600 active:scale-[0.99] transition-all min-w-0"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${
                    index === 0 ? 'bg-amber-500' : index === 1 ? 'bg-slate-400' : index === 2 ? 'bg-orange-700' : 'bg-slate-500'
                  }`}>
                    {index < 3 && <span className="absolute -top-1 -right-1 text-sm">{index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}</span>}
                    {staff.user_name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-slate-900 dark:text-white">{staff.user_name}</p>
                      <span className="text-[10px] px-2 py-0.5 bg-slate-200 dark:bg-slate-600 rounded-full text-slate-600 dark:text-slate-300">
                        {roleLabels[staff.user_role] || staff.user_role}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {staff.completed} מתוך {staff.total_assigned} משימות
                    </p>
                  </div>
                  <div className="text-left">
                    <p className="text-xl font-bold text-teal-600 dark:text-teal-400">{staff.completion_rate}%</p>
                  </div>
                </div>
                
                {/* Mini stats */}
                <div className="flex gap-2 mb-3 text-xs">
                  <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded">
                    🔄 {staff.in_progress || 0} בביצוע
                  </span>
                  {(staff.overdue || 0) > 0 && (
                    <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded">
                      ⚠️ {staff.overdue} באיחור
                    </span>
                  )}
                </div>

                <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
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
              )}

            </div>
          </motion.div>
        ))}
      </div>

      {/* Tag Tasks Modal */}
      {selectedTag && (
        <div 
          className="fixed inset-0 bg-black/70 flex items-end justify-center z-50"
          onClick={() => setSelectedTag(null)}
        >
          <div 
            className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-t-3xl max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div 
              className="p-5 border-b border-slate-200 dark:border-slate-700 rounded-t-3xl"
              style={{ 
                background: selectedTag.color2 
                  ? `linear-gradient(135deg, ${selectedTag.color} 0%, ${selectedTag.color2} 100%)`
                  : selectedTag.color 
              }}
            >
              <div className="flex items-center justify-between">
                <div className="text-white">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <span>🏷️</span>
                    <span>{selectedTag.name}</span>
                  </h3>
                  <p className="text-white/80 text-sm mt-1">{selectedTag.task_count} משימות</p>
                </div>
                <button
                  onClick={() => setSelectedTag(null)}
                  onPointerUp={() => setSelectedTag(null)}
                  className="w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center text-xl hover:bg-white/30 active:scale-95 transition-all touch-manipulation"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Tasks List */}
            <div className="flex-1 overflow-y-auto p-4">
              {loadingTagTasks ? (
                <div className="flex items-center justify-center py-10">
                  <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : tagTasks.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-slate-400">אין משימות בתגית זו</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tagTasks.map((task) => {
                    const isOverdue = task.due_date && new Date(task.due_date) < new Date() && !['completed', 'verified'].includes(task.status);
                    return (
                      <div 
                        key={task.id}
                        className={`p-4 rounded-xl border ${
                          isOverdue 
                            ? 'border-red-300 dark:border-red-500/50 bg-red-50 dark:bg-red-900/10' 
                            : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50'
                        }`}
                      >
                        {/* Title & Priority */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4 className="font-bold text-slate-900 dark:text-white text-sm">{task.title}</h4>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold text-white ${priorityColors[task.priority] || 'bg-slate-500'}`}>
                            {priorityLabels[task.priority] || task.priority}
                          </span>
                        </div>

                        {/* Description */}
                        {task.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 line-clamp-2">{task.description}</p>
                        )}

                        {/* Status Badge */}
                        <div className="flex flex-wrap gap-2 mb-2">
                          <span className={`px-2 py-1 rounded-lg text-xs font-bold text-white ${statusColors[task.status] || 'bg-slate-500'}`}>
                            {statusLabels[task.status] || task.status}
                          </span>
                          {isOverdue && (
                            <span className="px-2 py-1 rounded-lg text-xs font-bold bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                              ⚠️ באיחור
                            </span>
                          )}
                        </div>

                        {/* Meta Info */}
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                          {task.due_date && (
                            <span className={isOverdue ? 'text-red-500 font-bold' : ''}>
                              📅 {new Date(task.due_date).toLocaleDateString('he-IL')}
                            </span>
                          )}
                          {task.assignees && task.assignees.length > 0 && (
                            <span>
                              👤 {task.assignees.map(a => a.name).join(', ')}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Close Button */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setSelectedTag(null)}
                onPointerUp={() => setSelectedTag(null)}
                className="w-full py-4 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-base hover:bg-slate-300 dark:hover:bg-slate-600 active:scale-95 transition-all touch-manipulation"
                style={{ minHeight: '52px', WebkitTapHighlightColor: 'transparent' }}
              >
                סגירה
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Worker Tasks Modal */}
      {selectedWorker && (
        <div 
          className="fixed inset-0 bg-black/70 flex items-end justify-center z-50"
          onClick={() => setSelectedWorker(null)}
        >
          <div 
            className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-t-3xl max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-700 rounded-t-3xl bg-gradient-to-r from-teal-500 to-emerald-500">
              <div className="flex items-center justify-between">
                <div className="text-white flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-xl font-bold">
                    {selectedWorker.user_name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{selectedWorker.user_name}</h3>
                    <p className="text-white/80 text-sm">
                      {selectedWorker.completed} / {selectedWorker.total_assigned} משימות ({selectedWorker.completion_rate}%)
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedWorker(null)}
                  className="w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center text-xl hover:bg-white/30 active:scale-95 transition-all touch-manipulation"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Tasks List */}
            <div className="flex-1 overflow-y-auto p-4">
              {loadingWorkerTasks ? (
                <div className="flex items-center justify-center py-10">
                  <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : workerTasks.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-slate-400">אין משימות לעובד זה</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {workerTasks.map((task) => {
                    const isOverdue = task.due_date && new Date(task.due_date) < new Date() && !['completed', 'verified'].includes(task.status);
                    return (
                      <div 
                        key={task.id}
                        className={`p-4 rounded-xl border ${
                          isOverdue 
                            ? 'border-red-300 dark:border-red-500/50 bg-red-50 dark:bg-red-900/10' 
                            : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50'
                        }`}
                      >
                        {/* Title & Priority */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4 className="font-bold text-slate-900 dark:text-white text-sm">{task.title}</h4>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold text-white ${priorityColors[task.priority] || 'bg-slate-500'}`}>
                            {priorityLabels[task.priority] || task.priority}
                          </span>
                        </div>

                        {/* Description */}
                        {task.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 line-clamp-2">{task.description}</p>
                        )}

                        {/* Status Badge */}
                        <div className="flex flex-wrap gap-2 mb-2">
                          <span className={`px-2 py-1 rounded-lg text-xs font-bold text-white ${statusColors[task.status] || 'bg-slate-500'}`}>
                            {statusLabels[task.status] || task.status}
                          </span>
                          {isOverdue && (
                            <span className="px-2 py-1 rounded-lg text-xs font-bold bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                              ⚠️ באיחור
                            </span>
                          )}
                        </div>

                        {/* Tags */}
                        {task.tags && task.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {task.tags.map((tag: any) => (
                              <span
                                key={tag.id}
                                className="px-2 py-0.5 rounded text-[10px] font-bold text-white"
                                style={{ 
                                  background: tag.color2 
                                    ? `linear-gradient(135deg, ${tag.color} 0%, ${tag.color2} 100%)`
                                    : tag.color 
                                }}
                              >
                                {tag.name}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Meta Info */}
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                          {task.due_date && (
                            <span className={isOverdue ? 'text-red-500 font-bold' : ''}>
                              📅 {new Date(task.due_date).toLocaleDateString('he-IL')}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Close Button */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setSelectedWorker(null)}
                className="w-full py-4 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-base hover:bg-slate-300 dark:hover:bg-slate-600 active:scale-95 transition-all touch-manipulation"
                style={{ minHeight: '52px', WebkitTapHighlightColor: 'transparent' }}
              >
                סגירה
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Priority Tasks Modal */}
      {selectedPriority && (
        <div 
          className="fixed inset-0 bg-black/70 flex items-end justify-center z-50"
          onClick={() => setSelectedPriority(null)}
        >
          <div 
            className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-t-3xl max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div 
              className="p-5 border-b border-slate-200 dark:border-slate-700 rounded-t-3xl"
              style={{ 
                background: selectedPriority.priority === 'critical' 
                  ? 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)'
                  : selectedPriority.priority === 'high'
                  ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)'
                  : selectedPriority.priority === 'medium'
                  ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                  : 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
              }}
            >
              <div className="flex items-center justify-between">
                <div className="text-white">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <span>🎯</span>
                    <span>{priorityLabels[selectedPriority.priority] || selectedPriority.priority}</span>
                  </h3>
                  <p className="text-white/80 text-sm mt-1">{selectedPriority.count} משימות</p>
                </div>
                <button
                  onClick={() => setSelectedPriority(null)}
                  className="w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center text-xl hover:bg-white/30 active:scale-95 transition-all touch-manipulation"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Tasks List */}
            <div className="flex-1 overflow-y-auto p-4">
              {loadingPriorityTasks ? (
                <div className="flex items-center justify-center py-10">
                  <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : priorityTasks.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-slate-400">אין משימות בעדיפות זו</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {priorityTasks.map((task) => {
                    const isOverdue = task.due_date && new Date(task.due_date) < new Date() && !['completed', 'verified'].includes(task.status);
                    return (
                      <div 
                        key={task.id}
                        className={`p-4 rounded-xl border ${
                          isOverdue 
                            ? 'border-red-300 dark:border-red-500/50 bg-red-50 dark:bg-red-900/10' 
                            : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50'
                        }`}
                      >
                        {/* Title */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4 className="font-bold text-slate-900 dark:text-white text-sm">{task.title}</h4>
                        </div>

                        {/* Description */}
                        {task.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 line-clamp-2">{task.description}</p>
                        )}

                        {/* Status Badge */}
                        <div className="flex flex-wrap gap-2 mb-2">
                          <span className={`px-2 py-1 rounded-lg text-xs font-bold text-white ${statusColors[task.status] || 'bg-slate-500'}`}>
                            {statusLabels[task.status] || task.status}
                          </span>
                          {isOverdue && (
                            <span className="px-2 py-1 rounded-lg text-xs font-bold bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                              ⚠️ באיחור
                            </span>
                          )}
                        </div>

                        {/* Tags */}
                        {task.tags && task.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {task.tags.map((tag: any) => (
                              <span
                                key={tag.id}
                                className="px-2 py-0.5 rounded text-[10px] font-bold text-white"
                                style={{ 
                                  background: tag.color2 
                                    ? `linear-gradient(135deg, ${tag.color} 0%, ${tag.color2} 100%)`
                                    : tag.color 
                                }}
                              >
                                {tag.name}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Meta Info */}
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                          {task.due_date && (
                            <span className={isOverdue ? 'text-red-500 font-bold' : ''}>
                              📅 {new Date(task.due_date).toLocaleDateString('he-IL')}
                            </span>
                          )}
                          {task.assignees && task.assignees.length > 0 && (
                            <span>
                              👤 {task.assignees.map((a: any) => a.name).join(', ')}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Close Button */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setSelectedPriority(null)}
                className="w-full py-4 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-base hover:bg-slate-300 dark:hover:bg-slate-600 active:scale-95 transition-all touch-manipulation"
                style={{ minHeight: '52px', WebkitTapHighlightColor: 'transparent' }}
              >
                סגירה
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="min-h-[6rem] sm:min-h-[8rem]" aria-hidden="true" />
    </div>
  );
}
