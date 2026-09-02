import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';
import {
  AIProvider,
  AIChatMessage,
  AIRequestContext,
  AITaskContext,
  AIToolDefinition,
  AIToolResult,
} from './types';

export class GeminiProvider implements AIProvider {
  public readonly name = 'Google Gemini';
  public readonly defaultModel = 'gemini-2.5-flash';
  private aiClient: GoogleGenAI | null = null;

  private getClient(): GoogleGenAI {
    if (!this.aiClient) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || !apiKey.trim()) {
        throw new Error('GEMINI_API_KEY environment variable is not configured.');
      }
      this.aiClient = new GoogleGenAI({ apiKey });
    }
    return this.aiClient;
  }

  public async isAvailable(): Promise<boolean> {
    const key = process.env.GEMINI_API_KEY;
    return Boolean(key && key.trim().length > 0);
  }

  /**
   * Convert controlled tool definitions to GoogleGenAI FunctionDeclarations
   */
  private mapToolsToGeminiDeclarations(tools: AIToolDefinition[]): FunctionDeclaration[] {
    const mapType = (t: string) => {
      switch (t.toLowerCase()) {
        case 'string':
          return Type.STRING;
        case 'number':
        case 'integer':
          return Type.NUMBER;
        case 'boolean':
          return Type.BOOLEAN;
        case 'array':
          return Type.ARRAY;
        case 'object':
        default:
          return Type.OBJECT;
      }
    };

    return tools.map((tool) => {
      const properties: Record<string, any> = {};
      const requiredProps: string[] = tool.parameters.required || [];

      for (const [propName, propDef] of Object.entries(tool.parameters.properties)) {
        if (propDef.type === 'array') {
          properties[propName] = {
            type: Type.ARRAY,
            description: propDef.description,
            items: {
              type: propDef.items?.type ? mapType(propDef.items.type) : Type.STRING,
            },
          };
        } else {
          properties[propName] = {
            type: mapType(propDef.type || 'string'),
            description: propDef.description,
          };
        }
      }

      return {
        name: tool.name,
        description: tool.description,
        parameters: {
          type: Type.OBJECT,
          properties,
          required: requiredProps.length > 0 ? requiredProps : undefined,
        },
      };
    });
  }

  /**
   * Process Natural Language Chat with Tool Calling Loop
   */
  public async generateChatResponse(
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
  }> {
    const ai = this.getClient();
    const toolDeclarations = this.mapToolsToGeminiDeclarations(tools);

    // Build rich system instruction with security guardrails and user context
    const systemInstruction = `You are the intelligent Team Task Tracker Assistant for "${context.workspaceName}".
Authenticated User:
- Name: ${context.userName} (ID: ${context.userId})
- Email: ${context.userEmail}
- Role: ${context.userRole}
Current Date: ${context.currentDate} (${context.currentTime})

GUIDELINES & BEHAVIOR:
1. You assist team members in managing tasks, tracking workloads, prioritizing overdue items, and collaborating naturally.
2. You have access to controlled tools to view, search, create, assign, move, comment, and note tasks.
3. Always invoke the appropriate tool when the user asks a question about tasks or requests a task modification.
4. When a user asks "What should I work on today?" or "Show my tasks", call "get_my_tasks" or "get_overdue_tasks".
5. When a user asks to create or modify tasks (e.g. "Create a task for Arun to finish the homepage tomorrow"), resolve relative dates based on current date (${context.currentDate}) and invoke the "create_task" tool.
6. If an ambiguous name or task is encountered, ask the user politely for clarification.
7. Maintain a friendly, concise, and professional tone. Highlight actions performed clearly.
${taskContext ? `\nCURRENTLY SELECTED TASK CONTEXT:\n- Title: "${taskContext.title}" (ID: ${taskContext.id})\n- Status: ${taskContext.status}, Priority: ${taskContext.priority}\n- Assignee: ${taskContext.assigneeName || 'Unassigned'}\n- Description: ${taskContext.description || 'None'}\n- Notes: ${taskContext.notes || 'None'}` : ''}`;

    // Convert past messages to Gemini content parts
    const contents: any[] = [];

    for (const msg of messages) {
      if (msg.role === 'user') {
        contents.push({
          role: 'user',
          parts: [{ text: msg.content }],
        });
      } else if (msg.role === 'assistant') {
        contents.push({
          role: 'model',
          parts: [{ text: msg.content }],
        });
      }
    }

    const toolInvocations: {
      name: string;
      args: Record<string, any>;
      result: AIToolResult;
    }[] = [];

    let loopCount = 0;
    const MAX_TOOL_LOOPS = 5;
    let finalContent = '';
    let structuredData: AIChatMessage['structuredData'] | undefined = undefined;

    while (loopCount < MAX_TOOL_LOOPS) {
      loopCount++;

      const response = await ai.models.generateContent({
        model: this.defaultModel,
        contents,
        config: {
          systemInstruction,
          temperature: 0.2,
          tools: [{ functionDeclarations: toolDeclarations }],
        },
      });

      const functionCalls = response.functionCalls;

      if (!functionCalls || functionCalls.length === 0) {
        // Model provided its final textual answer
        finalContent = response.text || '';
        break;
      }

      // Execute returned function calls
      const modelParts: any[] = response.candidates?.[0]?.content?.parts || [];
      contents.push({
        role: 'model',
        parts: modelParts,
      });

      const toolResponseParts: any[] = [];

      for (const call of functionCalls) {
        const callName = call.name;
        const callArgs = (call.args as Record<string, any>) || {};

        const result = await executeTool(callName, callArgs);
        toolInvocations.push({
          name: callName,
          args: callArgs,
          result,
        });

        toolResponseParts.push({
          functionResponse: {
            name: callName,
            response: {
              output: result,
            },
          },
        });
      }

      contents.push({
        role: 'user',
        parts: toolResponseParts,
      });
    }

    if (!finalContent && toolInvocations.length > 0) {
      const summaryParts = toolInvocations.map((inv) => {
        if (inv.result.success) {
          return inv.result.message || `Successfully executed ${inv.name}.`;
        } else {
          return inv.result.error || `Failed to execute ${inv.name}.`;
        }
      });
      finalContent = summaryParts.join('\n');
    }

    return {
      content: finalContent,
      toolInvocations,
      structuredData,
    };
  }

  /**
   * Dedicated Task Details AI Help (Summary, Next Steps, Blockers, Checklist Generator, etc.)
   */
  public async generateTaskHelp(
    action: 'summarize' | 'next_steps' | 'blockers' | 'improve_description' | 'generate_checklist' | 'suggest_teammate' | 'summarize_comments',
    task: AITaskContext,
    context: AIRequestContext,
    customInstruction?: string
  ): Promise<{
    title: string;
    content: string;
    structuredItems?: string[];
    suggestedPayload?: Record<string, any>;
  }> {
    const ai = this.getClient();

    const taskDataBlock = `
TASK INFORMATION:
- ID: ${task.id}
- Title: ${task.title}
- Description: ${task.description || 'No description provided.'}
- Status: ${task.status}
- Priority: ${task.priority}
- Due Date: ${task.dueDate || 'None'}
- Assignee: ${task.assigneeName || 'Unassigned'}
- Creator: ${task.creatorName || 'Unknown'}
- Notes: ${task.notes || 'None'}
- Labels: ${(task.labels || []).join(', ') || 'None'}
- Subtasks (${(task.subtasks || []).length}): ${(task.subtasks || []).map((s) => `[${s.completed ? 'X' : ' '}] ${s.title}`).join('; ') || 'None'}
- Recent Comments: ${(task.comments || []).slice(-5).map((c) => `${c.userName}: "${c.content}"`).join(' | ') || 'No comments'}
- Suggestions: ${(task.suggestions || []).map((s) => `${s.userName} (${s.status}): "${s.content}"`).join(' | ') || 'None'}
`;

    let prompt = '';
    let responseMimeType: string | undefined = undefined;
    let title = '';

    switch (action) {
      case 'summarize':
        title = 'Task Summary & Current State';
        prompt = `Provide an executive, highly concise 2-paragraph summary of this task, its current status, who is working on it, and any outstanding notes or comments.\n\n${taskDataBlock}`;
        break;

      case 'next_steps':
        title = 'Recommended Next Steps';
        prompt = `Analyze this task and identify 3-5 concrete, actionable next steps for the assignee to move it towards completion. Return as clear bullet points.\n\n${taskDataBlock}`;
        break;

      case 'blockers':
        title = 'Risk & Blocker Analysis';
        prompt = `Analyze this task for potential blockers, dependencies, risks, or overdue milestones based on its details, notes, and comments. Offer proactive mitigations.\n\n${taskDataBlock}`;
        break;

      case 'improve_description':
        title = 'Polished Task Description';
        prompt = `Rewrite and enhance the description of this task into a clean, professional, well-structured format (including Overview, Key Deliverables, and Acceptance Criteria) that team members can immediately understand and execute against.\n\n${taskDataBlock}`;
        break;

      case 'generate_checklist':
        title = 'AI Checklist Generator';
        prompt = `Break down this task into 4 to 8 clear, sequential subtask checklist items that can be checked off by the assignee. Return your response as a JSON array of strings: ["First subtask title", "Second subtask title", ...].\n\n${taskDataBlock}`;
        responseMimeType = 'application/json';
        break;

      case 'suggest_teammate':
        title = 'Teammate & Ownership Suggestion';
        prompt = `Based on the task labels, domain requirements, and context, recommend what skill sets or team members would be best suited to own or review this task.\n\n${taskDataBlock}`;
        break;

      case 'summarize_comments':
        title = 'Discussion & Feedback Synthesis';
        prompt = `Synthesize all discussion comments and suggestions into key agreements, feedback points, and outstanding questions.\n\n${taskDataBlock}`;
        break;
    }

    if (customInstruction) {
      prompt += `\n\nAdditional User Request: ${customInstruction}`;
    }

    const response = await ai.models.generateContent({
      model: this.defaultModel,
      contents: prompt,
      config: {
        systemInstruction: `You are an expert agile product manager and engineering lead assistant helping a team coordinate tasks on Team Task Tracker. Provide direct, high-value, crisp advice.`,
        temperature: 0.2,
        responseMimeType,
      },
    });

    const rawText = response.text || '';

    if (action === 'generate_checklist') {
      try {
        const parsed = JSON.parse(rawText);
        const items = Array.isArray(parsed) ? parsed : parsed.items || parsed.checklist || [];
        return {
          title,
          content: `Generated ${items.length} actionable checklist items tailored to "${task.title}".`,
          structuredItems: items.map((i: any) => (typeof i === 'string' ? i : i.title || String(i))),
          suggestedPayload: { checklist: items },
        };
      } catch {
        const lines = rawText
          .split('\n')
          .map((l) => l.replace(/^[-*0-9.)\s]+/, '').trim())
          .filter((l) => l.length > 0);
        return {
          title,
          content: `Generated ${lines.length} checklist items.`,
          structuredItems: lines,
          suggestedPayload: { checklist: lines },
        };
      }
    }

    if (action === 'improve_description') {
      return {
        title,
        content: rawText,
        suggestedPayload: { description: rawText },
      };
    }

    return {
      title,
      content: rawText,
    };
  }
}
