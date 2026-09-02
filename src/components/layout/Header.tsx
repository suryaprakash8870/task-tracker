import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { aiCreditService, AICreditState } from '../../services/aiCreditService';
import { Avatar } from '../common/Avatar';
import { NotificationCenter } from '../notifications/NotificationCenter';
import { ExportReportModal } from '../common/ExportReportModal';
import {
  Menu,
  Search,
  Plus,
  Bell,
  X,
  Sparkles,
  Zap,
  Radio,
  Download,
  FileSpreadsheet
} from 'lucide-react';

interface HeaderProps {
  onToggleMobileMenu: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileMenu }) => {
  const {
    currentView,
    setCurrentView,
    searchQuery,
    setSearchQuery,
    unreadNotificationCount,
    currentUser,
    setIsNewTaskModalOpen,
    setIsAuthModalOpen,
    realtimeStatus
  } = useApp();

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [credits, setCredits] = useState<AICreditState>(() => aiCreditService.getCredits());
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = aiCreditService.subscribe(setCredits);
    return unsub;
  }, []);

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
    dashboard: { title: 'Dashboard', subtitle: 'Overview of team workload and priorities' },
    'ai-assistant': { title: 'AI Assistant', subtitle: 'Natural task chat, automated updates & tool workflows' },
    'my-tasks': { title: 'My Tasks', subtitle: 'Assigned to you sorted by urgency and status' },
    board: { title: 'Team Board', subtitle: 'Live status tracking across all team initiatives' },
    calendar: { title: 'Calendar & Deadlines', subtitle: 'Visual timeline and scheduled milestones' },
    files: { title: 'Project Files', subtitle: 'Design mockups, specs, and attachments' },
    suggestions: { title: 'Suggestions Hub', subtitle: 'Ideas, recommendations, and reviews' },
    activity: { title: 'Team Activity', subtitle: 'Chronological audit feed of changes' },
    team: { title: 'Team Workspace', subtitle: 'Members, roles, and workload breakdown' },
    settings: { title: 'Settings', subtitle: 'Workspace preferences and configuration' },
  };

  const currentInfo = titles[currentView] || { title: 'Overview', subtitle: 'Team Task Tracker' };

  return (
    <header
      id="app-header"
      className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 transition-colors"
    >
      <div className="flex items-center justify-between px-4 sm:px-6 py-2.5 gap-4">
        {/* Left: Mobile trigger & view title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            id="mobile-menu-trigger"
            onClick={onToggleMobileMenu}
            className="p-1.5 text-zinc-600 hover:bg-zinc-100 rounded-md lg:hidden"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-bold text-zinc-900 tracking-tight truncate">
              {currentInfo.title}
            </h2>
            <p className="text-[11px] text-zinc-500 hidden sm:block truncate">
              {currentInfo.subtitle}
            </p>
          </div>
        </div>

        {/* Center: Quick Search Bar */}
        <div className="flex-1 max-w-md hidden md:block">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              id="global-search-input"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search tasks, labels, assignees..."
              className="w-full pl-8.5 pr-8 py-1.5 text-xs bg-zinc-100/80 hover:bg-zinc-100 focus:bg-white border border-transparent focus:border-zinc-300 text-zinc-900 rounded-md placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-zinc-900/10 transition-all font-normal"
            />
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
                <kbd className="text-[10px] font-mono text-zinc-400 bg-zinc-200/60 px-1 py-0.5 rounded border border-zinc-200">
                  /
                </kbd>
              </div>
            )}
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Live Realtime Indicator */}
          <div
            id="realtime-status-badge"
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-50 border border-zinc-200/80 text-[11px] font-medium text-zinc-600"
            title={
              realtimeStatus === 'CONNECTED'
                ? 'Supabase Realtime is actively listening for live database changes'
                : realtimeStatus === 'CONNECTING'
                ? 'Connecting to Realtime channel...'
                : 'Realtime is offline / reconnecting'
            }
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                realtimeStatus === 'CONNECTED'
                  ? 'bg-emerald-500 ring-3 ring-emerald-500/20'
                  : realtimeStatus === 'CONNECTING'
                  ? 'bg-amber-400 ring-3 ring-amber-400/20'
                  : 'bg-zinc-400'
              }`}
            />
            <span className="text-zinc-600 text-[11px]">
              {realtimeStatus === 'CONNECTED'
                ? 'Synced'
                : realtimeStatus === 'CONNECTING'
                ? 'Syncing'
                : 'Offline'}
            </span>
          </div>

          {/* AI Assistant Quick Nav Button */}
          <button
            id="header-ai-assistant-btn"
            onClick={() => setCurrentView('ai-assistant')}
            className={`flex items-center gap-1.5 py-1.5 px-2.5 rounded-md text-xs font-semibold border transition-all cursor-pointer ${
              currentView === 'ai-assistant'
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-2xs'
                : 'bg-white hover:bg-zinc-50 text-zinc-700 border-zinc-200 shadow-2xs hover:border-zinc-300'
            }`}
            title={`Open AI Assistant (${credits.remaining} daily credits remaining)`}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span className="hidden sm:inline">AI Chat</span>
            <span className="font-mono text-[10px] px-1 py-0.2 rounded bg-zinc-100 text-zinc-600 border border-zinc-200/60 hidden md:inline">
              {credits.remaining}⚡
            </span>
          </button>

          {/* Export Workload Report Button */}
          <button
            id="header-export-report-btn"
            onClick={() => setIsExportModalOpen(true)}
            className="hidden sm:flex items-center gap-1.5 py-1.5 px-2.5 bg-white hover:bg-zinc-50 active:bg-zinc-100 text-zinc-700 rounded-md text-xs font-semibold border border-zinc-200 shadow-2xs transition-all cursor-pointer hover:border-zinc-300"
            title="Export Team Workload to Excel or PDF for Manager review"
          >
            <Download className="w-3.5 h-3.5 text-zinc-500" />
            <span className="hidden md:inline">Export</span>
          </button>

          {/* Create Task Button */}
          <button
            id="header-create-task-btn"
            onClick={() => setIsNewTaskModalOpen(true)}
            className="flex items-center gap-1.5 py-1.5 px-3 bg-zinc-900 hover:bg-zinc-800 active:bg-black text-white rounded-md text-xs font-semibold shadow-2xs transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="hidden sm:inline">New Task</span>
          </button>

          {/* Notification Bell */}
          <div className="relative" ref={notifRef}>
            <button
              id="notification-bell-btn"
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="p-1.5 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 rounded-md transition-colors relative cursor-pointer"
              aria-label="View notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadNotificationCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white" />
              )}
            </button>

            <NotificationCenter isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />
          </div>

          {/* Member Switcher trigger */}
          <button
            id="header-profile-btn"
            onClick={() => setIsAuthModalOpen(true)}
            className="flex items-center gap-1.5 p-0.5 hover:bg-zinc-100 rounded-md transition-colors cursor-pointer"
            title={`Active: ${currentUser.name} (${currentUser.role})`}
          >
            <Avatar user={currentUser} size="sm" showRoleBadge />
          </button>
        </div>
      </div>

      {/* Mobile search bar */}
      <div className="px-4 pb-2.5 md:hidden">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search all tasks..."
            className="w-full pl-8 pr-8 py-1.5 text-xs bg-zinc-100 border border-zinc-200 rounded-md text-zinc-900 placeholder-zinc-400 focus:outline-hidden"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <ExportReportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />
    </header>
  );
};

