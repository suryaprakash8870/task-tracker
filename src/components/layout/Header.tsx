import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Avatar } from '../common/Avatar';
import { NotificationCenter } from '../notifications/NotificationCenter';
import {
  Menu,
  Search,
  Plus,
  Bell,
  Sun,
  Moon,
  Users,
  X
} from 'lucide-react';

interface HeaderProps {
  onToggleMobileMenu: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileMenu }) => {
  const {
    currentView,
    searchQuery,
    setSearchQuery,
    unreadNotificationCount,
    theme,
    toggleTheme,
    currentUser,
    setIsNewTaskModalOpen,
    setIsAuthModalOpen,
    tasks
  } = useApp();

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Close notifications if clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const titles: Record<string, { title: string; subtitle: string }> = {
    dashboard: { title: 'Dashboard', subtitle: 'Overview of your tasks, team workload, and priorities' },
    'my-tasks': { title: 'My Tasks', subtitle: 'Items assigned to you sorted by urgency and status' },
    board: { title: 'Team Kanban Board', subtitle: 'Live status tracking across all team initiatives' },
    calendar: { title: 'Calendar & Deadlines', subtitle: 'Visual timeline and scheduled task milestones' },
    files: { title: 'Project Files', subtitle: 'All design mockups, specs, and attachments across tasks' },
    suggestions: { title: 'Suggestions Hub', subtitle: 'Ideas, recommendations, and reviews from team members' },
    activity: { title: 'Team Activity', subtitle: 'Chronological audit feed of status updates and assignments' },
    team: { title: 'Team Workspace', subtitle: 'Members, roles, assignments, and workload breakdown' },
    settings: { title: 'Settings', subtitle: 'Workspace preferences, user profile, and data management' },
  };

  const currentInfo = titles[currentView] || { title: 'Overview', subtitle: 'Team Task Tracker' };

  return (
    <header
      id="app-header"
      className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors"
    >
      <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 gap-4">
        {/* Left: Mobile trigger & view title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            id="mobile-menu-trigger"
            onClick={onToggleMobileMenu}
            className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg lg:hidden"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100 tracking-tight truncate">
              {currentInfo.title}
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block truncate">
              {currentInfo.subtitle}
            </p>
          </div>
        </div>

        {/* Center: Quick Search Bar */}
        <div className="flex-1 max-w-md hidden md:block">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              id="global-search-input"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search tasks, labels, descriptions... (Press / to focus)"
              className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-100/80 dark:bg-slate-800/80 border border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Right Actions: New Task, Theme, Notifications, User */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Create Task Button */}
          <button
            id="header-create-task-btn"
            onClick={() => setIsNewTaskModalOpen(true)}
            className="flex items-center gap-1.5 py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs shadow-blue-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="hidden sm:inline">New Task</span>
          </button>

          {/* Theme Toggle */}
          <button
            id="theme-toggle-btn"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600" />
            )}
          </button>

          {/* Notification Bell with Dropdown */}
          <div className="relative" ref={notifRef}>
            <button
              id="notification-bell-btn"
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors relative"
              aria-label="View notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadNotificationCount > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white dark:ring-slate-900" />
              )}
            </button>

            <NotificationCenter isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />
          </div>

          {/* Member Switcher trigger */}
          <button
            id="header-profile-btn"
            onClick={() => setIsAuthModalOpen(true)}
            className="flex items-center gap-2 p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            title={`Active: ${currentUser.name} (${currentUser.role})`}
          >
            <Avatar user={currentUser} size="sm" showRoleBadge />
          </button>
        </div>
      </div>

      {/* Mobile search bar */}
      <div className="px-4 pb-2.5 md:hidden">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search all tasks..."
            className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 border border-transparent rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
