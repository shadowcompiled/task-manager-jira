import { useEffect, useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
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
    const { source, destination } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const taskId = parseInt(result.draggableId);
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
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 pb-2">
        <h1 className="text-xl font-bold text-white mb-1">לוח קנבן</h1>
        <p className="text-sm text-slate-400">גרור משימות בין העמודות</p>
      </div>

      {loading && (
        <div className="p-4 m-4 bg-slate-800 rounded-xl text-center text-teal-400">
          טוען...
        </div>
      )}

      {!loading && statuses.length === 0 && (
        <div className="p-4 m-4 bg-slate-800 rounded-xl text-center text-slate-400">
          אין סטטוסים להצגה
        </div>
      )}

      {/* Kanban Board - Horizontal Scrollable Columns */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex-1 overflow-x-auto overflow-y-hidden pb-24">
          <div className="flex gap-3 p-4 min-w-max h-full">
            {statuses.length > 0 && statuses.filter(s => s && s.name).map((status) => (
              <div 
                key={status.name} 
                className="flex flex-col w-72 flex-shrink-0 bg-slate-800/50 rounded-xl"
              >
                {/* Column Header */}
                <div 
                  className="p-3 border-b border-slate-700 flex items-center justify-between"
                  style={{ borderTopColor: status.color, borderTopWidth: '3px' }}
                >
                  <div className="flex items-center gap-2">
                    <span 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: status.color }}
                    />
                    <span className="font-bold text-white text-sm">{status.display_name}</span>
                  </div>
                  <span className="px-2 py-1 bg-slate-700 rounded-full text-xs text-slate-300">
                    {tasksByStatus[status.name]?.length || 0}
                  </span>
                </div>

                {/* Droppable Column */}
                <Droppable droppableId={status.name}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 p-2 space-y-2 overflow-y-auto min-h-[300px] transition-colors ${
                        snapshot.isDraggingOver ? 'bg-teal-900/30' : ''
                      }`}
                    >
                      {tasksByStatus[status.name]?.length === 0 && !snapshot.isDraggingOver && (
                        <div className="text-center py-8 text-slate-600 text-sm">
                          גרור משימות לכאן
                        </div>
                      )}

                      {tasksByStatus[status.name]?.map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id.toString()} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              onClick={() => onTaskSelect(task)}
                              className={`bg-slate-700 rounded-lg p-3 cursor-pointer hover:bg-slate-600 transition-all ${
                                snapshot.isDragging ? 'shadow-xl rotate-2 scale-105' : ''
                              }`}
                              style={{
                                ...provided.draggableProps.style,
                                touchAction: 'none',
                              }}
                            >
                              {/* Task Title */}
                              <h4 className="font-bold text-white text-sm mb-2 line-clamp-2">
                                {task.title}
                              </h4>

                              {/* Priority Badge */}
                              <div className="flex items-center gap-2 mb-2">
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
                              </div>

                              {/* Assignee & Due Date */}
                              <div className="flex items-center justify-between text-xs text-slate-400">
                                {task.assigned_to_name && (
                                  <span>👤 {task.assigned_to_name}</span>
                                )}
                                {task.due_date && (
                                  <span className={new Date(task.due_date) < new Date() ? 'text-orange-400' : ''}>
                                    📅 {new Date(task.due_date).toLocaleDateString('he-IL')}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </div>
      </DragDropContext>
    </div>
  );
}
