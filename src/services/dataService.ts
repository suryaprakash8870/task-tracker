import {
  Task,
  User,
  Workspace,
  NotificationItem,
  TaskStatus,
  TaskPriority,
  TaskLabel,
  TaskComment,
  TaskSuggestion,
  TaskAttachment,
  TaskActivity,
  MemberRole
} from '../types';
import { supabase, isSupabaseConfigured, isDemoModeEnabled } from './supabaseClient';
import { storageService } from './storageService';
import { realtimeService } from './realtimeService';
import { initialTasks, initialUsers, initialWorkspace, initialNotifications } from './mockData';

const LOCAL_STORAGE_PREFIX = 'ttt_demo_';

interface DatabaseTaskRow {
  id: string;
  workspace_id: string;
  project_id?: string | null;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_id?: string | null;
  creator_id?: string | null;
  due_date?: string | null;
  created_at: string;
  updated_at: string;
  task_labels?: { id: string; name: string; color: string }[];
  task_subtasks?: { id: string; title: string; completed: boolean; assigned_to?: string | null }[];
  comments?: { id: string; user_id: string; content: string; created_at: string }[];
  notes?: { id: string; content: string; updated_by?: string | null; updated_at: string }[];
  suggestions?: { id: string; user_id: string; content: string; status: 'open' | 'adopted' | 'dismissed'; resolution_note?: string | null; created_at: string }[];
  attachments?: { id: string; name: string; size: number; type: string; storage_path: string; uploaded_by?: string | null; uploaded_at: string }[];
  activity_logs?: { id: string; user_id?: string | null; action: string; details: string; timestamp: string }[];
}

function parseAuthErrorMessage(error: unknown, providerContext: 'google' | 'email' = 'email'): string {
  if (!error) return 'An unexpected authentication error occurred.';

  let rawMessage = '';
  if (typeof error === 'string') {
    rawMessage = error;
  } else if (error instanceof Error) {
    rawMessage = error.message;
  } else if (typeof error === 'object' && error !== null) {
    const obj = error as Record<string, unknown>;
    rawMessage = (obj.message as string) || (obj.msg as string) || (obj.error_description as string) || JSON.stringify(error);
  }

  // Check for JSON stringified errors (e.g. from GoTrue API)
  if (rawMessage.includes('{') && rawMessage.includes('}')) {
    try {
      const parsed = JSON.parse(rawMessage);
      if (parsed.msg) rawMessage = parsed.msg;
      else if (parsed.message) rawMessage = parsed.message;
      else if (parsed.error_description) rawMessage = parsed.error_description;
    } catch {
      // not valid JSON, keep rawMessage
    }
  }

  const lower = rawMessage.toLowerCase();

  if (lower.includes('unsupported provider') || lower.includes('provider is not enabled')) {
    if (providerContext === 'google' || lower.includes('google')) {
      return 'Google Sign-In is not enabled in your Supabase project. To enable it: Go to Supabase Dashboard → Authentication → Providers → Google and enter your Google Client ID & Secret. You can also sign up or sign in using Email & Password below.';
    }
    return 'Email sign-up is not enabled in your Supabase project settings. To enable it: Go to Supabase Dashboard → Authentication → Providers → Email and ensure "Enable Email provider" is turned ON.';
  }

  if (lower.includes('invalid login credentials') || lower.includes('invalid_credentials')) {
    return 'Invalid email or password. Please check your credentials or click "Create Account" if you are new.';
  }

  if (lower.includes('user already registered') || lower.includes('already registered')) {
    return 'An account with this email already exists. Please switch to the "Sign In" tab.';
  }

  if (lower.includes('rate limit')) {
    return 'Too many authentication attempts. Please wait a few moments and try again.';
  }

  if (lower.includes('password should be at least')) {
    return 'Password must be at least 6 characters long.';
  }

  if (lower.includes('signup is disabled') || lower.includes('signups are not allowed')) {
    return 'User registration is currently disabled in your Supabase project settings (Authentication → Providers → Email → Allow new users to sign up).';
  }

  return rawMessage;
}

class DataService {
  // Helper to ensure connection
  private ensureConnection(): void {
    // If not configured with live credentials, operates safely in local/offline storage mode
  }

  public isConfigured(): boolean {
    return isSupabaseConfigured();
  }

  public isDemoMode(): boolean {
    return !isSupabaseConfigured() || isDemoModeEnabled();
  }

  public async ensureProfileExists(
    userId: string,
    meta?: { name?: string; email?: string; avatar?: string; role?: string; title?: string; department?: string }
  ): Promise<string | null> {
    if (!userId || !isSupabaseConfigured()) return null;

    try {
      // 1. Check if profile exists
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      if (existing?.id) {
        return existing.id;
      }

      const email = meta?.email || `${userId}@user.local`;
      const name = meta?.name || 'Workspace Member';
      const avatar = meta?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';

      // 2. Try inserting with all fields
      const { error: err1 } = await supabase.from('profiles').upsert({
        id: userId,
        name,
        email,
        avatar_url: avatar,
        role: meta?.role || 'lead',
        title: meta?.title || 'Product Lead & Architect',
        department: meta?.department || 'Product & Engineering'
      });

      if (!err1) return userId;

      // 3. Fallback: Try with basic fields if title/department failed
      const { error: err2 } = await supabase.from('profiles').upsert({
        id: userId,
        name,
        email,
        avatar_url: avatar,
        role: 'member'
      });

      if (!err2) return userId;

      // 4. Fallback: Try minimal (id, name, email)
      const { error: err3 } = await supabase.from('profiles').upsert({
        id: userId,
        name,
        email
      });

      if (!err3) return userId;

      console.warn('ensureProfileExists: auto-create profiles encountered constraints:', { err1, err2, err3 });
      return null;
    } catch (e) {
      console.warn('ensureProfileExists exception:', e);
      return null;
    }
  }

  public async ensureWorkspaceMembership(
    workspaceId: string,
    userId: string,
    role: string = 'member'
  ): Promise<boolean> {
    if (!workspaceId || !userId || !isSupabaseConfigured()) return true;

    try {
      // First ensure the user profile exists so foreign key references in workspace_members don't fail
      await this.ensureProfileExists(userId);

      // Check if membership already exists
      const { data: existing } = await supabase
        .from('workspace_members')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId)
        .maybeSingle();

      if (existing?.id) {
        return true;
      }

      // Upsert membership into workspace_members
      const { error } = await supabase.from('workspace_members').upsert(
        {
          workspace_id: workspaceId,
          user_id: userId,
          role: role || 'member'
        },
        { onConflict: 'workspace_id,user_id', ignoreDuplicates: true }
      );

      if (error) {
        console.warn('ensureWorkspaceMembership notice:', error.message);
      }
      return true;
    } catch (e) {
      console.warn('ensureWorkspaceMembership exception:', e);
      return false;
    }
  }

  // ============================================================================
  // AUTHENTICATION & USERS (Supabase Auth & Profiles)
  // ============================================================================

  public async getCurrentAuthUser(): Promise<User | null> {
    if (!isSupabaseConfigured()) {
      if (this.isDemoMode()) {
        return this.getLocalDemoActiveUser();
      }
      return null;
    }

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.user) {
      return null;
    }

    const authUser = session.user;
    const name = authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Team Member';
    const avatar = authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
    
    // Ensure profile row exists in public.profiles
    await this.ensureProfileExists(authUser.id, {
      name,
      email: authUser.email || '',
      avatar,
      role: 'lead'
    });

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle();

    if (!profile) {
      return {
        id: authUser.id,
        name,
        email: authUser.email || '',
        avatar,
        role: 'lead',
        title: 'Product Lead & Architect',
        department: 'Product & Engineering'
      };
    }

    return {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      avatar: profile.avatar_url || avatar,
      role: (profile.role as MemberRole) || 'lead',
      title: profile.title || 'Product Lead & Architect',
      department: profile.department || 'Product & Engineering'
    };
  }

  public async signInWithEmail(email: string, password: string): Promise<User> {
    this.ensureConnection();

    if (!isSupabaseConfigured()) {
      const demoUsers = await this.getUsers();
      const matched = demoUsers.find(u => u.email.toLowerCase() === email.toLowerCase()) || demoUsers[0];
      await this.setActiveUser(matched);
      return matched;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });

      if (error) {
        throw new Error(parseAuthErrorMessage(error, 'email'));
      }

      if (!data.user) throw new Error('Sign in failed. No user returned.');

      const user = await this.getCurrentAuthUser();
      if (!user) throw new Error('Could not load user profile after sign-in.');
      return user;
    } catch (err: unknown) {
      throw new Error(parseAuthErrorMessage(err, 'email'));
    }
  }

  public async signUpWithEmail(
    email: string,
    password: string,
    profileData: { name: string; role: MemberRole; title?: string; department?: string; avatar?: string }
  ): Promise<User> {
    this.ensureConnection();

    if (!isSupabaseConfigured()) {
      const newUser: User = {
        id: `user-${Date.now()}`,
        name: profileData.name,
        email,
        avatar: profileData.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        role: profileData.role,
        title: profileData.title || 'Team Contributor',
        department: profileData.department || 'Product & Engineering'
      };
      await this.addUser(newUser);
      await this.setActiveUser(newUser);
      return newUser;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: profileData.name,
            name: profileData.name,
            role: profileData.role,
            title: profileData.title || 'Team Contributor',
            department: profileData.department || 'Product & Engineering',
            avatar_url: profileData.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
          }
        }
      });

      if (error) {
        throw new Error(parseAuthErrorMessage(error, 'email'));
      }

      if (!data.user) throw new Error('Sign up failed.');

      // If identities is empty array, it means user already exists in Supabase
      if (data.user.identities && data.user.identities.length === 0) {
        throw new Error('An account with this email already exists. Please switch to the "Sign In" tab.');
      }

      // Ensure profile row exists
      try {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          name: profileData.name,
          email: data.user.email || email,
          avatar_url: profileData.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          role: profileData.role,
          title: profileData.title || 'Team Contributor',
          department: profileData.department || 'Product & Engineering'
        });
      } catch (upsertErr) {
        console.warn('Profile upsert warning:', upsertErr);
      }

      const user = await this.getCurrentAuthUser();
      return (
        user || {
          id: data.user.id,
          name: profileData.name,
          email,
          avatar: profileData.avatar || '',
          role: profileData.role,
          title: profileData.title || '',
          department: profileData.department || ''
        }
      );
    } catch (err: unknown) {
      throw new Error(parseAuthErrorMessage(err, 'email'));
    }
  }

  public async signInWithGoogle(): Promise<void> {
    this.ensureConnection();
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured. Google OAuth requires Supabase credentials.');
    }

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });

      if (error) {
        throw new Error(parseAuthErrorMessage(error, 'google'));
      }
    } catch (err: unknown) {
      throw new Error(parseAuthErrorMessage(err, 'google'));
    }
  }

  public async signOut(): Promise<void> {
    if (isSupabaseConfigured()) {
      await supabase.auth.signOut();
    }
  }

  public async resetPassword(email: string): Promise<void> {
    this.ensureConnection();
    if (!isSupabaseConfigured()) {
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin
      });

      if (error) throw new Error(parseAuthErrorMessage(error, 'email'));
    } catch (err: unknown) {
      throw new Error(parseAuthErrorMessage(err, 'email'));
    }
  }

  public async getUsers(): Promise<User[]> {
    this.ensureConnection();

    if (!isSupabaseConfigured()) {
      return this.getLocalDemoUsers();
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.warn('Error loading profiles, using current user / fallback:', error);
      const active = await this.getCurrentAuthUser();
      return active ? [active] : this.getLocalDemoUsers();
    }

    if (!data || data.length === 0) {
      const active = await this.getCurrentAuthUser();
      return active ? [active] : this.getLocalDemoUsers();
    }

    return (data || []).map(p => ({
      id: p.id,
      name: p.name,
      email: p.email,
      avatar: p.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      role: p.role as MemberRole,
      title: p.title || 'Team Contributor',
      department: p.department || 'Product & Engineering'
    }));
  }

  public async getUserById(userId: string): Promise<User | undefined> {
    const users = await this.getUsers();
    return users.find(u => u.id === userId);
  }

  public async getActiveUser(): Promise<User> {
    const current = await this.getCurrentAuthUser();
    if (current) return current;

    if (this.isDemoMode()) {
      return this.getLocalDemoActiveUser();
    }

    throw new Error('No active user found. Please authenticate with Supabase.');
  }

  public async setActiveUser(user: User): Promise<void> {
    if (this.isDemoMode()) {
      localStorage.setItem(`${LOCAL_STORAGE_PREFIX}active_user`, JSON.stringify(user));
    }
  }

  public async updateUserProfile(updatedUser: User): Promise<User> {
    this.ensureConnection();

    if (!isSupabaseConfigured()) {
      const users = this.getLocalDemoUsers();
      const idx = users.findIndex(u => u.id === updatedUser.id);
      if (idx !== -1) users[idx] = updatedUser;
      localStorage.setItem(`${LOCAL_STORAGE_PREFIX}users`, JSON.stringify(users));
      localStorage.setItem(`${LOCAL_STORAGE_PREFIX}active_user`, JSON.stringify(updatedUser));
      return updatedUser;
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        name: updatedUser.name,
        avatar_url: updatedUser.avatar,
        role: updatedUser.role,
        title: updatedUser.title,
        department: updatedUser.department,
        updated_at: new Date().toISOString()
      })
      .eq('id', updatedUser.id);

    if (error) {
      console.error('Error updating user profile:', error);
      throw new Error(`Failed to update profile: ${error.message}`);
    }

    return updatedUser;
  }

  public async addUser(newUser: User): Promise<User> {
    if (this.isDemoMode()) {
      const users = this.getLocalDemoUsers();
      users.push(newUser);
      localStorage.setItem(`${LOCAL_STORAGE_PREFIX}users`, JSON.stringify(users));
      return newUser;
    }
    throw new Error('Directly adding users is not permitted. Users must register through Supabase Auth.');
  }

  // ============================================================================
  // WORKSPACES
  // ============================================================================

  public async getWorkspace(): Promise<Workspace> {
    this.ensureConnection();

    if (!isSupabaseConfigured()) {
      const ws = this.getLocalDemoWorkspace();
      ws.members = this.getLocalDemoUsers();
      return ws;
    }

    // Try fetching with all columns first
    let workspaces: any[] | null = null;
    const { data: wsData, error: wsError } = await supabase
      .from('workspaces')
      .select('*')
      .limit(1);

    if (wsError) {
      // If error is related to schema cache on a column, fallback to selecting id and name only
      console.warn('Full workspace select failed, trying minimal select (id, name):', wsError.message);
      const { data: minimalWs, error: minimalError } = await supabase
        .from('workspaces')
        .select('id, name')
        .limit(1);

      if (minimalError) {
        console.error('Error fetching workspaces:', minimalError);
        throw new Error(`Failed to fetch workspace: ${minimalError.message}`);
      }
      workspaces = minimalWs;
    } else {
      workspaces = wsData;
    }

    let wsRow = workspaces && workspaces.length > 0 ? workspaces[0] : null;

    if (!wsRow) {
      // Create first workspace for the current authenticated user if none exists
      const { data: { session } } = await supabase.auth.getSession();
      const authUserId = session?.user?.id;
      const activeUser = await this.getActiveUser();
      const newWsId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `ws-${Date.now()}`;
      let createdWs: any = null;
      let verifiedProfileId: string | null = null;

      // 1. If we have an authenticated user, make sure their profile exists in public.profiles first
      if (authUserId) {
        verifiedProfileId = await this.ensureProfileExists(authUserId, {
          name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || activeUser?.name || 'Workspace Lead',
          email: session.user.email || activeUser?.email || '',
          avatar: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || activeUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          role: 'lead'
        });
      }

      // If still no verified profile, check if ANY profile exists in public.profiles
      if (!verifiedProfileId) {
        const { data: anyProf } = await supabase
          .from('profiles')
          .select('id')
          .limit(1)
          .maybeSingle();
        if (anyProf?.id) {
          verifiedProfileId = anyProf.id;
        }
      }

      // Strategy 1: Insert minimal workspace with created_by if verified
      const basePayload: any = {
        id: newWsId,
        name: `${activeUser?.name || 'My'}'s Workspace`,
        description: 'Primary workspace for team initiatives and sprint execution'
      };

      if (verifiedProfileId) {
        basePayload.created_by = verifiedProfileId;
      }

      try {
        const { data: created, error: createError } = await supabase
          .from('workspaces')
          .insert(basePayload)
          .select()
          .maybeSingle();

        if (createError) {
          console.warn('Strategy 1 workspace insert failed, attempting clean fallback:', createError.message);

          // Strategy 2: Try with owner_id if schema expects owner_id instead of created_by
          if (verifiedProfileId) {
            const { data: createdWithOwner, error: errorOwner } = await supabase
              .from('workspaces')
              .insert({
                id: newWsId,
                name: `${activeUser?.name || 'My'}'s Workspace`,
                owner_id: verifiedProfileId
              })
              .select()
              .maybeSingle();

            if (!errorOwner && createdWithOwner) {
              createdWs = createdWithOwner;
            }
          }

          // Strategy 3: Try minimal without foreign keys
          if (!createdWs) {
            const { data: createdSimple, error: errorSimple } = await supabase
              .from('workspaces')
              .insert({
                id: newWsId,
                name: `${activeUser?.name || 'My'}'s Workspace`
              })
              .select()
              .maybeSingle();

            if (!errorSimple && createdSimple) {
              createdWs = createdSimple;
            }
          }

          if (!createdWs) {
            console.warn('All database workspace insert strategies encountered constraints, using resilient in-memory workspace.');
            createdWs = {
              id: newWsId,
              name: `${activeUser?.name || 'My'}'s Workspace`,
              description: 'Primary workspace for team initiatives and sprint execution',
              created_by: verifiedProfileId || ''
            };
          }
        } else {
          createdWs = created || { id: newWsId, name: `${activeUser?.name || 'My'}'s Workspace`, created_by: verifiedProfileId || '' };
        }
      } catch (insertEx) {
        console.warn('Workspace insertion caught exception, falling back smoothly:', insertEx);
        createdWs = {
          id: newWsId,
          name: `${activeUser?.name || 'My'}'s Workspace`,
          description: 'Primary workspace for team initiatives and sprint execution',
          created_by: verifiedProfileId || ''
        };
      }

      if (createdWs && createdWs.id && verifiedProfileId) {
        try {
          await supabase.from('workspace_members').insert({
            workspace_id: createdWs.id,
            user_id: verifiedProfileId,
            role: 'lead'
          });
        } catch (memberErr) {
          console.warn('Workspace member assignment note:', memberErr);
        }
      }

      wsRow = createdWs;
    }

    if (wsRow && wsRow.id) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          await this.ensureWorkspaceMembership(wsRow.id, session.user.id);
        }
      } catch (e) {
        console.warn('Membership auto-enrollment notice:', e);
      }
    }

    const allUsers = await this.getUsers();

    return {
      id: wsRow.id,
      name: wsRow.name || 'My Workspace',
      description: wsRow.description || 'Primary workspace for team initiatives and sprint execution',
      ownerId: wsRow.created_by || wsRow.owner_id || '',
      members: allUsers,
      createdAt: wsRow.created_at || new Date().toISOString()
    };
  }

  public async updateWorkspace(workspace: Workspace): Promise<Workspace> {
    this.ensureConnection();

    if (!isSupabaseConfigured()) {
      localStorage.setItem(`${LOCAL_STORAGE_PREFIX}workspace`, JSON.stringify(workspace));
      return workspace;
    }

    const { error } = await supabase
      .from('workspaces')
      .update({
        name: workspace.name,
        description: workspace.description,
        updated_at: new Date().toISOString()
      })
      .eq('id', workspace.id);

    if (error) {
      // If error is about description column, try updating just name
      if (error.message.toLowerCase().includes('description')) {
        const { error: nameError } = await supabase
          .from('workspaces')
          .update({
            name: workspace.name,
            updated_at: new Date().toISOString()
          })
          .eq('id', workspace.id);

        if (nameError) {
          throw new Error(`Failed to update workspace: ${nameError.message}`);
        }
      } else {
        throw new Error(`Failed to update workspace: ${error.message}`);
      }
    }

    return workspace;
  }

  // ============================================================================
  // TASKS (Supabase PostgreSQL with RLS and dedicated notes table)
  // ============================================================================

  public async getTasks(workspaceId?: string): Promise<Task[]> {
    this.ensureConnection();

    if (!isSupabaseConfigured()) {
      return this.getLocalDemoTasks();
    }

    try {
      let query = supabase
        .from('tasks')
        .select(`
          id,
          workspace_id,
          project_id,
          title,
          description,
          status,
          priority,
          assignee_id,
          creator_id,
          due_date,
          created_at,
          updated_at,
          task_labels (id, name, color),
          task_subtasks (id, title, completed, assigned_to),
          comments (id, user_id, content, created_at),
          notes (id, content, updated_by, updated_at),
          suggestions (id, user_id, content, status, resolution_note, created_at),
          attachments (id, name, size, type, storage_path, uploaded_by, uploaded_at),
          activity_logs (id, user_id, action, details, timestamp)
        `)
        .order('created_at', { ascending: false });

      if (workspaceId && workspaceId !== 'default-workspace') {
        query = query.eq('workspace_id', workspaceId);
      }

      const { data, error } = await query;

      if (!error && data) {
        const tasksRows = (data as unknown as DatabaseTaskRow[]) || [];
        return this.mapTaskRowsToDomain(tasksRows);
      }

      if (error) {
        console.warn('Nested task query warning, attempting fallback query:', error.message);
      }
    } catch (queryErr) {
      console.warn('Initial tasks query failed, using fallback:', queryErr);
    }

    // Fallback: Query tasks table directly and populate child relations
    let fallbackQuery = supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (workspaceId && workspaceId !== 'default-workspace') {
      fallbackQuery = fallbackQuery.eq('workspace_id', workspaceId);
    }

    const { data: baseTasks, error: baseErr } = await fallbackQuery;
    if (baseErr) {
      console.error('Error fetching tasks base rows from Supabase:', baseErr);
      throw new Error(`Failed to load tasks: ${baseErr.message}`);
    }

    if (!baseTasks || baseTasks.length === 0) {
      return [];
    }

    const taskIds = baseTasks.map((t: { id: string }) => t.id);

    // Fetch related tables in parallel
    const [labelsRes, subtasksRes, commentsRes, notesRes, suggestionsRes, attachmentsRes, activitiesRes] = await Promise.all([
      supabase.from('task_labels').select('*').in('task_id', taskIds),
      supabase.from('task_subtasks').select('*').in('task_id', taskIds),
      supabase.from('comments').select('*').in('task_id', taskIds).order('created_at', { ascending: true }),
      supabase.from('notes').select('*').in('task_id', taskIds),
      supabase.from('suggestions').select('*').in('task_id', taskIds).order('created_at', { ascending: false }),
      supabase.from('attachments').select('*').in('task_id', taskIds),
      supabase.from('activity_logs').select('*').in('task_id', taskIds).order('timestamp', { ascending: false })
    ]);

    const labelsByTask: Record<string, { id: string; name: string; color: string }[]> = {};
    (labelsRes.data || []).forEach((l: { id: string; task_id: string; name: string; color: string }) => {
      if (!labelsByTask[l.task_id]) labelsByTask[l.task_id] = [];
      labelsByTask[l.task_id].push({ id: l.id, name: l.name, color: l.color });
    });

    const subtasksByTask: Record<string, { id: string; title: string; completed: boolean; assigned_to?: string }[]> = {};
    (subtasksRes.data || []).forEach((st: { id: string; task_id: string; title: string; completed: boolean; assigned_to?: string }) => {
      if (!subtasksByTask[st.task_id]) subtasksByTask[st.task_id] = [];
      subtasksByTask[st.task_id].push({ id: st.id, title: st.title, completed: Boolean(st.completed), assigned_to: st.assigned_to });
    });

    const commentsByTask: Record<string, { id: string; user_id: string; content: string; created_at: string }[]> = {};
    (commentsRes.data || []).forEach((c: { id: string; task_id: string; user_id: string; content: string; created_at: string }) => {
      if (!commentsByTask[c.task_id]) commentsByTask[c.task_id] = [];
      commentsByTask[c.task_id].push({ id: c.id, user_id: c.user_id, content: c.content, created_at: c.created_at });
    });

    const notesByTask: Record<string, { id: string; content: string; updated_by: string; updated_at: string }[]> = {};
    (notesRes.data || []).forEach((n: { id: string; task_id: string; content: string; updated_by: string; updated_at: string }) => {
      if (!notesByTask[n.task_id]) notesByTask[n.task_id] = [];
      notesByTask[n.task_id].push({ id: n.id, content: n.content, updated_by: n.updated_by, updated_at: n.updated_at });
    });

    const suggestionsByTask: Record<string, { id: string; user_id: string; content: string; status: 'open' | 'adopted' | 'dismissed'; resolution_note?: string; created_at: string }[]> = {};
    (suggestionsRes.data || []).forEach((s: { id: string; task_id: string; user_id: string; content: string; status: 'open' | 'adopted' | 'dismissed'; resolution_note?: string; created_at: string }) => {
      if (!suggestionsByTask[s.task_id]) suggestionsByTask[s.task_id] = [];
      suggestionsByTask[s.task_id].push({ id: s.id, user_id: s.user_id, content: s.content, status: s.status, resolution_note: s.resolution_note, created_at: s.created_at });
    });

    const attachmentsByTask: Record<string, { id: string; name: string; size: number; type: string; storage_path: string; uploaded_by: string; uploaded_at: string }[]> = {};
    (attachmentsRes.data || []).forEach((a: { id: string; task_id: string; name: string; size: number; type: string; storage_path: string; uploaded_by: string; uploaded_at: string }) => {
      if (!attachmentsByTask[a.task_id]) attachmentsByTask[a.task_id] = [];
      attachmentsByTask[a.task_id].push({ id: a.id, name: a.name, size: a.size, type: a.type, storage_path: a.storage_path, uploaded_by: a.uploaded_by, uploaded_at: a.uploaded_at });
    });

    const activitiesByTask: Record<string, { id: string; user_id: string; action: string; details: string; timestamp: string }[]> = {};
    (activitiesRes.data || []).forEach((act: { id: string; task_id: string; user_id: string; action: string; details: string; timestamp: string }) => {
      if (!activitiesByTask[act.task_id]) activitiesByTask[act.task_id] = [];
      activitiesByTask[act.task_id].push({ id: act.id, user_id: act.user_id, action: act.action, details: act.details, timestamp: act.timestamp });
    });

    const fallbackRows: DatabaseTaskRow[] = baseTasks.map((t: {
      id: string;
      workspace_id: string;
      project_id?: string;
      title: string;
      description?: string;
      status: TaskStatus;
      priority: TaskPriority;
      assignee_id?: string;
      creator_id?: string;
      due_date?: string;
      created_at: string;
      updated_at: string;
    }) => ({
      id: t.id,
      workspace_id: t.workspace_id,
      project_id: t.project_id,
      title: t.title,
      description: t.description || '',
      status: t.status,
      priority: t.priority,
      assignee_id: t.assignee_id,
      creator_id: t.creator_id,
      due_date: t.due_date,
      created_at: t.created_at,
      updated_at: t.updated_at,
      task_labels: labelsByTask[t.id] || [],
      task_subtasks: subtasksByTask[t.id] || [],
      comments: commentsByTask[t.id] || [],
      notes: notesByTask[t.id] || [],
      suggestions: suggestionsByTask[t.id] || [],
      attachments: attachmentsByTask[t.id] || [],
      activity_logs: activitiesByTask[t.id] || []
    }));

    return this.mapTaskRowsToDomain(fallbackRows);
  }

  public async getTaskById(taskId: string): Promise<Task | undefined> {
    this.ensureConnection();

    if (!isSupabaseConfigured()) {
      const tasks = this.getLocalDemoTasks();
      return tasks.find(t => t.id === taskId);
    }

    try {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          id,
          workspace_id,
          project_id,
          title,
          description,
          status,
          priority,
          assignee_id,
          creator_id,
          due_date,
          created_at,
          updated_at,
          task_labels (id, name, color),
          task_subtasks (id, title, completed, assigned_to),
          comments (id, user_id, content, created_at),
          notes (id, content, updated_by, updated_at),
          suggestions (id, user_id, content, status, resolution_note, created_at),
          attachments (id, name, size, type, storage_path, uploaded_by, uploaded_at),
          activity_logs (id, user_id, action, details, timestamp)
        `)
        .eq('id', taskId)
        .maybeSingle();

      if (!error && data) {
        const mapped = this.mapTaskRowsToDomain([data as unknown as DatabaseTaskRow]);
        return mapped[0];
      }
    } catch (e) {
      console.warn('Embedded getTaskById failed, trying fallback:', e);
    }

    // Fallback get single task
    const all = await this.getTasks();
    return all.find(t => t.id === taskId);
  }

  public async createTask(
    taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'activity' | 'comments' | 'attachments' | 'suggestions'>,
    author: User
  ): Promise<Task> {
    this.ensureConnection();

    if (!isSupabaseConfigured()) {
      const tasks = this.getLocalDemoTasks();
      const now = new Date().toISOString();
      const newTask: Task = {
        ...taskData,
        id: `task-${Date.now()}`,
        comments: [],
        attachments: [],
        suggestions: [],
        activity: [
          {
            id: `act-${Date.now()}`,
            taskId: `task-${Date.now()}`,
            userId: author.id,
            action: 'created',
            details: `${author.name} created this task`,
            timestamp: now
          }
        ],
        createdAt: now,
        updatedAt: now
      };
      tasks.unshift(newTask);
      localStorage.setItem(`${LOCAL_STORAGE_PREFIX}tasks`, JSON.stringify(tasks));
      realtimeService.broadcastLocalChange('tasks', 'INSERT', { id: newTask.id, ...newTask });
      return newTask;
    }

    // 1. Ensure author and assignee profiles exist to prevent foreign key errors
    await this.ensureProfileExists(author.id, {
      name: author.name,
      email: author.email,
      avatar: author.avatar,
      role: author.role,
      title: author.title,
      department: author.department
    });

    let validAssigneeId: string | null = null;
    if (taskData.assigneeId && taskData.assigneeId.trim()) {
      try {
        await this.ensureProfileExists(taskData.assigneeId);
        validAssigneeId = taskData.assigneeId;
      } catch (err) {
        console.warn('Assignee profile check warning, continuing with null:', err);
        validAssigneeId = null;
      }
    }

    // 2. Ensure valid workspace_id and guarantee workspace membership
    let workspaceId = taskData.workspaceId;
    if (!workspaceId || workspaceId === 'default-workspace') {
      const ws = await this.getWorkspace();
      workspaceId = ws.id;
    }

    // Auto-enroll author into workspace_members to satisfy RLS policies
    await this.ensureWorkspaceMembership(workspaceId, author.id);

    // 3. Insert into tasks table
    let createdTask: any = null;
    const { data: firstTryTask, error: taskError } = await supabase
      .from('tasks')
      .insert({
        workspace_id: workspaceId,
        title: taskData.title,
        description: taskData.description || '',
        status: taskData.status,
        priority: taskData.priority,
        assignee_id: validAssigneeId,
        creator_id: author.id,
        due_date: taskData.dueDate || null
      })
      .select()
      .single();

    if (taskError) {
      console.warn('Supabase createTask initial insert encountered error:', taskError);

      // Handle 42501 RLS policy errors by attempting fallback re-enrollment & retry
      if (taskError.code === '42501' || taskError.message?.toLowerCase().includes('row-level security')) {
        await this.ensureProfileExists(author.id);
        await this.ensureWorkspaceMembership(workspaceId, author.id);

        const { data: retryTask, error: retryError } = await supabase
          .from('tasks')
          .insert({
            workspace_id: workspaceId,
            title: taskData.title,
            description: taskData.description || '',
            status: taskData.status,
            priority: taskData.priority,
            assignee_id: validAssigneeId,
            creator_id: author.id,
            due_date: taskData.dueDate || null
          })
          .select()
          .single();

        if (!retryError && retryTask) {
          createdTask = retryTask;
        } else {
          console.error('Supabase createTask retry failed:', retryError);
          throw new Error(
            'Row-Level Security Policy error (42501): Your Supabase database has an outdated RLS policy on the "tasks" table. Please run the SQL Quick-Fix snippet in Settings > Supabase SQL (or schema.sql in your Supabase SQL Editor) to allow all team members to create tasks.'
          );
        }
      } else {
        throw new Error(`Failed to create task: ${taskError.message}`);
      }
    } else {
      createdTask = firstTryTask;
    }

    const taskId = createdTask.id;

    // 4. Insert initial note if provided (dedicated notes table)
    if (taskData.notes && taskData.notes.trim()) {
      await supabase.from('notes').insert({
        task_id: taskId,
        content: taskData.notes.trim(),
        updated_by: author.id
      });
    }

    // 5. Insert labels if any
    if (taskData.labels && taskData.labels.length > 0) {
      const labelsToInsert = taskData.labels.map(l => ({
        task_id: taskId,
        name: l.name,
        color: l.color
      }));
      await supabase.from('task_labels').insert(labelsToInsert);
    }

    // 6. Insert subtasks if any
    if (taskData.subtasks && taskData.subtasks.length > 0) {
      const subtasksToInsert = taskData.subtasks.map((st, index) => ({
        task_id: taskId,
        title: st.title,
        completed: Boolean(st.completed),
        assigned_to: st.assignedTo || null,
        position: index
      }));
      await supabase.from('task_subtasks').insert(subtasksToInsert);
    }

    // 7. Activity log
    await supabase.from('activity_logs').insert({
      task_id: taskId,
      workspace_id: workspaceId,
      user_id: author.id,
      action: 'created',
      details: `${author.name} created task: "${taskData.title}"`
    });

    // 8. Notify assignee if different from creator
    if (validAssigneeId && validAssigneeId !== author.id) {
      await this.addNotification({
        userId: validAssigneeId,
        actorId: author.id,
        taskId,
        type: 'assigned',
        title: 'New task assigned to you',
        message: `${author.name} assigned "${taskData.title}" to you.`
      });
    }

    const fullTask = await this.getTaskById(taskId);
    if (!fullTask) throw new Error('Task was created but could not be fetched.');
    return fullTask;
  }

  public async updateTask(taskId: string, updates: Partial<Task>, actor: User): Promise<Task> {
    this.ensureConnection();

    if (!isSupabaseConfigured()) {
      const tasks = this.getLocalDemoTasks();
      const idx = tasks.findIndex(t => t.id === taskId);
      if (idx === -1) throw new Error('Task not found');
      tasks[idx] = { ...tasks[idx], ...updates, updatedAt: new Date().toISOString() };
      localStorage.setItem(`${LOCAL_STORAGE_PREFIX}tasks`, JSON.stringify(tasks));
      realtimeService.broadcastLocalChange('tasks', 'UPDATE', { id: taskId, ...tasks[idx] }, { id: taskId });
      return tasks[idx];
    }

    // Ensure actor profile exists
    await this.ensureProfileExists(actor.id, {
      name: actor.name,
      email: actor.email,
      avatar: actor.avatar,
      role: actor.role,
      title: actor.title,
      department: actor.department
    });

    const currentTask = await this.getTaskById(taskId);
    if (!currentTask) throw new Error(`Task ${taskId} not found`);

    const taskUpdates: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    };

    if (updates.title !== undefined) taskUpdates.title = updates.title;
    if (updates.description !== undefined) taskUpdates.description = updates.description;
    if (updates.status !== undefined) taskUpdates.status = updates.status;
    if (updates.priority !== undefined) taskUpdates.priority = updates.priority;
    if (updates.dueDate !== undefined) taskUpdates.due_date = updates.dueDate || null;

    if (updates.assigneeId !== undefined) {
      if (updates.assigneeId && updates.assigneeId.trim()) {
        try {
          await this.ensureProfileExists(updates.assigneeId);
          taskUpdates.assignee_id = updates.assigneeId;
        } catch (err) {
          console.warn('Assignee profile check warning during update:', err);
          taskUpdates.assignee_id = null;
        }
      } else {
        taskUpdates.assignee_id = null;
      }
    }

    const { error: updateError } = await supabase
      .from('tasks')
      .update(taskUpdates)
      .eq('id', taskId);

    if (updateError) {
      console.error('Supabase updateTask error:', updateError);
      throw new Error(`Failed to update task: ${updateError.message}`);
    }

    // Save dedicated notes table if notes updated
    if (updates.notes !== undefined) {
      await this.saveTaskNotes(taskId, updates.notes, actor);
    }

    // Replace labels if labels updated
    if (updates.labels !== undefined) {
      await supabase.from('task_labels').delete().eq('task_id', taskId);
      if (updates.labels.length > 0) {
        const labelsToInsert = updates.labels.map(l => ({
          task_id: taskId,
          name: l.name,
          color: l.color
        }));
        await supabase.from('task_labels').insert(labelsToInsert);
      }
    }

    // Activity and notifications for key changes
    if (updates.status && updates.status !== currentTask.status) {
      const statusLabels: Record<TaskStatus, string> = {
        todo: 'Todo',
        in_progress: 'In Progress',
        review: 'Review',
        done: 'Done'
      };
      await supabase.from('activity_logs').insert({
        task_id: taskId,
        workspace_id: currentTask.workspaceId,
        user_id: actor.id,
        action: 'status_changed',
        details: `${actor.name} moved status to ${statusLabels[updates.status]}`
      });

      if (currentTask.assigneeId && currentTask.assigneeId !== actor.id) {
        await this.addNotification({
          userId: currentTask.assigneeId,
          actorId: actor.id,
          taskId,
          type: 'status_update',
          title: 'Task status updated',
          message: `${actor.name} changed status to "${statusLabels[updates.status]}" on "${currentTask.title}".`
        });
      }
    }

    if (updates.assigneeId !== undefined && updates.assigneeId !== currentTask.assigneeId) {
      const allUsers = await this.getUsers();
      const newAssignee = allUsers.find(u => u.id === updates.assigneeId);
      await supabase.from('activity_logs').insert({
        task_id: taskId,
        workspace_id: currentTask.workspaceId,
        user_id: actor.id,
        action: 'assigned',
        details: `${actor.name} assigned task to ${newAssignee ? newAssignee.name : 'unassigned'}`
      });

      if (updates.assigneeId && updates.assigneeId !== actor.id) {
        await this.addNotification({
          userId: updates.assigneeId,
          actorId: actor.id,
          taskId,
          type: 'assigned',
          title: 'Task assigned to you',
          message: `${actor.name} assigned "${currentTask.title}" to you.`
        });
      }
    }

    if (updates.priority && updates.priority !== currentTask.priority) {
      await supabase.from('activity_logs').insert({
        task_id: taskId,
        workspace_id: currentTask.workspaceId,
        user_id: actor.id,
        action: 'priority_changed',
        details: `${actor.name} changed priority to ${updates.priority.toUpperCase()}`
      });
    }

    const refreshed = await this.getTaskById(taskId);
    if (!refreshed) throw new Error('Could not refresh updated task.');
    return refreshed;
  }

  public async deleteTask(taskId: string): Promise<void> {
    // 1. Always purge from local storage
    const tasks = this.getLocalDemoTasks();
    const filtered = tasks.filter(t => t.id !== taskId);
    localStorage.setItem(`${LOCAL_STORAGE_PREFIX}tasks`, JSON.stringify(filtered));
    realtimeService.broadcastLocalChange('tasks', 'DELETE', {}, { id: taskId });

    if (!isSupabaseConfigured()) {
      return;
    }

    try {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) {
        console.warn('Supabase deleteTask error:', error);
      }
    } catch (err) {
      console.warn('Supabase deleteTask exception:', err);
    }
  }

  // ============================================================================
  // DEDICATED NOTES TABLE
  // ============================================================================

  public async saveTaskNotes(taskId: string, notes: string, user: User): Promise<void> {
    this.ensureConnection();

    if (!isSupabaseConfigured()) {
      const tasks = this.getLocalDemoTasks();
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        task.notes = notes;
        localStorage.setItem(`${LOCAL_STORAGE_PREFIX}tasks`, JSON.stringify(tasks));
      }
      return;
    }

    await this.ensureProfileExists(user.id, {
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      role: user.role,
      title: user.title,
      department: user.department
    });

    const { error } = await supabase
      .from('notes')
      .upsert(
        {
          task_id: taskId,
          content: notes,
          updated_by: user.id,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'task_id' }
      );

    if (error) {
      console.error('Supabase saveTaskNotes error:', error);
      throw new Error(`Failed to save notes: ${error.message}`);
    }
  }

  // ============================================================================
  // COMMENTS
  // ============================================================================

  public async addComment(taskId: string, content: string, user: User): Promise<Task> {
    this.ensureConnection();

    if (!isSupabaseConfigured()) {
      const tasks = this.getLocalDemoTasks();
      const task = tasks.find(t => t.id === taskId);
      if (!task) throw new Error('Task not found');
      task.comments.push({
        id: `c-${Date.now()}`,
        userId: user.id,
        content,
        createdAt: new Date().toISOString()
      });
      localStorage.setItem(`${LOCAL_STORAGE_PREFIX}tasks`, JSON.stringify(tasks));
      realtimeService.broadcastLocalChange('comments', 'INSERT', {
        task_id: taskId,
        user_id: user.id,
        content,
        created_at: new Date().toISOString()
      });
      return task;
    }

    await this.ensureProfileExists(user.id, {
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      role: user.role,
      title: user.title,
      department: user.department
    });

    const task = await this.getTaskById(taskId);
    if (!task) throw new Error('Task not found');

    const { error } = await supabase.from('comments').insert({
      task_id: taskId,
      user_id: user.id,
      content: content.trim()
    });

    if (error) {
      console.error('Supabase addComment error:', error);
      throw new Error(`Failed to add comment: ${error.message}`);
    }

    await supabase.from('activity_logs').insert({
      task_id: taskId,
      workspace_id: task.workspaceId,
      user_id: user.id,
      action: 'commented',
      details: `${user.name} commented: "${content.slice(0, 40)}${content.length > 40 ? '...' : ''}"`
    });

    if (task.assigneeId && task.assigneeId !== user.id) {
      await this.addNotification({
        userId: task.assigneeId,
        actorId: user.id,
        taskId,
        type: 'comment',
        title: `New comment on ${task.title}`,
        message: `${user.name}: "${content.slice(0, 80)}"`
      });
    }

    const updated = await this.getTaskById(taskId);
    if (!updated) throw new Error('Could not fetch updated task after adding comment.');
    return updated;
  }

  // ============================================================================
  // SUGGESTIONS
  // ============================================================================

  public async addSuggestion(taskId: string, content: string, user: User): Promise<Task> {
    this.ensureConnection();

    if (!isSupabaseConfigured()) {
      const tasks = this.getLocalDemoTasks();
      const task = tasks.find(t => t.id === taskId);
      if (!task) throw new Error('Task not found');
      task.suggestions.unshift({
        id: `sug-${Date.now()}`,
        taskId,
        userId: user.id,
        content,
        status: 'open',
        createdAt: new Date().toISOString()
      });
      localStorage.setItem(`${LOCAL_STORAGE_PREFIX}tasks`, JSON.stringify(tasks));
      realtimeService.broadcastLocalChange('suggestions', 'INSERT', {
        task_id: taskId,
        user_id: user.id,
        content,
        status: 'open',
        created_at: new Date().toISOString()
      });
      return task;
    }

    await this.ensureProfileExists(user.id, {
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      role: user.role,
      title: user.title,
      department: user.department
    });

    const task = await this.getTaskById(taskId);
    if (!task) throw new Error('Task not found');

    const { error } = await supabase.from('suggestions').insert({
      task_id: taskId,
      user_id: user.id,
      content: content.trim(),
      status: 'open'
    });

    if (error) {
      throw new Error(`Failed to submit suggestion: ${error.message}`);
    }

    await supabase.from('activity_logs').insert({
      task_id: taskId,
      workspace_id: task.workspaceId,
      user_id: user.id,
      action: 'suggestion_added',
      details: `${user.name} suggested: "${content.slice(0, 45)}..."`
    });

    if (task.assigneeId && task.assigneeId !== user.id) {
      await this.addNotification({
        userId: task.assigneeId,
        actorId: user.id,
        taskId,
        type: 'suggestion',
        title: `New suggestion for ${task.title}`,
        message: `${user.name} suggested: "${content.slice(0, 80)}"`
      });
    }

    const updated = await this.getTaskById(taskId);
    if (!updated) throw new Error('Could not fetch task.');
    return updated;
  }

  public async updateSuggestionStatus(
    taskId: string,
    suggestionId: string,
    status: 'open' | 'adopted' | 'dismissed',
    resolutionNote?: string
  ): Promise<Task> {
    this.ensureConnection();

    if (!isSupabaseConfigured()) {
      const tasks = this.getLocalDemoTasks();
      const task = tasks.find(t => t.id === taskId);
      if (!task) throw new Error('Task not found');
      const sug = task.suggestions.find(s => s.id === suggestionId);
      if (sug) {
        sug.status = status;
        if (resolutionNote) sug.resolutionNote = resolutionNote;
      }
      localStorage.setItem(`${LOCAL_STORAGE_PREFIX}tasks`, JSON.stringify(tasks));
      return task;
    }

    const { error } = await supabase
      .from('suggestions')
      .update({
        status,
        resolution_note: resolutionNote || null
      })
      .eq('id', suggestionId);

    if (error) {
      throw new Error(`Failed to update suggestion: ${error.message}`);
    }

    const updated = await this.getTaskById(taskId);
    if (!updated) throw new Error('Could not fetch task.');
    return updated;
  }

  // ============================================================================
  // ATTACHMENTS (Supabase Storage canonical references & signed URLs)
  // ============================================================================

  public async addAttachment(
    taskId: string,
    attachment: Omit<TaskAttachment, 'id' | 'uploadedAt'>,
    user: User
  ): Promise<Task> {
    this.ensureConnection();

    if (!isSupabaseConfigured()) {
      const tasks = this.getLocalDemoTasks();
      const task = tasks.find(t => t.id === taskId);
      if (!task) throw new Error('Task not found');
      task.attachments.unshift({
        ...attachment,
        id: `att-${Date.now()}`,
        uploadedAt: new Date().toISOString()
      });
      localStorage.setItem(`${LOCAL_STORAGE_PREFIX}tasks`, JSON.stringify(tasks));
      return task;
    }

    await this.ensureProfileExists(user.id, {
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      role: user.role,
      title: user.title,
      department: user.department
    });

    const task = await this.getTaskById(taskId);
    if (!task) throw new Error('Task not found');

    const { error } = await supabase.from('attachments').insert({
      task_id: taskId,
      name: attachment.name,
      size: attachment.size,
      type: attachment.type,
      storage_path: attachment.storagePath,
      uploaded_by: user.id
    });

    if (error) {
      console.error('Supabase addAttachment error:', error);
      throw new Error(`Failed to save attachment metadata: ${error.message}`);
    }

    await supabase.from('activity_logs').insert({
      task_id: taskId,
      workspace_id: task.workspaceId,
      user_id: user.id,
      action: 'attachment_added',
      details: `${user.name} attached file ${attachment.name}`
    });

    const updated = await this.getTaskById(taskId);
    if (!updated) throw new Error('Could not fetch task.');
    return updated;
  }

  public async deleteAttachment(taskId: string, attachmentId: string): Promise<Task> {
    this.ensureConnection();

    if (!isSupabaseConfigured()) {
      const tasks = this.getLocalDemoTasks();
      const task = tasks.find(t => t.id === taskId);
      if (!task) throw new Error('Task not found');
      task.attachments = task.attachments.filter(a => a.id !== attachmentId);
      localStorage.setItem(`${LOCAL_STORAGE_PREFIX}tasks`, JSON.stringify(tasks));
      return task;
    }

    // Retrieve attachment to remove from storage
    const { data: att } = await supabase
      .from('attachments')
      .select('storage_path')
      .eq('id', attachmentId)
      .maybeSingle();

    if (att?.storage_path) {
      await storageService.deleteStorageFile(att.storage_path);
    }

    const { error } = await supabase.from('attachments').delete().eq('id', attachmentId);
    if (error) {
      throw new Error(`Failed to delete attachment: ${error.message}`);
    }

    const updated = await this.getTaskById(taskId);
    if (!updated) throw new Error('Could not fetch task.');
    return updated;
  }

  public async getSignedAttachmentUrl(storagePath: string): Promise<string> {
    return storageService.getSignedAttachmentUrl(storagePath);
  }

  public async downloadAttachment(storagePath: string, fileName: string): Promise<void> {
    return storageService.downloadAttachment(storagePath, fileName);
  }

  // ============================================================================
  // SUBTASKS
  // ============================================================================

  public async toggleSubtask(taskId: string, subtaskId: string, actor: User): Promise<Task> {
    this.ensureConnection();

    if (!isSupabaseConfigured()) {
      const tasks = this.getLocalDemoTasks();
      const task = tasks.find(t => t.id === taskId);
      if (!task) throw new Error('Task not found');
      const st = task.subtasks.find(s => s.id === subtaskId);
      if (st) st.completed = !st.completed;
      localStorage.setItem(`${LOCAL_STORAGE_PREFIX}tasks`, JSON.stringify(tasks));
      return task;
    }

    await this.ensureProfileExists(actor.id, {
      name: actor.name,
      email: actor.email,
      avatar: actor.avatar,
      role: actor.role,
      title: actor.title,
      department: actor.department
    });

    // Fetch current status
    const { data: st } = await supabase
      .from('task_subtasks')
      .select('completed, title')
      .eq('id', subtaskId)
      .single();

    const newCompleted = !st?.completed;

    const { error } = await supabase
      .from('task_subtasks')
      .update({ completed: newCompleted })
      .eq('id', subtaskId);

    if (error) throw new Error(`Failed to update subtask: ${error.message}`);

    if (newCompleted && st?.title) {
      const task = await this.getTaskById(taskId);
      if (task) {
        await supabase.from('activity_logs').insert({
          task_id: taskId,
          workspace_id: task.workspaceId,
          user_id: actor.id,
          action: 'subtask_completed',
          details: `${actor.name} completed subtask: "${st.title}"`
        });
      }
    }

    const updated = await this.getTaskById(taskId);
    if (!updated) throw new Error('Could not fetch task.');
    return updated;
  }

  public async addSubtask(taskId: string, title: string): Promise<Task> {
    this.ensureConnection();

    if (!isSupabaseConfigured()) {
      const tasks = this.getLocalDemoTasks();
      const task = tasks.find(t => t.id === taskId);
      if (!task) throw new Error('Task not found');
      task.subtasks.push({
        id: `st-${Date.now()}`,
        title,
        completed: false
      });
      localStorage.setItem(`${LOCAL_STORAGE_PREFIX}tasks`, JSON.stringify(tasks));
      return task;
    }

    const { error } = await supabase.from('task_subtasks').insert({
      task_id: taskId,
      title: title.trim(),
      completed: false
    });

    if (error) throw new Error(`Failed to add subtask: ${error.message}`);

    const updated = await this.getTaskById(taskId);
    if (!updated) throw new Error('Could not fetch task.');
    return updated;
  }

  public async deleteSubtask(taskId: string, subtaskId: string): Promise<Task> {
    this.ensureConnection();

    if (!isSupabaseConfigured()) {
      const tasks = this.getLocalDemoTasks();
      const task = tasks.find(t => t.id === taskId);
      if (!task) throw new Error('Task not found');
      task.subtasks = task.subtasks.filter(s => s.id !== subtaskId);
      localStorage.setItem(`${LOCAL_STORAGE_PREFIX}tasks`, JSON.stringify(tasks));
      return task;
    }

    const { error } = await supabase.from('task_subtasks').delete().eq('id', subtaskId);
    if (error) throw new Error(`Failed to delete subtask: ${error.message}`);

    const updated = await this.getTaskById(taskId);
    if (!updated) throw new Error('Could not fetch task.');
    return updated;
  }

  // ============================================================================
  // NOTIFICATIONS
  // ============================================================================

  public async getNotifications(userId: string): Promise<NotificationItem[]> {
    if (!userId) return [];

    if (!isSupabaseConfigured()) {
      return this.getLocalDemoNotifications(userId);
    }

    if (!isSupabaseConfigured()) return [];

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Could not load notifications from Supabase:', error);
      return [];
    }

    return (data || []).map(n => ({
      id: n.id,
      userId: n.user_id,
      actorId: n.actor_id || '',
      taskId: n.task_id || undefined,
      type: n.type as NotificationItem['type'],
      title: n.title,
      message: n.message,
      read: Boolean(n.read),
      createdAt: n.created_at
    }));
  }

  public async addNotification(
    notif: Omit<NotificationItem, 'id' | 'createdAt' | 'read'>
  ): Promise<NotificationItem> {
    if (!isSupabaseConfigured()) {
      const all = this.getLocalDemoNotifications(notif.userId);
      const newNotif: NotificationItem = {
        ...notif,
        id: `notif-${Date.now()}`,
        read: false,
        createdAt: new Date().toISOString()
      };
      all.unshift(newNotif);
      localStorage.setItem(`${LOCAL_STORAGE_PREFIX}notifications`, JSON.stringify(all));
      return newNotif;
    }

    if (!isSupabaseConfigured()) {
      return {
        ...notif,
        id: `notif-${Date.now()}`,
        read: false,
        createdAt: new Date().toISOString()
      };
    }

    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: notif.userId,
        actor_id: notif.actorId || null,
        task_id: notif.taskId || null,
        type: notif.type,
        title: notif.title,
        message: notif.message,
        read: false
      })
      .select()
      .single();

    if (error) {
      console.warn('Could not insert notification into Supabase:', error);
      return {
        ...notif,
        id: `notif-${Date.now()}`,
        read: false,
        createdAt: new Date().toISOString()
      };
    }

    return {
      id: data.id,
      userId: data.user_id,
      actorId: data.actor_id || '',
      taskId: data.task_id || undefined,
      type: data.type as NotificationItem['type'],
      title: data.title,
      message: data.message,
      read: false,
      createdAt: data.created_at
    };
  }

  public async markNotificationAsRead(notifId: string): Promise<void> {
    if (!isSupabaseConfigured()) {
      const all = this.getLocalDemoNotifications();
      const target = all.find(n => n.id === notifId);
      if (target) target.read = true;
      localStorage.setItem(`${LOCAL_STORAGE_PREFIX}notifications`, JSON.stringify(all));
      return;
    }

    if (!isSupabaseConfigured()) return;

    await supabase.from('notifications').update({ read: true }).eq('id', notifId);
  }

  public async markAllNotificationsAsRead(userId: string): Promise<void> {
    if (!isSupabaseConfigured()) {
      const all = this.getLocalDemoNotifications();
      all.forEach(n => {
        if (n.userId === userId) n.read = true;
      });
      localStorage.setItem(`${LOCAL_STORAGE_PREFIX}notifications`, JSON.stringify(all));
      return;
    }

    if (!isSupabaseConfigured()) return;

    await supabase.from('notifications').update({ read: true }).eq('user_id', userId);
  }

  // ============================================================================
  // DOMAIN MAPPING HELPERS
  // ============================================================================

  private mapTaskRowsToDomain(rows: DatabaseTaskRow[]): Task[] {
    return rows.map(r => {
      const labels: TaskLabel[] = (r.task_labels || []).map(l => ({
        id: l.id,
        name: l.name,
        color: l.color
      }));

      const subtasks = (r.task_subtasks || []).map(st => ({
        id: st.id,
        title: st.title,
        completed: Boolean(st.completed),
        assignedTo: st.assigned_to || undefined
      }));

      const comments: TaskComment[] = (r.comments || []).map(c => ({
        id: c.id,
        userId: c.user_id,
        content: c.content,
        createdAt: c.created_at
      }));

      const suggestions: TaskSuggestion[] = (r.suggestions || []).map(s => ({
        id: s.id,
        taskId: r.id,
        userId: s.user_id,
        content: s.content,
        status: s.status,
        resolutionNote: s.resolution_note || undefined,
        createdAt: s.created_at
      }));

      const attachments: TaskAttachment[] = (r.attachments || []).map(a => {
        let formattedSize = '0 KB';
        if (typeof a.size === 'number') {
          if (a.size >= 1024 * 1024) formattedSize = `${(a.size / (1024 * 1024)).toFixed(1)} MB`;
          else if (a.size >= 1024) formattedSize = `${(a.size / 1024).toFixed(0)} KB`;
          else formattedSize = `${a.size} B`;
        } else if (typeof a.size === 'string') {
          formattedSize = a.size;
        }

        return {
          id: a.id,
          taskId: r.id,
          name: a.name,
          size: formattedSize,
          type: a.type,
          storagePath: a.storage_path,
          url: a.storage_path, // Storage service will resolve signed URL dynamically
          uploadedBy: a.uploaded_by || '',
          uploadedAt: a.uploaded_at
        };
      });

      const activity: TaskActivity[] = (r.activity_logs || []).map(act => ({
        id: act.id,
        taskId: r.id,
        userId: act.user_id || '',
        action: act.action as TaskActivity['action'],
        details: act.details,
        timestamp: act.timestamp
      }));

      // Notes loaded from dedicated notes table
      const notesContent = r.notes && r.notes.length > 0 ? r.notes[0].content : '';

      return {
        id: r.id,
        workspaceId: r.workspace_id,
        title: r.title,
        description: r.description || '',
        status: r.status,
        priority: r.priority,
        assigneeId: r.assignee_id || '',
        creatorId: r.creator_id || '',
        dueDate: r.due_date || '',
        labels,
        subtasks,
        comments,
        notes: notesContent,
        attachments,
        suggestions,
        activity,
        createdAt: r.created_at,
        updatedAt: r.updated_at
      };
    });
  }

  // ============================================================================
  // EXPLICIT LOCAL DEMO DATA (Used ONLY when VITE_DEMO_MODE=true)
  // ============================================================================

  private getLocalDemoUsers(): User[] {
    try {
      const stored = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}users`);
      if (stored) return JSON.parse(stored);
    } catch {}
    return initialUsers;
  }

  private getLocalDemoActiveUser(): User {
    try {
      const stored = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}active_user`);
      if (stored) return JSON.parse(stored);
    } catch {}
    return initialUsers[0];
  }

  private getLocalDemoWorkspace(): Workspace {
    try {
      const stored = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}workspace`);
      if (stored) return JSON.parse(stored);
    } catch {}
    return initialWorkspace;
  }

  private getLocalDemoTasks(): Task[] {
    try {
      const stored = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}tasks`);
      if (stored) return JSON.parse(stored);
    } catch {}
    return initialTasks;
  }

  private getLocalDemoNotifications(userId?: string): NotificationItem[] {
    try {
      const stored = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}notifications`);
      if (stored) {
        const parsed: NotificationItem[] = JSON.parse(stored);
        return userId ? parsed.filter(n => n.userId === userId) : parsed;
      }
    } catch {}
    return userId ? initialNotifications.filter(n => n.userId === userId) : initialNotifications;
  }

  public resetToDemoData(): void {
    try {
      localStorage.removeItem(`${LOCAL_STORAGE_PREFIX}tasks`);
      localStorage.removeItem(`${LOCAL_STORAGE_PREFIX}users`);
      localStorage.removeItem(`${LOCAL_STORAGE_PREFIX}active_user`);
      localStorage.removeItem(`${LOCAL_STORAGE_PREFIX}workspace`);
      localStorage.removeItem(`${LOCAL_STORAGE_PREFIX}notifications`);
    } catch (e) {
      console.warn('Could not clear demo data from localStorage', e);
    }
  }
}

export const dataService = new DataService();
