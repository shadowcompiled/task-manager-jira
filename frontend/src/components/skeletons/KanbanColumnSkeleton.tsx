import TaskCardSkeleton from './TaskCardSkeleton';

export default function KanbanColumnSkeleton() {
  return (
    <div className="w-full flex-shrink-0 rounded-2xl p-2 sm:p-3 bg-slate-800/80 border-2 border-slate-600 animate-pulse">
      <div className="flex justify-between items-center mb-2">
        <div className="flex-1 min-w-0">
          <div className="h-4 bg-slate-600/60 rounded w-20 mb-1" />
          <div className="h-2 w-16 rounded-full bg-slate-600/50" />
        </div>
        <div className="h-5 w-6 bg-slate-600/50 rounded-full" />
      </div>
      <div className="space-y-2 min-h-28">
        <TaskCardSkeleton />
        <TaskCardSkeleton />
        <TaskCardSkeleton />
      </div>
    </div>
  );
}
