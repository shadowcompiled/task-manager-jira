// TaskCard component - displays individual task in card format

interface TaskCardProps {
  task: any;
  onClick: () => void;
  onEdit?: () => void;
  showEditButton?: boolean;
}

const priorityLabels: Record<string, string> = {
  critical: 'דחוף',
  high: 'גבוה',
  medium: 'בינוני',
  low: 'נמוך',
};

const statusLabels: Record<string, string> = {
  planned: 'מתוכנן',
  assigned: 'הוקצה',
  in_progress: 'בביצוע',
  waiting: 'ממתין',
  completed: 'הושלם',
  verified: 'אומת',
  overdue: 'באיחור',
};

const priorityColors: Record<string, string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-amber-500',
  low: 'bg-emerald-500',
};

export default function TaskCard({ task, onClick, onEdit, showEditButton = false }: TaskCardProps) {
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && !['completed', 'verified'].includes(task.status);

  return (
    <div
      className={`p-4 rounded-2xl border transition-all cursor-pointer
        bg-white dark:bg-slate-800 
        hover:shadow-md dark:hover:bg-slate-750
        ${isOverdue
          ? 'border-red-300 dark:border-orange-500/50 bg-red-50/50 dark:bg-slate-800'
          : 'border-slate-200 dark:border-slate-700'
        }`}
    >
      {/* Header: Title + Priority */}
      <div className="flex items-start justify-between gap-3 mb-3" onClick={onClick}>
        <h3 className="font-bold text-slate-900 dark:text-white text-base flex-1 leading-tight">{task.title}</h3>
        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold text-white whitespace-nowrap ${priorityColors[task.priority] || 'bg-slate-500'}`}>
          {priorityLabels[task.priority as keyof typeof priorityLabels] || task.priority}
        </span>
      </div>

      {/* Description */}
      {task.description && (
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-3 line-clamp-2" onClick={onClick}>{task.description}</p>
      )}

      {/* Status Badge */}
      <div className="flex flex-wrap gap-2 mb-3" onClick={onClick}>
        <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-700 text-teal-600 dark:text-teal-400">
          {statusLabels[task.status as keyof typeof statusLabels] || task.status}
        </span>
        {task.recurrence && task.recurrence !== 'once' && (
          <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
            🔄 {task.recurrence === 'daily' ? 'יומי' : task.recurrence === 'weekly' ? 'שבועי' : 'חודשי'}
          </span>
        )}
        {isOverdue && (
          <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-100 dark:bg-orange-500/20 text-red-600 dark:text-orange-400">
            ⚠️ באיחור
          </span>
        )}
      </div>

      {/* Task Tags */}
      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3" onClick={onClick}>
          {task.tags.map((tag: any) => (
            <span
              key={tag.id}
              className="px-2.5 py-1 rounded-lg text-xs font-bold text-white shadow-sm"
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

      {/* Meta Info: Due date, Time estimate, Assigned */}
      <div className="flex flex-col gap-2 text-sm text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-700 pt-3" onClick={onClick}>
        {task.due_date && (
          <div className="flex items-center gap-2">
            <span>📅</span>
            <span className={isOverdue ? 'text-red-500 dark:text-orange-400 font-medium' : ''}>
              {new Date(task.due_date).toLocaleDateString('he-IL')}
            </span>
          </div>
        )}
        {task.estimated_time && (
          <div className="flex items-center gap-2">
            <span>⏱️</span>
            <span>
              {task.estimated_time < 60 
                ? `${task.estimated_time} דקות` 
                : task.estimated_time < 1440 
                ? `${Math.round(task.estimated_time / 60)} שעות` 
                : `${Math.round(task.estimated_time / 1440)} ימים`}
            </span>
          </div>
        )}
        {/* Show assignees */}
        {task.assignees && task.assignees.length > 0 ? (
          <div className="flex items-center gap-1">
            <div className="flex -space-x-2 rtl:space-x-reverse">
              {task.assignees.slice(0, 3).map((assignee: any) => (
                <span 
                  key={assignee.id}
                  className="w-6 h-6 rounded-full bg-teal-600 flex items-center justify-center text-[10px] text-white font-bold border-2 border-white dark:border-slate-700"
                  title={assignee.name}
                >
                  {assignee.name.charAt(0)}
                </span>
              ))}
              {task.assignees.length > 3 && (
                <span className="w-6 h-6 rounded-full bg-slate-500 flex items-center justify-center text-[10px] text-white font-bold border-2 border-white dark:border-slate-700">
                  +{task.assignees.length - 3}
                </span>
              )}
            </div>
            <span className="mr-1 text-xs">{task.assignees.length > 1 ? `${task.assignees.length} מוקצים` : task.assignees[0].name}</span>
          </div>
        ) : task.assigned_to_name && (
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-[10px] text-slate-600 dark:text-white font-bold">
              {task.assigned_to_name.charAt(0)}
            </span>
            <span>{task.assigned_to_name}</span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
        <button
          onClick={onClick}
          onTouchEnd={(e) => { e.preventDefault(); onClick(); }}
          className="flex-1 py-4 bg-slate-100 dark:bg-slate-700 text-teal-600 dark:text-teal-400 rounded-xl text-base font-bold hover:bg-slate-200 dark:hover:bg-slate-600 active:bg-slate-300 dark:active:bg-slate-500 transition-colors active:scale-95 touch-manipulation"
          style={{ minHeight: '52px', WebkitTapHighlightColor: 'transparent' }}
        >
          צפייה בפרטים
        </button>
        {showEditButton && onEdit && (
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(); }}
            className="flex-1 py-4 bg-teal-600 text-white rounded-xl text-base font-bold hover:bg-teal-500 active:bg-teal-700 transition-colors active:scale-95 touch-manipulation"
            style={{ minHeight: '52px', WebkitTapHighlightColor: 'transparent' }}
          >
            עריכה
          </button>
        )}
      </div>
    </div>
  );
}
