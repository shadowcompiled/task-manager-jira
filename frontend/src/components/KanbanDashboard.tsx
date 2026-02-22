import { useEffect, useState } from 'react';
import { useTaskStore, useAuthStore } from '../store';
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
    { id: 'verified', name: 'verified', displayName: '✓✓ אומת', color: '#059669' },
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
      
      // Initialize columns
      const newColumns: StatusColumn[] = DEFAULT_STATUSES.map(status => ({
        ...status,
        tasks: tasks.filter(task => task.status === status.name),
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

    const validStatuses = ['planned', 'assigned', 'in_progress', 'waiting', 'completed', 'verified', 'overdue'];
    const status = validStatuses.includes(statusName) 
      ? (statusName as 'planned' | 'assigned' | 'in_progress' | 'waiting' | 'completed' | 'verified' | 'overdue')
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
        return 'bg-red-100 text-red-800 border-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
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
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 text-center">
          <p className="text-gray-700 text-lg">לוח בקרה זמין לבעלי משימות בלבד</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 min-h-screen">
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
        <p className="text-gray-600 font-semibold text-sm md:text-base">
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
        <div className="text-center text-gray-600 py-12 font-bold">⏳ טוען משימות...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 overflow-x-hidden md:overflow-x-auto pb-6 min-w-0 w-full">
          {columns.map((column) => (
            <div
              key={column.id}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(column.name)}
              className="kanban-column bg-white rounded-lg shadow-lg border-2 border-gray-200 p-4 flex flex-col animate-slideIn hover:shadow-xl transition-shadow"
              style={{ borderTopColor: column.color }}
            >
              {/* Column Header */}
              <div className="mb-4 pb-3 border-b-2" style={{ borderBottomColor: column.color }}>
                <h2
                  className="font-bold text-lg text-white px-3 py-2 rounded-lg text-center"
                  style={{ backgroundColor: column.color }}
                >
                  {column.displayName}
                </h2>
                <p className="text-xs text-gray-500 text-center mt-2 font-bold">
                  {column.tasks.length} משימות
                </p>
              </div>

              {/* Tasks */}
              <div className="space-y-3 flex-1 overflow-y-auto">
                {column.tasks.length > 0 ? (
                  column.tasks.map((task) => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={() => handleDragStart(task)}
                      className="bg-gradient-to-br from-white to-gray-50 border-2 border-gray-300 rounded-lg p-3 cursor-move hover:shadow-lg hover:border-blue-400 transition-all transform hover:scale-105 active:scale-95"
                    >
                      {/* Task Title */}
                      <h3 className="font-bold text-gray-800 text-sm mb-2 line-clamp-2">
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
                      <div className="space-y-1 text-xs text-gray-600 mb-2">
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
                        <p className="text-xs text-gray-600 line-clamp-2 mb-2">{task.description}</p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-center text-gray-400 py-8 text-sm font-semibold">
                    אין משימות
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Mobile-friendly footer tip */}
      <div className="mt-6 lg:hidden bg-blue-50 border-2 border-blue-200 rounded-lg p-4 text-center">
        <p className="text-sm text-gray-700 font-semibold">
          💡 גרור משימות לשינוי סטטוס. גלול אופקיים לראות יותר עמודות
        </p>
      </div>
    </div>
  );
}
