export default function TaskCardSkeleton() {
  return (
    <div className="p-4 border-2 border-slate-600/50 rounded-2xl min-h-[72px] bg-slate-800/40 animate-pulse">
      <div className="flex justify-between items-start mb-2 gap-2">
        <div className="h-5 bg-slate-600/60 rounded-lg flex-1 max-w-[70%]" />
        <div className="h-6 w-20 bg-slate-600/60 rounded-full shrink-0" />
      </div>
      <div className="h-3 bg-slate-600/40 rounded w-full mb-1" />
      <div className="h-3 bg-slate-600/40 rounded w-4/5 mb-2" />
      <div className="flex gap-2 mb-2">
        <div className="h-6 w-16 bg-slate-600/50 rounded-full" />
        <div className="h-6 w-14 bg-slate-600/40 rounded-full" />
      </div>
      <div className="mt-2 pt-2 border-t border-slate-600/50 space-y-1">
        <div className="h-3 bg-slate-600/40 rounded w-24" />
        <div className="h-3 bg-slate-600/40 rounded w-20" />
      </div>
    </div>
  );
}
