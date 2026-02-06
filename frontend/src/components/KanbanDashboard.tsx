import { useEffect, useState } from 'react';
import { useTaskStore, useAuthStore } from '../store';
import TaskCard from './TaskCard';
import TaskDetail from './TaskDetail';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface TaskWithAssignee {
  id: number;
  title: string;
  description?: string;
  assigned_to?: number;
  assigned_to_name?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: string;
  due_date?: string;
  estimated_time?: number;
  created_at: string;
  tags?: any[];
  recurrence?: string;
}

interface StatusColumn {
  name: string;
  displayName: string;
  color: string;
  tasks: TaskWithAssignee[];
}

const DEFAULT_STATUSES = [
  { name: 'planned', displayName: 'מתוכנן', color: '#64748b' },
  { name: 'assigned', displayName: 'הוקצה', color: '#3b82f6' },
  { name: 'in_progress', displayName: 'בביצוע', color: '#8b5cf6' },
  { name: 'waiting', displayName: 'ממתין', color: '#f59e0b' },
  { name: 'completed', displayName: 'הושלם', color: '#10b981' },
  { name: 'verified', displayName: 'אומת', color: '#059669' },
];

export default function KanbanDashboard() {
  const { user, token } = useAuthStore();
  const { updateTask } = useTaskStore();
  const [columns, setColumns] = useState<StatusColumn[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskWithAssignee | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('all');

  const loadTasks = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/tasks`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const tasks: TaskWithAssignee[] = response.data;
      
      const newColumns: StatusColumn[] = DEFAULT_STATUSES.map(status => ({
        ...status,
        tasks: tasks.filter(task => task.status === status.name),
      }));

      setColumns(newColumns);
    } catch (error) {
      console.error('שגיאה בטעינת משימות:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (taskId: number, newStatus: string) => {
    try {
      await updateTask(taskId, { status: newStatus as any });
      await loadTasks();
    } catch (error) {
      console.error('שגיאה בעדכון סטטוס:', error);
    }
  };

  useEffect(() => {
    if (user?.restaurant_id && token) {
      loadTasks();
    }
  }, [user?.restaurant_id, token]);

  if (!user?.role || !['maintainer', 'admin'].includes(user.role)) {
    return (
      <div className="p-4 text-center">
        <p className="text-slate-400">לוח זה זמין למנהלים בלבד</p>
      </div>
    );
  }

  // Priority order for sorting
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  const sortByPriority = (a: TaskWithAssignee, b: TaskWithAssignee) => {
    const aPriority = priorityOrder[a.priority] ?? 4;
    const bPriority = priorityOrder[b.priority] ?? 4;
    return aPriority - bPriority;
  };

  // Get all tasks flattened for filtering, sorted by priority
  const allTasks = columns.flatMap(col => col.tasks);
  const filteredTasks = (activeFilter === 'all' 
    ? allTasks 
    : allTasks.filter(task => task.status === activeFilter)
  ).sort(sortByPriority);

  // Stats
  const totalTasks = allTasks.length;
  const completedTasks = allTasks.filter(t => ['completed', 'verified'].includes(t.status)).length;
  const overdueTasks = allTasks.filter(t => 
    t.due_date && new Date(t.due_date) < new Date() && !['completed', 'verified'].includes(t.status)
  ).length;

  return (
    <div className="p-4 pb-24">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-xl font-bold text-white mb-1">ניהול משימות</h1>
        <p className="text-sm text-slate-400">סקירה מהירה וניהול</p>
        <p className="text-xs text-teal-400 mt-1">📊 מיון: לפי עדיפות (קריטי ← גבוה ← בינוני ← נמוך)</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-slate-800 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-white">{totalTasks}</p>
          <p className="text-xs text-slate-400">סה"כ</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-teal-400">{completedTasks}</p>
          <p className="text-xs text-slate-400">הושלמו</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-orange-400">{overdueTasks}</p>
          <p className="text-xs text-slate-400">באיחור</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-4 -mx-4 px-4">
        <button
          onClick={() => setActiveFilter('all')}
          className={`flex-shrink-0 px-4 py-2 rounded-lg font-bold text-sm ${
            activeFilter === 'all' ? 'bg-teal-600 text-white' : 'bg-slate-800 text-slate-400'
          }`}
        >
          הכל ({allTasks.length})
        </button>
        {columns.map((col) => (
          <button
            key={col.name}
            onClick={() => setActiveFilter(col.name)}
            className={`flex-shrink-0 px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap ${
              activeFilter === col.name ? 'bg-teal-600 text-white' : 'bg-slate-800 text-slate-400'
            }`}
          >
            {col.displayName} ({col.tasks.length})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-8">
          <p className="text-teal-400">טוען משימות...</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-8 bg-slate-800 rounded-xl">
              <p className="text-slate-400 text-lg mb-1">אין משימות</p>
              <p className="text-slate-500 text-sm">צור משימה חדשה להתחיל</p>
            </div>
          ) : (
            filteredTasks.map((task) => (
              <div key={task.id}>
                <TaskCard
                  task={task}
                  onClick={() => setSelectedTask(task)}
                  showEditButton={true}
                  onEdit={() => setSelectedTask(task)}
                />
                
                {/* Quick Status Buttons */}
                <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
                  {columns
                    .filter(col => col.name !== task.status)
                    .slice(0, 4)
                    .map(col => (
                      <button
                        key={col.name}
                        onPointerUp={(e) => {
                          e.stopPropagation();
                          handleStatusChange(task.id, col.name);
                        }}
                        className="flex-shrink-0 px-5 py-4 bg-slate-700 text-slate-300 rounded-xl text-base font-bold whitespace-nowrap hover:bg-slate-600 active:bg-slate-500 active:scale-95 transition-all select-none"
                        style={{ 
                          minHeight: '52px', 
                          WebkitTapHighlightColor: 'transparent',
                          touchAction: 'manipulation',
                          userSelect: 'none',
                          WebkitUserSelect: 'none'
                        }}
                      >
                        {col.displayName}
                      </button>
                    ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetail
          taskId={selectedTask.id}
          onClose={() => setSelectedTask(null)}
          onTaskUpdate={() => {
            loadTasks();
            setSelectedTask(null);
          }}
        />
      )}
    </div>
  );
}
