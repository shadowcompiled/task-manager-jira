import { useState } from 'react';
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

type ViewType = 'daily' | 'kanban' | 'dashboard' | 'kanban-dash';


export default function App() {
  const { user, logout, token } = useAuthStore();
  const [currentView, setCurrentView] = useState<ViewType>('daily');
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showStatusManager, setShowStatusManager] = useState(false);
  const [showTagManager, setShowTagManager] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [showUserApproval, setShowUserApproval] = useState(false);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [showUsersNotificationStatus, setShowUsersNotificationStatus] = useState(false);

  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className="h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col">
      {/* Header */}
      <header className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 border-b-4 border-teal-500/40 shadow-2xl sticky top-0 z-40 transform transition-transform duration-300">
        <div className="max-w-7xl mx-auto px-3 md:px-4 h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 md:gap-2 min-w-0">
            <h1 className="text-xl md:text-2xl font-bold text-white truncate drop-shadow-lg">🍽️ Mission Tracker</h1>
            <span className="text-xs md:text-sm text-teal-300/80 hidden sm:inline font-semibold">Restaurant Operations</span>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <div className="text-right hidden sm:block">
              <p className="font-bold text-white text-sm drop-shadow-lg">{user.name}</p>
              <p className="text-xs text-teal-300/80 capitalize font-semibold">{user.role}</p>
            </div>
            {/* Mobile: single menu button */}
            {(user.role === 'admin' || user.role === 'manager' || user.role === 'maintainer') && (
              <div className="md:hidden relative">
                <button
                  onClick={() => setShowHeaderMenu(!showHeaderMenu)}
                  className="p-2 rounded-lg bg-slate-600/80 text-white min-h-[44px] min-w-[44px] flex items-center justify-center"
                  title="Menu"
                  aria-label="Open menu"
                >
                  ⋯
                </button>
                {showHeaderMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowHeaderMenu(false)} aria-hidden="true" />
                    <div className="absolute right-0 top-full mt-1 py-2 w-48 bg-slate-800 border border-teal-500/40 rounded-xl shadow-xl z-50">
                      {user.role === 'admin' && (
                        <button onClick={() => { setShowAdminPanel(true); setShowHeaderMenu(false); }} className="w-full text-right px-4 py-3 text-white hover:bg-slate-700 text-sm font-bold">
                          👤 Users
                        </button>
                      )}
                      {user.role === 'admin' && (
                        <button onClick={() => { setShowUsersNotificationStatus(true); setShowHeaderMenu(false); }} className="w-full text-right px-4 py-3 text-white hover:bg-slate-700 text-sm font-bold">
                          🔔 Notifications
                        </button>
                      )}
                      <button onClick={() => { setShowUserApproval(true); setShowHeaderMenu(false); }} className="w-full text-right px-4 py-3 text-white hover:bg-slate-700 text-sm font-bold">
                        ✓ Approve
                      </button>
                      <button onClick={() => { setShowStatusManager(true); setShowHeaderMenu(false); }} className="w-full text-right px-4 py-3 text-white hover:bg-slate-700 text-sm font-bold">
                        ⚙️ Status
                      </button>
                      <button onClick={() => { setShowTagManager(true); setShowHeaderMenu(false); }} className="w-full text-right px-4 py-3 text-white hover:bg-slate-700 text-sm font-bold">
                        🏷️ Tags
                      </button>
                      <button onClick={() => { setShowUserManagement(true); setShowHeaderMenu(false); }} className="w-full text-right px-4 py-3 text-white hover:bg-slate-700 text-sm font-bold">
                        👥 Team
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
                  <button onClick={() => setShowAdminPanel(true)} className="px-3 py-2 bg-teal-600/80 hover:bg-teal-700 text-white rounded-lg text-sm font-bold whitespace-nowrap" title="Add new user">👤 Users</button>
                )}
                {user.role === 'admin' && (
                  <button onClick={() => setShowUsersNotificationStatus(true)} className="px-3 py-2 bg-amber-600/80 hover:bg-amber-700 text-white rounded-lg text-sm font-bold whitespace-nowrap" title="Users & notifications">🔔</button>
                )}
                <button onClick={() => setShowUserApproval(true)} className="px-3 py-2 bg-orange-600/80 hover:bg-orange-700 text-white rounded-lg text-sm font-bold whitespace-nowrap">✓ Approve</button>
                <button onClick={() => setShowStatusManager(true)} className="px-3 py-2 bg-cyan-600/80 hover:bg-cyan-700 text-white rounded-lg text-sm font-bold whitespace-nowrap">⚙️ Status</button>
                <button onClick={() => setShowTagManager(true)} className="px-3 py-2 bg-emerald-600/80 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold whitespace-nowrap">🏷️ Tags</button>
                <button onClick={() => setShowUserManagement(true)} className="px-3 py-2 bg-purple-600/80 hover:bg-purple-700 text-white rounded-lg text-sm font-bold whitespace-nowrap">👥 Team</button>
              </div>
            )}
            <button onClick={logout} className="px-3 md:px-4 py-2 bg-red-600/80 hover:bg-red-700 text-white rounded-lg text-sm font-bold min-h-[44px]">
              🔓 Logout
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-hidden flex">
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
              📋 Daily
            </button>

            <button
              onClick={() => setCurrentView('kanban')}
              className={`w-full text-left px-4 py-3 rounded-lg font-bold transition-all duration-300 transform hover:scale-105 ${
                currentView === 'kanban'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg scale-105'
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              🧱 Kanban
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
                  🎯 Missions
                </button>
                <button
                  onClick={() => setCurrentView('dashboard')}
                  className={`w-full text-left px-4 py-3 rounded-lg font-bold transition-all duration-300 transform hover:scale-105 ${
                    currentView === 'dashboard'
                      ? 'bg-gradient-to-r from-cyan-600 to-teal-600 text-white shadow-lg scale-105'
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  📊 Dashboard
                </button>
              </>
            )}

            {(user.role === 'manager' || user.role === 'admin' || user.role === 'maintainer') && (
              <button
                onClick={() => setShowCreateTask(true)}
                className="w-full text-left px-4 py-3 rounded-lg font-bold bg-gradient-to-r from-teal-600 to-emerald-600 text-white hover:from-teal-700 hover:to-emerald-700 transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg mt-4 hover:shadow-teal-500/50"
              >
                ➕ Create Mission
              </button>
            )}
          </div>
        </nav>

      {/* Bottom Navigation for Mobile */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 border-t border-teal-500/40 shadow-2xl z-50">
        <div className="flex justify-around items-center">
          <button
            onClick={() => setCurrentView('daily')}
            className={`flex-1 py-3 text-center text-xs font-semibold transition-all ${
              currentView === 'daily'
                ? 'text-teal-300 border-t-2 border-teal-400 bg-slate-700/50'
                : 'text-slate-400 hover:text-teal-300'
            }`}
          >
            📋 Daily
          </button>
          <button
            onClick={() => setCurrentView('kanban')}
            className={`flex-1 py-3 text-center text-xs font-semibold transition-all ${
              currentView === 'kanban'
                ? 'text-teal-300 border-t-2 border-teal-400 bg-slate-700/50'
                : 'text-slate-400 hover:text-teal-300'
            }`}
          >
            🧱 Kanban
          </button>
          {(user.role === 'manager' || user.role === 'admin' || user.role === 'maintainer') && (
            <>
              <button
                onClick={() => setShowCreateTask(true)}
                className="flex-1 py-3 text-center text-xl font-bold text-white bg-gradient-to-r from-teal-600 to-emerald-600 shadow-lg border-t-2 border-teal-400 hover:from-teal-700 hover:to-emerald-700 hover:text-teal-100 hover:scale-110 transition-all rounded-none"
                title="Create new mission"
                style={{ zIndex: 10 }}
              >
                <span className="inline-flex flex-col items-center">
                  <span className="text-2xl leading-none">➕</span>
                  <span className="text-xs font-bold mt-1">Create</span>
                </span>
              </button>
              <button
                onClick={() => setCurrentView('kanban-dash')}
                className={`flex-1 py-3 text-center text-xs font-semibold transition-all ${
                  currentView === 'kanban-dash'
                    ? 'text-teal-300 border-t-2 border-teal-400 bg-slate-700/50'
                    : 'text-slate-400 hover:text-teal-300'
                }`}
              >
                🎯 Missions
              </button>
              <button
                onClick={() => setCurrentView('dashboard')}
                className={`flex-1 py-3 text-center text-xs font-semibold transition-all ${
                  currentView === 'dashboard'
                    ? 'text-teal-300 border-t-2 border-teal-400 bg-slate-700/50'
                    : 'text-slate-400 hover:text-teal-300'
                }`}
              >
                📊 Dashboard
              </button>
            </>
          )}
        </div>
      </div>

        {/* Main Content */}
        <main className="flex-1 overflow-auto pb-20 md:pb-0">
          {currentView === 'daily' && (
            <DailyTaskList onTaskSelect={setSelectedTask} />
          )}
          {currentView === 'kanban' && (
            <KanbanBoard onTaskSelect={setSelectedTask} />
          )}
          {currentView === 'kanban-dash' && <KanbanDashboard />}
          {currentView === 'dashboard' && <Dashboard />}
        </main>
      </div>

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetail
          taskId={selectedTask.id}
          onClose={() => setSelectedTask(null)}
          onTaskUpdate={() => {
            // Refresh data
          }}
        />
      )}

      {/* Create Task Modal */}
      {showCreateTask && (
        <CreateTaskModal
          onClose={() => setShowCreateTask(false)}
          onTaskCreated={() => setShowCreateTask(false)}
        />
      )}

      {/* Status Manager Modal */}
      {showStatusManager && (
        <StatusManager
          restaurantId={user.restaurant_id}
          onClose={() => setShowStatusManager(false)}
          onStatusesChanged={() => {
            // Refresh kanban board statuses
          }}
        />
      )}

      {/* Tag Manager Modal */}
      {showTagManager && (
        <TagManagementModal
          onClose={() => setShowTagManager(false)}
        />
      )}

      {/* Admin Panel Modal */}
      {showAdminPanel && (
        <AdminPanel onClose={() => setShowAdminPanel(false)} />
      )}

      {/* User Management Modal */}
      {showUserManagement && (
        <UserManagementModal isOpen={showUserManagement} onClose={() => setShowUserManagement(false)} />
      )}

      {/* User Approval Modal */}
      {showUserApproval && (
        <UserApprovalModal 
          isOpen={showUserApproval} 
          onClose={() => setShowUserApproval(false)}
          token={token || ''}
        />
      )}

      {/* Users & Notifications Status (admin only) */}
      {showUsersNotificationStatus && user?.role === 'admin' && (
        <UsersNotificationStatusModal onClose={() => setShowUsersNotificationStatus(false)} />
      )}
    </div>
  );
}
