import { useEffect, useState } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { useTaskStore, useAuthStore } from '../store';
import TaskCard from './TaskCard';
import axios from 'axios';
import { API_BASE } from '../store';
import { KanbanColumnSkeleton } from './skeletons';

interface Status {
  id: number;
  name: string;
  display_name: string;
  color: string;
  order_index: number;
}

export default function KanbanBoard({ onTaskSelect, onEditTask, onCreateTask }: { onTaskSelect: (task: any) => void; onEditTask?: (task: any) => void; onCreateTask?: () => void }) {
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
        const orgId = user?.organization_id ?? user?.restaurant_id;
        const res = await axios.get(`${API_BASE}/statuses/restaurant/${orgId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setStatuses((res.data as Status[]).filter((s) => s.name !== 'verified'));
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
      const status = t.status === 'verified' ? 'completed' : t.status;
      if (byStatus[status]) {
        byStatus[status].push(t);
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
    <div className="kanban-page min-h-full w-full min-w-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-6xl mx-auto w-full px-4 sm:px-4 md:px-6 py-4 md:py-6">
      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slideDown { animation: slideDown 0.4s ease-out forwards; }
      `}</style>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 sm:mb-6 gap-3 animate-slideDown">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-teal-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent">🧱 לוח פעולות</h1>
        {user?.role === 'admin' && (
          <div className="text-xs sm:text-sm text-slate-400 font-semibold bg-slate-800 border-r-4 border-teal-500 px-3 py-2 rounded-xl">💡 גרור משימות בין עמודות לעדכון הסטטוס</div>
        )}
      </div>

      {loading && statuses.length === 0 ? (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {[1, 2, 3, 4].map((i) => (
            <KanbanColumnSkeleton key={i} />
          ))}
        </div>
      ) : tasks.length === 0 && statuses.length > 0 ? (
        <div className="rounded-2xl p-8 border-2 border-dashed border-slate-600 bg-slate-800/50 text-center">
          <p className="text-4xl mb-3" aria-hidden="true">🧱</p>
          <p className="font-bold text-slate-200 text-lg mb-1">אין משימות בלוח</p>
          <p className="text-sm text-slate-400 mb-4">צור משימה ראשונה או גרור משימות מהרשימה</p>
          {onCreateTask && (
            <button
              type="button"
              onClick={onCreateTask}
              className="min-h-[48px] px-6 py-3 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl transition-colors"
            >
              ➕ צור משימה
            </button>
          )}
        </div>
      ) : (
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="overflow-x-hidden md:overflow-x-auto md:kanban-scroll -mx-3 md:mx-0 min-w-0">
          <div className="flex flex-col md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-3 w-full md:min-w-fit px-3 md:px-0">
            {statuses.map((status, idx) => (
              <Droppable key={status.name} droppableId={status.name}>
                {/* @ts-ignore - react-beautiful-dnd types */}
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`animate-slideDown w-full flex-shrink-0 md:w-full rounded-2xl p-2 sm:p-3 transition-all duration-300 shadow-lg border-2 ${
                      snapshot.isDraggingOver 
                        ? 'bg-slate-700 border-teal-500 scale-[1.02]' 
                        : 'bg-slate-800 border-slate-600 hover:border-teal-500/50'
                    }`}
                    style={{ animationDelay: `${idx * 0.1}s` }}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex-1 min-w-0">
                        <h2 className="font-bold text-teal-300 text-sm md:text-base mb-1 truncate">
                          {status.display_name}
                        </h2>
                        <div
                          className="h-2 w-16 rounded-full shadow-md"
                          style={{ backgroundColor: status.color || '#3b82f6' }}
                        />
                      </div>
                      <span className="bg-teal-600 text-white px-2 py-0.5 rounded-full text-xs font-bold">
                        {tasksByStatus[status.name]?.length || 0}
                      </span>
                    </div>

                    <div className={`space-y-2 ${(tasksByStatus[status.name]?.length || 0) === 0 ? 'min-h-28' : 'min-h-0'}`}>
                      {tasksByStatus[status.name]?.map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id.toString()} index={index}>
                          {/* @ts-ignore - react-beautiful-dnd types */}
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              style={{
                                ...provided.draggableProps.style,
                                ...(snapshot.isDragging
                                  ? {
                                      opacity: 1,
                                      boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
                                      borderRadius: '12px',
                                      zIndex: 9999,
                                    }
                                  : {}),
                              }}
                              className={`transition-transform duration-200 ease-out transition-shadow duration-200 rounded-xl ${
                                snapshot.isDragging ? 'scale-[1.02] ring-2 ring-teal-400' : 'hover:shadow-lg'
                              }`}
                            >
                              <TaskCard task={task} onClick={() => (onEditTask || onTaskSelect)(task)} />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}

                      {(!tasksByStatus[status.name] || tasksByStatus[status.name].length === 0) && (
                        <div className="text-center py-6 text-slate-400">
                          <p className="text-xs font-semibold">✨ אין משימות</p>
                          <p className="text-[10px] mt-0.5">גרור משימות לכאן</p>
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
      )}
      <div className="min-h-[6rem] sm:min-h-[8rem]" aria-hidden="true" />
      </div>
    </div>
  );
}
