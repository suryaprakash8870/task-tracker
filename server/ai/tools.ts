import { SupabaseClient } from '@supabase/supabase-js';
import { AIToolDefinition, AIToolResult, AIRequestContext } from './types';

// ==============================================================================
// TOOL DEFINITIONS (Function Declarations for Gemini/AI Providers)
// ==============================================================================

export const CONTROLLED_AI_TOOLS: AIToolDefinition[] = [
  // 1. get_my_tasks
  {
    name: 'get_my_tasks',
    description: 'Return tasks assigned to the currently authenticated user in their active workspace.',
    parameters: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          description: 'Optional filter by status: "todo", "in_progress", "review", "done", or "all" (default: open/active tasks)',
        },
        priority: {
          type: 'string',
          description: 'Optional filter by priority: "low", "medium", "high", "urgent"',
        },
      },
    },
  },

  // 2. get_task
  {
    name: 'get_task',
    description: 'Get a specific task and its full relevant details (status, assignee, subtasks, notes, comments, activity).',
    parameters: {
      type: 'object',
      properties: {
        taskId: {
          type: 'string',
          description: 'The unique ID of the task or approximate title search query.',
        },
        taskTitle: {
          type: 'string',
          description: 'The title or keyword of the task if the ID is not known.',
        },
      },
    },
  },

  // 3. search_tasks
  {
    name: 'search_tasks',
    description: 'Search tasks the authenticated user is authorized to access by keyword, assignee, status, or priority.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Keyword search in task title, description, or notes.',
        },
        status: {
          type: 'string',
          description: 'Filter by status: "todo", "in_progress", "review", "done", or "all"',
        },
        assigneeName: {
          type: 'string',
          description: 'Filter by assignee member name (e.g., "Arun", "Priya", "Surya").',
        },
        priority: {
          type: 'string',
          description: 'Filter by priority: "low", "medium", "high", "urgent"',
        },
      },
    },
  },

  // 4. get_overdue_tasks
  {
    name: 'get_overdue_tasks',
    description: 'Return overdue tasks (due date before today and not marked done) available in the authenticated workspace.',
    parameters: {
      type: 'object',
      properties: {
        assigneeOnly: {
          type: 'boolean',
          description: 'If true, only return overdue tasks assigned to the current user (default: false).',
        },
      },
    },
  },

  // 5. get_team_members
  {
    name: 'get_team_members',
    description: 'Return the list of members in the authenticated user\'s workspace (names, emails, roles, titles).',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Optional name search filter.',
        },
      },
    },
  },

  // 6. get_recent_activity
  {
    name: 'get_recent_activity',
    description: 'Return relevant recent workspace audit activity (task creations, assignments, status changes, comments).',
    parameters: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of activity items to retrieve (default: 10).',
        },
        taskId: {
          type: 'string',
          description: 'Optional taskId to filter activity logs for a specific task.',
        },
      },
    },
  },

  // 7. create_task
  {
    name: 'create_task',
    description: 'Create a new task in the workspace. Automatically matches assignee names, verifies workspace membership, and sets appropriate defaults.',
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Title of the new task (required).',
        },
        description: {
          type: 'string',
          description: 'Detailed description of the task requirements.',
        },
        assigneeName: {
          type: 'string',
          description: 'Name of the workspace member to assign to (e.g. "Arun", "Priya", "Surya").',
        },
        status: {
          type: 'string',
          description: 'Initial task status: "todo" (default), "in_progress", "review", or "done".',
        },
        priority: {
          type: 'string',
          description: 'Priority level: "low", "medium" (default), "high", or "urgent".',
        },
        dueDate: {
          type: 'string',
          description: 'Due date in YYYY-MM-DD format (resolve relative dates like "tomorrow", "next Monday" using current context).',
        },
        notes: {
          type: 'string',
          description: 'Initial notes or context for the task.',
        },
        labels: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of label names to attach (e.g. ["Design", "Frontend", "Backend", "QA & Testing"]).',
        },
      },
      required: ['title'],
    },
  },

  // 8. update_task
  {
    name: 'update_task',
    description: 'Update allowed fields on an existing task (title, description, priority, dueDate, notes).',
    parameters: {
      type: 'object',
      properties: {
        taskId: {
          type: 'string',
          description: 'Unique task ID or unambiguous task title.',
        },
        title: {
          type: 'string',
          description: 'Updated title.',
        },
        description: {
          type: 'string',
          description: 'Updated description.',
        },
        priority: {
          type: 'string',
          description: 'Updated priority: "low", "medium", "high", "urgent".',
        },
        dueDate: {
          type: 'string',
          description: 'Updated due date in YYYY-MM-DD format.',
        },
        notes: {
          type: 'string',
          description: 'Updated notes content.',
        },
      },
      required: ['taskId'],
    },
  },

  // 9. assign_task
  {
    name: 'assign_task',
    description: 'Assign or reassign a task to an authorized workspace team member.',
    parameters: {
      type: 'object',
      properties: {
        taskId: {
          type: 'string',
          description: 'Task ID or task title to assign.',
        },
        assigneeName: {
          type: 'string',
          description: 'Name of the workspace member to assign to (e.g. "Priya", "Arun", "Surya").',
        },
      },
      required: ['taskId', 'assigneeName'],
    },
  },

  // 10. move_task
  {
    name: 'move_task',
    description: 'Change the workflow status of a task.',
    parameters: {
      type: 'object',
      properties: {
        taskId: {
          type: 'string',
          description: 'Task ID or task title.',
        },
        status: {
          type: 'string',
          description: 'Target workflow status: "todo", "in_progress", "review", or "done".',
        },
      },
      required: ['taskId', 'status'],
    },
  },

  // 11. complete_task
  {
    name: 'complete_task',
    description: 'Mark a task as completed (moves status to "done").',
    parameters: {
      type: 'object',
      properties: {
        taskId: {
          type: 'string',
          description: 'Task ID or task title to mark as completed.',
        },
      },
      required: ['taskId'],
    },
  },

  // 12. add_comment
  {
    name: 'add_comment',
    description: 'Post a comment or discussion message on a task.',
    parameters: {
      type: 'object',
      properties: {
        taskId: {
          type: 'string',
          description: 'Task ID or task title.',
        },
        content: {
          type: 'string',
          description: 'The comment text to post.',
        },
      },
      required: ['taskId', 'content'],
    },
  },

  // 13. add_note
  {
    name: 'add_note',
    description: 'Add or append a note to a task.',
    parameters: {
      type: 'object',
      properties: {
        taskId: {
          type: 'string',
          description: 'Task ID or task title.',
        },
        note: {
          type: 'string',
          description: 'The note text to attach to the task.',
        },
        append: {
          type: 'boolean',
          description: 'If true, append to existing notes; if false or not specified, replace or update (default: true).',
        },
      },
      required: ['taskId', 'note'],
    },
  },

  // 14. create_suggestion
  {
    name: 'create_suggestion',
    description: 'Create an advisory suggestion or recommendation for another team member on a task.',
    parameters: {
      type: 'object',
      properties: {
        taskId: {
          type: 'string',
          description: 'Task ID or task title.',
        },
        content: {
          type: 'string',
          description: 'The suggestion text (e.g. "Consider checking the previous landing page assets before proceeding").',
        },
      },
      required: ['taskId', 'content'],
    },
  },
];

// ==============================================================================
// TOOL EXECUTION ENGINE (Server-Side with Strict Authorization & DB Verification)
// ==============================================================================

export class AIToolExecutor {
  constructor(
    private supabase: SupabaseClient,
    private context: AIRequestContext
  ) {}

  /**
   * Helper: Match a workspace member by name or ID safely
   */
  private async resolveMember(nameOrId?: string): Promise<{
    user?: { id: string; name: string; email: string; role: string };
    ambiguity?: string;
  }> {
    if (!nameOrId || !nameOrId.trim()) return {};

    const clean = nameOrId.trim().toLowerCase();

    // Query profiles in workspace
    const { data: profiles, error } = await this.supabase
      .from('profiles')
      .select('id, name, email, role');

    if (error || !profiles || profiles.length === 0) {
      // Fallback: check if matches context user
      if (clean === 'me' || clean === 'myself' || clean === this.context.userName.toLowerCase() || clean === this.context.userId.toLowerCase()) {
        return {
          user: {
            id: this.context.userId,
            name: this.context.userName,
            email: this.context.userEmail,
            role: this.context.userRole,
          },
        };
      }
      return {};
    }

    // Direct ID match
    const byId = profiles.find((p) => p.id === nameOrId);
    if (byId) return { user: byId };

    // "me" / "myself" keyword
    if (clean === 'me' || clean === 'myself') {
      const meProf = profiles.find((p) => p.id === this.context.userId) || {
        id: this.context.userId,
        name: this.context.userName,
        email: this.context.userEmail,
        role: this.context.userRole,
      };
      return { user: meProf };
    }

    // Exact name match (case-insensitive)
    const exactMatches = profiles.filter((p) => (p.name || '').toLowerCase() === clean);
    if (exactMatches.length === 1) return { user: exactMatches[0] };
    if (exactMatches.length > 1) {
      const names = exactMatches.map((m) => `"${m.name}" (${m.email})`).join(' and ');
      return { ambiguity: `There are multiple team members matching "${nameOrId}": ${names}. Which one did you mean?` };
    }

    // Partial name match (e.g. "Arun" matching "Arun Kumar")
    const partialMatches = profiles.filter((p) => (p.name || '').toLowerCase().includes(clean));
    if (partialMatches.length === 1) return { user: partialMatches[0] };
    if (partialMatches.length > 1) {
      const names = partialMatches.map((m) => `"${m.name}" (${m.email})`).join(', ');
      return { ambiguity: `Multiple team members match "${nameOrId}": ${names}. Please specify.` };
    }

    return {};
  }

  /**
   * Helper: Match an authorized task by ID or title query safely
   */
  private async resolveTask(taskIdOrTitle: string): Promise<{
    task?: any;
    ambiguity?: string;
  }> {
    if (!taskIdOrTitle || !taskIdOrTitle.trim()) {
      return { ambiguity: 'Please specify which task you want to act on.' };
    }

    const clean = taskIdOrTitle.trim();

    // 1. Try finding by exact ID first
    const { data: directTask } = await this.supabase
      .from('tasks')
      .select('*, task_labels(id, name, color), notes(content)')
      .eq('id', clean)
      .maybeSingle();

    if (directTask) return { task: directTask };

    // 2. Search by title
    const { data: titleTasks, error } = await this.supabase
      .from('tasks')
      .select('*, task_labels(id, name, color), notes(content)')
      .ilike('title', `%${clean}%`)
      .limit(10);

    if (error) {
      return { ambiguity: `Failed to search tasks: ${error.message}` };
    }

    if (!titleTasks || titleTasks.length === 0) {
      return { ambiguity: `Could not find any task matching "${clean}".` };
    }

    if (titleTasks.length === 1) {
      return { task: titleTasks[0] };
    }

    // If multiple matches, check for exact title
    const exactMatch = titleTasks.find((t) => t.title.toLowerCase() === clean.toLowerCase());
    if (exactMatch) return { task: exactMatch };

    // Ambiguous task titles
    const options = titleTasks.map((t) => `"${t.title}" (Status: ${t.status})`).join(', ');
    return { ambiguity: `Multiple tasks matched "${clean}": ${options}. Which task did you mean?` };
  }

  /**
   * Helper: Normalize status
   */
  private normalizeStatus(status?: string): 'todo' | 'in_progress' | 'review' | 'done' {
    if (!status) return 'todo';
    const s = status.toLowerCase().trim().replace(/[\s-]/g, '_');
    if (s === 'todo' || s === 'to_do') return 'todo';
    if (s === 'in_progress' || s === 'inprogress' || s === 'progress' || s === 'doing') return 'in_progress';
    if (s === 'review' || s === 'in_review' || s === 'inreview' || s === 'testing') return 'review';
    if (s === 'done' || s === 'completed' || s === 'complete' || s === 'finished') return 'done';
    return 'todo';
  }

  /**
   * Helper: Normalize priority
   */
  private normalizePriority(priority?: string): 'low' | 'medium' | 'high' | 'urgent' {
    if (!priority) return 'medium';
    const p = priority.toLowerCase().trim();
    if (p === 'low') return 'low';
    if (p === 'medium' || p === 'med' || p === 'normal') return 'medium';
    if (p === 'high') return 'high';
    if (p === 'urgent' || p === 'critical' || p === 'blocker') return 'urgent';
    return 'medium';
  }

  /**
   * Helper: Normalize date string
   */
  private normalizeDate(dateStr?: string): string | null {
    if (!dateStr || !dateStr.trim()) return null;
    const clean = dateStr.trim().toLowerCase();

    const today = new Date();

    if (clean === 'today') {
      return today.toISOString().split('T')[0];
    }
    if (clean === 'tomorrow') {
      const tom = new Date(today);
      tom.setDate(tom.getDate() + 1);
      return tom.toISOString().split('T')[0];
    }
    if (clean === 'yesterday') {
      const yest = new Date(today);
      yest.setDate(yest.getDate() - 1);
      return yest.toISOString().split('T')[0];
    }

    // Try parsing standard YYYY-MM-DD or standard date format
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }

    return null;
  }

  // ============================================================================
  // MASTER DISPATCHER
  // ============================================================================

  public async execute(name: string, args: Record<string, any>): Promise<AIToolResult> {
    try {
      switch (name) {
        case 'get_my_tasks':
          return await this.getMyTasks(args);
        case 'get_task':
          return await this.getTask(args);
        case 'search_tasks':
          return await this.searchTasks(args);
        case 'get_overdue_tasks':
          return await this.getOverdueTasks(args);
        case 'get_team_members':
          return await this.getTeamMembers(args);
        case 'get_recent_activity':
          return await this.getRecentActivity(args);
        case 'create_task':
          return await this.createTask(args as any);
        case 'update_task':
          return await this.updateTask(args as any);
        case 'assign_task':
          return await this.assignTask(args as any);
        case 'move_task':
          return await this.moveTask(args as any);
        case 'complete_task':
          return await this.completeTask(args as any);
        case 'add_comment':
          return await this.addComment(args as any);
        case 'add_note':
          return await this.addNote(args as any);
        case 'create_suggestion':
          return await this.createSuggestion(args as any);
        default:
          return {
            success: false,
            error: `Unsupported tool: "${name}".`,
          };
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        error: `Tool execution failed: ${msg}`,
      };
    }
  }

  // ----------------------------------------------------------------------------
  // READ TOOL IMPLEMENTATIONS
  // ----------------------------------------------------------------------------

  private async getMyTasks(args: { status?: string; priority?: string }): Promise<AIToolResult> {
    let query = this.supabase
      .from('tasks')
      .select('id, title, description, status, priority, due_date, created_at, task_labels(id, name, color)')
      .eq('assignee_id', this.context.userId)
      .order('due_date', { ascending: true, nullsFirst: false });

    if (args.status && args.status !== 'all') {
      query = query.eq('status', this.normalizeStatus(args.status));
    }
    if (args.priority && args.priority !== 'all') {
      query = query.eq('priority', this.normalizePriority(args.priority));
    }

    const { data: tasks, error } = await query;
    if (error) throw error;

    const formatted = (tasks || []).map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description || '',
      status: t.status,
      priority: t.priority,
      dueDate: t.due_date || 'No due date',
      labels: (t.task_labels || []).map((l: any) => l.name),
    }));

    return {
      success: true,
      data: {
        total: formatted.length,
        assignee: this.context.userName,
        tasks: formatted,
      },
      message: `Found ${formatted.length} tasks assigned to you (${this.context.userName}).`,
    };
  }

  private async getTask(args: { taskId?: string; taskTitle?: string }): Promise<AIToolResult> {
    const target = args.taskId || args.taskTitle || '';
    const { task, ambiguity } = await this.resolveTask(target);
    if (ambiguity) return { success: false, ambiguityPrompt: ambiguity, error: ambiguity };
    if (!task) return { success: false, error: `Task not found.` };

    // Fetch related child records in parallel
    const [subtasksRes, commentsRes, suggestionsRes] = await Promise.all([
      this.supabase.from('task_subtasks').select('*').eq('task_id', task.id),
      this.supabase.from('comments').select('*, profiles(name)').eq('task_id', task.id).order('created_at', { ascending: true }),
      this.supabase.from('suggestions').select('*, profiles(name)').eq('task_id', task.id).order('created_at', { ascending: false }),
    ]);

    // Resolve assignee and creator names
    let assigneeName = 'Unassigned';
    if (task.assignee_id) {
      const { data: p } = await this.supabase.from('profiles').select('name').eq('id', task.assignee_id).maybeSingle();
      if (p) assigneeName = p.name;
    }

    return {
      success: true,
      data: {
        id: task.id,
        title: task.title,
        description: task.description || '',
        status: task.status,
        priority: task.priority,
        assignee: assigneeName,
        dueDate: task.due_date || 'No due date',
        notes: (task.notes && task.notes.length > 0 ? task.notes[0].content : '') || '',
        labels: (task.task_labels || []).map((l: any) => l.name),
        subtasks: (subtasksRes.data || []).map((s: any) => ({ title: s.title, completed: s.completed })),
        comments: (commentsRes.data || []).map((c: any) => ({
          author: c.profiles?.name || 'Team member',
          content: c.content,
          date: c.created_at,
        })),
        suggestions: (suggestionsRes.data || []).map((s: any) => ({
          author: s.profiles?.name || 'Team member',
          content: s.content,
          status: s.status,
        })),
      },
    };
  }

  private async searchTasks(args: {
    query?: string;
    status?: string;
    assigneeName?: string;
    priority?: string;
  }): Promise<AIToolResult> {
    let query = this.supabase
      .from('tasks')
      .select('id, title, description, status, priority, assignee_id, due_date, task_labels(id, name, color)')
      .order('created_at', { ascending: false })
      .limit(20);

    if (args.query && args.query.trim()) {
      query = query.or(`title.ilike.%${args.query.trim()}%,description.ilike.%${args.query.trim()}%`);
    }

    if (args.status && args.status !== 'all') {
      query = query.eq('status', this.normalizeStatus(args.status));
    }

    if (args.priority && args.priority !== 'all') {
      query = query.eq('priority', this.normalizePriority(args.priority));
    }

    if (args.assigneeName && args.assigneeName.trim()) {
      const { user, ambiguity } = await this.resolveMember(args.assigneeName);
      if (ambiguity) return { success: false, ambiguityPrompt: ambiguity, error: ambiguity };
      if (user) {
        query = query.eq('assignee_id', user.id);
      }
    }

    const { data: tasks, error } = await query;
    if (error) throw error;

    // Resolve assignee names for output
    const { data: allProfiles } = await this.supabase.from('profiles').select('id, name');
    const profileMap = new Map((allProfiles || []).map((p) => [p.id, p.name]));

    const formatted = (tasks || []).map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      assignee: t.assignee_id ? profileMap.get(t.assignee_id) || 'Unknown' : 'Unassigned',
      dueDate: t.due_date || 'None',
      labels: (t.task_labels || []).map((l: any) => l.name),
    }));

    return {
      success: true,
      data: {
        total: formatted.length,
        tasks: formatted,
      },
      message: `Found ${formatted.length} tasks matching your search criteria.`,
    };
  }

  private async getOverdueTasks(args: { assigneeOnly?: boolean }): Promise<AIToolResult> {
    const today = this.context.currentDate || new Date().toISOString().split('T')[0];

    let query = this.supabase
      .from('tasks')
      .select('id, title, status, priority, assignee_id, due_date')
      .lt('due_date', today)
      .neq('status', 'done')
      .order('due_date', { ascending: true });

    if (args.assigneeOnly) {
      query = query.eq('assignee_id', this.context.userId);
    }

    const { data: tasks, error } = await query;
    if (error) throw error;

    const { data: allProfiles } = await this.supabase.from('profiles').select('id, name');
    const profileMap = new Map((allProfiles || []).map((p) => [p.id, p.name]));

    const formatted = (tasks || []).map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      assignee: t.assignee_id ? profileMap.get(t.assignee_id) || 'Unknown' : 'Unassigned',
      dueDate: t.due_date,
    }));

    return {
      success: true,
      data: {
        total: formatted.length,
        today,
        tasks: formatted,
      },
      message: `There are ${formatted.length} overdue tasks in the workspace.`,
    };
  }

  private async getTeamMembers(args: { query?: string }): Promise<AIToolResult> {
    let query = this.supabase
      .from('profiles')
      .select('id, name, email, role, title, department')
      .order('name', { ascending: true });

    if (args.query && args.query.trim()) {
      query = query.ilike('name', `%${args.query.trim()}%`);
    }

    const { data: profiles, error } = await query;
    if (error) throw error;

    return {
      success: true,
      data: {
        total: (profiles || []).length,
        members: profiles || [],
      },
    };
  }

  private async getRecentActivity(args: { limit?: number; taskId?: string }): Promise<AIToolResult> {
    const limit = Math.min(args.limit || 10, 30);
    let query = this.supabase
      .from('activity_logs')
      .select('id, task_id, action, details, timestamp, user_id, profiles(name)')
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (args.taskId) {
      query = query.eq('task_id', args.taskId);
    }

    const { data: logs, error } = await query;
    if (error) throw error;

    const formatted = (logs || []).map((l: any) => ({
      id: l.id,
      user: l.profiles?.name || 'Team member',
      action: l.action,
      details: l.details,
      timestamp: l.timestamp,
    }));

    return {
      success: true,
      data: {
        total: formatted.length,
        activities: formatted,
      },
    };
  }

  // ----------------------------------------------------------------------------
  // WRITE TOOL IMPLEMENTATIONS
  // ----------------------------------------------------------------------------

  private async createTask(args: {
    title: string;
    description?: string;
    assigneeName?: string;
    status?: string;
    priority?: string;
    dueDate?: string;
    notes?: string;
    labels?: string[];
  }): Promise<AIToolResult> {
    if (!args.title || !args.title.trim()) {
      return { success: false, error: 'Task title is required.' };
    }

    // 1. Resolve assignee
    let assigneeId: string | null = null;
    let assigneeDisplayName = 'Unassigned';

    if (args.assigneeName && args.assigneeName.trim()) {
      const { user, ambiguity } = await this.resolveMember(args.assigneeName);
      if (ambiguity) return { success: false, ambiguityPrompt: ambiguity, error: ambiguity };
      if (user) {
        assigneeId = user.id;
        assigneeDisplayName = user.name;
      }
    }

    // 2. Resolve Workspace
    let workspaceId = this.context.workspaceId;
    if (!workspaceId || workspaceId === 'default-workspace') {
      const { data: ws } = await this.supabase.from('workspaces').select('id').limit(1).maybeSingle();
      if (ws?.id) workspaceId = ws.id;
    }

    const normalizedStatus = this.normalizeStatus(args.status);
    const normalizedPriority = this.normalizePriority(args.priority);
    const normalizedDueDate = this.normalizeDate(args.dueDate);

    // 3. Insert Task
    const { data: newTask, error } = await this.supabase
      .from('tasks')
      .insert({
        workspace_id: workspaceId,
        title: args.title.trim(),
        description: args.description?.trim() || '',
        status: normalizedStatus,
        priority: normalizedPriority,
        assignee_id: assigneeId,
        creator_id: this.context.userId,
        due_date: normalizedDueDate,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create task in Supabase: ${error.message}`);
    }

    // 4. Attach Notes if provided
    if (args.notes && args.notes.trim()) {
      await this.supabase.from('notes').insert({
        task_id: newTask.id,
        content: args.notes.trim(),
        updated_by: this.context.userId,
      });
    }

    // 5. Attach Labels if provided
    if (args.labels && args.labels.length > 0) {
      const labelInserts = args.labels.map((lbl) => ({
        task_id: newTask.id,
        name: lbl,
        color: 'bg-blue-100 text-blue-700 border-blue-200',
      }));
      await this.supabase.from('task_labels').insert(labelInserts);
    }

    // 6. Activity log
    await this.supabase.from('activity_logs').insert({
      task_id: newTask.id,
      workspace_id: workspaceId,
      user_id: this.context.userId,
      action: 'created',
      details: `${this.context.userName} created task "${newTask.title}" via AI Assistant`,
    });

    // 7. Notification to assignee if not self
    if (assigneeId && assigneeId !== this.context.userId) {
      await this.supabase.from('notifications').insert({
        user_id: assigneeId,
        actor_id: this.context.userId,
        task_id: newTask.id,
        type: 'assigned',
        title: 'New task assigned to you',
        message: `${this.context.userName} assigned "${newTask.title}" to you.`,
        read: false,
      });
    }

    return {
      success: true,
      message: `Created task "${newTask.title}" (Status: ${normalizedStatus.toUpperCase()}, Priority: ${normalizedPriority.toUpperCase()}, Assigned to: ${assigneeDisplayName}${normalizedDueDate ? `, Due: ${normalizedDueDate}` : ''}).`,
      data: {
        id: newTask.id,
        title: newTask.title,
        status: newTask.status,
        priority: newTask.priority,
        assignee: assigneeDisplayName,
        dueDate: normalizedDueDate,
      },
    };
  }

  private async updateTask(args: {
    taskId: string;
    title?: string;
    description?: string;
    priority?: string;
    dueDate?: string;
    notes?: string;
  }): Promise<AIToolResult> {
    const { task, ambiguity } = await this.resolveTask(args.taskId);
    if (ambiguity) return { success: false, ambiguityPrompt: ambiguity, error: ambiguity };
    if (!task) return { success: false, error: 'Task not found.' };

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (args.title !== undefined) updates.title = args.title.trim();
    if (args.description !== undefined) updates.description = args.description.trim();
    if (args.priority !== undefined) updates.priority = this.normalizePriority(args.priority);
    if (args.dueDate !== undefined) updates.due_date = this.normalizeDate(args.dueDate);

    const { error: updateError } = await this.supabase
      .from('tasks')
      .update(updates)
      .eq('id', task.id);

    if (updateError) throw updateError;

    if (args.notes !== undefined) {
      await this.supabase.from('notes').upsert(
        {
          task_id: task.id,
          content: args.notes.trim(),
          updated_by: this.context.userId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'task_id' }
      );
    }

    await this.supabase.from('activity_logs').insert({
      task_id: task.id,
      workspace_id: task.workspace_id,
      user_id: this.context.userId,
      action: 'updated',
      details: `${this.context.userName} updated task "${task.title}" via AI Assistant`,
    });

    return {
      success: true,
      message: `Updated task "${task.title}".`,
      data: { id: task.id, title: updates.title || task.title },
    };
  }

  private async assignTask(args: { taskId: string; assigneeName: string }): Promise<AIToolResult> {
    const { task, ambiguity: taskAmbiguity } = await this.resolveTask(args.taskId);
    if (taskAmbiguity) return { success: false, ambiguityPrompt: taskAmbiguity, error: taskAmbiguity };
    if (!task) return { success: false, error: 'Task not found.' };

    const { user, ambiguity: userAmbiguity } = await this.resolveMember(args.assigneeName);
    if (userAmbiguity) return { success: false, ambiguityPrompt: userAmbiguity, error: userAmbiguity };
    if (!user) return { success: false, error: `Team member "${args.assigneeName}" could not be found in this workspace.` };

    const { error } = await this.supabase
      .from('tasks')
      .update({ assignee_id: user.id, updated_at: new Date().toISOString() })
      .eq('id', task.id);

    if (error) throw error;

    await this.supabase.from('activity_logs').insert({
      task_id: task.id,
      workspace_id: task.workspace_id,
      user_id: this.context.userId,
      action: 'assigned',
      details: `${this.context.userName} assigned "${task.title}" to ${user.name}`,
    });

    if (user.id !== this.context.userId) {
      await this.supabase.from('notifications').insert({
        user_id: user.id,
        actor_id: this.context.userId,
        task_id: task.id,
        type: 'assigned',
        title: 'Task assigned to you',
        message: `${this.context.userName} assigned "${task.title}" to you.`,
        read: false,
      });
    }

    return {
      success: true,
      message: `Assigned task "${task.title}" to ${user.name}.`,
      data: { taskId: task.id, taskTitle: task.title, assigneeName: user.name },
    };
  }

  private async moveTask(args: { taskId: string; status: string }): Promise<AIToolResult> {
    const { task, ambiguity } = await this.resolveTask(args.taskId);
    if (ambiguity) return { success: false, ambiguityPrompt: ambiguity, error: ambiguity };
    if (!task) return { success: false, error: 'Task not found.' };

    const targetStatus = this.normalizeStatus(args.status);
    const statusLabels: Record<string, string> = {
      todo: 'Todo',
      in_progress: 'In Progress',
      review: 'Review',
      done: 'Done',
    };

    const { error } = await this.supabase
      .from('tasks')
      .update({ status: targetStatus, updated_at: new Date().toISOString() })
      .eq('id', task.id);

    if (error) throw error;

    await this.supabase.from('activity_logs').insert({
      task_id: task.id,
      workspace_id: task.workspace_id,
      user_id: this.context.userId,
      action: 'status_changed',
      details: `${this.context.userName} moved "${task.title}" to ${statusLabels[targetStatus]}`,
    });

    if (task.assignee_id && task.assignee_id !== this.context.userId) {
      await this.supabase.from('notifications').insert({
        user_id: task.assignee_id,
        actor_id: this.context.userId,
        task_id: task.id,
        type: 'status_update',
        title: 'Task status updated',
        message: `${this.context.userName} changed status of "${task.title}" to ${statusLabels[targetStatus]}.`,
        read: false,
      });
    }

    return {
      success: true,
      message: `Moved "${task.title}" to ${statusLabels[targetStatus]}.`,
      data: { taskId: task.id, taskTitle: task.title, status: targetStatus },
    };
  }

  private async completeTask(args: { taskId: string }): Promise<AIToolResult> {
    return this.moveTask({ taskId: args.taskId, status: 'done' });
  }

  private async addComment(args: { taskId: string; content: string }): Promise<AIToolResult> {
    if (!args.content || !args.content.trim()) {
      return { success: false, error: 'Comment content cannot be empty.' };
    }

    const { task, ambiguity } = await this.resolveTask(args.taskId);
    if (ambiguity) return { success: false, ambiguityPrompt: ambiguity, error: ambiguity };
    if (!task) return { success: false, error: 'Task not found.' };

    const { error } = await this.supabase.from('comments').insert({
      task_id: task.id,
      user_id: this.context.userId,
      content: args.content.trim(),
    });

    if (error) throw error;

    await this.supabase.from('activity_logs').insert({
      task_id: task.id,
      workspace_id: task.workspace_id,
      user_id: this.context.userId,
      action: 'commented',
      details: `${this.context.userName} commented on "${task.title}"`,
    });

    if (task.assignee_id && task.assignee_id !== this.context.userId) {
      await this.supabase.from('notifications').insert({
        user_id: task.assignee_id,
        actor_id: this.context.userId,
        task_id: task.id,
        type: 'comment',
        title: `New comment on ${task.title}`,
        message: `${this.context.userName}: "${args.content.slice(0, 80)}"`,
        read: false,
      });
    }

    return {
      success: true,
      message: `Posted comment to task "${task.title}".`,
      data: { taskId: task.id, taskTitle: task.title, comment: args.content.trim() },
    };
  }

  private async addNote(args: { taskId: string; note: string; append?: boolean }): Promise<AIToolResult> {
    if (!args.note || !args.note.trim()) {
      return { success: false, error: 'Note text cannot be empty.' };
    }

    const { task, ambiguity } = await this.resolveTask(args.taskId);
    if (ambiguity) return { success: false, ambiguityPrompt: ambiguity, error: ambiguity };
    if (!task) return { success: false, error: 'Task not found.' };

    const existingContent = (task.notes && task.notes.length > 0 ? task.notes[0].content : '') || '';
    const newContent = args.append && existingContent
      ? `${existingContent}\n\n• ${args.note.trim()}`
      : args.note.trim();

    const { error } = await this.supabase.from('notes').upsert(
      {
        task_id: task.id,
        content: newContent,
        updated_by: this.context.userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'task_id' }
    );

    if (error) throw error;

    await this.supabase.from('activity_logs').insert({
      task_id: task.id,
      workspace_id: task.workspace_id,
      user_id: this.context.userId,
      action: 'updated',
      details: `${this.context.userName} added a note to "${task.title}"`,
    });

    return {
      success: true,
      message: `Added note to task "${task.title}".`,
      data: { taskId: task.id, taskTitle: task.title, note: newContent },
    };
  }

  private async createSuggestion(args: { taskId: string; content: string }): Promise<AIToolResult> {
    if (!args.content || !args.content.trim()) {
      return { success: false, error: 'Suggestion content cannot be empty.' };
    }

    const { task, ambiguity } = await this.resolveTask(args.taskId);
    if (ambiguity) return { success: false, ambiguityPrompt: ambiguity, error: ambiguity };
    if (!task) return { success: false, error: 'Task not found.' };

    const { error } = await this.supabase.from('suggestions').insert({
      task_id: task.id,
      user_id: this.context.userId,
      content: args.content.trim(),
      status: 'open',
    });

    if (error) throw error;

    await this.supabase.from('activity_logs').insert({
      task_id: task.id,
      workspace_id: task.workspace_id,
      user_id: this.context.userId,
      action: 'suggestion_added',
      details: `${this.context.userName} submitted a suggestion on "${task.title}"`,
    });

    if (task.assignee_id && task.assignee_id !== this.context.userId) {
      await this.supabase.from('notifications').insert({
        user_id: task.assignee_id,
        actor_id: this.context.userId,
        task_id: task.id,
        type: 'suggestion',
        title: `New suggestion on ${task.title}`,
        message: `${this.context.userName} suggested: "${args.content.slice(0, 80)}"`,
        read: false,
      });
    }

    return {
      success: true,
      message: `Submitted suggestion on task "${task.title}".`,
      data: { taskId: task.id, taskTitle: task.title, suggestion: args.content.trim() },
    };
  }
}
