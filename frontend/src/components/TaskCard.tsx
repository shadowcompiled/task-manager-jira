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
  critical: 'bg-orange-500',
  high: 'bg-orange-400',
  medium: 'bg-teal-500',
  low: 'bg-teal-600',
};

export default function TaskCard({ task, onClick, onEdit, showEditButton = false }: TaskCardProps) {
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && !['completed', 'verified'].includes(task.status);

  return (
    <div
      className={`p-4 rounded-xl border-2 transition-all ${
        isOverdue
          ? 'border-orange-500 bg-slate-800'
          : 'border-slate-600 bg-slate-800 active:bg-slate-700'
      }`}
    >
      {/* Header: Title + Priority */}
      <div className="flex items-start justify-between gap-2 mb-3" onClick={onClick}>
        <h3 className="font-bold text-white text-base flex-1 leading-tight">{task.title}</h3>
        <span className={`px-2 py-1 rounded-lg text-xs font-bold text-white whitespace-nowrap ${priorityColors[task.priority] || 'bg-slate-600'}`}>
          {priorityLabels[task.priority as keyof typeof priorityLabels] || task.priority}
        </span>
      </div>

      {/* Description */}
      {task.description && (
        <p className="text-sm text-slate-400 mb-3 line-clamp-2" onClick={onClick}>{task.description}</p>
      )}

      {/* Status Badge */}
      <div className="flex flex-wrap gap-2 mb-3" onClick={onClick}>
        <span className="px-3 py-1 rounded-lg text-xs font-bold bg-slate-700 text-teal-400">
          {statusLabels[task.status as keyof typeof statusLabels] || task.status}
        </span>
        {task.recurrence && task.recurrence !== 'once' && (
          <span className="px-3 py-1 rounded-lg text-xs font-bold bg-slate-700 text-slate-300">
            🔄 {task.recurrence === 'daily' ? 'יומי' : task.recurrence === 'weekly' ? 'שבועי' : 'חודשי'}
          </span>
        )}
        {isOverdue && (
          <span className="px-3 py-1 rounded-lg text-xs font-bold bg-orange-500/20 text-orange-400">
            ⚠️ באיחור
          </span>
        )}
      </div>

      {/* Task Tags */}
      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3" onClick={onClick}>
          {task.tags.map((tag: any) => (
            <span
              key={tag.id}
              className="px-2 py-1 rounded text-xs font-bold text-white"
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
      <div className="flex flex-col gap-2 text-sm text-slate-400 border-t border-slate-700 pt-3" onClick={onClick}>
        {task.due_date && (
          <div className="flex items-center gap-2">
            <span>📅</span>
            <span>{new Date(task.due_date).toLocaleDateString('he-IL')}</span>
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
        {task.assigned_to_name && (
          <div className="flex items-center gap-2">
            <span>👤</span>
            <span>{task.assigned_to_name}</span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 mt-3 pt-3 border-t border-slate-700">
        <button
          onClick={onClick}
          className="flex-1 py-2 bg-slate-700 text-teal-400 rounded-lg text-sm font-bold active:bg-slate-600"
        >
          צפייה בפרטים
        </button>
        {showEditButton && onEdit && (
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="flex-1 py-2 bg-teal-600 text-white rounded-lg text-sm font-bold active:bg-teal-700"
          >
            עריכה
          </button>
        )}
      </div>
    </div>
  );
}
