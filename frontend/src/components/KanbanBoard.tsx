import { useEffect, useState } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { useTaskStore, useAuthStore } from '../store';
import TaskCard from './TaskCard';
import axios from 'axios';
import { API_BASE } from '../store';

interface Status {
  id: number;
  name: string;
  display_name: string;
  color: string;
  order_index: number;
}

export default function KanbanBoard({ onTaskSelect }: any) {
  const { tasks, fetchTasks, updateTask } = useTaskStore();
  const { user, token } = useAuthStore();
  const [tasksByStatus, setTasksByStatus] = useState<Record<string, any[]>>({});
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [loading, setLoading] = useState(false);

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
        console.error('Failed to fetch statuses:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStatuses();
  }, [user, token]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    const byStatus: Record<string, any[]> = {};
    statuses.forEach((s) => { byStatus[s.name] = []; });
    const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    tasks.forEach((t) => {
      if (byStatus[t.status]) {
        byStatus[t.status].push(t);
      }
    });
    Object.keys(byStatus).forEach((status) => {
      byStatus[status].sort((a, b) => (priorityOrder[a.priority] ?? 4) - (priorityOrder[b.priority] ?? 4));
    });
    setTasksByStatus(byStatus);
  }, [tasks, statuses]);

  const handleDragEnd = async (result: any) => {
    const { source, destination } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;
    const taskId = parseInt(result.draggableId);
    const newStatus = destination.droppableId;
    try {
      setLoading(true);
      await updateTask(taskId, { status: newStatus });
      await fetchTasks();
    } catch (error) {
      console.error('Failed to update task status:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 min-h-screen">
      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slideDown {
          animation: slideDown 0.4s ease-out forwards;
        }
      `}</style>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 animate-slideDown">
        <h1 className="text-4xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">🧱 לוח פעולות</h1>
        {user?.role === 'admin' && (
          <div className="text-sm text-gray-600 font-semibold bg-blue-50 border-l-4 border-blue-500 px-4 py-2 rounded">💡 גרור משימות בין עמודות לעדכון הסטטוס</div>
        )}
      </div>

      {loading && (
        <div className="bg-gradient-to-r from-blue-100 to-purple-100 border-2 border-blue-300 rounded-xl p-4 mb-6 text-center shadow-md">
          <p className="text-blue-700 font-bold">⏳ טוען...</p>
        </div>
      )}

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="overflow-x-auto pb-4 -mx-4 md:mx-0">
          <div className="flex gap-2 md:gap-3 min-w-fit px-4 md:px-0 md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {statuses.map((status, idx) => (
              <Droppable key={status.name} droppableId={status.name}>
                {/* @ts-ignore - react-beautiful-dnd types */}
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-shrink-0 w-56 sm:w-60 md:w-full rounded-2xl p-4 transition-all duration-300 shadow-lg border-2 transform hover:scale-105 ${
                      snapshot.isDraggingOver 
                        ? 'bg-gradient-to-br from-blue-200 to-purple-200 border-blue-500 scale-105' 
                        : 'bg-white border-blue-100 hover:border-blue-300'
                    }`}
                    style={{ animationDelay: `${idx * 0.1}s` }}
                  >
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex-1">
                        <h2 className="font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent text-sm md:text-base mb-2">
                          {status.display_name}
                        </h2>
                        <div
                          className="h-2 w-16 rounded-full shadow-md"
                          style={{ backgroundColor: status.color || '#3b82f6' }}
                        />
                      </div>
                      <span className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-md">
                        {tasksByStatus[status.name]?.length || 0}
                      </span>
                    </div>

                    <div className="space-y-2 md:space-y-3 min-h-96">
                      {tasksByStatus[status.name]?.map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id.toString()} index={index}>
                          {/* @ts-ignore - react-beautiful-dnd types */}
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`transition-all duration-200 ${
                                snapshot.isDragging 
                                  ? 'opacity-50 scale-95 shadow-2xl' 
                                  : 'opacity-100 shadow-sm'
                              } hover:shadow-lg`}
                              onClick={() => onTaskSelect(task)}
                            >
                              <TaskCard task={task} onClick={() => onTaskSelect(task)} />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}

                      {(!tasksByStatus[status.name] || tasksByStatus[status.name].length === 0) && (
                        <div className="text-center py-12 text-gray-300">
                          <p className="text-sm font-semibold">✨ اين مشام</p>
                          <p className="text-xs mt-1">اسحب المهام هنا</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Droppable>
            ))}
          </div>
        </div>
      </DragDropContext>
    </div>
  );
}
