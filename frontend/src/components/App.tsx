import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { modalTransition, quickTransition, pageTransition, getTransition, useReducedMotion } from '../utils/motion';
import { useAuthStore } from '../store';
import LoginPage from './LoginPage';
import DailyTaskList from './DailyTaskList';
import KanbanBoard from './KanbanBoard';
import KanbanDashboard from './KanbanDashboard';
import Dashboard from './Dashboard';
import TaskDetail from './TaskDetail';
import CreateTaskModal from './CreateTaskModal';
import StatusManager from './StatusManager';
import TagManagementModal from './TagManagementModal';
import AdminPanel from './AdminPanel';
import UserManagementModal from './UserManagementModal';
import { UserApprovalModal } from './UserApprovalModal';
import UsersNotificationStatusModal from './UsersNotificationStatusModal';
import { ToastProvider } from '../contexts/ToastContext';
import Toast from './Toast';

type ViewType = 'daily' | 'kanban' | 'dashboard' | 'kanban-dash';


const THEME_KEY = 'mission-tracker-theme';

export default function App() {
  const { user, logout, token } = useAuthStore();
  const reducedMotion = useReducedMotion();
  const [currentView, setCurrentView] = useState<ViewType>('daily');
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [openTaskInEditMode, setOpenTaskInEditMode] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showStatusManager, setShowStatusManager] = useState(false);
  const [showTagManager, setShowTagManager] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [showUserApproval, setShowUserApproval] = useState(false);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [showUsersNotificationStatus, setShowUsersNotificationStatus] = useState(false);
  const [isDark, setIsDark] = useState<boolean>(() => {
    return (localStorage.getItem(THEME_KEY) ?? 'light') !== 'light';
  });

  const setTheme = useCallback((dark: boolean) => {
    setIsDark(dark);
    if (dark) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light-mode');
      localStorage.setItem(THEME_KEY, 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light-mode');
      localStorage.setItem(THEME_KEY, 'light');
    }
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem(THEME_KEY);
    setIsDark((stored ?? 'light') !== 'light');
  }, []);

  if (!user) {
    return <LoginPage />;
  }

  return (
    <ToastProvider>
    <div className="app-shell min-h-[100dvh] h-[100dvh] max-h-[100dvh] max-w-[100vw] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col overflow-hidden min-w-0">
      {/* Header - safe area top for notch; compact on phone */}
      <header className="app-header bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 border-b border-teal-500/40 shadow-lg sticky top-0 z-40 shrink-0 pt-[env(safe-area-inset-top)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-5 h-12 sm:h-14 flex items-center justify-between gap-2 min-h-[44px]">
          <div className="flex items-center gap-1 md:gap-2 min-w-0">
            <h1 className="text-xl md:text-2xl font-bold text-white truncate drop-shadow-lg">🍽️ מעקב משימות</h1>
            <span className="text-xs md:text-sm text-teal-300/80 hidden sm:inline font-semibold">ניהול משימות במסעדה</span>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <div className="text-right hidden sm:block">
              <p className="font-bold text-white text-sm drop-shadow-lg">{user.name}</p>
              <p className="text-xs text-teal-300/80 capitalize font-semibold">{user.role}</p>
            </div>
            {/* Theme toggle - visible on mobile (and desktop) */}
            <button
              type="button"
              onClick={() => setTheme(!isDark)}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-slate-600/80 text-white p-2 md:p-2"
              title={isDark ? 'מצב בהיר' : 'מצב כהה'}
              aria-label={isDark ? 'מצב בהיר' : 'מצב כהה'}
            >
              {isDark ? '☀️' : '🌙'}
            </button>
            {/* Mobile: single menu button */}
            {(user.role === 'admin' || user.role === 'manager' || user.role === 'maintainer') && (
              <div className="md:hidden relative">
                <button
                  onClick={() => setShowHeaderMenu(!showHeaderMenu)}
                  className="p-2 rounded-lg bg-slate-600/80 text-white min-h-[44px] min-w-[44px] flex items-center justify-center"
                  title="תפריט"
                  aria-label="פתח תפריט"
                >
                  ⋯
                </button>
                <AnimatePresence>
                  {showHeaderMenu && (
                    <motion.div
                      key="header-menu-overlay"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={getTransition(reducedMotion, quickTransition)}
                      className="fixed inset-0 z-40 bg-black/50"
                      onClick={() => setShowHeaderMenu(false)}
                      aria-hidden="true"
                    />
                  )}
                  {showHeaderMenu && (
                    <motion.div
                      key="header-menu-sheet"
                      dir="rtl"
                      initial={{ y: '100%' }}
                      animate={{ y: 0 }}
                      exit={{ y: '100%' }}
                      transition={getTransition(reducedMotion, modalTransition)}
                      className="md:hidden fixed inset-x-0 bottom-0 z-50 max-h-[70vh] rounded-t-2xl bg-slate-800 border border-b-0 border-teal-500/40 shadow-2xl flex flex-col pb-[env(safe-area-inset-bottom)] overflow-hidden"
                    >
                      <div className="flex-1 overflow-y-auto py-4 px-4 sm:px-5 flex flex-col gap-0" dir="rtl" style={{ direction: 'rtl' }}>
                        {user.role === 'admin' && (
                          <button onClick={() => { setShowAdminPanel(true); setShowHeaderMenu(false); }} className="menu-item-rtl w-full text-right px-5 py-3.5 min-h-[48px] flex items-center justify-end gap-2 text-white hover:bg-slate-700 text-sm font-bold">
                            <span>משתמשים</span><span>👤</span>
                          </button>
                        )}
                        {user.role === 'admin' && (
                          <button onClick={() => { setShowUsersNotificationStatus(true); setShowHeaderMenu(false); }} className="menu-item-rtl w-full text-right px-5 py-3.5 min-h-[48px] flex items-center justify-end gap-2 text-white hover:bg-slate-700 text-sm font-bold">
                            <span>התראות</span><span>🔔</span>
                          </button>
                        )}
                        <button onClick={() => { setShowUserApproval(true); setShowHeaderMenu(false); }} className="menu-item-rtl w-full text-right px-5 py-3.5 min-h-[48px] flex items-center justify-end gap-2 text-white hover:bg-slate-700 text-sm font-bold">
                          <span>אישור משתמשים</span><span>✓</span>
                        </button>
                        <button onClick={() => { setShowStatusManager(true); setShowHeaderMenu(false); }} className="menu-item-rtl w-full text-right px-5 py-3.5 min-h-[48px] flex items-center justify-end gap-2 text-white hover:bg-slate-700 text-sm font-bold">
                          <span>סטטוסים</span><span>⚙️</span>
                        </button>
                        <button onClick={() => { setShowTagManager(true); setShowHeaderMenu(false); }} className="menu-item-rtl w-full text-right px-5 py-3.5 min-h-[48px] flex items-center justify-end gap-2 text-white hover:bg-slate-700 text-sm font-bold">
                          <span>תגיות</span><span>🏷️</span>
                        </button>
                        <button onClick={() => { setShowUserManagement(true); setShowHeaderMenu(false); }} className="menu-item-rtl w-full text-right px-5 py-3.5 min-h-[48px] flex items-center justify-end gap-2 text-white hover:bg-slate-700 text-sm font-bold">
                          <span>צוות</span><span>👥</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                {showHeaderMenu && (
                  <>
                    {/* Desktop: dropdown */}
                    <div dir="rtl" className="hidden md:block absolute right-0 top-full mt-1 py-2 w-52 bg-slate-800 border border-teal-500/40 rounded-xl shadow-xl z-50 flex flex-col" style={{ direction: 'rtl' }}>
                      {user.role === 'admin' && (
                        <button onClick={() => { setShowAdminPanel(true); setShowHeaderMenu(false); }} className="menu-item-rtl w-full text-right px-5 py-3.5 min-h-[44px] flex items-center justify-end gap-2 text-white hover:bg-slate-700 text-sm font-bold">
                          <span>משתמשים</span><span>👤</span>
                        </button>
                      )}
                      {user.role === 'admin' && (
                        <button onClick={() => { setShowUsersNotificationStatus(true); setShowHeaderMenu(false); }} className="menu-item-rtl w-full text-right px-5 py-3.5 min-h-[44px] flex items-center justify-end gap-2 text-white hover:bg-slate-700 text-sm font-bold">
                          <span>התראות</span><span>🔔</span>
                        </button>
                      )}
                      <button onClick={() => { setShowUserApproval(true); setShowHeaderMenu(false); }} className="menu-item-rtl w-full text-right px-5 py-3.5 min-h-[44px] flex items-center justify-end gap-2 text-white hover:bg-slate-700 text-sm font-bold">
                        <span>אישור משתמשים</span><span>✓</span>
                      </button>
                      <button onClick={() => { setShowStatusManager(true); setShowHeaderMenu(false); }} className="menu-item-rtl w-full text-right px-5 py-3.5 min-h-[44px] flex items-center justify-end gap-2 text-white hover:bg-slate-700 text-sm font-bold">
                        <span>סטטוסים</span><span>⚙️</span>
                      </button>
                      <button onClick={() => { setShowTagManager(true); setShowHeaderMenu(false); }} className="menu-item-rtl w-full text-right px-5 py-3.5 min-h-[44px] flex items-center justify-end gap-2 text-white hover:bg-slate-700 text-sm font-bold">
                        <span>תגיות</span><span>🏷️</span>
                      </button>
                      <button onClick={() => { setShowUserManagement(true); setShowHeaderMenu(false); }} className="menu-item-rtl w-full text-right px-5 py-3.5 min-h-[44px] flex items-center justify-end gap-2 text-white hover:bg-slate-700 text-sm font-bold">
                        <span>צוות</span><span>👥</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
            {/* Desktop: all buttons */}
            {(user.role === 'admin' || user.role === 'manager' || user.role === 'maintainer') && (
              <div className="hidden md:flex items-center gap-2">
                {user.role === 'admin' && (
                  <button onClick={() => setShowAdminPanel(true)} className="px-3 py-2 bg-teal-600/80 hover:bg-teal-700 text-white rounded-lg text-sm font-bold whitespace-nowrap" title="משתמשים">👤 משתמשים</button>
                )}
                {user.role === 'admin' && (
                  <button onClick={() => setShowUsersNotificationStatus(true)} className="px-3 py-2 bg-amber-600/80 hover:bg-amber-700 text-white rounded-lg text-sm font-bold whitespace-nowrap" title="התראות">🔔</button>
                )}
                <button onClick={() => setShowUserApproval(true)} className="px-3 py-2 bg-orange-600/80 hover:bg-orange-700 text-white rounded-lg text-sm font-bold whitespace-nowrap">✓ אישור</button>
                <button onClick={() => setShowStatusManager(true)} className="px-3 py-2 bg-cyan-600/80 hover:bg-cyan-700 text-white rounded-lg text-sm font-bold whitespace-nowrap">⚙️ סטטוסים</button>
                <button onClick={() => setShowTagManager(true)} className="px-3 py-2 bg-emerald-600/80 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold whitespace-nowrap">🏷️ תגיות</button>
                <button onClick={() => setShowUserManagement(true)} className="px-3 py-2 bg-purple-600/80 hover:bg-purple-700 text-white rounded-lg text-sm font-bold whitespace-nowrap">👥 צוות</button>
              </div>
            )}
            <motion.button onClick={logout} className="px-3 md:px-4 py-2 bg-red-600/80 hover:bg-red-700 text-white rounded-lg text-sm font-bold min-h-[44px]" whileTap={{ scale: 0.96 }}>
              🔓 התנתק
            </motion.button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-hidden flex min-w-0">
        {/* Sidebar Navigation */}
        <nav className="hidden md:flex md:flex-col w-48 bg-slate-800 border-r border-teal-500/30 shadow-xl overflow-y-auto">
          <div className="p-4 space-y-2">
            <button
              onClick={() => setCurrentView('daily')}
              className={`w-full text-left px-4 py-3 rounded-lg font-bold transition-all duration-300 transform hover:scale-105 ${
                currentView === 'daily'
                  ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-lg scale-105'
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              📋 יומי
            </button>

            <button
              onClick={() => setCurrentView('kanban')}
              className={`w-full text-left px-4 py-3 rounded-lg font-bold transition-all duration-300 transform hover:scale-105 ${
                currentView === 'kanban'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg scale-105'
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              🧱 לוח
            </button>

            {(user.role === 'manager' || user.role === 'admin' || user.role === 'maintainer') && (
              <>
                <button
                  onClick={() => setCurrentView('kanban-dash')}
                  className={`w-full text-left px-4 py-3 rounded-lg font-bold transition-all duration-300 transform hover:scale-105 ${
                    currentView === 'kanban-dash'
                      ? 'bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-lg scale-105'
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  🎯 משימות
                </button>
                <button
                  onClick={() => setCurrentView('dashboard')}
                  className={`w-full text-left px-4 py-3 rounded-lg font-bold transition-all duration-300 transform hover:scale-105 ${
                    currentView === 'dashboard'
                      ? 'bg-gradient-to-r from-cyan-600 to-teal-600 text-white shadow-lg scale-105'
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  📊 סטטיסטיקה
                </button>
              </>
            )}

            {(user.role === 'manager' || user.role === 'admin' || user.role === 'maintainer') && (
              <button
                onClick={() => setShowCreateTask(true)}
                className="w-full text-left px-4 py-3 rounded-lg font-bold bg-gradient-to-r from-teal-600 to-emerald-600 text-white hover:from-teal-700 hover:to-emerald-700 transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg mt-4 hover:shadow-teal-500/50"
              >
                ➕ משימה חדשה
              </button>
            )}
          </div>
        </nav>

      {/* Bottom Navigation for Mobile - five equal-width columns */}
      <div className="app-bottom-bar md:hidden fixed bottom-0 left-0 right-0 w-full max-w-[100vw] bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 border-t border-teal-500/40 shadow-[0_-4px_12px_rgba(0,0,0,0.15)] z-50 pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pt-5 px-2 sm:px-4">
        {(user.role === 'manager' || user.role === 'admin' || user.role === 'maintainer') && (
          <div className="grid grid-cols-[1fr_1fr_auto_1fr_1fr] w-full max-w-lg mx-auto gap-0 items-end min-h-[52px]">
            <button
              onClick={() => setCurrentView('daily')}
              className={`min-w-0 w-full min-h-[44px] py-2.5 px-1 text-center text-xs font-semibold transition-all flex flex-col items-center justify-center touch-manipulation rounded-xl max-[360px]:text-[0.65rem] ${
                currentView === 'daily'
                  ? 'text-teal-300 bg-slate-700/50'
                  : 'text-slate-400 hover:text-teal-300 active:bg-slate-700/30'
              }`}
            >
              <span className="whitespace-nowrap overflow-hidden text-inherit truncate w-full max-w-full" style={{ textOverflow: 'ellipsis' }}>📋 יומי</span>
            </button>
            <button
              onClick={() => setCurrentView('kanban')}
              className={`min-w-0 w-full min-h-[44px] py-2.5 px-1 text-center text-xs font-semibold transition-all flex flex-col items-center justify-center touch-manipulation rounded-xl max-[360px]:text-[0.65rem] ${
                currentView === 'kanban'
                  ? 'text-teal-300 bg-slate-700/50'
                  : 'text-slate-400 hover:text-teal-300 active:bg-slate-700/30'
              }`}
            >
              <span className="whitespace-nowrap overflow-hidden text-inherit truncate w-full max-w-full" style={{ textOverflow: 'ellipsis' }}>🧱 לוח</span>
            </button>
            <div className="flex justify-center items-end min-w-0">
              <motion.button
                onClick={() => setShowCreateTask(true)}
                className="create-btn-float w-14 h-14 sm:w-16 sm:h-16 -mt-9 sm:-mt-10 rounded-full text-white bg-gradient-to-br from-teal-500 to-emerald-600 shadow-lg border-4 border-slate-800 hover:from-teal-600 hover:to-emerald-700 flex flex-col items-center justify-center touch-manipulation z-10"
                title="משימה חדשה"
                aria-label="צור משימה"
                whileTap={{ scale: 0.92 }}
              >
                <span className="text-2xl sm:text-3xl leading-none">➕</span>
              </motion.button>
            </div>
            <button
              onClick={() => setCurrentView('kanban-dash')}
              className={`min-w-0 w-full min-h-[44px] py-2.5 px-1 text-center text-xs font-semibold transition-all flex flex-col items-center justify-center touch-manipulation rounded-xl max-[360px]:text-[0.65rem] ${
                currentView === 'kanban-dash'
                  ? 'text-teal-300 bg-slate-700/50'
                  : 'text-slate-400 hover:text-teal-300 active:bg-slate-700/30'
              }`}
            >
              <span className="whitespace-nowrap overflow-hidden text-inherit truncate w-full max-w-full" style={{ textOverflow: 'ellipsis' }}>🎯 משימות</span>
            </button>
            <button
              onClick={() => setCurrentView('dashboard')}
              className={`min-w-0 w-full min-h-[44px] py-2.5 px-1 text-center text-xs font-semibold transition-all flex flex-col items-center justify-center touch-manipulation rounded-xl max-[360px]:text-[0.65rem] ${
                currentView === 'dashboard'
                  ? 'text-teal-300 bg-slate-700/50'
                  : 'text-slate-400 hover:text-teal-300 active:bg-slate-700/30'
              }`}
            >
              <span className="whitespace-nowrap overflow-hidden text-inherit truncate w-full max-w-full" style={{ textOverflow: 'ellipsis' }}>📊 סטטיסטיקה</span>
            </button>
          </div>
        )}
        {!(user.role === 'manager' || user.role === 'admin' || user.role === 'maintainer') && (
          <div className="grid grid-cols-2 w-full gap-0 items-end min-h-[48px]">
            <button
              onClick={() => setCurrentView('daily')}
              className={`min-w-0 w-full min-h-[48px] py-2.5 text-center text-xs font-semibold transition-all flex flex-col items-center justify-center touch-manipulation rounded-xl ${
                currentView === 'daily'
                  ? 'text-teal-300 bg-slate-700/50'
                  : 'text-slate-400 hover:text-teal-300 active:bg-slate-700/30'
              }`}
            >
              <span>📋 יומי</span>
            </button>
            <button
              onClick={() => setCurrentView('kanban')}
              className={`min-w-0 w-full min-h-[48px] py-2.5 text-center text-xs font-semibold transition-all flex flex-col items-center justify-center touch-manipulation rounded-xl ${
                currentView === 'kanban'
                  ? 'text-teal-300 bg-slate-700/50'
                  : 'text-slate-400 hover:text-teal-300 active:bg-slate-700/30'
              }`}
            >
              <span>🧱 לוח</span>
            </button>
          </div>
        )}
      </div>

        {/* Main Content - scrollable; mobile: bottom padding so footer never overlays content when fully scrolled */}
        <main className="flex-1 min-h-0 overflow-auto overflow-x-hidden main-scroll pb-[max(15rem,calc(14rem+env(safe-area-inset-bottom)))] md:pb-0 px-3 sm:px-4">
          <AnimatePresence mode="wait">
            {currentView === 'daily' && (
              <motion.div key="daily" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={getTransition(reducedMotion, pageTransition)} className="h-full min-w-0 w-full">
                <DailyTaskList onTaskSelect={setSelectedTask} onEditTask={(t) => { setSelectedTask(t); }} onCreateTask={(user?.role === 'manager' || user?.role === 'admin' || user?.role === 'maintainer') ? () => setShowCreateTask(true) : undefined} />
              </motion.div>
            )}
            {currentView === 'kanban' && (
              <motion.div key="kanban" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={getTransition(reducedMotion, pageTransition)} className="h-full min-w-0 w-full">
                <KanbanBoard onTaskSelect={setSelectedTask} onEditTask={(t) => { setSelectedTask(t); setOpenTaskInEditMode(true); }} onCreateTask={(user?.role === 'manager' || user?.role === 'admin' || user?.role === 'maintainer') ? () => setShowCreateTask(true) : undefined} />
              </motion.div>
            )}
            {currentView === 'kanban-dash' && (
              <motion.div key="kanban-dash" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={getTransition(reducedMotion, pageTransition)} className="h-full min-w-0 w-full">
                <KanbanDashboard />
              </motion.div>
            )}
            {currentView === 'dashboard' && (
              <motion.div key="dashboard" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={getTransition(reducedMotion, pageTransition)} className="h-full min-w-0 w-full">
                <Dashboard />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Task Detail Modal */}
      <AnimatePresence>
        {selectedTask && (
          <TaskDetail
            key={`task-detail-${selectedTask.id}`}
            taskId={selectedTask.id}
            startInEditMode={openTaskInEditMode}
            onClose={() => { setSelectedTask(null); setOpenTaskInEditMode(false); }}
            onTaskUpdate={() => {}}
          />
        )}
      </AnimatePresence>

      {/* Create Task Modal */}
      <AnimatePresence>
        {showCreateTask && (
          <CreateTaskModal
            key="create-task-modal"
            onClose={() => setShowCreateTask(false)}
            onTaskCreated={() => setShowCreateTask(false)}
          />
        )}
      </AnimatePresence>

      {/* Status Manager Modal */}
      <AnimatePresence>
        {showStatusManager && (
          <StatusManager
            key="status-manager"
            organizationId={user.organization_id ?? user.restaurant_id ?? 0}
            onClose={() => setShowStatusManager(false)}
            onStatusesChanged={() => {}}
          />
        )}
      </AnimatePresence>

      {/* Tag Manager Modal */}
      <AnimatePresence>
        {showTagManager && (
          <TagManagementModal key="tag-manager" onClose={() => setShowTagManager(false)} />
        )}
      </AnimatePresence>

      {/* Admin Panel Modal */}
      <AnimatePresence>
        {showAdminPanel && (
          <AdminPanel key="admin-panel" onClose={() => setShowAdminPanel(false)} />
        )}
      </AnimatePresence>

      {/* User Management Modal */}
      <AnimatePresence>
        {showUserManagement && (
          <UserManagementModal key="user-management" isOpen={showUserManagement} onClose={() => setShowUserManagement(false)} />
        )}
      </AnimatePresence>

      {/* User Approval Modal */}
      <AnimatePresence>
        {showUserApproval && (
          <UserApprovalModal
            key="user-approval"
            isOpen={showUserApproval}
            onClose={() => setShowUserApproval(false)}
            token={token || ''}
          />
        )}
      </AnimatePresence>

      {/* Users & Notifications Status (admin only) */}
      <AnimatePresence>
        {showUsersNotificationStatus && user?.role === 'admin' && (
          <UsersNotificationStatusModal key="users-notification-status" onClose={() => setShowUsersNotificationStatus(false)} />
        )}
      </AnimatePresence>
      <Toast />
    </div>
    </ToastProvider>
  );
}
