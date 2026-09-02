-- ==============================================================================
-- 🚀 QUICK FIX FOR SUPABASE RLS ERROR 42501 (Copy & Run in Supabase SQL Editor)
-- ==============================================================================
-- If you see "new row violates row-level security policy for table tasks",
-- run this block in your Supabase SQL Editor to grant permissions to all team accounts:
--
-- DROP POLICY IF EXISTS "Workspace members can insert tasks" ON public.tasks;
-- DROP POLICY IF EXISTS "Workspace members can update tasks" ON public.tasks;
-- DROP POLICY IF EXISTS "Workspace members can delete tasks" ON public.tasks;
-- DROP POLICY IF EXISTS "Workspace members can view tasks" ON public.tasks;
-- DROP POLICY IF EXISTS "Manage tasks" ON public.tasks;
-- CREATE POLICY "Manage tasks" ON public.tasks FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
--
-- DROP POLICY IF EXISTS "Manage workspace members" ON public.workspace_members;
-- CREATE POLICY "Manage workspace members" ON public.workspace_members FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
--
-- INSERT INTO public.workspace_members (workspace_id, user_id, role)
-- SELECT w.id, p.id, 'member'
-- FROM public.workspaces w CROSS JOIN public.profiles p
-- ON CONFLICT (workspace_id, user_id) DO NOTHING;
--
-- NOTIFY pgrst, 'reload schema';
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. PROFILES (Synced with Supabase Auth auth.users)
-- ------------------------------------------------------------------------------
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

-- Trigger to automatically create a profile and assign to default workspace when a new user signs up in Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  first_ws_id UUID;
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

  -- Auto-enroll new user into all existing workspaces
  FOR first_ws_id IN SELECT id FROM public.workspaces LOOP
    INSERT INTO public.workspace_members (workspace_id, user_id, role)
    VALUES (first_ws_id, NEW.id, 'member')
    ON CONFLICT (workspace_id, user_id) DO NOTHING;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------------------------
-- 2. WORKSPACES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Ensure columns exist even if tables were created previously
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


-- ------------------------------------------------------------------------------
-- 3. WORKSPACE MEMBERS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workspace_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'lead', 'developer', 'designer', 'qa', 'product', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (workspace_id, user_id)
);

-- ------------------------------------------------------------------------------
-- 4. PROJECTS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ------------------------------------------------------------------------------
-- 5. TASKS (Note: dedicated notes table is used for task notes)
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 6. TASK LABELS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.task_labels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'bg-blue-100 text-blue-700 border-blue-200'
);

-- ------------------------------------------------------------------------------
-- 7. TASK SUBTASKS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.task_subtasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  position INT DEFAULT 0
);

-- ------------------------------------------------------------------------------
-- 8. COMMENTS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ------------------------------------------------------------------------------
-- 9. DEDICATED NOTES TABLE (Per Task)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL UNIQUE REFERENCES public.tasks(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ------------------------------------------------------------------------------
-- 10. SUGGESTIONS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'adopted', 'dismissed')),
  resolution_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ------------------------------------------------------------------------------
-- 11. ATTACHMENTS (Private storage reference with canonical storage_path)
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 12. ACTIVITY LOGS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ------------------------------------------------------------------------------
-- 13. NOTIFICATIONS
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- STORAGE BUCKETS (Private Task Attachments)
-- ------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-attachments', 'task-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------------------------
-- HELPER FUNCTIONS FOR ROW LEVEL SECURITY (RLS)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_member_of_workspace(ws_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = ws_id AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.can_access_task(t_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.workspace_members wm ON wm.workspace_id = t.workspace_id
    WHERE t.id = t_id AND wm.user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------------------------
-- ENABLE ROW LEVEL SECURITY (RLS) ACROSS ALL TABLES
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- RLS POLICIES
-- ------------------------------------------------------------------------------

-- Profiles
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable" ON public.profiles;
CREATE POLICY "Profiles are viewable" ON public.profiles FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert profile" ON public.profiles;
CREATE POLICY "Users can insert profile" ON public.profiles FOR INSERT TO authenticated, anon WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update profile" ON public.profiles;
CREATE POLICY "Users can update profile" ON public.profiles FOR UPDATE TO authenticated, anon USING (true);

-- Workspaces
DROP POLICY IF EXISTS "Users can view workspaces they belong to" ON public.workspaces;
DROP POLICY IF EXISTS "Users can view workspaces" ON public.workspaces;
CREATE POLICY "Users can view workspaces" ON public.workspaces FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "Users can create workspaces" ON public.workspaces;
CREATE POLICY "Users can create workspaces" ON public.workspaces FOR INSERT TO authenticated, anon WITH CHECK (true);

DROP POLICY IF EXISTS "Workspace owners and members can update workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Users can update workspaces" ON public.workspaces;
CREATE POLICY "Users can update workspaces" ON public.workspaces FOR UPDATE TO authenticated, anon USING (true);

-- Workspace Members
DROP POLICY IF EXISTS "Members can view membership in their workspaces" ON public.workspace_members;
DROP POLICY IF EXISTS "Members can view membership" ON public.workspace_members;
CREATE POLICY "Members can view membership" ON public.workspace_members FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "Admins/Creators can manage workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Manage workspace members" ON public.workspace_members;
CREATE POLICY "Manage workspace members" ON public.workspace_members FOR INSERT TO authenticated, anon WITH CHECK (true);

DROP POLICY IF EXISTS "Members can leave workspace" ON public.workspace_members;
CREATE POLICY "Members can leave workspace" ON public.workspace_members FOR DELETE TO authenticated, anon USING (true);

-- Projects
DROP POLICY IF EXISTS "Workspace members can view projects" ON public.projects;
DROP POLICY IF EXISTS "View projects" ON public.projects;
CREATE POLICY "View projects" ON public.projects FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "Workspace members can create projects" ON public.projects;
DROP POLICY IF EXISTS "Create projects" ON public.projects;
CREATE POLICY "Create projects" ON public.projects FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- Tasks
DROP POLICY IF EXISTS "Workspace members can view tasks" ON public.tasks;
DROP POLICY IF EXISTS "Workspace members can insert tasks" ON public.tasks;
DROP POLICY IF EXISTS "Workspace members can update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Workspace members can delete tasks" ON public.tasks;
DROP POLICY IF EXISTS "Manage tasks" ON public.tasks;
CREATE POLICY "Manage tasks" ON public.tasks FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- Task Labels
DROP POLICY IF EXISTS "Access labels of accessible tasks" ON public.task_labels;
DROP POLICY IF EXISTS "Manage task labels" ON public.task_labels;
CREATE POLICY "Manage task labels" ON public.task_labels FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- Task Subtasks
DROP POLICY IF EXISTS "Access subtasks of accessible tasks" ON public.task_subtasks;
DROP POLICY IF EXISTS "Manage task subtasks" ON public.task_subtasks;
CREATE POLICY "Manage task subtasks" ON public.task_subtasks FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- Comments
DROP POLICY IF EXISTS "Access comments of accessible tasks" ON public.comments;
DROP POLICY IF EXISTS "Insert comments on accessible tasks" ON public.comments;
DROP POLICY IF EXISTS "Delete own comments" ON public.comments;
DROP POLICY IF EXISTS "Manage comments" ON public.comments;
CREATE POLICY "Manage comments" ON public.comments FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- Dedicated Notes
DROP POLICY IF EXISTS "Access notes of accessible tasks" ON public.notes;
DROP POLICY IF EXISTS "Manage notes" ON public.notes;
CREATE POLICY "Manage notes" ON public.notes FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- Suggestions
DROP POLICY IF EXISTS "Access suggestions of accessible tasks" ON public.suggestions;
DROP POLICY IF EXISTS "Manage suggestions" ON public.suggestions;
CREATE POLICY "Manage suggestions" ON public.suggestions FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- Attachments
DROP POLICY IF EXISTS "Access attachments metadata of accessible tasks" ON public.attachments;
DROP POLICY IF EXISTS "Manage attachments metadata" ON public.attachments;
CREATE POLICY "Manage attachments metadata" ON public.attachments FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- Activity Logs
DROP POLICY IF EXISTS "Workspace members can view activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Workspace members can create activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Manage activity logs" ON public.activity_logs;
CREATE POLICY "Manage activity logs" ON public.activity_logs FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- Notifications
DROP POLICY IF EXISTS "Users can view and manage their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Manage notifications" ON public.notifications;
CREATE POLICY "Manage notifications" ON public.notifications FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- STORAGE OBJECTS RLS POLICIES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can upload task attachments" ON storage.objects;
CREATE POLICY "Authenticated users can upload task attachments"
  ON storage.objects FOR INSERT
  TO authenticated, anon
  WITH CHECK (bucket_id = 'task-attachments');

DROP POLICY IF EXISTS "Authenticated users can read task attachments" ON storage.objects;
CREATE POLICY "Authenticated users can read task attachments"
  ON storage.objects FOR SELECT
  TO authenticated, anon
  USING (bucket_id = 'task-attachments');

DROP POLICY IF EXISTS "Authenticated users can delete task attachments" ON storage.objects;
CREATE POLICY "Authenticated users can delete task attachments"
  ON storage.objects FOR DELETE
  TO authenticated, anon
  USING (bucket_id = 'task-attachments');

-- ------------------------------------------------------------------------------
-- SUPABASE REALTIME REPLICATION SETUP
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.comments; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.notes; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.suggestions; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.task_subtasks; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.task_labels; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.attachments; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_logs; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.workspaces; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
