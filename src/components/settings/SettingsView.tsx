import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Avatar } from '../common/Avatar';
import {
  Settings,
  User,
  Building,
  Moon,
  Sun,
  Download,
  RotateCcw,
  Database,
  ShieldCheck,
  Check,
  Zap,
  Server
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const {
    currentUser,
    updateCurrentUserProfile,
    workspace,
    theme,
    toggleTheme,
    tasks,
    users,
    notifications,
    resetData
  } = useApp();

  const [name, setName] = useState(currentUser.name);
  const [title, setTitle] = useState(currentUser.title);
  const [department, setDepartment] = useState(currentUser.department);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateCurrentUserProfile({ name, title, department });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleExportData = () => {
    const exportPayload = {
      workspace,
      users,
      tasks,
      notifications,
      exportedAt: new Date().toISOString()
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `team-task-tracker-export-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleResetData = async () => {
    if (window.confirm('Reset all tasks, suggestions, and activity to original clean demo state?')) {
      await resetData();
      alert('Data reset successfully to original clean state!');
    }
  };

  return (
    <div id="settings-view" className="p-4 sm:p-6 space-y-6 max-w-4xl mx-auto">
      {/* Profile Settings Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="p-2 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-xl">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-base text-slate-900 dark:text-slate-100">
              User Profile
            </h3>
            <p className="text-xs text-slate-500">Manage your persona and contact information</p>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar user={currentUser} size="xl" showRoleBadge />
            <div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">{currentUser.name}</h4>
              <p className="text-xs text-slate-500">{currentUser.email}</p>
              <span className="inline-block mt-1 text-[11px] font-semibold px-2 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 uppercase">
                {currentUser.role}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Job Title
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Department
              </label>
              <input
                type="text"
                value={department}
                onChange={e => setDepartment(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            {savedSuccess ? (
              <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                <Check className="w-4 h-4" /> Changes saved successfully!
              </span>
            ) : (
              <span />
            )}
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              Save Profile
            </button>
          </div>
        </form>
      </div>

      {/* Theme & Display Preferences */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="p-2 bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 rounded-xl">
            <Sun className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-base text-slate-900 dark:text-slate-100">
              Appearance & Theme
            </h3>
            <p className="text-xs text-slate-500">Choose your preferred workspace aesthetic</p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
              Color Theme Mode
            </span>
            <span className="text-xs text-slate-500">Currently active: {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
          </div>

          <button
            onClick={toggleTheme}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            <span>Toggle to {theme === 'dark' ? 'Light' : 'Dark'}</span>
          </button>
        </div>
      </div>

      {/* Backend & Architecture Readiness */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="p-2 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-base text-slate-900 dark:text-slate-100">
              Backend Architecture Preparedness
            </h3>
            <p className="text-xs text-slate-500">Decoupled data access layer ready for Supabase connection</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-900 dark:text-slate-100 block">Supabase Auth</span>
              <p className="text-slate-500 text-[11px] mt-0.5">Abstracted user sessions and RBAC role identifiers</p>
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800 flex items-start gap-2.5">
            <Server className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-900 dark:text-slate-100 block">PostgreSQL Schema</span>
              <p className="text-slate-500 text-[11px] mt-0.5">Normalized Tasks, Subtasks, Comments, Suggestions, Activity tables</p>
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800 flex items-start gap-2.5">
            <Zap className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-900 dark:text-slate-100 block">Supabase Realtime</span>
              <p className="text-slate-500 text-[11px] mt-0.5">Event-driven notification hooks & live status subscription ready</p>
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800 flex items-start gap-2.5">
            <Database className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-900 dark:text-slate-100 block">Supabase Storage</span>
              <p className="text-slate-500 text-[11px] mt-0.5">File attachment metadata and bucket upload pipelines</p>
            </div>
          </div>
        </div>
      </div>

      {/* Data Management & Export */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl">
            <Download className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-base text-slate-900 dark:text-slate-100">
              Data Management & Backup
            </h3>
            <p className="text-xs text-slate-500">Export workspace JSON or restore original demo fixtures</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
          <button
            onClick={handleExportData}
            className="w-full sm:w-auto px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export Workspace as JSON</span>
          </button>

          <button
            onClick={handleResetData}
            className="w-full sm:w-auto px-4 py-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset Demo Data</span>
          </button>
        </div>
      </div>
    </div>
  );
};
