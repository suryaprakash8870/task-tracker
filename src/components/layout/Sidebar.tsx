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
  Plus,
  Sparkles,
  ChevronRight,
  Command,
  Layers
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
  
  const openSuggestionsCount = tasks.reduce(
    (acc, task) => acc + task.suggestions.filter(s => s.status === 'open').length,
    0
  );

  const mainNavItems: { id: ViewMode; label: string; icon: React.ComponentType<{ className?: string }>; badge?: number; isAi?: boolean; shortcut?: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, shortcut: '1' },
    { id: 'ai-assistant', label: 'AI Assistant', icon: Sparkles, isAi: true, shortcut: 'A' },
    { id: 'my-tasks', label: 'My Tasks', icon: CheckSquare, badge: myTasksCount, shortcut: '2' },
    { id: 'board', label: 'Team Board', icon: Kanban, shortcut: '3' },
    { id: 'calendar', label: 'Calendar', icon: Calendar, shortcut: '4' },
  ];

  const secondaryNavItems: { id: ViewMode; label: string; icon: React.ComponentType<{ className?: string }>; badge?: number }[] = [
    { id: 'files', label: 'Files & Assets', icon: FolderClosed },
    { id: 'suggestions', label: 'Suggestions', icon: Lightbulb, badge: openSuggestionsCount },
    { id: 'activity', label: 'Activity Log', icon: Activity },
    { id: 'team', label: 'Team Directory', icon: Users },
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
        className={`fixed lg:sticky top-0 left-0 h-screen w-64 bg-white/95 text-slate-800 flex flex-col justify-between border-r border-slate-200/90 z-40 transition-transform duration-200 ease-in-out select-none backdrop-blur-md ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Top Header & Workspace Switcher */}
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
          {/* Workspace Branding Header */}
          <div className="p-3.5 border-b border-slate-100/90 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center font-bold text-xs shadow-xs tracking-tight">
                <Layers className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-zinc-900 truncate tracking-tight">
                  {workspace?.name || 'Creative Studio'}
                </div>
                <div className="text-[10px] text-zinc-500 font-medium flex items-center gap-1 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                  <span>Team Workspace</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => handleNavClick('settings')}
              className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-md transition-colors"
              title="Workspace Settings"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* High-Contrast Create Task Action */}
          <div className="p-3 shrink-0">
            <button
              id="sidebar-new-task-btn"
              onClick={() => setIsNewTaskModalOpen(true)}
              className="w-full flex items-center justify-between py-2 px-3 bg-zinc-900 hover:bg-zinc-800 active:bg-black text-white rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-zinc-300 group-hover:rotate-90 transition-transform duration-150" />
                <span>New Task</span>
              </div>
              <kbd className="hidden sm:inline-flex items-center text-[10px] font-mono text-zinc-400 bg-zinc-800/80 px-1.5 py-0.5 rounded border border-zinc-700">
                C
              </kbd>
            </button>
          </div>

          {/* Main Navigation Section */}
          <div className="px-3 pt-1 pb-1">
            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              Overview
            </div>
            <nav className="space-y-0.5" aria-label="Main Navigation">
              {mainNavItems.map(item => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    id={`nav-${item.id}`}
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-all group ${
                      isActive
                        ? 'bg-zinc-100 text-zinc-950 font-semibold shadow-2xs'
                        : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 truncate">
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-colors ${
                          isActive
                            ? item.isAi
                              ? 'text-indigo-600'
                              : 'text-zinc-900'
                            : item.isAi
                            ? 'text-indigo-500'
                            : 'text-zinc-400 group-hover:text-zinc-600'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                      {item.isAi && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                          AI
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {item.badge !== undefined && item.badge > 0 && (
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                            isActive
                              ? 'bg-zinc-900 text-white'
                              : 'bg-zinc-100 text-zinc-600 group-hover:bg-zinc-200'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Secondary Navigation Section */}
          <div className="px-3 pt-3 pb-2">
            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              Workspace
            </div>
            <nav className="space-y-0.5" aria-label="Workspace Navigation">
              {secondaryNavItems.map(item => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    id={`nav-${item.id}`}
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-all group ${
                      isActive
                        ? 'bg-zinc-100 text-zinc-950 font-semibold shadow-2xs'
                        : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 truncate">
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-colors ${
                          isActive ? 'text-zinc-900' : 'text-zinc-400 group-hover:text-zinc-600'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </div>

                    {item.badge !== undefined && item.badge > 0 && (
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                          isActive
                            ? 'bg-zinc-900 text-white'
                            : 'bg-zinc-100 text-zinc-600 group-hover:bg-zinc-200'
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
        </div>

        {/* Footer Profile & Persona Switcher */}
        <div className="p-3 border-t border-slate-100 shrink-0 bg-zinc-50/70">
          <div
            id="sidebar-user-card"
            onClick={() => setIsAuthModalOpen(true)}
            className="flex items-center justify-between p-2 rounded-lg hover:bg-white hover:shadow-2xs cursor-pointer transition-all border border-transparent hover:border-slate-200/80 group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar user={currentUser} size="sm" showRoleBadge />
              <div className="min-w-0">
                <div className="text-xs font-bold text-zinc-900 group-hover:text-blue-600 truncate">
                  {currentUser.name}
                </div>
                <div className="text-[10px] text-zinc-500 capitalize truncate">
                  {currentUser.role} • {currentUser.title}
                </div>
              </div>
            </div>

            <ChevronRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-700 transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>
      </aside>
    </>
  );
};

