import { useEffect } from 'react';
import { useTaskStore, useAuthStore } from '../store';
import TaskCard from './TaskCard';

export default function DailyTaskList({ onTaskSelect }: { onTaskSelect: (task: any) => void }) {
  const { tasks, fetchTasks } = useTaskStore();
  const { user } = useAuthStore();

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Filter tasks for workers to only show their assigned tasks
  const filteredTasks = user?.role === 'worker'
    ? tasks.filter((task) => task.assigned_to === user.id)
    : tasks;

  // Group tasks by status
  const pendingTasks = filteredTasks.filter((t) => !['completed', 'verified'].includes(t.status));
  const completedTasks = filteredTasks.filter((t) => ['completed', 'verified'].includes(t.status));

  // Sort by: 1) Overdue first, 2) Priority (critical > high > medium > low), 3) Due date (closest first)
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  const sortTasks = (a: any, b: any) => {
    const now = new Date();
    const aOverdue = a.due_date && new Date(a.due_date) < now && !['completed', 'verified'].includes(a.status);
    const bOverdue = b.due_date && new Date(b.due_date) < now && !['completed', 'verified'].includes(b.status);
    
    // Overdue tasks first
    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;
    
    // Then by priority (critical = 0 = highest)
    const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 4;
    const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 4;
    if (aPriority !== bPriority) return aPriority - bPriority;
    
    // Then by due date (closest first)
    if (a.due_date && b.due_date) {
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    }
    if (a.due_date) return -1;
    if (b.due_date) return 1;
    
    return 0;
  };

  return (
    <div className="p-4 pb-24 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">המשימות שלי</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {pendingTasks.length} משימות פעילות
        </p>
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
          <div className="space-y-3">
            {[...pendingTasks].sort(sortTasks).map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onClick={() => onTaskSelect(task)}
                showEditButton={user?.role !== 'worker'}
                onEdit={() => onTaskSelect(task)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Completed Tasks */}
      {completedTasks.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-slate-400 dark:text-slate-500 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full" />
            משימות שהושלמו ({completedTasks.length})
          </h2>
          <div className="space-y-3 opacity-60">
            {completedTasks.slice(0, 5).map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onClick={() => onTaskSelect(task)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
