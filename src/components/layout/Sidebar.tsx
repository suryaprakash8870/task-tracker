import React from 'react';
import { useApp } from '../../context/AppContext';
import { Avatar } from '../common/Avatar';
import { ViewMode } from '../../types';
import {
  LayoutDashboard,
  CheckSquare,
  Kanban,
  Calendar,
  FolderClosed,
  Lightbulb,
  Activity,
  Users,
  Settings,
  PlusCircle,
  Sparkles,
  ChevronRight
} from 'lucide-react';

interface SidebarProps {
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen, setIsMobileOpen }) => {
  const {
    currentView,
    setCurrentView,
    tasks,
    currentUser,
    workspace,
    setIsNewTaskModalOpen,
    setIsAuthModalOpen
  } = useApp();

  const myTasksCount = tasks.filter(t => t.assigneeId === currentUser.id && t.status !== 'done').length;
  
  // Count all open suggestions
  const openSuggestionsCount = tasks.reduce(
    (acc, task) => acc + task.suggestions.filter(s => s.status === 'open').length,
    0
  );

  const navItems: { id: ViewMode; label: string; icon: React.ComponentType<{ className?: string }>; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'my-tasks', label: 'My Tasks', icon: CheckSquare, badge: myTasksCount },
    { id: 'board', label: 'Team Board', icon: Kanban },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'files', label: 'Files', icon: FolderClosed },
    { id: 'suggestions', label: 'Suggestions', icon: Lightbulb, badge: openSuggestionsCount },
    { id: 'activity', label: 'Activity', icon: Activity },
    { id: 'team', label: 'Team', icon: Users },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handleNavClick = (view: ViewMode) => {
    setCurrentView(view);
    setIsMobileOpen(false);
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside
        id="app-sidebar"
        className={`fixed lg:sticky top-0 left-0 h-screen w-64 bg-slate-900 text-slate-100 flex flex-col justify-between border-r border-slate-800 z-40 transition-transform duration-200 ease-in-out ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Top: Brand & Workspace */}
        <div>
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-blue-500/20">
                TT
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-bold text-white tracking-tight truncate">
                  Team Task Tracker
                </h1>
                <p className="text-[11px] text-slate-400 truncate">
                  {workspace?.name || 'Creative Tech Studio'}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Action Button */}
          <div className="p-3">
            <button
              id="sidebar-new-task-btn"
              onClick={() => setIsNewTaskModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-sm shadow-blue-900/30 transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create New Task</span>
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="px-2 py-1 space-y-0.5" aria-label="Main Navigation">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-${item.id}`}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-slate-800 text-white font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>

                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                        isActive
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom: Active User & Persona Switcher */}
        <div className="p-3 border-t border-slate-800">
          <div
            id="sidebar-user-card"
            onClick={() => setIsAuthModalOpen(true)}
            className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-800/80 cursor-pointer transition-colors group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar user={currentUser} size="sm" showRoleBadge />
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white group-hover:text-blue-300 truncate">
                  {currentUser.name}
                </div>
                <div className="text-[10px] text-slate-400 capitalize truncate">
                  {currentUser.role} • {currentUser.title}
                </div>
              </div>
            </div>

            <div className="text-slate-500 group-hover:text-slate-300 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>

          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="w-full mt-2 py-1 px-2 text-[10px] text-slate-400 hover:text-slate-200 flex items-center justify-center gap-1.5 border border-slate-800 hover:border-slate-700 rounded-md transition-colors"
          >
            <Sparkles className="w-3 h-3 text-blue-400" />
            <span>Switch Team Persona</span>
          </button>
        </div>
      </aside>
    </>
  );
};
