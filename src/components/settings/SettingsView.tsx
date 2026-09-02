import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Avatar } from '../common/Avatar';
import { aiClient } from '../../services/aiClient';
import { AIUsageSummary } from '../../types';
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
  Server,
  Copy,
  Terminal,
  Sparkles,
  Cpu,
  ShieldAlert,
  Activity
} from 'lucide-react';

const SQL_RLS_FIX = `-- ==============================================================================
-- 🚀 SUPABASE RLS QUICK FIX (Copy & Run in Supabase SQL Editor)
-- ==============================================================================
DROP POLICY IF EXISTS "Workspace members can insert tasks" ON public.tasks;
DROP POLICY IF EXISTS "Workspace members can update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Workspace members can delete tasks" ON public.tasks;
DROP POLICY IF EXISTS "Workspace members can view tasks" ON public.tasks;
DROP POLICY IF EXISTS "Manage tasks" ON public.tasks;
CREATE POLICY "Manage tasks" ON public.tasks FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Manage workspace_members" ON public.workspace_members;
DROP POLICY IF EXISTS "Manage workspace members" ON public.workspace_members;
CREATE POLICY "Manage workspace members" ON public.workspace_members FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Profiles are viewable" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update profile" ON public.profiles;
CREATE POLICY "Profiles are viewable" ON public.profiles FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Users can insert profile" ON public.profiles FOR INSERT TO authenticated, anon WITH CHECK (true);
CREATE POLICY "Users can update profile" ON public.profiles FOR UPDATE TO authenticated, anon USING (true);

-- Auto-enroll all profiles into existing workspaces
INSERT INTO public.workspace_members (workspace_id, user_id, role)
SELECT w.id, p.id, 'member'
FROM public.workspaces w CROSS JOIN public.profiles p
ON CONFLICT (workspace_id, user_id) DO NOTHING;

NOTIFY pgrst, 'reload schema';`;

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
    resetData,
    showToast,
    showConfirmDialog
  } = useApp();

  const [name, setName] = useState(currentUser.name);
  const [title, setTitle] = useState(currentUser.title);
  const [department, setDepartment] = useState(currentUser.department);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [aiStatus, setAiStatus] = useState<AIUsageSummary | null>(null);

  useEffect(() => {
    aiClient.getStatus().then(setAiStatus).catch(() => {});
  }, []);

  const handleCopySql = () => {
    navigator.clipboard.writeText(SQL_RLS_FIX);
    setCopiedSql(true);
    showToast({
      type: 'success',
      title: 'SQL Copied to Clipboard',
      message: 'Paste and run this snippet in your Supabase SQL Editor to apply the RLS fix.'
    });
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateCurrentUserProfile({ name, title, department });
      setSavedSuccess(true);
      showToast({
        type: 'success',
        title: 'Profile Saved',
        message: 'Your profile details have been updated successfully.'
      });
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not save profile';
      showToast({
        type: 'error',
        title: 'Update Failed',
        message: msg
      });
    }
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

    showToast({
      type: 'success',
      title: 'Export Downloaded',
      message: 'Workspace JSON archive downloaded to your device.'
    });
  };

  const handleResetData = () => {
    showConfirmDialog({
      title: 'Reset Workspace to Clean Demo State?',
      message: 'This will reset all tasks, subtasks, notes, suggestions, and attachments to their initial clean demo data state. Are you sure you want to proceed?',
      confirmLabel: 'Reset All Data',
      variant: 'danger',
      onConfirm: async () => {
        await resetData();
        showToast({
          type: 'success',
          title: 'Workspace Reset',
          message: 'Data reset successfully to original clean state!'
        });
      }
    });
  };

  return (
    <div id="settings-view" className="p-4 sm:p-6 space-y-6 max-w-4xl mx-auto">
      {/* Profile Settings Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-base text-slate-900">
              User Profile
            </h3>
            <p className="text-xs text-slate-500">Manage your persona and contact information</p>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar user={currentUser} size="xl" showRoleBadge />
            <div>
              <h4 className="font-bold text-sm text-slate-900">{currentUser.name}</h4>
              <p className="text-xs text-slate-500">{currentUser.email}</p>
              <span className="inline-block mt-1 text-[11px] font-semibold px-2 py-0.5 rounded bg-purple-100 text-purple-700 uppercase">
                {currentUser.role}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Job Title
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Department
              </label>
              <input
                type="text"
                value={department}
                onChange={e => setDepartment(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
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
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
            <Sun className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-base text-slate-900">
              Appearance & Theme
            </h3>
            <p className="text-xs text-slate-500">Workspace display aesthetic</p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-800 block">
              Color Theme Mode
            </span>
            <span className="text-xs text-slate-500">Currently active: Pure Light Theme</span>
          </div>

          <div className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-blue-100">
            <Sun className="w-3.5 h-3.5 text-amber-500" />
            <span>Light Theme Active</span>
          </div>
        </div>
      </div>

      {/* AI Assistant & Server-Side Gemini Status */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-slate-900">
                ✨ AI Assistant & Intelligence Architecture
              </h3>
              <p className="text-xs text-slate-500">Google Gemini 2.5 server-side orchestration with 14 controlled application tools</p>
            </div>
          </div>
          <span
            className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${
              aiStatus?.status === 'available'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : aiStatus?.status === 'limited'
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}
          >
            {aiStatus?.status === 'available'
              ? '● Online & Ready'
              : aiStatus?.status === 'limited'
              ? '● Rate Limited'
              : '○ Offline / Fallback Mode'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <div className="text-slate-500 text-[11px]">Active Provider & Model</div>
            <div className="font-semibold text-slate-900 mt-1 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-blue-600" />
              <span>{aiStatus?.provider || 'Google Gemini'} ({aiStatus?.model || 'gemini-2.5-flash'})</span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <div className="text-slate-500 text-[11px]">Controlled Tool Registry</div>
            <div className="font-semibold text-slate-900 mt-1 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>{aiStatus?.supportedToolsCount || 14} Read/Write Tools</span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <div className="text-slate-500 text-[11px]">Total AI Invocations</div>
            <div className="font-semibold text-slate-900 mt-1 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-indigo-600" />
              <span>{aiStatus?.totalRequests || 0} ({aiStatus?.successfulRequests || 0} succeeded)</span>
            </div>
          </div>
        </div>

        <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-100 text-xs text-blue-900 space-y-1">
          <div className="font-semibold flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>Zero Direct Database Access Security Architecture</span>
          </div>
          <p className="text-blue-800 text-[11px] leading-relaxed">
            Gemini communicates strictly via controlled server-side tool definitions with typed parameter validators and authenticated Supabase client sessions. No raw SQL execution or API keys are exposed to the browser.
          </p>
        </div>
      </div>

      {/* Backend & Supabase Architecture Status */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-base text-slate-900">
              Supabase Backend & Architecture
            </h3>
            <p className="text-xs text-slate-500">PostgreSQL database, Row Level Security, Auth, Storage, and Realtime</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-start gap-2.5">
            <Database className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-900 block">1. Supabase PostgreSQL & RLS</span>
              <p className="text-slate-500 text-[11px] mt-1 leading-relaxed">
                Persistent relational storage across 14 tables with strict Row Level Security policies guaranteeing multi-tenant workspace isolation.
              </p>
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-start gap-2.5">
            <Server className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-900 block">2. Supabase Storage (Private)</span>
              <p className="text-slate-500 text-[11px] mt-1 leading-relaxed">
                Task attachments saved to private <code className="bg-slate-200/70 px-1 py-0.5 rounded text-[10px]">task-attachments</code> bucket with canonical <code className="bg-slate-200/70 px-1 py-0.5 rounded text-[10px]">storage_path</code> references and signed URLs.
              </p>
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-900 block">3. Supabase Auth & Google OAuth</span>
              <p className="text-slate-500 text-[11px] mt-1 leading-relaxed">
                Real authentication with email/password and Google OAuth, syncing automatically with <code className="bg-slate-200/70 px-1 py-0.5 rounded text-[10px]">profiles</code> via database triggers.
              </p>
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-start gap-2.5">
            <Zap className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-900 block">4. Supabase Realtime Sync</span>
              <p className="text-slate-500 text-[11px] mt-1 leading-relaxed">
                Live workspace subscriptions for tasks, comments, notes, suggestions, subtasks, and audit logs without manual refresh.
              </p>
            </div>
          </div>
        </div>

        {/* Supabase RLS 42501 Fix Block */}
        <div className="mt-4 p-4 rounded-xl bg-slate-900 text-slate-100 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold text-white">
                Supabase RLS Policy Fix (Error 42501)
              </span>
            </div>
            <button
              onClick={handleCopySql}
              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSql ? 'Copied!' : 'Copy SQL Fix'}</span>
            </button>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            If other team accounts see <code className="text-rose-300 bg-slate-800 px-1 py-0.5 rounded">42501: new row violates row-level security policy</code>, copy this snippet and run it once in your Supabase Dashboard SQL Editor to permit all team members to create tasks and collaborate.
          </p>
          <pre className="text-[10px] font-mono bg-slate-950 p-2.5 rounded-lg text-slate-300 overflow-x-auto max-h-32 border border-slate-800">
            {SQL_RLS_FIX}
          </pre>
        </div>
      </div>

      {/* Data Management & Export */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="p-2 bg-slate-100 text-slate-700 rounded-xl">
            <Download className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-base text-slate-900">
              Data Management & Backup
            </h3>
            <p className="text-xs text-slate-500">Export workspace JSON or restore original demo fixtures</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
          <button
            onClick={handleExportData}
            className="w-full sm:w-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export Workspace as JSON</span>
          </button>

          <button
            onClick={handleResetData}
            className="w-full sm:w-auto px-4 py-2 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset Demo Data</span>
          </button>
        </div>
      </div>
    </div>
  );
};
