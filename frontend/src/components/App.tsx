import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store';
import { usePushNotifications } from '../hooks/usePushNotifications';
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
import Logo from './Logo';

type ViewType = 'daily' | 'kanban' | 'dashboard' | 'kanban-dash';

const roleLabels: Record<string, string> = {
  admin: 'מנהל ראשי',
  maintainer: 'מנהל',
  worker: 'עובד',
};

export default function App() {
  const { user, logout, token } = useAuthStore();
  const { isSupported, isSubscribed, loading: pushLoading, subscribe, unsubscribe } = usePushNotifications();
  const [currentView, setCurrentView] = useState<ViewType>('daily');
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showStatusManager, setShowStatusManager] = useState(false);
  const [showTagManager, setShowTagManager] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [showUserApproval, setShowUserApproval] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  // Initialize theme from localStorage only (not system preference)
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    // Default to dark mode if no preference saved
    return savedTheme ? savedTheme === 'dark' : true;
  });

  // Handle push notification toggle
  const handleNotificationToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  // Auto-prompt for notifications on first login
  useEffect(() => {
    if (user && isSupported && !isSubscribed && !pushLoading) {
      const hasAskedBefore = localStorage.getItem('notificationAsked');
      if (!hasAskedBefore) {
        // Wait a bit before asking (better UX)
        const timer = setTimeout(() => {
          subscribe();
          localStorage.setItem('notificationAsked', 'true');
        }, 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [user, isSupported, isSubscribed, pushLoading]);

  // Apply theme - uses class-based approach, ignores system preference
  useEffect(() => {
    const html = document.documentElement;
    if (isDarkMode) {
      html.classList.add('dark');
      html.classList.remove('light-mode');
    } else {
      html.classList.remove('dark');
      html.classList.add('light-mode');
    }
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // Handle Android back button / ESC key
  useEffect(() => {
    // Check if any modal is open
    const isAnyModalOpen = () => {
      return selectedTask || showCreateTask || showStatusManager || showTagManager || 
             showAdminPanel || showUserManagement || showUserApproval || showMenu || showExitConfirm;
    };

    // Close the topmost modal
    const closeTopModal = () => {
      if (showExitConfirm) {
        setShowExitConfirm(false);
        return true;
      }
      if (selectedTask) {
        setSelectedTask(null);
        return true;
      }
      if (showCreateTask) {
        setShowCreateTask(false);
        return true;
      }
      if (showMenu) {
        setShowMenu(false);
        return true;
      }
      if (showStatusManager) {
        setShowStatusManager(false);
        return true;
      }
      if (showTagManager) {
        setShowTagManager(false);
        return true;
      }
      if (showAdminPanel) {
        setShowAdminPanel(false);
        return true;
      }
      if (showUserManagement) {
        setShowUserManagement(false);
        return true;
      }
      if (showUserApproval) {
        setShowUserApproval(false);
        return true;
      }
      return false;
    };

    // Handle back button (popstate event)
    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      if (isAnyModalOpen()) {
        closeTopModal();
        // Push state back to prevent actual navigation
        window.history.pushState(null, '', window.location.href);
      } else {
        // Show exit confirmation
        setShowExitConfirm(true);
        window.history.pushState(null, '', window.location.href);
      }
    };

    // Handle ESC key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isAnyModalOpen()) {
          closeTopModal();
        } else {
          setShowExitConfirm(true);
        }
      }
    };

    // Push initial state
    window.history.pushState(null, '', window.location.href);
    
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedTask, showCreateTask, showStatusManager, showTagManager, showAdminPanel, showUserManagement, showUserApproval, showMenu, showExitConfirm]);

  if (!user) {
    return <LoginPage />;
  }

  const isManager = user.role === 'admin' || user.role === 'maintainer';

  // Theme classes
  const bgClass = isDarkMode ? 'bg-slate-900' : 'bg-gray-100';
  const headerBgClass = isDarkMode ? 'bg-slate-800' : 'bg-white';
  const textClass = isDarkMode ? 'text-white' : 'text-gray-900';
  const mutedTextClass = isDarkMode ? 'text-slate-400' : 'text-gray-500';
  const borderClass = isDarkMode ? 'border-teal-600/30' : 'border-gray-200';
  const menuBgClass = isDarkMode ? 'bg-slate-700' : 'bg-white';

  return (
    <div className={`min-h-screen ${bgClass} flex flex-col overflow-x-hidden`}>
      {/* Header */}
      <header className={`${headerBgClass} border-b ${borderClass} sticky top-0 z-40`}>
        <div className="px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size={36} />
            <div>
              <h1 className={`text-lg font-bold ${textClass} leading-tight`}>TaskFlow</h1>
              <p className="text-xs text-teal-500 font-medium">מעקב משימות</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Push Notifications Toggle */}
            {isSupported && (
              <button
                onClick={handleNotificationToggle}
                disabled={pushLoading}
                className={`p-2 rounded-lg transition-all ${
                  isSubscribed 
                    ? 'bg-teal-600 text-white' 
                    : isDarkMode 
                      ? 'bg-slate-700 text-slate-400' 
                      : 'bg-gray-200 text-gray-500'
                } ${pushLoading ? 'opacity-50' : ''}`}
                title={isSubscribed ? 'התראות פעילות' : 'הפעל התראות'}
              >
                {pushLoading ? '⏳' : isSubscribed ? '🔔' : '🔕'}
              </button>
            )}

            {/* Dark/Light Mode Toggle */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-2 rounded-lg ${isDarkMode ? 'bg-slate-700 text-yellow-400' : 'bg-gray-200 text-gray-700'}`}
              title={isDarkMode ? 'מצב בהיר' : 'מצב כהה'}
            >
              {isDarkMode ? '☀️' : '🌙'}
            </button>

            {/* User info */}
            <div className="text-left hidden sm:block">
              <p className={`text-sm font-bold ${textClass}`}>{user.name}</p>
              <p className="text-xs text-teal-500">{roleLabels[user.role] || user.role}</p>
            </div>

            {/* Menu button */}
            {isManager && (
              <button
                onClick={() => setShowMenu(!showMenu)}
                className={`p-2 ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'} ${textClass} rounded-lg`}
              >
                ☰
              </button>
            )}

            <button
              onClick={logout}
              className="p-2 bg-orange-500 text-white rounded-lg text-sm font-bold"
            >
              יציאה
            </button>
          </div>
        </div>

      </header>

      {/* Dropdown Menu - Outside header with high z-index */}
      {showMenu && isManager && (
        <div 
          className={`fixed left-4 top-14 ${menuBgClass} rounded-lg shadow-xl border ${borderClass} p-2 z-50 min-w-48 animate-fadeIn`}
          onClick={(e) => e.stopPropagation()}
        >
          {user.role === 'admin' && (
            <button
              onClick={() => { setShowAdminPanel(true); setShowMenu(false); }}
              className={`w-full text-right px-4 py-3 ${textClass} hover:bg-teal-600 hover:text-white rounded-lg flex items-center gap-2 transition-colors`}
            >
              <span>👤</span>
              <span>הוספת משתמש</span>
            </button>
          )}
          <button
            onClick={() => { setShowUserApproval(true); setShowMenu(false); }}
            className={`w-full text-right px-4 py-3 ${textClass} hover:bg-teal-600 hover:text-white rounded-lg flex items-center gap-2 transition-colors`}
          >
            <span>✓</span>
            <span>אישור משתמשים</span>
          </button>
          <button
            onClick={() => { setShowUserManagement(true); setShowMenu(false); }}
            className={`w-full text-right px-4 py-3 ${textClass} hover:bg-teal-600 hover:text-white rounded-lg flex items-center gap-2 transition-colors`}
          >
            <span>👥</span>
            <span>ניהול צוות</span>
          </button>
          <button
            onClick={() => { setShowStatusManager(true); setShowMenu(false); }}
            className={`w-full text-right px-4 py-3 ${textClass} hover:bg-teal-600 hover:text-white rounded-lg flex items-center gap-2 transition-colors`}
          >
            <span>⚙️</span>
            <span>ניהול סטטוסים</span>
          </button>
          <button
            onClick={() => { setShowTagManager(true); setShowMenu(false); }}
            className={`w-full text-right px-4 py-3 ${textClass} hover:bg-teal-600 hover:text-white rounded-lg flex items-center gap-2 transition-colors`}
          >
            <span>🏷️</span>
            <span>ניהול תגיות</span>
          </button>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden pb-20">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            className={`h-full ${isDarkMode ? '' : 'bg-gray-100'}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {currentView === 'daily' && (
              <DailyTaskList onTaskSelect={setSelectedTask} />
            )}
            {currentView === 'kanban' && (
              <KanbanBoard onTaskSelect={setSelectedTask} />
            )}
            {currentView === 'kanban-dash' && <KanbanDashboard />}
            {currentView === 'dashboard' && <Dashboard />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className={`fixed bottom-0 left-0 right-0 ${headerBgClass} border-t ${borderClass} z-50`}>
        <div className="flex items-center justify-around h-16">
          <button
            onClick={() => setCurrentView('daily')}
            className={`flex-1 flex flex-col items-center justify-center h-full ${
              currentView === 'daily' 
                ? 'text-teal-500' 
                : mutedTextClass
            } ${currentView === 'daily' && isDarkMode ? 'bg-slate-700/50' : currentView === 'daily' ? 'bg-teal-50' : ''}`}
          >
            <span className="text-xl">📋</span>
            <span className="text-xs font-bold mt-1">יומי</span>
          </button>

          <button
            onClick={() => setCurrentView('kanban')}
            className={`flex-1 flex flex-col items-center justify-center h-full ${
              currentView === 'kanban' 
                ? 'text-teal-500' 
                : mutedTextClass
            } ${currentView === 'kanban' && isDarkMode ? 'bg-slate-700/50' : currentView === 'kanban' ? 'bg-teal-50' : ''}`}
          >
            <span className="text-xl">🧱</span>
            <span className="text-xs font-bold mt-1">לוח</span>
          </button>

          {isManager && (
            <>
              <button
                onClick={() => setShowCreateTask(true)}
                className="flex flex-col items-center justify-center h-14 w-14 -mt-4 bg-teal-600 rounded-full shadow-lg"
              >
                <span className="text-2xl text-white">+</span>
              </button>

              <button
                onClick={() => setCurrentView('kanban-dash')}
                className={`flex-1 flex flex-col items-center justify-center h-full ${
                  currentView === 'kanban-dash' 
                    ? 'text-teal-500' 
                    : mutedTextClass
                } ${currentView === 'kanban-dash' && isDarkMode ? 'bg-slate-700/50' : currentView === 'kanban-dash' ? 'bg-teal-50' : ''}`}
              >
                <span className="text-xl">🎯</span>
                <span className="text-xs font-bold mt-1">משימות</span>
              </button>

              <button
                onClick={() => setCurrentView('dashboard')}
                className={`flex-1 flex flex-col items-center justify-center h-full ${
                  currentView === 'dashboard' 
                    ? 'text-teal-500' 
                    : mutedTextClass
                } ${currentView === 'dashboard' && isDarkMode ? 'bg-slate-700/50' : currentView === 'dashboard' ? 'bg-teal-50' : ''}`}
              >
                <span className="text-xl">📊</span>
                <span className="text-xs font-bold mt-1">סטטיסטיקה</span>
              </button>
            </>
          )}
        </div>
      </nav>

      {/* Click outside to close menu - lower z-index than menu */}
      {showMenu && (
        <div className="fixed inset-0 z-30" onClick={() => setShowMenu(false)} />
      )}

      {/* Modals */}
      {selectedTask && (
        <TaskDetail
          taskId={selectedTask.id}
          onClose={() => setSelectedTask(null)}
          onTaskUpdate={() => {}}
        />
      )}

      {showCreateTask && (
        <CreateTaskModal
          onClose={() => setShowCreateTask(false)}
          onTaskCreated={() => setShowCreateTask(false)}
        />
      )}

      {showStatusManager && (
        <StatusManager
          restaurantId={user.restaurant_id}
          onClose={() => setShowStatusManager(false)}
          onStatusesChanged={() => {}}
        />
      )}

      {showTagManager && (
        <TagManagementModal onClose={() => setShowTagManager(false)} />
      )}

      {showAdminPanel && (
        <AdminPanel onClose={() => setShowAdminPanel(false)} />
      )}

      {showUserManagement && (
        <UserManagementModal isOpen={showUserManagement} onClose={() => setShowUserManagement(false)} />
      )}

      {showUserApproval && (
        <UserApprovalModal 
          isOpen={showUserApproval} 
          onClose={() => setShowUserApproval(false)}
          token={token || ''}
        />
      )}

      {/* Exit Confirmation Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="text-center mb-6">
              <span className="text-4xl">👋</span>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-3">יציאה מהאפליקציה</h3>
              <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">האם לצאת? (תישאר מחובר)</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 py-4 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-base hover:bg-slate-300 dark:hover:bg-slate-600 active:scale-95 transition-all"
                style={{ minHeight: '52px' }}
              >
                ביטול
              </button>
              <button
                onClick={() => {
                  setShowExitConfirm(false);
                  window.close();
                  const steps = Math.max(1, window.history.length - 1);
                  window.history.go(-steps);
                }}
                className="flex-1 py-4 bg-red-600 text-white rounded-xl font-bold text-base hover:bg-red-500 active:scale-95 transition-all"
                style={{ minHeight: '52px' }}
              >
                יציאה למסך הבית
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
