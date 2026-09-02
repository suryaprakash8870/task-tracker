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
import { AIAssistantView } from './components/ai/AIAssistantView';
import { TaskDetailModal } from './components/tasks/TaskDetailModal';
import { NewTaskModal } from './components/tasks/NewTaskModal';
import { AuthModal } from './components/auth/AuthModal';
import { DatabaseSchemaModal } from './components/common/DatabaseSchemaModal';
import { ToastContainer } from './components/common/ToastContainer';
import { ConfirmDialogModal } from './components/common/ConfirmDialogModal';
import { FloatingAIChatWidget } from './components/ai/FloatingAIChatWidget';
import { AlertCircle, Database, RefreshCw, Key, ShieldCheck, Terminal } from 'lucide-react';

const MainLayout: React.FC = () => {
  const {
    currentView,
    isLoading,
    isAuthModalOpen,
    setIsAuthModalOpen,
    errorMessage,
    clearError,
    retryConnection,
    isConfigured,
    isDemoMode,
    toasts,
    dismissToast,
    confirmDialog,
    closeConfirmDialog
  } = useApp();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSchemaModalOpen, setIsSchemaModalOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-500 gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
        <span className="text-xs font-semibold tracking-wider uppercase text-slate-400">
          Loading Supabase Workspace...
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
      case 'ai-assistant':
        return <AIAssistantView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col lg:flex-row font-sans transition-colors duration-150 selection:bg-blue-500 selection:text-white">
      {/* Navigation Sidebar */}
      <Sidebar
        isMobileOpen={isMobileMenuOpen}
        setIsMobileOpen={setIsMobileMenuOpen}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <Header onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />

        {/* Supabase Error Banner if Error Occurred */}
        {errorMessage && (
          <div className="mx-4 sm:mx-6 mt-4 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-amber-950 flex items-center gap-1.5">
                  <span>Backend Notice / Connection State</span>
                  {errorMessage.includes('schema cache') && (
                    <span className="px-1.5 py-0.5 bg-amber-200 text-amber-900 rounded font-normal text-[10px]">
                      Database Tables Needed
                    </span>
                  )}
                </p>
                <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                  {errorMessage.includes('schema cache')
                    ? "Your Supabase project is connected, but the database tables haven't been created yet. Click 'SQL Setup Script' to view and copy the script to run in your Supabase SQL Editor."
                    : errorMessage}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <button
                onClick={() => setIsSchemaModalOpen(true)}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>SQL Setup Script</span>
              </button>
              <button
                onClick={retryConnection}
                className="px-3 py-1.5 bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry
              </button>
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="px-3 py-1.5 bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
              >
                <Key className="w-3.5 h-3.5" />
                Auth
              </button>
            </div>
          </div>
        )}

        <main className="flex-1 overflow-x-hidden pb-12">
          {renderView()}
        </main>
      </div>

      {/* Global Modals, Alerts & Overlays */}
      <TaskDetailModal />
      <NewTaskModal />
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      <DatabaseSchemaModal isOpen={isSchemaModalOpen} onClose={() => setIsSchemaModalOpen(false)} />
      <ConfirmDialogModal dialog={confirmDialog} onClose={closeConfirmDialog} />
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      <FloatingAIChatWidget />
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
