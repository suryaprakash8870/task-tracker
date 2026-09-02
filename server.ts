import express, { Request, Response } from 'express';
import path from 'path';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { aiService } from './server/ai/aiService';
import { getServerSupabaseClient } from './server/supabaseServer';
import { AIRequestContext, AIChatMessage, AITaskContext } from './server/ai/types';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ==============================================================================
// SERVER API ROUTES (FIRST)
// ==============================================================================

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// AI Usage & Provider Status
app.get('/api/ai/status', async (req: Request, res: Response) => {
  try {
    const summary = await aiService.getUsageSummary();
    res.json(summary);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

// AI Assistant Chat Turn
app.post('/api/ai/chat', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const { messages, userContext, taskContext } = req.body as {
      messages: AIChatMessage[];
      userContext?: Partial<AIRequestContext>;
      taskContext?: AITaskContext;
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'Messages array is required.' });
      return;
    }

    const supabase = getServerSupabaseClient(authHeader);

    // Build context with defaults
    const now = new Date();
    const context: AIRequestContext = {
      userId: userContext?.userId || 'user-guest',
      userName: userContext?.userName || 'Team Member',
      userEmail: userContext?.userEmail || 'member@example.com',
      userRole: userContext?.userRole || 'member',
      workspaceId: userContext?.workspaceId || 'default-workspace',
      workspaceName: userContext?.workspaceName || 'Team Workspace',
      currentDate: now.toISOString().split('T')[0],
      currentTime: now.toISOString(),
    };

    const result = await aiService.handleChatTurn({
      messages,
      context,
      taskContext,
      supabase,
    });

    res.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Chat endpoint error:', msg);
    res.status(500).json({
      error: 'AI service request failed',
      message: {
        id: `ai-err-${Date.now()}`,
        role: 'assistant',
        content: 'AI is temporarily unavailable. You can continue managing tasks manually.',
        timestamp: new Date().toISOString(),
      },
    });
  }
});

// AI Task Detail Actions (Summarize, Checklist, Next Steps, Blockers, etc.)
app.post('/api/ai/task-help', async (req: Request, res: Response) => {
  try {
    const { action, task, userContext, customInstruction } = req.body as {
      action: 'summarize' | 'next_steps' | 'blockers' | 'improve_description' | 'generate_checklist' | 'suggest_teammate' | 'summarize_comments';
      task: AITaskContext;
      userContext?: Partial<AIRequestContext>;
      customInstruction?: string;
    };

    if (!action || !task) {
      res.status(400).json({ error: 'action and task are required.' });
      return;
    }

    const now = new Date();
    const context: AIRequestContext = {
      userId: userContext?.userId || 'user-guest',
      userName: userContext?.userName || 'Team Member',
      userEmail: userContext?.userEmail || 'member@example.com',
      userRole: userContext?.userRole || 'member',
      workspaceId: userContext?.workspaceId || 'default-workspace',
      workspaceName: userContext?.workspaceName || 'Team Workspace',
      currentDate: now.toISOString().split('T')[0],
      currentTime: now.toISOString(),
    };

    const result = await aiService.handleTaskHelp({
      action,
      task,
      context,
      customInstruction,
    });

    res.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Task help endpoint error:', msg);
    res.status(500).json({ error: msg });
  }
});

// ==============================================================================
// VITE MIDDLEWARE / STATIC ASSETS
// ==============================================================================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Team Task Tracker server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
