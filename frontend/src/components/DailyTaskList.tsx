import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useTaskStore, useAuthStore } from '../store';
import TaskCard from './TaskCard';

const listVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.02 },
  },
};

type QuickFilter = 'all' | 'my' | 'overdue' | 'due_today';

export default function DailyTaskList({ onTaskSelect, onEditTask }: { onTaskSelect: (task: any) => void; onEditTask?: (task: any) => void }) {
  const { tasks, fetchTasks } = useTaskStore();
  const { user } = useAuthStore();
  const [showCompleted, setShowCompleted] = useState(false);
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [pullY, setPullY] = useState(0);
  const pullStart = useRef(0);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  let filteredTasks = user?.role === 'worker'
    ? tasks.filter((task) => task.assigned_to === user.id)
    : tasks;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

  if (quickFilter === 'my') {
    filteredTasks = filteredTasks.filter((t) => t.assigned_to === user?.id);
  } else if (quickFilter === 'overdue') {
    filteredTasks = filteredTasks.filter((t) => t.due_date && new Date(t.due_date) < now && !['completed', 'verified'].includes(t.status));
  } else if (quickFilter === 'due_today') {
    filteredTasks = filteredTasks.filter((t) => t.due_date && new Date(t.due_date) >= todayStart && new Date(t.due_date) < todayEnd && !['completed', 'verified'].includes(t.status));
  }

  if (searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase();
    filteredTasks = filteredTasks.filter((t: any) =>
      (t.title || '').toLowerCase().includes(q) ||
      (t.tags && Array.isArray(t.tags) && t.tags.some((tag: any) => (tag.name || '').toLowerCase().includes(q)))
    );
  }

  const pendingTasks = filteredTasks.filter((t) => !['completed', 'verified'].includes(t.status));
  const completedTasks = filteredTasks.filter((t) => ['completed', 'verified'].includes(t.status));

  const allPending = (user?.role === 'worker' ? tasks.filter((t) => t.assigned_to === user.id) : tasks).filter((t) => !['completed', 'verified'].includes(t.status));
  const dueTodayCount = allPending.filter((t) => t.due_date && new Date(t.due_date) >= todayStart && new Date(t.due_date) < todayEnd).length;
  const overdueCount = allPending.filter((t) => t.due_date && new Date(t.due_date) < now).length;

  // Sort by: 1) Overdue first, 2) Due date (closest first), 3) Priority (critical > high > medium > low)
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  const sortTasks = (a: any, b: any) => {
    const now = new Date();
    const aOverdue = a.due_date && new Date(a.due_date) < now && !['completed', 'verified'].includes(a.status);
    const bOverdue = b.due_date && new Date(b.due_date) < now && !['completed', 'verified'].includes(b.status);
    
    // Overdue tasks first
    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;
    
    // Then by due date (closest first)
    if (a.due_date && b.due_date) {
      const dateDiff = new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      if (dateDiff !== 0) return dateDiff;
    }
    if (a.due_date && !b.due_date) return -1;
    if (!a.due_date && b.due_date) return 1;
    
    // Then by priority (critical = 0 = highest)
    const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 4;
    const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 4;
    return aPriority - bPriority;
  };

  const handleTouchStart = (e: React.TouchEvent) => { pullStart.current = e.touches[0].clientY; };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches[0].clientY > pullStart.current) setPullY(Math.min(80, e.touches[0].clientY - pullStart.current));
  };
  const handleTouchEnd = () => {
    if (pullY > 50) fetchTasks();
    setPullY(0);
  };

  return (
    <div
      className="p-4 sm:p-4 max-w-2xl mx-auto w-full min-w-0 pb-6"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {pullY > 20 && (
        <div className="text-center py-2 text-teal-500 text-sm">
          {pullY > 50 ? 'מרענן...' : 'משוך לרענון'}
        </div>
      )}
      {/* Header + Summary */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">המשימות שלי</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {pendingTasks.length} משימות פעילות
          {dueTodayCount > 0 || overdueCount > 0 ? ` · ${dueTodayCount} להיום · ${overdueCount} באיחור` : ''}
        </p>
        <p className="text-xs text-teal-600 dark:text-teal-400 mt-1">📊 מיון: באיחור ← תאריך יעד ← עדיפות</p>
      </div>

      {/* Search */}
      <input
        type="search"
        placeholder="חיפוש לפי כותרת או תג..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full mb-3 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none text-base"
        dir="rtl"
      />

      {/* Quick filters */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {(['all', 'my', 'overdue', 'due_today'] as QuickFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setQuickFilter(f)}
            className={`shrink-0 min-h-[44px] px-4 py-2.5 rounded-xl text-sm font-bold transition-colors touch-manipulation ${
              quickFilter === f
                ? 'bg-teal-600 text-white'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
            }`}
          >
            {f === 'all' && 'הכל'}
            {f === 'my' && 'שלי'}
            {f === 'overdue' && 'באיחור'}
            {f === 'due_today' && 'להיום'}
          </button>
        ))}
      </div>

      {/* Pending Tasks */}
      <div className="mb-6">
        <h2 className="text-sm font-bold text-teal-600 dark:text-teal-400 mb-3 flex items-center gap-2">
          <span className="w-2 h-2 bg-teal-500 rounded-full" />
          משימות פעילות ({pendingTasks.length})
        </h2>
        
        {pendingTasks.length === 0 ? (
          <div className="p-8 bg-white dark:bg-slate-800 rounded-2xl text-center border border-slate-200 dark:border-slate-700 shadow-sm">
            <p className="text-slate-600 dark:text-slate-400 text-lg mb-2">אין משימות פעילות</p>
            <p className="text-slate-400 dark:text-slate-500 text-sm">כל הכבוד! סיימת הכל 🎉</p>
          </div>
        ) : (
          <motion.div
            className="space-y-3 sm:space-y-4"
            variants={listVariants}
            initial="hidden"
            animate="visible"
          >
            {[...pendingTasks].sort(sortTasks).map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onClick={() => onTaskSelect(task)}
                showEditButton={user?.role !== 'worker'}
                onEdit={() => onEditTask ? onEditTask(task) : onTaskSelect(task)}
              />
            ))}
          </motion.div>
        )}
      </div>

      {/* Completed Tasks */}
      {completedTasks.length > 0 && (
        <div>
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="w-full text-sm font-bold text-slate-400 dark:text-slate-500 mb-3 flex items-center justify-between gap-2 p-3 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full" />
              משימות שהושלמו ({completedTasks.length})
            </div>
            <span className={`transition-transform ${showCompleted ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </button>
          {showCompleted && (
            <div className="space-y-3 opacity-60">
              {completedTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onClick={() => onTaskSelect(task)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
