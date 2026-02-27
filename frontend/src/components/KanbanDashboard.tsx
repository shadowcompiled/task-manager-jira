import { useEffect, useRef, useState } from 'react';
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

interface StatusFromApi {
  id: number;
  name: string;
  display_name: string;
  color: string;
  order_index: number;
}

interface StatusColumn {
  id: string;
  name: string;
  displayName: string;
  color: string;
  tasks: TaskWithAssignee[];
}

const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3000/api' : '/api');

function getStatusName(s: StatusFromApi | { name?: string; Name?: string }): string {
  return String((s as any)?.name ?? (s as any)?.Name ?? '').trim();
}

export default function KanbanDashboard() {
  const { user, token } = useAuthStore();
  const { updateTask } = useTaskStore();
  const [statuses, setStatuses] = useState<StatusFromApi[]>([]);
  const [columns, setColumns] = useState<StatusColumn[]>([]);
  const [draggedTask, setDraggedTask] = useState<TaskWithAssignee | null>(null);
  const [loading, setLoading] = useState(false);
  const [showStatusManager, setShowStatusManager] = useState(false);
  const [newStatusName, setNewStatusName] = useState('');
  const [newStatusColor, setNewStatusColor] = useState('#3b82f6');
  const dragScrollListenerRef = useRef<((ev: DragEvent) => void) | null>(null);
  const dropFallbackListenerRef = useRef<((ev: DragEvent) => void) | null>(null);
  const handleDropRef = useRef<(statusName: string) => void>(() => {});

  // Keep ref updated so document-level drop listener always sees current handleDrop
  useEffect(() => {
    handleDropRef.current = handleDrop;
  });

  // Unmount cleanup: ensure scroll lock and drag-scroll/drop-fallback listeners are removed if user navigates away during drag
  useEffect(() => {
    return () => {
      document.body.classList.remove('kanban-dragging');
      const scrollListener = dragScrollListenerRef.current;
      if (scrollListener) {
        document.removeEventListener('dragover', scrollListener);
        dragScrollListenerRef.current = null;
      }
      const dropListener = dropFallbackListenerRef.current;
      if (dropListener) {
        document.removeEventListener('drop', dropListener, true);
        dropFallbackListenerRef.current = null;
      }
    };
  }, []);

  // Load statuses from API (same as Kanban) then tasks; build columns from org statuses
  const loadTasks = async () => {
    const orgId = user?.organization_id ?? user?.restaurant_id;
    if (!orgId || !token) return;
    try {
      setLoading(true);
      const [statusRes, tasksRes] = await Promise.all([
        axios.get<StatusFromApi[]>(`${API_BASE}/statuses/restaurant/${orgId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get<TaskWithAssignee[]>(`${API_BASE}/tasks`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      const apiStatuses = statusRes.data ?? [];
      setStatuses(apiStatuses);
      const tasks: TaskWithAssignee[] = tasksRes.data ?? [];
      const statusList = apiStatuses.filter((st) => getStatusName(st) !== 'verified');
      const newColumns: StatusColumn[] = statusList.map((st) => ({
        id: String(st.id),
        name: getStatusName(st),
        displayName: (st as any).display_name ?? st.name,
        color: st.color ?? '#94a3b8',
        tasks: tasks.filter((task) => {
          const taskStatus = (task.status || '').trim();
          const statusName = getStatusName(st);
          return taskStatus === statusName || (statusName === 'completed' && taskStatus === 'verified');
        }),
      }));
      setColumns(newColumns);
    } catch (error) {
      console.error('Failed to load tasks or statuses:', error);
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

  // Handle drag start - lock main scroll; use custom dark drag image so no white background shows
  const handleDragStart = (task: TaskWithAssignee, e: React.DragEvent) => {
    setDraggedTask(task);
    document.body.classList.add('kanban-dragging');
    const dt = e.dataTransfer;
    if (dt) {
      const ghost = document.createElement('div');
      ghost.setAttribute('aria-hidden', 'true');
      ghost.style.cssText = 'position:absolute;top:-9999px;left:0;width:260px;min-height:80px;padding:10px;border-radius:8px;background:rgb(51 65 85);border:2px solid rgb(71 85 105);color:rgb(226 232 240);font-size:12px;font-weight:700;box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);pointer-events:none;';
      ghost.textContent = task.title || 'משימה';
      document.body.appendChild(ghost);
      dt.setDragImage(ghost, 20, 16);
      requestAnimationFrame(() => ghost.remove());
    }
    // Narrow band (48px) so user can drop on columns near top/bottom without triggering scroll; do not preventDefault so dragover reaches column under pointer
    const SCROLL_THRESHOLD = 48;
    const SCROLL_STEP = 12;
    const onDragOverScroll = (ev: DragEvent) => {
      const main = document.querySelector<HTMLElement>('main.main-scroll');
      if (!main) return;
      const y = ev.clientY;
      if (y < SCROLL_THRESHOLD) {
        main.scrollTop = Math.max(0, main.scrollTop - SCROLL_STEP);
      } else if (y > window.innerHeight - SCROLL_THRESHOLD) {
        main.scrollTop = Math.min(main.scrollHeight - main.clientHeight, main.scrollTop + SCROLL_STEP);
      }
      // Do not call ev.preventDefault() here so dragover can reach the column under the pointer and drop target stays correct after scroll
    };
    dragScrollListenerRef.current = onDragOverScroll;

    // When drop lands on spacer/header/footer, resolve column from a point inside the visible main content (accurate when scrolled down)
    const onDropFallback = (ev: DragEvent) => {
      const main = document.querySelector<HTMLElement>('main.main-scroll');
      if (!main) return;
      const mainRect = main.getBoundingClientRect();
      const x = ev.clientX;
      const inHeaderZone = ev.clientY < mainRect.top + 80;
      const inFooterZone = ev.clientY > mainRect.bottom - 80;
      let col: HTMLElement | null = null;
      if (inHeaderZone) {
        const y = mainRect.top + Math.min(120, mainRect.height / 3);
        col = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-kanban-dash-column]') ?? null;
      } else if (inFooterZone) {
        const columns = main.querySelectorAll<HTMLElement>('[data-kanban-dash-column]');
        let lowestBottom = mainRect.top;
        for (const el of columns) {
          const rect = el.getBoundingClientRect();
          if (rect.bottom > mainRect.top && rect.top < mainRect.bottom && rect.bottom > lowestBottom) {
            lowestBottom = rect.bottom;
            col = el;
          }
        }
        if (!col) {
          for (const offset of [80, 150, 220]) {
            const y = mainRect.bottom - offset;
            if (y <= mainRect.top) break;
            col = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-kanban-dash-column]') ?? null;
            if (col) break;
          }
        }
        if (!col) col = document.elementFromPoint(x, mainRect.top + mainRect.height / 2)?.closest<HTMLElement>('[data-kanban-dash-column]') ?? null;
      } else {
        col = document.elementFromPoint(x, ev.clientY)?.closest<HTMLElement>('[data-kanban-dash-column]') ?? null;
      }
      if (col) {
        const name = col.getAttribute('data-kanban-dash-column');
        if (name) {
          ev.preventDefault();
          ev.stopPropagation();
          handleDropRef.current(name);
        }
      }
    };
    dropFallbackListenerRef.current = onDropFallback;
    document.addEventListener('drop', onDropFallback, true);

    const onDragEnd = () => {
      document.body.classList.remove('kanban-dragging');
      document.removeEventListener('dragend', onDragEnd);
      if (dragScrollListenerRef.current) {
        document.removeEventListener('dragover', dragScrollListenerRef.current);
        dragScrollListenerRef.current = null;
      }
      if (dropFallbackListenerRef.current) {
        document.removeEventListener('drop', dropFallbackListenerRef.current, true);
        dropFallbackListenerRef.current = null;
      }
      setDraggedTask(null);
    };
    document.addEventListener('dragend', onDragEnd);
    document.addEventListener('dragover', onDragOverScroll);
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Handle drop - update task status (use API status names, same as Kanban)
  const handleDrop = async (statusName: string) => {
    if (!draggedTask) return;
    const status = statuses.some((s) => getStatusName(s) === statusName) ? statusName : (statuses[0] && getStatusName(statuses[0])) || 'planned';

    try {
      await updateTask(draggedTask.id, { status: status as Task['status'] });
      
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
      document.body.classList.remove('kanban-dragging');
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
    const orgId = user?.organization_id ?? user?.restaurant_id;
    if (orgId && token) {
      loadTasks();
    }
  }, [user?.organization_id, user?.restaurant_id, token]);

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
    <div className="min-h-screen w-full min-w-0 bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="max-w-6xl mx-auto w-full px-4 md:px-6 py-2 md:py-4">
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
      <div className="mb-3 md:mb-4">
        <h1 className="flex items-center gap-1.5 text-3xl md:text-4xl font-bold mb-2">
          <span className="emoji-icon shrink-0 min-w-[1em]">📊</span>
          <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">לוח משימות</span>
        </h1>
        <p className="text-gray-600 dark:text-slate-300 font-semibold text-sm md:text-base">
          גרור ושחרר משימות לשינוי סטטוס
        </p>
      </div>

      {/* Status Manager (for admins) - no solid background so it matches the section */}
      {user?.role === 'admin' && (
        <div className="mb-6 bg-transparent rounded-lg p-4 border-2 border-purple-200 dark:border-purple-500/40">
          <button
            onClick={() => setShowStatusManager(!showStatusManager)}
            className="emoji-icon px-4 py-2 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 transition"
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
                  className="emoji-icon flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition"
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 overflow-x-hidden md:overflow-x-auto pb-2 min-w-0 w-full">
          {columns.map((column) => (
            <div
              key={column.id}
              data-kanban-dash-column={column.name}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(column.name)}
              className="kanban-column min-w-0 bg-transparent rounded-lg border-2 border-gray-200 dark:border-slate-600 p-3 flex flex-col animate-slideIn transition-shadow"
              style={{ borderTopColor: column.color }}
            >
              {/* Column Header - no wrapper background so status container has no white behind it */}
              <div className="mb-2 pb-2 border-b-2 bg-transparent" style={{ borderBottomColor: column.color }}>
                <h2
                  className="emoji-icon font-bold text-lg text-white px-3 py-2 rounded-lg text-center"
                  style={{ backgroundColor: column.color }}
                >
                  {column.displayName}
                </h2>
                <p className="text-xs text-gray-500 dark:text-slate-400 text-center mt-2 font-bold">
                  {column.tasks.length} משימות
                </p>
              </div>

              {/* Tasks - vertical stack so missions appear one below the other */}
              <div className="flex flex-col gap-2 min-w-0 min-h-0">
                {column.tasks.length > 0 ? (
                  column.tasks.map((task) => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(ev) => handleDragStart(task, ev)}
                      className="w-full min-w-0 bg-gradient-to-br from-white to-gray-50 dark:from-slate-700 dark:to-slate-800 border-2 border-gray-300 dark:border-slate-600 rounded-lg p-2.5 cursor-move hover:shadow-lg hover:border-blue-400 dark:hover:border-teal-500 transition-all duration-200 ease-out transform hover:scale-[1.01] active:scale-[0.98]"
                    >
                      {/* Task Title */}
                      <h3 className="font-bold text-gray-800 dark:text-slate-100 text-sm mb-2 line-clamp-2">
                        {task.title}
                      </h3>

                      {/* Priority Badge */}
                      <div className="mb-2">
                        <span className={`emoji-icon text-xs font-bold px-2 py-1 rounded-full border ${getPriorityColor(task.priority)}`}>
                          {task.priority === 'critical' && '🔴 חירום'}
                          {task.priority === 'high' && '🟠 גבוה'}
                          {task.priority === 'medium' && '🟡 בינוני'}
                          {task.priority === 'low' && '🟢 נמוך'}
                        </span>
                      </div>

                      {/* Assigned User & Estimated Time */}
                      <div className="space-y-1 text-xs text-gray-600 dark:text-slate-300 mb-2">
                        {task.assigned_to_name && (
                          <p className="emoji-icon font-semibold">👤 {task.assigned_to_name}</p>
                        )}
                        {task.estimated_time && (
                          <p className="emoji-icon font-semibold">⏱️ {formatEstimatedTime(task.estimated_time)}</p>
                        )}
                        {task.due_date && (
                          <p className="emoji-icon font-semibold">📅 {new Date(task.due_date).toLocaleDateString('he-IL')}</p>
                        )}
                      </div>

                      {/* Description */}
                      {task.description && (
                        <p className="text-xs text-gray-600 dark:text-slate-400 line-clamp-2 mb-2">{task.description}</p>
                      )}

                      {/* Status shortcuts - same statuses as Kanban columns */}
                      <div className="flex flex-wrap gap-1 pt-2 border-t border-gray-200 dark:border-slate-600" onClick={(e) => e.stopPropagation()}>
                        {columns.filter((col) => col.name !== task.status).slice(0, 4).map((col) => (
                          <button
                            key={col.id}
                            type="button"
                            onClick={async () => {
                              try {
                                await updateTask(task.id, { status: col.name as Task['status'] });
                                await loadTasks();
                              } catch (err) {
                                console.error('Failed to update status', err);
                              }
                            }}
                            className="px-2 py-0.5 rounded text-[10px] font-bold border bg-white/80 dark:bg-slate-700/80 text-gray-700 dark:text-slate-200 hover:opacity-90 transition-opacity"
                            style={{ borderColor: col.color, color: col.color }}
                          >
                            {col.displayName}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="w-full min-h-[4rem] flex items-center justify-center rounded-lg border-2 border-dashed border-gray-300 dark:border-slate-600 text-gray-400 dark:text-slate-500 text-xs font-semibold py-4">
                    אין משימות
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Compact footer tip - soft styling, no large gap above app footer */}
      <div className="mt-1 lg:hidden rounded-lg px-3 py-2.5 text-center bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-600/70 shadow-sm">
        <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
          <span className="inline-block ml-1 opacity-90" aria-hidden>💡</span>
          גרור משימות לשינוי סטטוס. גלול לראות יותר עמודות — גרור כלפי הכותרת או התחתית כדי לגלול
        </p>
      </div>
      </div>
    </div>
  );
}
