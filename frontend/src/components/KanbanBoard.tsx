import { useEffect, useState, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { useTaskStore, useAuthStore } from '../store';
import TaskCard from './TaskCard';
import axios from 'axios';
import { API_BASE } from '../store';
import { KanbanColumnSkeleton } from './skeletons';
import { useToast } from '../contexts/ToastContext';

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
  const toast = useToast();
  const [tasksByStatus, setTasksByStatus] = useState<Record<string, any[]>>({});
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [loading, setLoading] = useState(false);
  const [draggingTaskId, setDraggingTaskId] = useState<number | null>(null);
  const [draggingTask, setDraggingTask] = useState<any>(null);
  const [dragPreviewRect, setDragPreviewRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const [pointerPosition, setPointerPosition] = useState<{ x: number; y: number } | null>(null);
  const placeholderRef = useRef<HTMLDivElement | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const pointerOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const pointerOffsetInitializedRef = useRef(false);
  const pointerDownRef = useRef<{ x: number; y: number } | null>(null);
  const pointerDownTargetRectRef = useRef<{ left: number; top: number; width: number; height: number } | null>(null);

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

  // Capture pointer position and target card rect at touch/mouse down so we can pin the preview under the finger
  useEffect(() => {
    const onDown = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? (e as TouchEvent).touches[0]?.clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? (e as TouchEvent).touches[0]?.clientY : (e as MouseEvent).clientY;
      if (typeof clientX !== 'number' || typeof clientY !== 'number') return;
      pointerDownRef.current = { x: clientX, y: clientY };
      const el = document.elementFromPoint(clientX, clientY);
      const draggable = el?.closest('[data-rbd-draggable-context-id]');
      if (draggable) {
        const r = draggable.getBoundingClientRect();
        pointerDownTargetRectRef.current = { left: r.left, top: r.top, width: r.width, height: r.height };
      } else {
        pointerDownTargetRectRef.current = null;
      }
    };
    document.addEventListener('mousedown', onDown, { passive: true });
    document.addEventListener('touchstart', onDown, { passive: true });
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
    };
  }, []);

  // Unmount cleanup: ensure scroll lock is removed if user navigates away during drag
  useEffect(() => {
    return () => {
      document.body.classList.remove('kanban-dragging');
    };
  }, []);

  useEffect(() => {
    const byStatus: Record<string, any[]> = {};
    statuses.forEach((s) => { byStatus[s.name] = []; });
    const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    const firstStatusName = statuses[0]?.name;
    tasks.forEach((t) => {
      const rawStatus = (t.status ?? (t as any).Status ?? '') as string;
      const status = rawStatus === 'verified' ? 'completed' : rawStatus;
      const normalized = String(status).toLowerCase().trim();
      const matched = statuses.find((s) => (String(s.name || '').toLowerCase().trim() === normalized));
      if (matched && byStatus[matched.name]) {
        byStatus[matched.name].push(t);
      } else if (firstStatusName) {
        byStatus[firstStatusName].push(t);
      }
    });
    Object.keys(byStatus).forEach((status) => {
      byStatus[status].sort((a, b) => (priorityOrder[a.priority] ?? 4) - (priorityOrder[b.priority] ?? 4));
    });
    setTasksByStatus(byStatus);
  }, [tasks, statuses]);

  const handleDragStart = (result: any) => {
    document.body.classList.add('kanban-dragging');
    const taskId = parseInt(result.draggableId, 10);
    setDraggingTaskId(taskId);
    const task = tasks.find((t) => t.id === taskId);
    setDraggingTask(task ?? null);
    if (pointerDownRef.current && pointerDownTargetRectRef.current) {
      const rect = pointerDownTargetRectRef.current;
      pointerOffsetRef.current = {
        x: pointerDownRef.current.x - rect.left,
        y: pointerDownRef.current.y - rect.top,
      };
      pointerOffsetInitializedRef.current = true;
      setPointerPosition(pointerDownRef.current);
      setDragPreviewRect(rect);
    } else {
      setPointerPosition(null);
      pointerOffsetRef.current = { x: 0, y: 0 };
      pointerOffsetInitializedRef.current = false;
    }
  };

  const handleDragEnd = async (result: any) => {
    document.body.classList.remove('kanban-dragging');
    setDraggingTaskId(null);
    setDraggingTask(null);
    setDragPreviewRect(null);
    setPointerPosition(null);
    placeholderRef.current = null;
    pointerDownRef.current = null;
    pointerDownTargetRectRef.current = null;
    if (rafIdRef.current != null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    const { source, destination } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;
    const taskId = parseInt(result.draggableId, 10);
    const newStatus = destination.droppableId;
    try {
      setLoading(true);
      await updateTask(taskId, { status: newStatus });
      await fetchTasks();
    } catch (error) {
      console.error('Failed to update task status:', error);
      toast?.showToast('לא ניתן לעדכן סטטוס – נסה שוב', 'error');
      await fetchTasks();
    } finally {
      setLoading(false);
    }
  };

  useLayoutEffect(() => {
    if (draggingTaskId == null) return;
    const tick = () => {
      if (placeholderRef.current) {
        const rect = placeholderRef.current.getBoundingClientRect();
        setDragPreviewRect(rect);
      }
      rafIdRef.current = requestAnimationFrame(tick);
    };
    tick();
    rafIdRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafIdRef.current != null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [draggingTaskId]);

  // Set pointer offset from first finger/cursor position relative to card so the grab point stays under the finger
  useLayoutEffect(() => {
    if (draggingTaskId == null || pointerPosition == null || dragPreviewRect == null || pointerOffsetInitializedRef.current) return;
    pointerOffsetRef.current = {
      x: pointerPosition.x - dragPreviewRect.left,
      y: pointerPosition.y - dragPreviewRect.top,
    };
    pointerOffsetInitializedRef.current = true;
  }, [draggingTaskId, pointerPosition?.x, pointerPosition?.y, dragPreviewRect?.left, dragPreviewRect?.top]);

  useLayoutEffect(() => {
    if (draggingTaskId == null) return;
    const onMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0]?.clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0]?.clientY : e.clientY;
      if (typeof clientX === 'number' && typeof clientY === 'number') {
        setPointerPosition({ x: clientX, y: clientY });
      }
    };
    document.addEventListener('mousemove', onMove, { passive: true });
    document.addEventListener('touchmove', onMove, { passive: true });
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('touchmove', onMove);
    };
  }, [draggingTaskId]);

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
        <h1 className="emoji-icon text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-teal-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent">🧱 לוח פעולות</h1>
        {user?.role === 'admin' && (
          <div className="emoji-icon text-xs sm:text-sm text-slate-400 font-semibold bg-slate-800 border-r-4 border-teal-500 px-3 py-2 rounded-xl">💡 גרור משימות בין עמודות לעדכון הסטטוס</div>
        )}
      </div>

      {loading && statuses.length === 0 ? (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {[1, 2, 3, 4].map((i) => (
            <KanbanColumnSkeleton key={i} />
          ))}
        </div>
      ) : !loading && statuses.length === 0 ? (
        <div className="rounded-2xl p-8 border-2 border-dashed border-slate-600 bg-slate-800/50 text-center">
          <p className="emoji-icon text-4xl mb-3" aria-hidden="true">⚙️</p>
          <p className="font-bold text-slate-200 text-lg mb-1">לא הוגדרו סטטוסים</p>
          <p className="text-sm text-slate-400">אנא פנה למנהל כדי להגדיר סטטוסים ללוח.</p>
        </div>
      ) : tasks.length === 0 && statuses.length > 0 ? (
        <div className="rounded-2xl p-8 border-2 border-dashed border-slate-600 bg-slate-800/50 text-center">
          <p className="emoji-icon text-4xl mb-3" aria-hidden="true">🧱</p>
          <p className="font-bold text-slate-200 text-lg mb-1">אין משימות בלוח</p>
          <p className="text-sm text-slate-400 mb-4">צור משימה ראשונה או גרור משימות מהרשימה</p>
          {onCreateTask && (
            <button
              type="button"
              onClick={onCreateTask}
              className="emoji-icon min-h-[48px] px-6 py-3 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl transition-colors"
            >
              ➕ צור משימה
            </button>
          )}
        </div>
      ) : (
      <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        {draggingTask && dragPreviewRect != null && createPortal(
          <div
            className="pointer-events-none fixed rounded-2xl overflow-hidden shadow-2xl"
            style={{
              left: pointerPosition != null
                ? pointerPosition.x - pointerOffsetRef.current.x
                : dragPreviewRect.left,
              top: pointerPosition != null
                ? pointerPosition.y - pointerOffsetRef.current.y
                : dragPreviewRect.top,
              width: dragPreviewRect.width,
              height: dragPreviewRect.height,
              zIndex: 2147483647,
              backgroundColor: 'rgb(51 65 85)', /* slate-700 opaque - no white bleed */
              boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(51,65,85,1)',
              willChange: 'transform',
              isolation: 'isolate',
            }}
          >
            <div className="h-full w-full overflow-hidden rounded-2xl" style={{ backgroundColor: 'rgb(51 65 85)' }}>
              <TaskCard task={draggingTask} onClick={() => {}} isDragPreview />
            </div>
          </div>,
          document.body
        )}
        <div className="overflow-x-hidden md:overflow-x-auto md:kanban-scroll -mx-3 md:mx-0 min-w-0">
          <div className="flex flex-col md:flex md:flex-row gap-3 md:gap-4 w-full md:min-w-fit px-3 md:px-0">
            {statuses.map((status, idx) => (
              <Droppable key={status.name} droppableId={status.name} direction="horizontal">
                {/* @ts-ignore - react-beautiful-dnd types */}
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`animate-slideDown min-w-0 w-full flex-shrink-0 md:min-w-[380px] md:w-[380px] rounded-2xl pt-2 px-2 pb-0 sm:pt-3 sm:px-3 sm:pb-0 transition-all duration-300 shadow-lg border-2 ${
                      snapshot.isDraggingOver 
                        ? 'bg-slate-700 border-teal-500 scale-[1.02]' 
                        : 'bg-slate-800 border-slate-600 hover:border-teal-500/50'
                    }`}
                    style={{ animationDelay: `${idx * 0.1}s` }}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex-1 min-w-0">
                        <h2 className="font-bold text-teal-300 text-sm md:text-base mb-1 truncate emoji-icon">
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

                    <div className={`flex flex-row gap-3 overflow-x-auto overflow-y-hidden min-w-0 ${(tasksByStatus[status.name]?.length || 0) === 0 ? '' : ''}`}>
                      {tasksByStatus[status.name]?.map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id.toString()} index={index}>
                          {/* @ts-ignore - react-beautiful-dnd types */}
                          {(provided, snapshot) => (
                            <div
                              ref={(el) => {
                                (provided.innerRef as (el: HTMLDivElement | null) => void)(el);
                                if (snapshot.isDragging) placeholderRef.current = el;
                              }}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              style={{
                                ...provided.draggableProps.style,
                                ...(snapshot.isDragging ? { opacity: 0, visibility: 'hidden' as const } : {}),
                              }}
                              className="min-w-[280px] w-[280px] flex-shrink-0 rounded-xl transition-transform duration-200 ease-out transition-shadow duration-200 hover:shadow-lg"
                            >
                              <TaskCard task={task} onClick={() => (onEditTask || onTaskSelect)(task)} />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}

                      {(!tasksByStatus[status.name] || tasksByStatus[status.name].length === 0) && (
                        <div className="flex items-center justify-center min-w-[200px] w-[200px] flex-shrink-0 min-h-[4rem] text-center py-3 text-slate-400 rounded-xl border-2 border-dashed border-slate-600">
                          <div>
                            <p className="text-xs font-semibold emoji-icon">✨ אין משימות</p>
                            <p className="text-[10px] mt-0.5">גרור משימות לכאן</p>
                          </div>
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
      <div className="min-h-[1rem]" aria-hidden="true" />
      </div>
    </div>
  );
}
