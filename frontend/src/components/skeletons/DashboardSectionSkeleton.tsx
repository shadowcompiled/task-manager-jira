export default function DashboardSectionSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden border border-slate-600 bg-slate-800/40 animate-pulse">
      <div className="flex items-center justify-center min-h-[44px] py-3 bg-slate-700/60 border-b border-slate-600">
        <div className="h-5 w-24 bg-slate-600/50 rounded" />
      </div>
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-slate-700/50 rounded-2xl p-4">
              <div className="h-3 bg-slate-600/60 rounded w-16 mb-2" />
              <div className="h-8 bg-slate-600/60 rounded w-12" />
            </div>
          ))}
        </div>
        <div className="h-2 bg-slate-600/40 rounded-full w-full" />
        <div className="flex gap-2">
          <div className="h-8 w-20 bg-slate-600/50 rounded" />
          <div className="h-8 w-20 bg-slate-600/50 rounded" />
        </div>
      </div>
    </div>
  );
}
