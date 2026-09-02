import { SupabaseClient } from '@supabase/supabase-js';
import {
  AIProvider,
  AIChatMessage,
  AIRequestContext,
  AITaskContext,
  AIUsageRecord,
  AIUsageSummary,
} from './types';
import { GeminiProvider } from './geminiProvider';
import { CONTROLLED_AI_TOOLS, AIToolExecutor } from './tools';

export class AIService {
  private provider: AIProvider;
  private usageHistory: AIUsageRecord[] = [];

  constructor(provider?: AIProvider) {
    this.provider = provider || new GeminiProvider();
  }

  public setProvider(provider: AIProvider) {
    this.provider = provider;
  }

  public getProvider(): AIProvider {
    return this.provider;
  }

  private recordUsage(record: AIUsageRecord) {
    this.usageHistory.push(record);
    // Keep max 500 records in memory
    if (this.usageHistory.length > 500) {
      this.usageHistory.shift();
    }
  }

  public async getUsageSummary(): Promise<AIUsageSummary> {
    const isAvailable = await this.provider.isAvailable();
    const today = new Date().toISOString().split('T')[0];

    const todayRecords = this.usageHistory.filter((r) => r.timestamp.startsWith(today));
    const successful = this.usageHistory.filter((r) => r.status === 'success');
    const lastRecord = this.usageHistory[this.usageHistory.length - 1];

    let status: 'available' | 'limited' | 'unavailable' = 'available';
    let statusMessage = 'Google Gemini 2.5 is online and ready for team collaboration.';

    if (!isAvailable) {
      status = 'unavailable';
      statusMessage = 'GEMINI_API_KEY is not configured in the server environment. Core task tracker functions remain 100% active.';
    } else if (todayRecords.some((r) => r.status === 'quota_exceeded')) {
      status = 'limited';
      statusMessage = 'Recent requests encountered rate limits or quota boundaries. Temporary cool-down active.';
    }

    return {
      provider: this.provider.name,
      model: this.provider.defaultModel,
      status,
      statusMessage,
      totalRequests: this.usageHistory.length,
      todayRequests: todayRecords.length,
      successfulRequests: successful.length,
      lastUsedAt: lastRecord ? lastRecord.timestamp : null,
      supportedToolsCount: CONTROLLED_AI_TOOLS.length,
    };
  }

  /**
   * Process Natural Language Assistant Turn
   */
  public async handleChatTurn(params: {
    messages: AIChatMessage[];
    context: AIRequestContext;
    taskContext?: AITaskContext;
    supabase: SupabaseClient;
  }): Promise<{
    message: AIChatMessage;
    toolInvocations?: any[];
  }> {
    const timestamp = new Date().toISOString();
    const executor = new AIToolExecutor(params.supabase, params.context);

    try {
      const response = await this.provider.generateChatResponse(
        params.messages,
        params.context,
        CONTROLLED_AI_TOOLS,
        async (name, args) => executor.execute(name, args),
        params.taskContext
      );

      this.recordUsage({
        timestamp,
        userId: params.context.userId,
        workspaceId: params.context.workspaceId,
        provider: this.provider.name,
        model: this.provider.defaultModel,
        status: 'success',
        actionType: 'chat',
        tokensEstimated: 350,
      });

      const assistantMessage: AIChatMessage = {
        id: `ai-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        role: 'assistant',
        content: response.content,
        timestamp,
        toolCalls: response.toolInvocations.map((inv) => ({
          name: inv.name,
          args: inv.args,
          result: inv.result,
          status: inv.result.success ? 'success' : inv.result.ambiguityPrompt ? 'ambiguous' : 'error',
        })),
        structuredData: response.structuredData,
      };

      return {
        message: assistantMessage,
        toolInvocations: response.toolInvocations,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      const isQuota = errorMsg.toLowerCase().includes('quota') || errorMsg.toLowerCase().includes('resource_exhausted') || errorMsg.includes('429');

      this.recordUsage({
        timestamp,
        userId: params.context.userId,
        workspaceId: params.context.workspaceId,
        provider: this.provider.name,
        model: this.provider.defaultModel,
        status: isQuota ? 'quota_exceeded' : 'error',
        actionType: 'chat',
        errorType: errorMsg,
      });

      let userFacingError = 'AI is temporarily unavailable. You can continue managing tasks manually.';
      if (errorMsg.includes('GEMINI_API_KEY')) {
        userFacingError = 'AI key is not configured on the server. The application continues running in standard mode.';
      } else if (isQuota) {
        userFacingError = 'AI quota limit reached. Please try again shortly or continue managing tasks manually.';
      }

      return {
        message: {
          id: `ai-err-${Date.now()}`,
          role: 'assistant',
          content: userFacingError,
          timestamp,
        },
      };
    }
  }

  /**
   * Process Task Contextual AI Actions (Summary, Checklist, Next Steps, Blockers, etc.)
   */
  public async handleTaskHelp(params: {
    action: 'summarize' | 'next_steps' | 'blockers' | 'improve_description' | 'generate_checklist' | 'suggest_teammate' | 'summarize_comments';
    task: AITaskContext;
    context: AIRequestContext;
    customInstruction?: string;
  }): Promise<{
    title: string;
    content: string;
    structuredItems?: string[];
    suggestedPayload?: Record<string, any>;
  }> {
    const timestamp = new Date().toISOString();

    try {
      const result = await this.provider.generateTaskHelp(
        params.action,
        params.task,
        params.context,
        params.customInstruction
      );

      this.recordUsage({
        timestamp,
        userId: params.context.userId,
        workspaceId: params.context.workspaceId,
        provider: this.provider.name,
        model: this.provider.defaultModel,
        status: 'success',
        actionType: params.action === 'generate_checklist' ? 'checklist_gen' : 'task_help',
        tokensEstimated: 250,
      });

      return result;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      const isQuota = errorMsg.toLowerCase().includes('quota') || errorMsg.includes('429');

      this.recordUsage({
        timestamp,
        userId: params.context.userId,
        workspaceId: params.context.workspaceId,
        provider: this.provider.name,
        model: this.provider.defaultModel,
        status: isQuota ? 'quota_exceeded' : 'error',
        actionType: 'task_help',
        errorType: errorMsg,
      });

      if (errorMsg.includes('GEMINI_API_KEY')) {
        throw new Error('GEMINI_API_KEY is not configured on the server.');
      } else if (isQuota) {
        throw new Error('AI rate limit reached. Please try again in a few moments.');
      } else {
        throw new Error(`AI Help failed: ${errorMsg}`);
      }
    }
  }
}

export const aiService = new AIService();
