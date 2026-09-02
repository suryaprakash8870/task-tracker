import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { aiClient } from '../../services/aiClient';
import { aiCreditService, AICreditState } from '../../services/aiCreditService';
import { aiChatStorage, AIChatThread } from '../../services/aiChatStorage';
import { analyzePromptForMissingDetails, PromptValidationAlert } from '../../services/aiPromptValidator';
import { AIMessageBubble } from './AIMessageBubble';
import { AIChatMessage, Task, AIUsageSummary } from '../../types';
import {
  Sparkles,
  Send,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  History,
  Search,
  Zap,
  Layers,
  AlertCircle,
  Clock,
  Shield,
  Bot,
  RefreshCw,
  MessageSquare,
  HelpCircle
} from 'lucide-react';

const CATEGORIZED_PROMPTS = [
  {
    category: 'Workload & Deadlines',
    prompts: [
      'What tasks are currently overdue?',
      'What should I prioritize today?',
      'Show all tasks assigned to me with upcoming deadlines',
    ],
  },
  {
    category: 'Action & Delegation',
    prompts: [
      'Create a task for Arun to finish the homepage tomorrow with high priority',
      'Move the Krafty service page task to review status',
      'Assign the video editing task to Priya due Friday',
    ],
  },
  {
    category: 'Analysis & Planning',
    prompts: [
      'Summarize current sprint progress across all columns',
      'Find any tasks that have no assignee or due date',
      'Suggest next steps for active high-priority tasks',
    ],
  },
];

export const AIAssistantView: React.FC = () => {
  const {
    currentUser,
    workspace,
    tasks,
    users,
    setSelectedTaskId,
    showToast,
  } = useApp();

  const [threads, setThreads] = useState<AIChatThread[]>([]);
  const [activeThread, setActiveThread] = useState<AIChatThread | null>(null);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTaskContext, setActiveTaskContext] = useState<Task | null>(null);
  const [showTaskSelector, setShowTaskSelector] = useState(false);
  const [taskSearchFilter, setTaskSearchFilter] = useState('');
  const [searchHistoryFilter, setSearchHistoryFilter] = useState('');
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [credits, setCredits] = useState<AICreditState>(() => aiCreditService.getCredits());
  const [aiStatus, setAiStatus] = useState<AIUsageSummary | null>(null);
  const [validationAlerts, setValidationAlerts] = useState<PromptValidationAlert[]>([]);
  const [showCreditModal, setShowCreditModal] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Subscribe to credits
  useEffect(() => {
    const unsub = aiCreditService.subscribe(setCredits);
    return unsub;
  }, []);

  // Initialize and subscribe to threads
  useEffect(() => {
    const loadedThreads = aiChatStorage.getThreads();
    setThreads(loadedThreads);
    const activeId = aiChatStorage.getActiveThreadId();
    const current = loadedThreads.find((t) => t.id === activeId) || loadedThreads[0];
    setActiveThread(current || null);

    const unsub = aiChatStorage.subscribe((updated) => {
      setThreads(updated);
      const curId = aiChatStorage.getActiveThreadId();
      setActiveThread(updated.find((t) => t.id === curId) || updated[0] || null);
    });

    aiClient.getStatus().then(setAiStatus).catch(() => {});

    return unsub;
  }, []);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeThread?.messages, isLoading]);

  // Real-time prompt validation
  useEffect(() => {
    if (inputPrompt.trim().length > 3) {
      const alerts = analyzePromptForMissingDetails(inputPrompt, users);
      setValidationAlerts(alerts);
    } else {
      setValidationAlerts([]);
    }
  }, [inputPrompt, users]);

  const handleSendMessage = async (customText?: string) => {
    const text = (customText || inputPrompt).trim();
    if (!text || isLoading || !activeThread) return;

    // Check credits
    if (credits.remaining <= 0) {
      showToast({
        type: 'warning',
        title: 'Daily AI Limit Reached',
        message: 'You have used all 50 free credits for today. Click Top Up to refill demo credits.',
      });
      setShowCreditModal(true);
      return;
    }

    const userMessage: AIChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...activeThread.messages, userMessage];

    // Update title if it's the first real question in a new conversation
    let updatedTitle = activeThread.title;
    if (activeThread.title === 'New Conversation' || activeThread.title === 'Workspace Assistant') {
      updatedTitle = text.slice(0, 32) + (text.length > 32 ? '...' : '');
    }

    const updatedThread: AIChatThread = {
      ...activeThread,
      title: updatedTitle,
      messages: updatedMessages,
      updatedAt: new Date().toISOString(),
    };

    aiChatStorage.saveThread(updatedThread);
    setActiveThread(updatedThread);
    setInputPrompt('');
    setValidationAlerts([]);
    setIsLoading(true);

    // Deduct 1 credit
    aiCreditService.useCredits(1);

    try {
      const response = await aiClient.sendChatMessage({
        messages: updatedMessages,
        currentUser,
        workspace,
        selectedTask: activeTaskContext,
      });

      const finalThread: AIChatThread = {
        ...updatedThread,
        messages: [...updatedMessages, response.message],
        updatedAt: new Date().toISOString(),
      };

      aiChatStorage.saveThread(finalThread);
      setActiveThread(finalThread);

      if (response.toolInvocations && response.toolInvocations.length > 0) {
        const successes = response.toolInvocations.filter((t) => t.result?.success);
        if (successes.length > 0) {
          showToast({
            type: 'success',
            title: 'AI Action Executed',
            message: successes[0].result?.message || 'Updated workspace tasks via AI.',
          });
        }
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'AI Assistant failed to reply';
      const errorThread: AIChatThread = {
        ...updatedThread,
        messages: [
          ...updatedMessages,
          {
            id: `ai-err-${Date.now()}`,
            role: 'assistant',
            content: `⚠️ ${errorMsg}`,
            timestamp: new Date().toISOString(),
          },
        ],
        updatedAt: new Date().toISOString(),
      };
      aiChatStorage.saveThread(errorThread);
      setActiveThread(errorThread);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    const newThread = aiChatStorage.createNewThread(currentUser.name);
    setActiveThread(newThread);
    setInputPrompt('');
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleDeleteThread = (e: React.MouseEvent, threadId: string) => {
    e.stopPropagation();
    const remaining = aiChatStorage.deleteThread(threadId);
    setThreads(remaining);
    if (activeThread?.id === threadId) {
      setActiveThread(remaining[0] || null);
    }
  };

  const handleStartRename = (e: React.MouseEvent, thread: AIChatThread) => {
    e.stopPropagation();
    setEditingThreadId(thread.id);
    setEditingTitle(thread.title);
  };

  const handleSaveRename = (threadId: string) => {
    if (editingTitle.trim()) {
      aiChatStorage.renameThread(threadId, editingTitle.trim());
    }
    setEditingThreadId(null);
  };

  const handleAppendSuggestion = (appendText: string) => {
    setInputPrompt((prev) => prev + appendText);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const filteredThreads = threads.filter((t) =>
    t.title.toLowerCase().includes(searchHistoryFilter.toLowerCase())
  );

  const filteredTasksForContext = tasks.filter(
    (t) =>
      t.title.toLowerCase().includes(taskSearchFilter.toLowerCase()) ||
      t.description.toLowerCase().includes(taskSearchFilter.toLowerCase())
  );

  return (
    <div id="ai-assistant-full-view" className="flex-1 flex h-[calc(100vh-60px)] bg-zinc-50 overflow-hidden">
      {/* Left Sidebar: Chat History & AI Credits */}
      <aside className="w-72 sm:w-80 bg-white border-r border-zinc-200/90 flex flex-col shrink-0 hidden md:flex">
        {/* New Chat Button */}
        <div className="p-3.5 border-b border-zinc-200/80 space-y-2">
          <button
            onClick={handleNewChat}
            className="w-full py-2 px-3 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-semibold shadow-2xs flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>New Conversation</span>
          </button>

          {/* Search History */}
          <div className="relative">
            <Search className="w-3 h-3 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchHistoryFilter}
              onChange={(e) => setSearchHistoryFilter(e.target.value)}
              placeholder="Search chat history..."
              className="w-full pl-7 pr-2.5 py-1 text-xs bg-zinc-100/90 border border-transparent focus:border-zinc-300 focus:bg-white rounded-md placeholder-zinc-400 focus:outline-hidden transition-all"
            />
          </div>
        </div>

        {/* Thread History List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <div className="px-2 py-1 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-zinc-400">
            <span className="flex items-center gap-1">
              <History className="w-3 h-3" />
              Chat History
            </span>
            <span>{filteredThreads.length}</span>
          </div>

          {filteredThreads.map((thread) => {
            const isActive = activeThread?.id === thread.id;
            const isEditing = editingThreadId === thread.id;

            return (
              <div
                key={thread.id}
                onClick={() => {
                  if (!isEditing) {
                    aiChatStorage.setActiveThreadId(thread.id);
                    setActiveThread(thread);
                  }
                }}
                className={`group relative px-2.5 py-2 rounded-lg text-xs transition-all flex items-center justify-between gap-1.5 cursor-pointer ${
                  isActive
                    ? 'bg-zinc-100 font-semibold text-zinc-900 shadow-2xs'
                    : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-indigo-600' : 'text-zinc-400'}`} />
                  {isEditing ? (
                    <input
                      type="text"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveRename(thread.id);
                        if (e.key === 'Escape') setEditingThreadId(null);
                      }}
                      onBlur={() => handleSaveRename(thread.id)}
                      autoFocus
                      className="w-full bg-white border border-indigo-400 px-1 py-0.5 rounded text-xs text-zinc-900 focus:outline-hidden"
                    />
                  ) : (
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs">{thread.title}</p>
                      <span className="text-[10px] text-zinc-400 font-normal">
                        {new Date(thread.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })} • {thread.messages.length} msgs
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions on hover */}
                {!isEditing && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => handleStartRename(e, thread)}
                      className="p-1 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/70 rounded transition-colors"
                      title="Rename"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    {threads.length > 1 && (
                      <button
                        onClick={(e) => handleDeleteThread(e, thread.id)}
                        className="p-1 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* AI Credits Widget at Bottom of Sidebar */}
        <div className="p-3 border-t border-zinc-200/90 bg-zinc-50/80 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-900">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>AI Credits</span>
            </div>
            <span className="font-mono text-xs font-bold text-zinc-900">
              {credits.remaining} / {credits.dailyQuota}
            </span>
          </div>

          <div className="w-full h-1.5 bg-zinc-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, (credits.remaining / credits.dailyQuota) * 100)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-0.5">
            <span>Refills daily at midnight</span>
            <button
              onClick={() => setShowCreditModal(true)}
              className="text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
            >
              Details / Top Up
            </button>
          </div>
        </div>
      </aside>

      {/* Main Gemini Chat Canvas */}
      <main className="flex-1 flex flex-col min-w-0 bg-white overflow-hidden">
        {/* Top Chat Header */}
        <header className="px-4 sm:px-6 py-3 border-b border-zinc-200/90 bg-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 via-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-2xs shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-zinc-900 truncate">
                  {activeThread?.title || 'AI Workspace Assistant'}
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-semibold border border-indigo-100 hidden sm:inline-flex items-center gap-1">
                  <Shield className="w-3 h-3 text-indigo-600" />
                  Controlled Tools
                </span>
                <span className="px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 text-[10px] font-mono font-medium border border-zinc-200 hidden sm:inline">
                  Gemini 2.5 Flash
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 truncate">
                Real-time task search, smart prioritization, automated assignment, and workload analysis
              </p>
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2">
            {/* Task Context Selector */}
            <div className="relative">
              {activeTaskContext ? (
                <div className="flex items-center gap-1.5 bg-indigo-50 text-indigo-900 text-xs px-2.5 py-1 rounded-md border border-indigo-200 font-medium">
                  <span className="truncate max-w-[130px] sm:max-w-[180px]">Task: {activeTaskContext.title}</span>
                  <button
                    onClick={() => setActiveTaskContext(null)}
                    className="text-indigo-500 hover:text-indigo-800 p-0.5 rounded cursor-pointer"
                    title="Remove context"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowTaskSelector(!showTaskSelector)}
                  className="flex items-center gap-1.5 text-xs text-zinc-700 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200/80 px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer"
                >
                  <Layers className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="hidden sm:inline">Attach Task Context</span>
                </button>
              )}

              {/* Task Selector Popover */}
              {showTaskSelector && (
                <div className="absolute right-0 top-9 w-72 sm:w-80 bg-white rounded-xl shadow-xl border border-zinc-200 p-2.5 z-50 animate-in fade-in">
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
                    <span className="text-xs font-bold text-zinc-900">Select Task Context</span>
                    <button
                      onClick={() => setShowTaskSelector(false)}
                      className="text-zinc-400 hover:text-zinc-600 p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="my-2">
                    <input
                      type="text"
                      value={taskSearchFilter}
                      onChange={(e) => setTaskSearchFilter(e.target.value)}
                      placeholder="Search tasks..."
                      className="w-full px-2.5 py-1 text-xs bg-zinc-100 border border-transparent rounded-md focus:border-zinc-300 focus:bg-white focus:outline-hidden"
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {filteredTasksForContext.slice(0, 10).map((t) => (
                      <button
                        key={t.id}
                        onClick={() => {
                          setActiveTaskContext(t);
                          setShowTaskSelector(false);
                        }}
                        className="w-full text-left p-2 rounded-md hover:bg-zinc-100 text-xs transition-colors flex items-center justify-between"
                      >
                        <span className="truncate flex-1 pr-2">{t.title}</span>
                        <span className="font-mono text-[10px] text-zinc-400 uppercase">{t.status}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Mobile History Drawer Toggle */}
            <button
              onClick={handleNewChat}
              className="p-1.5 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-md md:hidden"
              title="New Chat"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-zinc-50/50">
          {/* Welcome Screen / Prompt Starters if fresh */}
          {activeThread && activeThread.messages.length <= 1 && (
            <div className="max-w-3xl mx-auto py-6 space-y-6 animate-fade-in">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white shadow-md mx-auto">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-zinc-900 tracking-tight">
                  How can I help you today, {currentUser.name.split(' ')[0]}?
                </h3>
                <p className="text-xs text-zinc-500 max-w-md mx-auto">
                  Select a starter below or type a natural prompt to create tasks, organize sprints, or query workloads.
                </p>
              </div>

              {/* Categorized Starter Prompts Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {CATEGORIZED_PROMPTS.map((cat, idx) => (
                  <div key={idx} className="bg-white p-3.5 rounded-xl border border-zinc-200/90 shadow-2xs space-y-2.5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                      {cat.category}
                    </p>
                    <div className="space-y-1.5">
                      {cat.prompts.map((p, pIdx) => (
                        <button
                          key={pIdx}
                          onClick={() => handleSendMessage(p)}
                          className="w-full text-left p-2 rounded-lg bg-zinc-50 hover:bg-zinc-100 text-zinc-700 text-xs transition-colors line-clamp-2 cursor-pointer border border-zinc-100"
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Render Active Messages */}
          {activeThread?.messages.map((msg) => (
            <div key={msg.id} className="max-w-3xl mx-auto">
              <AIMessageBubble
                message={msg}
                currentUser={currentUser}
                onSelectTask={(taskId) => setSelectedTaskId(taskId)}
                onRetry={() => handleSendMessage(msg.content)}
              />
            </div>
          ))}

          {/* Loading Indicator with Thinking State */}
          {isLoading && (
            <div className="max-w-3xl mx-auto flex items-center gap-3 p-3 bg-white rounded-xl border border-zinc-200/90 shadow-2xs max-w-xs">
              <div className="w-5 h-5 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin shrink-0" />
              <div className="text-xs text-zinc-600">
                <p className="font-semibold text-zinc-800">Gemini is reasoning...</p>
                <p className="text-[10px] text-zinc-400">Querying workspace tasks and executing tools</p>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Missing Info Smart Validation Alert */}
        {validationAlerts.length > 0 && (
          <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 pt-2">
            <div className="p-3 bg-amber-50/95 border border-amber-200/90 rounded-xl text-amber-900 text-xs shadow-2xs">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-xs text-amber-950">
                    {validationAlerts[0].title}: <span className="font-normal text-amber-800">{validationAlerts[0].message}</span>
                  </p>
                  <div className="flex items-center flex-wrap gap-1.5 mt-2">
                    {validationAlerts[0].suggestedAppends.map((s, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleAppendSuggestion(s.appendText)}
                        className="px-2.5 py-1 bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 rounded-md text-[11px] font-medium transition-colors shadow-2xs cursor-pointer"
                      >
                        + {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Input Bar */}
        <div className="p-4 sm:p-6 bg-white border-t border-zinc-200/90 shrink-0">
          <div className="max-w-3xl mx-auto space-y-2">
            <div className="relative flex items-end gap-2 bg-zinc-100/90 rounded-xl p-2 border border-zinc-200 focus-within:border-zinc-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-zinc-900/5 transition-all">
              <textarea
                ref={inputRef}
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask Gemini to find overdue tasks, create a task, move status, or analyze sprint..."
                rows={2}
                className="flex-1 bg-transparent border-0 text-xs sm:text-[13px] text-zinc-900 placeholder-zinc-400 focus:outline-hidden resize-none p-1.5 max-h-32 font-normal"
              />

              <button
                onClick={() => handleSendMessage()}
                disabled={!inputPrompt.trim() || isLoading}
                className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
              >
                <span>Send</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center justify-between text-[11px] text-zinc-400 px-1">
              <span>Press <strong>Enter</strong> to send, <strong>Shift+Enter</strong> for newline</span>
              <span className="font-mono">⚡ {credits.remaining} credits left today</span>
            </div>
          </div>
        </div>
      </main>

      {/* Credit Details Modal */}
      {showCreditModal && (
        <div className="fixed inset-0 bg-zinc-900/40 backdrop-blur-2xs flex items-center justify-center p-4 z-60 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 border border-zinc-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900">AI Credits & Usage</h3>
                  <p className="text-[11px] text-zinc-500">Google Gemini 2.5 Flash Quota</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreditModal(false)}
                className="text-zinc-400 hover:text-zinc-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-zinc-50 p-3.5 rounded-xl border border-zinc-200/80 space-y-2">
              <div className="flex justify-between text-xs font-semibold text-zinc-700">
                <span>Daily Credits Remaining</span>
                <span className="font-mono text-zinc-900">{credits.remaining} / {credits.dailyQuota}</span>
              </div>
              <div className="w-full h-2 bg-zinc-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, (credits.remaining / credits.dailyQuota) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-zinc-500 pt-1">
                <span>Used Today: {credits.usedToday} requests</span>
                <span>Lifetime: {credits.lifetimeUsed} requests</span>
              </div>
            </div>

            <p className="text-xs text-zinc-600 leading-relaxed">
              Credits reset every calendar day at midnight. You can test workflows freely. Need more credits right now?
            </p>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => {
                  aiCreditService.topUpCredits(50);
                  showToast({ type: 'success', title: 'Credits Added', message: '+50 Demo credits added to your account.' });
                  setShowCreditModal(false);
                }}
                className="flex-1 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              >
                + Top Up 50 Credits
              </button>
              <button
                onClick={() => {
                  aiCreditService.resetCredits();
                  showToast({ type: 'info', message: 'Credits reset to standard 50/day.' });
                  setShowCreditModal(false);
                }}
                className="py-2 px-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg text-xs font-medium transition-colors cursor-pointer"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
