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
  const { tasks, fetchTasks, updateTask } = useTaskStore();
  const { user, token } = useAuthStore();
  const [tasksByStatus, setTasksByStatus] = useState<Record<string, any[]>>({});
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedStatus, setExpandedStatus] = useState<string | null>(null);

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
        // Auto-expand first status with tasks
        if (res.data.length > 0) {
          setExpandedStatus(res.data[0].name);
        }
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
      
      // Auto-expand destination status
      setExpandedStatus(newStatus);
    }

    try {
      await updateTask(taskId, { status: newStatus });
    } catch (error) {
      console.error('שגיאה בעדכון סטטוס:', error);
      fetchTasks();
    }
  };

  const toggleStatus = (statusName: string) => {
    setExpandedStatus(expandedStatus === statusName ? null : statusName);
  };

  return (
    <div className="min-h-full pb-24">
      {/* Header */}
      <div className="p-4 pb-2">
        <h1 className="text-xl font-bold text-white dark:text-white mb-1">לוח משימות</h1>
        <p className="text-sm text-slate-400">לחץ על סטטוס להרחבה, גרור משימות לשינוי סטטוס</p>
      </div>

      {loading && (
        <div className="p-4 m-4 bg-slate-800 rounded-xl text-center">
          <div className="flex items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-teal-400">טוען...</span>
          </div>
        </div>
      )}

      {!loading && statuses.length === 0 && (
        <div className="p-4 m-4 bg-slate-800 rounded-xl text-center text-slate-400">
          אין סטטוסים להצגה
        </div>
      )}

      {/* Vertical Kanban Board - Status sections stacked vertically */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="px-4 space-y-3">
          {statuses.length > 0 && statuses.filter(s => s && s.name).map((status) => {
            const isExpanded = expandedStatus === status.name;
            const taskCount = tasksByStatus[status.name]?.length || 0;
            
            return (
              <div 
                key={status.name} 
                className="bg-slate-800/50 dark:bg-slate-800/50 rounded-xl overflow-hidden border border-slate-700/50"
              >
                {/* Status Header - Clickable to expand/collapse */}
                <button 
                  onClick={() => toggleStatus(status.name)}
                  className="w-full p-4 flex items-center justify-between hover:bg-slate-700/30 transition-colors"
                  style={{ borderRightColor: status.color, borderRightWidth: '4px' }}
                >
                  <div className="flex items-center gap-3">
                    <span 
                      className="w-4 h-4 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: status.color }}
                    />
                    <span className="font-bold text-white">{status.display_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-slate-700 rounded-full text-sm font-bold text-slate-300">
                      {taskCount}
                    </span>
                    <span className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                      ▼
                    </span>
                  </div>
                </button>

                {/* Droppable Area - Expandable */}
                <Droppable droppableId={status.name}>
                  {(provided: DroppableProvided, snapshot: DroppableStateSnapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`transition-all duration-300 overflow-hidden ${
                        isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
                      } ${snapshot.isDraggingOver ? 'bg-teal-900/20' : ''}`}
                    >
                      <div className="p-3 space-y-2 border-t border-slate-700/50">
                        {taskCount === 0 && !snapshot.isDraggingOver && (
                          <div className="text-center py-6 text-slate-500 text-sm">
                            אין משימות בסטטוס זה
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
                                className={`bg-slate-700/70 dark:bg-slate-700/70 rounded-xl p-4 cursor-pointer 
                                  hover:bg-slate-600/70 active:scale-[0.98] transition-all ${
                                  snapshot.isDragging ? 'shadow-2xl ring-2 ring-teal-500 scale-102' : ''
                                }`}
                                style={{
                                  ...provided.draggableProps.style,
                                  touchAction: 'none',
                                }}
                              >
                                <div className="flex items-start gap-3">
                                  {/* Drag Handle Visual */}
                                  <div className="flex flex-col gap-1 mt-1 opacity-40">
                                    <div className="flex gap-0.5">
                                      <span className="w-1 h-1 bg-slate-400 rounded-full" />
                                      <span className="w-1 h-1 bg-slate-400 rounded-full" />
                                    </div>
                                    <div className="flex gap-0.5">
                                      <span className="w-1 h-1 bg-slate-400 rounded-full" />
                                      <span className="w-1 h-1 bg-slate-400 rounded-full" />
                                    </div>
                                    <div className="flex gap-0.5">
                                      <span className="w-1 h-1 bg-slate-400 rounded-full" />
                                      <span className="w-1 h-1 bg-slate-400 rounded-full" />
                                    </div>
                                  </div>

                                  {/* Task Content */}
                                  <div className="flex-1 min-w-0">
                                    {/* Task Title */}
                                    <h4 className="font-bold text-white text-sm mb-2">
                                      {task.title}
                                    </h4>

                                    {/* Priority & Time */}
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                      <span 
                                        className="px-2 py-0.5 rounded text-xs font-bold text-white"
                                        style={{ backgroundColor: priorityColors[task.priority] || '#64748b' }}
                                      >
                                        {priorityLabels[task.priority] || task.priority}
                                      </span>
                                      {task.estimated_time && (
                                        <span className="text-xs text-slate-400">
                                          ⏱ {task.estimated_time} דק׳
                                        </span>
                                      )}
                                      {task.tags && task.tags.length > 0 && (
                                        <div className="flex gap-1">
                                          {task.tags.slice(0, 2).map((tag: any) => (
                                            <span
                                              key={tag.id}
                                              className="px-2 py-0.5 rounded text-xs font-medium text-white"
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
                                    </div>

                                    {/* Assignee & Due Date */}
                                    <div className="flex items-center justify-between text-xs text-slate-400">
                                      {task.assigned_to_name ? (
                                        <span className="flex items-center gap-1">
                                          <span className="w-5 h-5 rounded-full bg-slate-600 flex items-center justify-center text-[10px] text-white">
                                            {task.assigned_to_name.charAt(0)}
                                          </span>
                                          {task.assigned_to_name}
                                        </span>
                                      ) : (
                                        <span className="text-slate-500">לא הוקצה</span>
                                      )}
                                      {task.due_date && (
                                        <span className={`flex items-center gap-1 ${
                                          new Date(task.due_date) < new Date() ? 'text-red-400 font-bold' : ''
                                        }`}>
                                          📅 {new Date(task.due_date).toLocaleDateString('he-IL')}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}
