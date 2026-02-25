import { motion } from 'framer-motion';
import { quickTransition, getTransition, useReducedMotion } from '../utils/motion';

const priorityLabels = {
  critical: 'דחוף ביותר',
  high: 'גבוה',
  medium: 'בינוני',
  low: 'נמוך',
};

const statusLabels = {
  planned: 'מתוכנן',
  assigned: 'הוקצה',
  in_progress: 'בתהליך',
  waiting: 'בהמתנה',
  completed: 'הושלם',
  verified: 'הושלם',
  overdue: 'בפיגור',
};

export default function TaskCard({ task, onClick, showEditButton, onEdit }: any) {
  const reducedMotion = useReducedMotion();
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && !['completed', 'verified'].includes(task.status);

  const priorityEmojis = {
    critical: '🔴',
    high: '🟠',
    medium: '🟡',
    low: '🟢',
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={getTransition(reducedMotion, quickTransition)}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className={`p-4 border-2 rounded-2xl cursor-pointer transition-all duration-300 min-h-[72px] ${
        isOverdue
          ? 'border-red-400/80 bg-slate-800/80 shadow-md'
          : 'border-teal-500/30 bg-slate-800/60 hover:border-teal-400/50 shadow-md'
      }`}
    >
      <div className="flex justify-between items-start mb-2 gap-2">
        <h3 className="font-bold text-base text-white flex-1 line-clamp-2">{task.title}</h3>
        <div className="flex items-center gap-1 shrink-0">
          {showEditButton && onEdit && (
            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={(e: React.MouseEvent) => { e.stopPropagation(); onEdit(); }}
              className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg bg-slate-600 hover:bg-teal-500/80 text-white text-sm"
              aria-label="עריכה"
            >
              ✏️
            </motion.button>
          )}
        <span className={`px-2 md:px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ml-1 md:ml-2 shadow-md text-white ${
          task.priority === 'critical'
            ? 'bg-red-600'
            : task.priority === 'high'
            ? 'bg-orange-500'
            : task.priority === 'medium'
            ? 'bg-amber-500'
            : 'bg-emerald-500'
        }`}>
          {priorityEmojis[task.priority as keyof typeof priorityEmojis]} {priorityLabels[task.priority as keyof typeof priorityLabels]}
        </span>
        </div>
      </div>

      {task.description && (
        <p className="text-xs sm:text-sm text-slate-400 mb-2 line-clamp-2 leading-relaxed">{task.description}</p>
      )}

      <div className="flex flex-wrap justify-between items-start gap-1 md:gap-2 mb-2 md:mb-3">
        <div className="flex gap-1 md:gap-2 flex-wrap">
          <span className={`px-2 md:px-3 py-1 rounded-full text-xs font-bold shadow-md ${
            task.status === 'planned'
              ? 'bg-gradient-to-r from-gray-500 to-slate-600 text-white'
              : task.status === 'assigned'
              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
              : task.status === 'in_progress'
              ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white'
              : task.status === 'waiting'
              ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white'
              : task.status === 'completed'
              ? 'bg-gradient-to-r from-green-500 to-green-600 text-white'
              : task.status === 'verified'
              ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white'
              : 'bg-gradient-to-r from-red-500 to-red-600 text-white'
          }`}>
            {statusLabels[task.status as keyof typeof statusLabels]}
          </span>
          {task.recurrence !== 'once' && (
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md">
              🔄 {task.recurrence === 'daily' ? 'יומי' : task.recurrence === 'weekly' ? 'שבועי' : task.recurrence === 'monthly' ? 'חודשי' : task.recurrence}
            </span>
          )}
        </div>
      </div>

      {(task.due_date || task.estimated_time || task.assigned_to_name) && (
        <div className="mt-2 pt-2 border-t border-slate-600 text-xs text-slate-400 space-y-1">
          {task.due_date && (
            <div className="flex items-center gap-2 font-semibold">
              <span>📅</span>
              <span className="text-xs">{new Date(task.due_date).toLocaleDateString('he-IL')}</span>
            </div>
          )}
          {task.estimated_time && (
            <div className="flex items-center gap-2 font-semibold">
              <span>⏱️</span>
              <span className="text-xs">
                {task.estimated_time < 60 
                  ? `${task.estimated_time} דקות` 
                  : task.estimated_time < 1440 
                  ? `${Math.round(task.estimated_time / 60)} שעות` 
                  : `${Math.round(task.estimated_time / 1440)} ימים`}
              </span>
            </div>
          )}
          {task.assigned_to_name && (
            <div className="flex items-center gap-2 font-semibold">
              <span>👤</span>
              <span className="text-xs truncate">{task.assigned_to_name}</span>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
