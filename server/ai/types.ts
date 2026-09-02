export interface AIRequestContext {
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  workspaceId: string;
  workspaceName: string;
  currentDate: string; // YYYY-MM-DD
  currentTime: string; // ISO string
}

export interface AITaskContext {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assigneeName?: string;
  assigneeId?: string;
  creatorName?: string;
  dueDate?: string;
  notes?: string;
  labels?: string[];
  subtasks?: { title: string; completed: boolean }[];
  comments?: { userName: string; content: string; createdAt: string }[];
  suggestions?: { userName: string; content: string; status: string }[];
}

export interface AIChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  toolCalls?: {
    name: string;
    args: Record<string, any>;
    result?: Record<string, any>;
    status: 'success' | 'error' | 'ambiguous';
  }[];
  structuredData?: {
    type: 'checklist' | 'summary' | 'task_preview' | 'suggestion';
    items?: string[];
    details?: Record<string, any>;
  };
}

export interface AIToolResult {
  success: boolean;
  message?: string;
  data?: any;
  ambiguityPrompt?: string;
  error?: string;
}

export interface AIToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface AIUsageRecord {
  timestamp: string;
  userId: string;
  workspaceId: string;
  provider: string;
  model: string;
  status: 'success' | 'error' | 'quota_exceeded' | 'unavailable';
  tokensEstimated?: number;
  actionType: 'chat' | 'task_help' | 'checklist_gen';
  errorType?: string;
}

export interface AIUsageSummary {
  provider: string;
  model: string;
  status: 'available' | 'limited' | 'unavailable';
  statusMessage: string;
  totalRequests: number;
  todayRequests: number;
  successfulRequests: number;
  lastUsedAt: string | null;
  supportedToolsCount: number;
}

export interface AIProvider {
  readonly name: string;
  readonly defaultModel: string;
  isAvailable(): Promise<boolean>;
  generateChatResponse(
    messages: AIChatMessage[],
    context: AIRequestContext,
    tools: AIToolDefinition[],
    executeTool: (name: string, args: Record<string, any>) => Promise<AIToolResult>,
    taskContext?: AITaskContext
  ): Promise<{
    content: string;
    toolInvocations: {
      name: string;
      args: Record<string, any>;
      result: AIToolResult;
    }[];
    structuredData?: AIChatMessage['structuredData'];
  }>;
  generateTaskHelp(
    action: 'summarize' | 'next_steps' | 'blockers' | 'improve_description' | 'generate_checklist' | 'suggest_teammate' | 'summarize_comments',
    task: AITaskContext,
    context: AIRequestContext,
    customInstruction?: string
  ): Promise<{
    title: string;
    content: string;
    structuredItems?: string[];
    suggestedPayload?: Record<string, any>;
  }>;
}
