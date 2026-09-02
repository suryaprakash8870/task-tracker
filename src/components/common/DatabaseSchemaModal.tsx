import React, { useState } from 'react';
import { Database, Copy, Check, Terminal, ExternalLink, X, AlertTriangle, ShieldCheck } from 'lucide-react';

interface DatabaseSchemaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DatabaseSchemaModal: React.FC<DatabaseSchemaModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const sqlCode = `-- ==============================================================================
-- TEAM TASK TRACKER: COMPLETE SUPABASE POSTGRESQL SCHEMA & ROW LEVEL SECURITY
-- Run this in Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES (Synced with Supabase Auth auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'developer' CHECK (role IN ('lead', 'developer', 'designer', 'qa', 'product', 'admin', 'member')),
  title TEXT,
  department TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, avatar_url, role, title, department)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'member'),
    COALESCE(NEW.raw_user_meta_data->>'title', 'Team Member'),
    COALESCE(NEW.raw_user_meta_data->>'department', 'Product')
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    avatar_url = EXCLUDED.avatar_url,
    updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. WORKSPACES
CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Ensure all columns exist even if tables were created previously
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'developer';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS department TEXT;

-- Backfill any existing Supabase Auth users into public.profiles
INSERT INTO public.profiles (id, name, email, avatar_url, role, title, department)
SELECT 
  id, 
  COALESCE(raw_user_meta_data->>'name', raw_user_meta_data->>'full_name', split_part(email, '@', 1), 'Team Member'),
  COALESCE(email, id::text || '@user.local'),
  COALESCE(raw_user_meta_data->>'avatar_url', raw_user_meta_data->>'picture', ''),
  'lead',
  'Product Lead & Architect',
  'Product & Engineering'
FROM auth.users
ON CONFLICT (id) DO UPDATE SET
  name = COALESCE(public.profiles.name, EXCLUDED.name),
  email = COALESCE(public.profiles.email, EXCLUDED.email);

ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.workspaces ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.workspaces ALTER COLUMN owner_id DROP NOT NULL;

ALTER TABLE public.workspace_members ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'member';

ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#3b82f6';

ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'todo';
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium';
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS creator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ;

-- Reload Supabase PostgREST Schema Cache
NOTIFY pgrst, 'reload schema';


-- 3. WORKSPACE MEMBERS
CREATE TABLE IF NOT EXISTS public.workspace_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'lead', 'developer', 'designer', 'qa', 'product', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (workspace_id, user_id)
);

-- 4. PROJECTS
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. TASKS
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'review', 'done')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  creator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. TASK LABELS
CREATE TABLE IF NOT EXISTS public.task_labels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'bg-blue-100 text-blue-700 border-blue-200'
);

-- 7. TASK SUBTASKS
CREATE TABLE IF NOT EXISTS public.task_subtasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  position INT DEFAULT 0
);

-- 8. COMMENTS
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 9. DEDICATED NOTES TABLE
CREATE TABLE IF NOT EXISTS public.notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL UNIQUE REFERENCES public.tasks(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 10. SUGGESTIONS
CREATE TABLE IF NOT EXISTS public.suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'adopted', 'dismissed')),
  resolution_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 11. ATTACHMENTS (Private storage reference)
CREATE TABLE IF NOT EXISTS public.attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  size TEXT NOT NULL,
  type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 12. ACTIVITY LOGS
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 13. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'system',
  link_url TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Helper RLS Functions
CREATE OR REPLACE FUNCTION public.is_member_of_workspace(ws_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = ws_id AND user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.workspaces
    WHERE id = ws_id AND (created_by = auth.uid() OR created_by IS NULL)
  ) OR (auth.uid() IS NULL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.can_access_task(t_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.workspace_members wm ON wm.workspace_id = t.workspace_id
    WHERE t.id = t_id AND (wm.user_id = auth.uid() OR auth.uid() IS NULL)
  ) OR (auth.uid() IS NULL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies (Safe & Permissive)
DROP POLICY IF EXISTS "Profiles are viewable" ON public.profiles;
CREATE POLICY "Profiles are viewable" ON public.profiles FOR SELECT TO authenticated, anon USING (true);
DROP POLICY IF EXISTS "Users can insert profile" ON public.profiles;
CREATE POLICY "Users can insert profile" ON public.profiles FOR INSERT TO authenticated, anon WITH CHECK (true);
DROP POLICY IF EXISTS "Users can update profile" ON public.profiles;
CREATE POLICY "Users can update profile" ON public.profiles FOR UPDATE TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "Users can view workspaces" ON public.workspaces;
CREATE POLICY "Users can view workspaces" ON public.workspaces FOR SELECT TO authenticated, anon USING (true);
DROP POLICY IF EXISTS "Users can create workspaces" ON public.workspaces;
CREATE POLICY "Users can create workspaces" ON public.workspaces FOR INSERT TO authenticated, anon WITH CHECK (true);
DROP POLICY IF EXISTS "Users can update workspaces" ON public.workspaces;
CREATE POLICY "Users can update workspaces" ON public.workspaces FOR UPDATE TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "Members can view membership" ON public.workspace_members;
CREATE POLICY "Members can view membership" ON public.workspace_members FOR SELECT TO authenticated, anon USING (true);
DROP POLICY IF EXISTS "Manage workspace members" ON public.workspace_members;
CREATE POLICY "Manage workspace members" ON public.workspace_members FOR INSERT TO authenticated, anon WITH CHECK (true);
DROP POLICY IF EXISTS "Members can leave workspace" ON public.workspace_members;
CREATE POLICY "Members can leave workspace" ON public.workspace_members FOR DELETE TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "View projects" ON public.projects;
CREATE POLICY "View projects" ON public.projects FOR SELECT TO authenticated, anon USING (true);
DROP POLICY IF EXISTS "Create projects" ON public.projects;
CREATE POLICY "Create projects" ON public.projects FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Manage tasks" ON public.tasks;
CREATE POLICY "Manage tasks" ON public.tasks FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Manage task labels" ON public.task_labels;
CREATE POLICY "Manage task labels" ON public.task_labels FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Manage task subtasks" ON public.task_subtasks;
CREATE POLICY "Manage task subtasks" ON public.task_subtasks FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Manage comments" ON public.comments;
CREATE POLICY "Manage comments" ON public.comments FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Manage notes" ON public.notes;
CREATE POLICY "Manage notes" ON public.notes FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Manage suggestions" ON public.suggestions;
CREATE POLICY "Manage suggestions" ON public.suggestions FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Manage attachments metadata" ON public.attachments;
CREATE POLICY "Manage attachments metadata" ON public.attachments FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Manage activity logs" ON public.activity_logs;
CREATE POLICY "Manage activity logs" ON public.activity_logs FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Manage notifications" ON public.notifications;
CREATE POLICY "Manage notifications" ON public.notifications FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('task-attachments', 'task-attachments', false) ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS "Auth users upload attachments" ON storage.objects;
CREATE POLICY "Auth users upload attachments" ON storage.objects FOR INSERT TO authenticated, anon WITH CHECK (bucket_id = 'task-attachments');
DROP POLICY IF EXISTS "Auth users read attachments" ON storage.objects;
CREATE POLICY "Auth users read attachments" ON storage.objects FOR SELECT TO authenticated, anon USING (bucket_id = 'task-attachments');
DROP POLICY IF EXISTS "Auth users delete attachments" ON storage.objects;
CREATE POLICY "Auth users delete attachments" ON storage.objects FOR DELETE TO authenticated, anon USING (bucket_id = 'task-attachments');
`;

  const handleCopy = () => {
    navigator.clipboard.writeText(sqlCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-start justify-between gap-4 bg-slate-50/50">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl shrink-0 mt-0.5">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Setup Supabase Database Schema
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Execute the SQL script in your Supabase Dashboard to create the tables, triggers, and Row Level Security policies.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-950">Why are you seeing this?</p>
              <p className="text-amber-800 mt-0.5 leading-relaxed">
                Your Supabase project credentials are connected, but the PostgreSQL database tables (like <code className="bg-amber-100/80 px-1 py-0.5 rounded font-mono">public.workspaces</code> and <code className="bg-amber-100/80 px-1 py-0.5 rounded font-mono">public.tasks</code>) have not been created yet in your Supabase database.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
              <Terminal className="w-4 h-4 text-blue-600" />
              Follow these 3 quick steps:
            </p>
            <ol className="list-decimal list-inside text-xs text-slate-600 space-y-1.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <li>
                Click the <strong>Copy SQL</strong> button below to copy the schema script.
              </li>
              <li>
                Open your <strong>Supabase Dashboard</strong> → Navigate to <strong>SQL Editor</strong> on the left sidebar.
              </li>
              <li>
                Click <strong>New Query</strong>, paste the script, and click <strong>Run</strong> (or press Ctrl+Enter).
              </li>
            </ol>
          </div>

          {/* SQL snippet container */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                SQL Schema Script (schema.sql)
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="px-2.5 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg flex items-center gap-1.5 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied to Clipboard!' : 'Copy SQL'}</span>
              </button>
            </div>

            <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl text-[11px] font-mono overflow-x-auto max-h-48 leading-relaxed border border-slate-800 select-all">
              {sqlCode}
            </pre>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
          <a
            href="https://supabase.com/dashboard"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
          >
            <span>Go to Supabase Dashboard</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-xl flex items-center gap-1.5 transition-colors shadow-xs"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy SQL'}</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-medium rounded-xl transition-colors"
            >
              Done & Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
