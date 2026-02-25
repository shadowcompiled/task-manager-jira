import { useEffect, useState } from 'react';
import { useTaskStore, useAuthStore } from '../store';
import type { Task } from '../store';
import axios from 'axios';

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
}

interface StatusColumn {
  id: string;
  name: string;
  displayName: string;
  color: string;
  tasks: TaskWithAssignee[];
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export default function KanbanDashboard() {
  const { user, token } = useAuthStore();
  const { updateTask } = useTaskStore();
  const [columns, setColumns] = useState<StatusColumn[]>([]);
  const [draggedTask, setDraggedTask] = useState<TaskWithAssignee | null>(null);
  const [loading, setLoading] = useState(false);
  const [showStatusManager, setShowStatusManager] = useState(false);
  const [newStatusName, setNewStatusName] = useState('');
  const [newStatusColor, setNewStatusColor] = useState('#3b82f6');

  // Default statuses
  const DEFAULT_STATUSES = [
    { id: 'planned', name: 'planned', displayName: '📋 מתוכנן', color: '#94a3b8' },
    { id: 'assigned', name: 'assigned', displayName: '👤 הוקצה', color: '#60a5fa' },
    { id: 'in_progress', name: 'in_progress', displayName: '⚙️ בתהליך', color: '#8b5cf6' },
    { id: 'waiting', name: 'waiting', displayName: '⏸️ מחכה', color: '#f59e0b' },
    { id: 'completed', name: 'completed', displayName: '✓ הושלם', color: '#10b981' },
    { id: 'overdue', name: 'overdue', displayName: '🔴 בפיגור', color: '#ef4444' },
  ];

  // Load all tasks and organize by status
  const loadTasks = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/tasks`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const tasks: TaskWithAssignee[] = response.data;
      
      // Initialize columns (verified tasks shown in completed column)
      const newColumns: StatusColumn[] = DEFAULT_STATUSES.map(status => ({
        ...status,
        tasks: tasks.filter(task =>
          task.status === status.name || (status.name === 'completed' && task.status === 'verified')
        ),
      }));

      setColumns(newColumns);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  // Add new custom status
  const handleAddStatus = async () => {
    if (!newStatusName.trim()) return;

    try {
      await axios.post(
        `${API_BASE}/statuses`,
        {
          name: newStatusName.toLowerCase().replace(/\s+/g, '_'),
          displayName: newStatusName,
          color: newStatusColor,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setNewStatusName('');
      setNewStatusColor('#3b82f6');
      await loadTasks();
    } catch (error) {
      console.error('Failed to add status:', error);
    }
  };

  // Handle drag start
  const handleDragStart = (task: TaskWithAssignee) => {
    setDraggedTask(task);
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Handle drop - update task status
  const handleDrop = async (statusName: string) => {
    if (!draggedTask) return;

    const validStatuses = ['planned', 'assigned', 'in_progress', 'waiting', 'completed', 'overdue'];
    const status = validStatuses.includes(statusName) 
      ? (statusName as 'planned' | 'assigned' | 'in_progress' | 'waiting' | 'completed' | 'overdue')
      : 'planned';

    try {
      await updateTask(draggedTask.id, { status });
      
      // Update local state
      setColumns(prevColumns =>
        prevColumns.map(col => ({
          ...col,
          tasks: col.tasks.filter(t => t.id !== draggedTask.id),
        }))
      );

      const targetCol = columns.find(c => c.name === statusName);
      if (targetCol) {
        setColumns(prevColumns =>
          prevColumns.map(col =>
            col.name === statusName
              ? { ...col, tasks: [...col.tasks, { ...draggedTask, status }] }
              : col
          )
        );
      }

      await loadTasks();
    } catch (error) {
      console.error('Failed to update task:', error);
    } finally {
      setDraggedTask(null);
    }
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-400 dark:bg-red-900/40 dark:text-red-200 dark:border-red-600';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-400 dark:bg-orange-900/40 dark:text-orange-200 dark:border-orange-600';
      case 'medium':
        return 'bg-amber-100 text-amber-800 border-amber-400 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-600';
      case 'low':
        return 'bg-emerald-100 text-emerald-800 border-emerald-400 dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-600';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600';
    }
  };

  // Format estimated time
  const formatEstimatedTime = (minutes?: number) => {
    if (!minutes) return null;
    if (minutes < 60) return `${minutes}דקות`;
    if (minutes < 1440) return `${Math.round(minutes / 60)}שעות`;
    return `${Math.round(minutes / 1440)}ימים`;
  };

  useEffect(() => {
    if (user?.restaurant_id && token) {
      loadTasks();
    }
  }, [user?.restaurant_id, token]);

  if (!user?.role || !['manager', 'admin'].includes(user.role)) {
    return (
      <div className="p-6">
        <div className="bg-blue-50 dark:bg-slate-800 border-2 border-blue-200 dark:border-slate-600 rounded-lg p-6 text-center">
          <p className="text-gray-700 dark:text-slate-300 text-lg">לוח בקרה זמין לבעלי משימות בלבד</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 min-h-screen">
      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .animate-slideIn {
          animation: slideIn 0.3s ease-out;
        }
        .kanban-column {
          min-height: 500px;
          max-height: calc(100vh - 200px);
        }
      `}</style>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
          📊 לוח משימות
        </h1>
        <p className="text-gray-600 dark:text-slate-300 font-semibold text-sm md:text-base">
          גרור ושחרר משימות לשינוי סטטוס
        </p>
      </div>

      {/* Status Manager (for admins) */}
      {user?.role === 'admin' && (
        <div className="mb-6 bg-white rounded-lg shadow p-4 border-2 border-purple-200">
          <button
            onClick={() => setShowStatusManager(!showStatusManager)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 transition"
          >
            {showStatusManager ? '✕ סגור מנהל סטטוס' : '⚙️ הוסף סטטוס חדש'}
          </button>

          {showStatusManager && (
            <div className="mt-4 space-y-3 bg-purple-50 p-4 rounded-lg">
              <input
                type="text"
                placeholder="שם הסטטוס החדש"
                value={newStatusName}
                onChange={(e) => setNewStatusName(e.target.value)}
                className="w-full px-3 py-2 border-2 border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={newStatusColor}
                  onChange={(e) => setNewStatusColor(e.target.value)}
                  className="w-12 h-10 rounded cursor-pointer"
                />
                <button
                  onClick={handleAddStatus}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition"
                >
                  ✓ הוסף סטטוס
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Kanban Board */}
      {loading ? (
        <div className="text-center text-gray-600 dark:text-slate-300 py-12 font-bold">⏳ טוען משימות...</div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-6 min-w-0 w-full">
          {columns.map((column) => (
            <div
              key={column.id}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(column.name)}
              className="kanban-column w-[75vw] sm:w-[280px] md:w-[300px] flex-shrink-0 bg-white dark:bg-slate-800 rounded-lg shadow-lg border-2 border-gray-200 dark:border-slate-600 p-3 flex flex-col animate-slideIn hover:shadow-xl transition-shadow"
              style={{ borderTopColor: column.color }}
            >
              {/* Column Header */}
              <div className="mb-2 pb-2 border-b-2" style={{ borderBottomColor: column.color }}>
                <h2
                  className="font-bold text-lg text-white px-3 py-2 rounded-lg text-center"
                  style={{ backgroundColor: column.color }}
                >
                  {column.displayName}
                </h2>
                <p className="text-xs text-gray-500 dark:text-slate-400 text-center mt-2 font-bold">
                  {column.tasks.length} משימות
                </p>
              </div>

              {/* Tasks */}
              <div className="space-y-2 flex-1 overflow-y-auto">
                {column.tasks.length > 0 ? (
                  column.tasks.map((task) => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => {
                        handleDragStart(task);
                        e.currentTarget.style.opacity = '0.6';
                        e.currentTarget.style.zIndex = '9999';
                      }}
                      onDragEnd={(e) => {
                        e.currentTarget.style.opacity = '1';
                        e.currentTarget.style.zIndex = '';
                      }}
                      className="bg-gradient-to-br from-white to-gray-50 dark:from-slate-700 dark:to-slate-800 border-2 border-gray-300 dark:border-slate-600 rounded-lg p-2.5 cursor-grab hover:shadow-lg hover:border-blue-400 dark:hover:border-teal-500 transition-all duration-200 ease-out active:cursor-grabbing"
                    >
                      {/* Task Title */}
                      <h3 className="font-bold text-gray-800 dark:text-slate-100 text-sm mb-2 line-clamp-2">
                        {task.title}
                      </h3>

                      {/* Priority Badge */}
                      <div className="mb-2">
                        <span className={`text-xs font-bold px-2 py-1 rounded-full border ${getPriorityColor(task.priority)}`}>
                          {task.priority === 'critical' && '🔴 חירום'}
                          {task.priority === 'high' && '🟠 גבוה'}
                          {task.priority === 'medium' && '🟡 בינוני'}
                          {task.priority === 'low' && '🟢 נמוך'}
                        </span>
                      </div>

                      {/* Assigned User & Estimated Time */}
                      <div className="space-y-1 text-xs text-gray-600 dark:text-slate-300 mb-2">
                        {task.assigned_to_name && (
                          <p className="font-semibold">👤 {task.assigned_to_name}</p>
                        )}
                        {task.estimated_time && (
                          <p className="font-semibold">⏱️ {formatEstimatedTime(task.estimated_time)}</p>
                        )}
                        {task.due_date && (
                          <p className="font-semibold">📅 {new Date(task.due_date).toLocaleDateString('he-IL')}</p>
                        )}
                      </div>

                      {/* Description */}
                      {task.description && (
                        <p className="text-xs text-gray-600 dark:text-slate-400 line-clamp-2 mb-2">{task.description}</p>
                      )}

                      {/* Status shortcuts */}
                      <div className="flex flex-wrap gap-1 pt-2 border-t border-gray-200 dark:border-slate-600" onClick={(e) => e.stopPropagation()}>
                        {DEFAULT_STATUSES.filter((s) => s.name !== task.status).slice(0, 4).map((s) => (
                          <button
                            key={s.name}
                            type="button"
                            onClick={async () => {
                              try {
                                await updateTask(task.id, { status: s.name as Task['status'] });
                                await loadTasks();
                              } catch (err) {
                                console.error('Failed to update status', err);
                              }
                            }}
                            className="px-2 py-0.5 rounded text-[10px] font-bold border bg-white/80 dark:bg-slate-700/80 text-gray-700 dark:text-slate-200 hover:opacity-90 transition-opacity"
                            style={{ borderColor: s.color, color: s.color }}
                          >
                            {s.displayName}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-gray-400 dark:text-slate-500 py-3 text-xs font-semibold">
                    אין משימות
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Mobile-friendly footer tip */}
      <div className="mt-6 lg:hidden bg-blue-50 dark:bg-slate-800 border-2 border-blue-200 dark:border-slate-600 rounded-lg p-4 text-center">
        <p className="text-sm text-gray-700 dark:text-slate-300 font-semibold">
          💡 גרור משימות לשינוי סטטוס. גלול אופקיים לראות יותר עמודות
        </p>
      </div>
    </div>
  );
}
