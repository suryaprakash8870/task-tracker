import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardView } from './components/dashboard/DashboardView';
import { KanbanBoardView } from './components/board/KanbanBoardView';
import { MyTasksView } from './components/my-tasks/MyTasksView';
import { CalendarView } from './components/calendar/CalendarView';
import { FilesView } from './components/files/FilesView';
import { SuggestionsView } from './components/suggestions/SuggestionsView';
import { ActivityView } from './components/activity/ActivityView';
import { TeamView } from './components/team/TeamView';
import { SettingsView } from './components/settings/SettingsView';
import { TaskDetailModal } from './components/tasks/TaskDetailModal';
import { NewTaskModal } from './components/tasks/NewTaskModal';
import { AuthModal } from './components/auth/AuthModal';

const MainLayout: React.FC = () => {
  const { currentView, isLoading, isAuthModalOpen, setIsAuthModalOpen } = useApp();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center text-slate-500 gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
        <span className="text-xs font-semibold tracking-wider uppercase text-slate-400">
          Loading Team Workspace...
        </span>
      </div>
    );
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardView />;
      case 'my-tasks':
        return <MyTasksView />;
      case 'board':
        return <KanbanBoardView />;
      case 'calendar':
        return <CalendarView />;
      case 'files':
        return <FilesView />;
      case 'suggestions':
        return <SuggestionsView />;
      case 'activity':
        return <ActivityView />;
      case 'team':
        return <TeamView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col lg:flex-row font-sans transition-colors duration-150 selection:bg-blue-500 selection:text-white">
      {/* Navigation Sidebar */}
      <Sidebar
        isMobileOpen={isMobileMenuOpen}
        setIsMobileOpen={setIsMobileMenuOpen}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <Header onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />

        <main className="flex-1 overflow-x-hidden pb-12">
          {renderView()}
        </main>
      </div>

      {/* Global Modals & Overlays */}
      <TaskDetailModal />
      <NewTaskModal />
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
