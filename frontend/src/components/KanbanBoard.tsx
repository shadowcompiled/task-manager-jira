import { useEffect, useState } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import type { DropResult, DroppableProvided, DroppableStateSnapshot, DraggableProvided, DraggableStateSnapshot } from 'react-beautiful-dnd';
import { useTaskStore, useAuthStore } from '../store';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface Status {
  id: number;
  name: string;
  display_name: string;
  color: string;
  order_index: number;
}

const priorityColors: Record<string, string> = {
  low: '#10b981',
  medium: '#f59e0b',
  high: '#f97316',
  critical: '#ef4444',
};

const priorityLabels: Record<string, string> = {
  low: 'נמוכה',
  medium: 'בינונית',
  high: 'גבוהה',
  critical: 'קריטית',
};

export default function KanbanBoard({ onTaskSelect }: { onTaskSelect: (task: any) => void }) {
  const { tasks, fetchTasks, updateTask, deleteTask } = useTaskStore();
  const { user, token } = useAuthStore();
  const [tasksByStatus, setTasksByStatus] = useState<Record<string, any[]>>({});
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [loading, setLoading] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<any>(null);

  const isManager = user?.role === 'admin' || user?.role === 'maintainer';

  const handleDeleteTask = async () => {
    if (!taskToDelete) return;
    try {
      await deleteTask(taskToDelete.id);
      setTaskToDelete(null);
      fetchTasks();
    } catch (error) {
      console.error('שגיאה במחיקת משימה:', error);
    }
  };

  // Fetch statuses on mount
  useEffect(() => {
    if (!user || !token) return;
    const fetchStatuses = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${API_BASE}/statuses/restaurant/${user.restaurant_id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setStatuses(res.data);
      } catch (error) {
        console.error('שגיאה בטעינת סטטוסים:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStatuses();
    fetchTasks();
  }, [user, token]);

  // Organize tasks by status
  useEffect(() => {
    if (tasks && statuses.length > 0) {
      const grouped: Record<string, any[]> = {};
      statuses.forEach((status) => {
        grouped[status.name] = tasks.filter((task) => task.status === status.name);
      });
      setTasksByStatus(grouped);
    }
  }, [tasks, statuses]);

  // Handle drag and drop
  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result as DropResult & { draggableId: string };
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const taskId = parseInt(draggableId);
    const newStatus = destination.droppableId;

    // Optimistic update
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      const newTasksByStatus = { ...tasksByStatus };
      newTasksByStatus[source.droppableId] = newTasksByStatus[source.droppableId].filter(t => t.id !== taskId);
      const updatedTask = { ...task, status: newStatus };
      newTasksByStatus[destination.droppableId] = [
        ...newTasksByStatus[destination.droppableId].slice(0, destination.index),
        updatedTask,
        ...newTasksByStatus[destination.droppableId].slice(destination.index),
      ];
      setTasksByStatus(newTasksByStatus);
    }

    try {
      await updateTask(taskId, { status: newStatus });
    } catch (error) {
      console.error('שגיאה בעדכון סטטוס:', error);
      fetchTasks();
    }
  };

  return (
    <div className="min-h-full pb-24">
      {/* Header */}
      <div className="p-4 pb-2">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">לוח משימות</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">גרור משימות למעלה/למטה לשינוי סטטוס, גלול ימינה/שמאלה לצפייה</p>
      </div>

      {loading && (
        <div className="p-4 m-4 bg-white dark:bg-slate-800 rounded-2xl text-center border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-teal-600 dark:text-teal-400">טוען...</span>
          </div>
        </div>
      )}

      {!loading && statuses.length === 0 && (
        <div className="p-4 m-4 bg-white dark:bg-slate-800 rounded-2xl text-center text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 shadow-sm">
          אין סטטוסים להצגה
        </div>
      )}

      {/* Kanban Board - Horizontal scroll per status */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="space-y-4 px-4">
          {statuses.length > 0 && statuses.filter(s => s && s.name).map((status) => {
            const taskCount = tasksByStatus[status.name]?.length || 0;
            
            return (
              <div 
                key={status.name} 
                className="bg-white dark:bg-slate-800/50 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700/50 shadow-sm"
              >
                {/* Status Header */}
                <div 
                  className="p-3 flex items-center justify-between"
                  style={{ borderRightColor: status.color, borderRightWidth: '4px' }}
                >
                  <div className="flex items-center gap-2">
                    <span 
                      className="w-3 h-3 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: status.color }}
                    />
                    <span className="font-bold text-slate-900 dark:text-white text-sm">{status.display_name}</span>
                  </div>
                  <span className="px-2.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded-full text-xs font-bold text-slate-600 dark:text-slate-300">
                    {taskCount}
                  </span>
                </div>

                {/* Droppable Area with Horizontal Scroll */}
                <Droppable droppableId={status.name} direction="horizontal">
                  {(provided: DroppableProvided, snapshot: DroppableStateSnapshot) => (
                    <div className="relative">
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`kanban-scroll overflow-x-auto overflow-y-hidden border-t border-slate-100 dark:border-slate-700/50 ${
                          snapshot.isDraggingOver ? 'bg-teal-50 dark:bg-teal-900/20' : ''
                        }`}
                        style={{ paddingBottom: '36px' }}
                      >
                        <div className="flex gap-3 p-4 min-h-[180px]" style={{ minWidth: 'min-content' }}>
                          {taskCount === 0 && !snapshot.isDraggingOver && (
                            <div className="flex items-center justify-center w-full min-w-[200px] text-slate-400 dark:text-slate-500 text-sm">
                              אין משימות
                            </div>
                          )}

                        {tasksByStatus[status.name]?.map((task, index) => (
                          <Draggable key={task.id} draggableId={task.id.toString()} index={index}>
                            {(provided: DraggableProvided, snapshot: DraggableStateSnapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                onClick={() => onTaskSelect(task)}
                                className={`flex-shrink-0 w-48 bg-slate-50 dark:bg-slate-700/70 rounded-xl p-3 cursor-pointer border border-slate-200 dark:border-transparent
                                  hover:bg-white dark:hover:bg-slate-600/70 hover:shadow-md active:scale-[0.98] transition-all ${
                                  snapshot.isDragging ? 'shadow-xl ring-2 ring-teal-500 scale-105 bg-white dark:bg-slate-700 z-50' : ''
                                }`}
                                style={{
                                  ...provided.draggableProps.style,
                                  touchAction: 'none',
                                }}
                              >
                                {/* Header: Priority + Delete */}
                                <div className="flex items-start justify-between gap-1 mb-2">
                                  <span 
                                    className="inline-block px-2 py-0.5 rounded text-[10px] font-bold text-white"
                                    style={{ backgroundColor: priorityColors[task.priority] || '#64748b' }}
                                  >
                                    {priorityLabels[task.priority] || task.priority}
                                  </span>
                                  {isManager && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setTaskToDelete(task); }}
                                      className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                                      title="מחק משימה"
                                    >
                                      🗑️
                                    </button>
                                  )}
                                </div>

                                {/* Task Title */}
                                <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-2 line-clamp-2">
                                  {task.title}
                                </h4>

                                {/* Tags */}
                                {task.tags && task.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mb-2">
                                    {task.tags.slice(0, 2).map((tag: any) => (
                                      <span
                                        key={tag.id}
                                        className="px-1.5 py-0.5 rounded text-[9px] font-medium text-white"
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

                                {/* Footer: Assignee & Due Date */}
                                <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mt-auto pt-2 border-t border-slate-200 dark:border-slate-600/50">
                                  {task.assignees && task.assignees.length > 0 ? (
                                    <div className="flex -space-x-1 rtl:space-x-reverse">
                                      {task.assignees.slice(0, 2).map((assignee: any) => (
                                        <span 
                                          key={assignee.id}
                                          className="w-5 h-5 rounded-full bg-teal-600 flex items-center justify-center text-[9px] text-white font-bold border border-white dark:border-slate-700"
                                          title={assignee.name}
                                        >
                                          {assignee.name.charAt(0)}
                                        </span>
                                      ))}
                                      {task.assignees.length > 2 && (
                                        <span className="w-5 h-5 rounded-full bg-slate-500 flex items-center justify-center text-[9px] text-white font-bold border border-white dark:border-slate-700">
                                          +{task.assignees.length - 2}
                                        </span>
                                      )}
                                    </div>
                                  ) : task.assigned_to_name ? (
                                    <span className="truncate max-w-[60px]">{task.assigned_to_name}</span>
                                  ) : (
                                    <span className="text-slate-400">—</span>
                                  )}
                                  
                                  {task.due_date ? (
                                    <span className={`${
                                      new Date(task.due_date) < new Date() ? 'text-red-500 font-bold' : ''
                                    }`}>
                                      {new Date(task.due_date).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' })}
                                    </span>
                                  ) : (
                                    <span>—</span>
                                  )}
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        </div>
                      </div>
                      {/* Scroll Indicator */}
                      {taskCount > 1 && (
                        <div className="absolute bottom-1 left-4 right-4 flex items-center justify-center gap-2 text-xs text-teal-500 dark:text-teal-400 pointer-events-none">
                          <span>→</span>
                          <span className="bg-teal-500/20 px-2 py-0.5 rounded-full">גלול לצדדים</span>
                          <span>←</span>
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      {/* Delete Confirmation Modal */}
      {taskToDelete && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70] p-4" onClick={() => setTaskToDelete(null)}>
          <div 
            className="bg-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-4">
              <span className="text-4xl">⚠️</span>
              <h3 className="text-lg font-bold text-white mt-2">מחיקת משימה</h3>
              <p className="text-slate-400 mt-2">
                האם אתה בטוח שברצונך למחוק את המשימה "{taskToDelete.title}"?
              </p>
              <p className="text-red-400 text-sm mt-1">פעולה זו אינה ניתנת לביטול</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setTaskToDelete(null)}
                className="flex-1 py-3 bg-slate-700 text-slate-300 rounded-xl font-bold hover:bg-slate-600 transition-colors"
              >
                ביטול
              </button>
              <button
                onClick={handleDeleteTask}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-500 transition-colors flex items-center justify-center gap-2"
              >
                <span>🗑️</span>
                <span>מחק</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
