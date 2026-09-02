-- Migration: 20260827_initial_schema.sql
-- Description: Initial schema, RLS policies, trigger, storage bucket, and realtime configuration for Team Task Tracker.

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Profiles (Users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'lead', 'developer', 'designer', 'member')),
  title TEXT DEFAULT 'Team Contributor',
  department TEXT DEFAULT 'Product & Engineering',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Workspaces
CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Workspace Members
CREATE TABLE IF NOT EXISTS public.workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'lead', 'developer', 'designer', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_workspace_member UNIQUE (workspace_id, user_id)
);

-- 5. Projects
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Tasks (No notes column; notes live in dedicated notes table)
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'review', 'done')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  creator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Task Assignees
CREATE TABLE IF NOT EXISTS public.task_assignees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_task_assignee UNIQUE (task_id, user_id)
);

-- 8. Task Labels
CREATE TABLE IF NOT EXISTS public.task_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. Task Subtasks
CREATE TABLE IF NOT EXISTS public.task_subtasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. Comments
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. Notes (Dedicated task notes scratchpad)
CREATE TABLE IF NOT EXISTS public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_task_note UNIQUE (task_id)
);

-- 12. Suggestions
CREATE TABLE IF NOT EXISTS public.suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'adopted', 'dismissed')),
  resolution_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 13. Attachments (Canonical storage_path reference)
CREATE TABLE IF NOT EXISTS public.attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  size TEXT NOT NULL,
  type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 14. Activity Logs
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 15. Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON public.workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace ON public.workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tasks_workspace ON public.tasks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON public.tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_task_labels_task ON public.task_labels(task_id);
CREATE INDEX IF NOT EXISTS idx_task_subtasks_task ON public.task_subtasks(task_id);
CREATE INDEX IF NOT EXISTS idx_comments_task ON public.comments(task_id);
CREATE INDEX IF NOT EXISTS idx_notes_task ON public.notes(task_id);
CREATE INDEX IF NOT EXISTS idx_suggestions_task ON public.suggestions(task_id);
CREATE INDEX IF NOT EXISTS idx_attachments_task ON public.attachments(task_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_task ON public.activity_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_workspace ON public.activity_logs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, read);

-- ============================================================================
-- HELPER FUNCTIONS FOR ROW LEVEL SECURITY (RLS)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_workspace_member(lookup_workspace_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = lookup_workspace_id
      AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_task_workspace_member(lookup_task_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.workspace_members wm ON wm.workspace_id = t.workspace_id
    WHERE t.id = lookup_task_id
      AND wm.user_id = auth.uid()
  );
$$;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Profiles viewable by authenticated users"
  ON public.profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

-- Workspaces
CREATE POLICY "Members can view their workspaces"
  ON public.workspaces FOR SELECT TO authenticated
  USING (public.is_workspace_member(id) OR owner_id = auth.uid());

CREATE POLICY "Authenticated users can create workspaces"
  ON public.workspaces FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Workspace owners and members can update workspaces"
  ON public.workspaces FOR UPDATE TO authenticated
  USING (public.is_workspace_member(id) OR owner_id = auth.uid())
  WITH CHECK (public.is_workspace_member(id) OR owner_id = auth.uid());

CREATE POLICY "Workspace owners can delete workspaces"
  ON public.workspaces FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

-- Workspace Members
CREATE POLICY "Members can view workspace members"
  ON public.workspace_members FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id) OR user_id = auth.uid());

CREATE POLICY "Members or creators can add workspace members"
  ON public.workspace_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_workspace_member(workspace_id));

CREATE POLICY "Members can update workspace membership"
  ON public.workspace_members FOR UPDATE TO authenticated
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "Members can leave or admins remove members"
  ON public.workspace_members FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_workspace_member(workspace_id));

-- Projects
CREATE POLICY "Workspace members can view projects"
  ON public.projects FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can insert projects"
  ON public.projects FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can update projects"
  ON public.projects FOR UPDATE TO authenticated
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can delete projects"
  ON public.projects FOR DELETE TO authenticated
  USING (public.is_workspace_member(workspace_id));

-- Tasks
CREATE POLICY "Workspace members can view tasks"
  ON public.tasks FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can create tasks"
  ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can update tasks"
  ON public.tasks FOR UPDATE TO authenticated
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can delete tasks"
  ON public.tasks FOR DELETE TO authenticated
  USING (public.is_workspace_member(workspace_id));

-- Task Assignees
CREATE POLICY "Workspace members can view task assignees"
  ON public.task_assignees FOR SELECT TO authenticated
  USING (public.is_task_workspace_member(task_id));

CREATE POLICY "Workspace members can manage task assignees"
  ON public.task_assignees FOR ALL TO authenticated
  USING (public.is_task_workspace_member(task_id))
  WITH CHECK (public.is_task_workspace_member(task_id));

-- Task Labels
CREATE POLICY "Workspace members can view task labels"
  ON public.task_labels FOR SELECT TO authenticated
  USING (public.is_task_workspace_member(task_id));

CREATE POLICY "Workspace members can manage task labels"
  ON public.task_labels FOR ALL TO authenticated
  USING (public.is_task_workspace_member(task_id))
  WITH CHECK (public.is_task_workspace_member(task_id));

-- Task Subtasks
CREATE POLICY "Workspace members can view subtasks"
  ON public.task_subtasks FOR SELECT TO authenticated
  USING (public.is_task_workspace_member(task_id));

CREATE POLICY "Workspace members can manage subtasks"
  ON public.task_subtasks FOR ALL TO authenticated
  USING (public.is_task_workspace_member(task_id))
  WITH CHECK (public.is_task_workspace_member(task_id));

-- Comments
CREATE POLICY "Workspace members can view comments"
  ON public.comments FOR SELECT TO authenticated
  USING (public.is_task_workspace_member(task_id));

CREATE POLICY "Workspace members can create comments"
  ON public.comments FOR INSERT TO authenticated
  WITH CHECK (public.is_task_workspace_member(task_id));

CREATE POLICY "Authors or members can delete comments"
  ON public.comments FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_task_workspace_member(task_id));

-- Notes
CREATE POLICY "Workspace members can view task notes"
  ON public.notes FOR SELECT TO authenticated
  USING (public.is_task_workspace_member(task_id));

CREATE POLICY "Workspace members can insert task notes"
  ON public.notes FOR INSERT TO authenticated
  WITH CHECK (public.is_task_workspace_member(task_id));

CREATE POLICY "Workspace members can update task notes"
  ON public.notes FOR UPDATE TO authenticated
  USING (public.is_task_workspace_member(task_id))
  WITH CHECK (public.is_task_workspace_member(task_id));

CREATE POLICY "Workspace members can delete task notes"
  ON public.notes FOR DELETE TO authenticated
  USING (public.is_task_workspace_member(task_id));

-- Suggestions
CREATE POLICY "Workspace members can view suggestions"
  ON public.suggestions FOR SELECT TO authenticated
  USING (public.is_task_workspace_member(task_id));

CREATE POLICY "Workspace members can create suggestions"
  ON public.suggestions FOR INSERT TO authenticated
  WITH CHECK (public.is_task_workspace_member(task_id));

CREATE POLICY "Workspace members can update suggestions"
  ON public.suggestions FOR UPDATE TO authenticated
  USING (public.is_task_workspace_member(task_id))
  WITH CHECK (public.is_task_workspace_member(task_id));

CREATE POLICY "Workspace members can delete suggestions"
  ON public.suggestions FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_task_workspace_member(task_id));

-- Attachments
CREATE POLICY "Workspace members can view attachments"
  ON public.attachments FOR SELECT TO authenticated
  USING (public.is_task_workspace_member(task_id));

CREATE POLICY "Workspace members can create attachments"
  ON public.attachments FOR INSERT TO authenticated
  WITH CHECK (public.is_task_workspace_member(task_id));

CREATE POLICY "Workspace members can delete attachments"
  ON public.attachments FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_task_workspace_member(task_id));

-- Activity Logs
CREATE POLICY "Workspace members can view activity logs"
  ON public.activity_logs FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can insert activity logs"
  ON public.activity_logs FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id));

-- Notifications
CREATE POLICY "Users can only view their own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Authenticated users can create notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own notifications"
  ON public.notifications FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Trigger for New User
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_workspace_id UUID;
  v_name TEXT;
  v_avatar TEXT;
BEGIN
  v_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
  v_avatar := COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80');

  INSERT INTO public.profiles (id, name, email, avatar_url, role, title, department)
  VALUES (
    NEW.id,
    v_name,
    NEW.email,
    v_avatar,
    'lead',
    'Product Lead & Architect',
    'Product & Engineering'
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      name = COALESCE(EXCLUDED.name, public.profiles.name);

  IF NOT EXISTS (SELECT 1 FROM public.workspace_members WHERE user_id = NEW.id) THEN
    INSERT INTO public.workspaces (name, description, owner_id)
    VALUES (v_name || '''s Workspace', 'Primary workspace for team initiatives and sprint execution', NEW.id)
    RETURNING id INTO v_workspace_id;

    INSERT INTO public.workspace_members (workspace_id, user_id, role)
    VALUES (v_workspace_id, NEW.id, 'lead');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Storage Bucket & Policies
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('task-attachments', 'task-attachments', false, 52428800, NULL)
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 52428800;

CREATE POLICY "Authenticated users can upload task attachments to authorized workspaces"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'task-attachments' AND
    public.is_workspace_member(((storage.foldername(name))[2])::uuid)
  );

CREATE POLICY "Authenticated users can view task attachments in authorized workspaces"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'task-attachments' AND
    public.is_workspace_member(((storage.foldername(name))[2])::uuid)
  );

CREATE POLICY "Authenticated users can delete task attachments in authorized workspaces"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'task-attachments' AND
    public.is_workspace_member(((storage.foldername(name))[2])::uuid)
  );

-- Realtime Configuration
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks; EXCEPTION WHEN duplicate_object THEN END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.comments; EXCEPTION WHEN duplicate_object THEN END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.notes; EXCEPTION WHEN duplicate_object THEN END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.suggestions; EXCEPTION WHEN duplicate_object THEN END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.task_subtasks; EXCEPTION WHEN duplicate_object THEN END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.task_labels; EXCEPTION WHEN duplicate_object THEN END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.attachments; EXCEPTION WHEN duplicate_object THEN END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_logs; EXCEPTION WHEN duplicate_object THEN END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications; EXCEPTION WHEN duplicate_object THEN END;
END $$;
