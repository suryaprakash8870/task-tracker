import { supabase, isSupabaseConfigured } from './supabaseClient';
import { User, Workspace, Task, AIChatMessage, AITaskHelpAction, AIUsageSummary } from '../types';

export class AIClient {
  private async getAuthHeader(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (isSupabaseConfigured()) {
      try {
        const { data } = await supabase.auth.getSession();
        if (data?.session?.access_token) {
          headers['Authorization'] = `Bearer ${data.session.access_token}`;
        }
      } catch (err) {
        console.warn('Could not retrieve Supabase session token:', err);
      }
    }

    return headers;
  }

  public async getStatus(): Promise<AIUsageSummary> {
    try {
      const headers = await this.getAuthHeader();
      const res = await fetch('/api/ai/status', { method: 'GET', headers });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      return await res.json();
    } catch (err: unknown) {
      console.warn('AI status check failed:', err);
      return {
        provider: 'Google Gemini',
        model: 'gemini-2.5-flash',
        status: 'unavailable',
        statusMessage: 'AI service endpoint unreachable or server restarting.',
        totalRequests: 0,
        todayRequests: 0,
        successfulRequests: 0,
        lastUsedAt: null,
        supportedToolsCount: 14,
      };
    }
  }

  public async sendChatMessage(params: {
    messages: AIChatMessage[];
    currentUser: User;
    workspace: Workspace | null;
    selectedTask?: Task | null;
  }): Promise<{
    message: AIChatMessage;
    toolInvocations?: any[];
  }> {
    const headers = await this.getAuthHeader();

    const payload = {
      messages: params.messages,
      userContext: {
        userId: params.currentUser.id,
        userName: params.currentUser.name,
        userEmail: params.currentUser.email,
        userRole: params.currentUser.role,
        workspaceId: params.workspace?.id || 'default-workspace',
        workspaceName: params.workspace?.name || 'Team Workspace',
      },
      taskContext: params.selectedTask
        ? {
            id: params.selectedTask.id,
            title: params.selectedTask.title,
            description: params.selectedTask.description,
            status: params.selectedTask.status,
            priority: params.selectedTask.priority,
            dueDate: params.selectedTask.dueDate,
            notes: params.selectedTask.notes,
            labels: params.selectedTask.labels.map((l) => l.name),
            subtasks: params.selectedTask.subtasks.map((s) => ({ title: s.title, completed: s.completed })),
          }
        : undefined,
    };

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP ${res.status}`);
      }

      return await res.json();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('AI chat client error:', msg);
      return {
        message: {
          id: `ai-err-${Date.now()}`,
          role: 'assistant',
          content: 'AI is temporarily unavailable. You can continue managing tasks manually.',
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  public async getTaskHelp(params: {
    action: AITaskHelpAction;
    task: Task;
    currentUser: User;
    workspace: Workspace | null;
    customInstruction?: string;
  }): Promise<{
    title: string;
    content: string;
    structuredItems?: string[];
    suggestedPayload?: Record<string, any>;
  }> {
    const headers = await this.getAuthHeader();

    const payload = {
      action: params.action,
      task: {
        id: params.task.id,
        title: params.task.title,
        description: params.task.description,
        status: params.task.status,
        priority: params.task.priority,
        dueDate: params.task.dueDate,
        notes: params.task.notes,
        labels: params.task.labels.map((l) => l.name),
        subtasks: params.task.subtasks.map((s) => ({ title: s.title, completed: s.completed })),
        comments: params.task.comments.map((c) => ({
          userName: c.userId,
          content: c.content,
          createdAt: c.createdAt,
        })),
        suggestions: params.task.suggestions.map((s) => ({
          userName: s.userId,
          content: s.content,
          status: s.status,
        })),
      },
      userContext: {
        userId: params.currentUser.id,
        userName: params.currentUser.name,
        userEmail: params.currentUser.email,
        userRole: params.currentUser.role,
        workspaceId: params.workspace?.id || 'default-workspace',
        workspaceName: params.workspace?.name || 'Team Workspace',
      },
      customInstruction: params.customInstruction,
    };

    const res = await fetch('/api/ai/task-help', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || `Failed to generate AI assistance (HTTP ${res.status})`);
    }

    return await res.json();
  }
}

export const aiClient = new AIClient();
