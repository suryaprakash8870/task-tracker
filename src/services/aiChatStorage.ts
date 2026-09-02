import { AIChatMessage } from '../types';

export interface AIChatThread {
  id: string;
  title: string;
  messages: AIChatMessage[];
  createdAt: string;
  updatedAt: string;
  taskContextId?: string;
  taskContextTitle?: string;
}

const THREADS_STORAGE_KEY = 'ttt_ai_chat_threads_v1';
const ACTIVE_THREAD_KEY = 'ttt_ai_active_thread_id_v1';

class AIChatStorage {
  private listeners: Set<(threads: AIChatThread[]) => void> = new Set();

  public getThreads(): AIChatThread[] {
    try {
      const raw = localStorage.getItem(THREADS_STORAGE_KEY);
      if (raw) {
        const parsed: AIChatThread[] = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        }
      }
    } catch (e) {
      console.warn('Failed to load AI chat threads:', e);
    }

    // Default thread
    const defaultThread = this.createDefaultThread();
    this.saveThreads([defaultThread]);
    return [defaultThread];
  }

  private createDefaultThread(userName: string = 'Team Member'): AIChatThread {
    const now = new Date().toISOString();
    return {
      id: `thread-${Date.now()}`,
      title: 'Workspace Assistant',
      createdAt: now,
      updatedAt: now,
      messages: [
        {
          id: 'msg-welcome',
          role: 'assistant',
          content: `Hello! I'm your Gemini-powered Team Task Assistant. I can help you search, create, prioritize, assign, and organize tasks across your workspace using controlled tools. How can I help you today?`,
          timestamp: now,
        },
      ],
    };
  }

  public getActiveThreadId(): string {
    const saved = localStorage.getItem(ACTIVE_THREAD_KEY);
    const threads = this.getThreads();
    if (saved && threads.some((t) => t.id === saved)) {
      return saved;
    }
    const fallbackId = threads[0]?.id || '';
    if (fallbackId) {
      localStorage.setItem(ACTIVE_THREAD_KEY, fallbackId);
    }
    return fallbackId;
  }

  public setActiveThreadId(id: string) {
    localStorage.setItem(ACTIVE_THREAD_KEY, id);
  }

  public saveThreads(threads: AIChatThread[]) {
    try {
      localStorage.setItem(THREADS_STORAGE_KEY, JSON.stringify(threads));
      this.notify(threads);
    } catch (e) {
      console.warn('Failed to save AI threads:', e);
    }
  }

  public saveThread(thread: AIChatThread): AIChatThread[] {
    const threads = this.getThreads();
    const existingIndex = threads.findIndex((t) => t.id === thread.id);
    let updatedThreads: AIChatThread[];

    const updatedThread: AIChatThread = {
      ...thread,
      updatedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      updatedThreads = [...threads];
      updatedThreads[existingIndex] = updatedThread;
    } else {
      updatedThreads = [updatedThread, ...threads];
    }

    this.saveThreads(updatedThreads);
    return updatedThreads;
  }

  public createNewThread(userName: string = 'Team Member', initialTitle?: string): AIChatThread {
    const now = new Date().toISOString();
    const newThread: AIChatThread = {
      id: `thread-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: initialTitle || 'New Conversation',
      createdAt: now,
      updatedAt: now,
      messages: [
        {
          id: `msg-welcome-${Date.now()}`,
          role: 'assistant',
          content: `Hi ${userName}! Starting a fresh chat session. Ask me anything about your tasks, sprint planning, or team workloads.`,
          timestamp: now,
        },
      ],
    };

    const threads = [newThread, ...this.getThreads()];
    this.saveThreads(threads);
    this.setActiveThreadId(newThread.id);
    return newThread;
  }

  public deleteThread(threadId: string): AIChatThread[] {
    const threads = this.getThreads().filter((t) => t.id !== threadId);
    if (threads.length === 0) {
      const defaultThread = this.createDefaultThread();
      threads.push(defaultThread);
    }
    this.saveThreads(threads);
    if (this.getActiveThreadId() === threadId) {
      this.setActiveThreadId(threads[0].id);
    }
    return threads;
  }

  public renameThread(threadId: string, newTitle: string): AIChatThread[] {
    const threads = this.getThreads().map((t) => {
      if (t.id === threadId) {
        return { ...t, title: newTitle.trim() || t.title, updatedAt: new Date().toISOString() };
      }
      return t;
    });
    this.saveThreads(threads);
    return threads;
  }

  public clearAll(): AIChatThread[] {
    const defaultThread = this.createDefaultThread();
    this.saveThreads([defaultThread]);
    this.setActiveThreadId(defaultThread.id);
    return [defaultThread];
  }

  public subscribe(callback: (threads: AIChatThread[]) => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notify(threads: AIChatThread[]) {
    this.listeners.forEach((cb) => {
      try {
        cb(threads);
      } catch (err) {
        console.error('Chat storage listener error:', err);
      }
    });
  }
}

export const aiChatStorage = new AIChatStorage();
