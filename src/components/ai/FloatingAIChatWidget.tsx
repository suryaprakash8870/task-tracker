import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { aiClient } from '../../services/aiClient';
import { aiCreditService, AICreditState } from '../../services/aiCreditService';
import { aiChatStorage, AIChatThread } from '../../services/aiChatStorage';
import { analyzePromptForMissingDetails, PromptValidationAlert } from '../../services/aiPromptValidator';
import { AIMessageBubble } from './AIMessageBubble';
import { AIChatMessage, Task } from '../../types';
import {
  Sparkles,
  X,
  Send,
  Plus,
  Maximize2,
  Minimize2,
  Layers,
  AlertCircle,
  History,
  RotateCcw,
  Bot,
  Zap,
  Info,
  ChevronDown,
  Check
} from 'lucide-react';

const QUICK_STARTERS = [
  'Show my overdue tasks',
  'What should I work on today?',
  'Create a task for Arun due tomorrow with high priority',
  'Summarize current sprint progress'
];

export const FloatingAIChatWidget: React.FC = () => {
  const {
    currentUser,
    workspace,
    tasks,
    users,
    selectedTask,
    setSelectedTaskId,
    setCurrentView,
    currentView,
    showToast
  } = useApp();

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [threads, setThreads] = useState<AIChatThread[]>([]);
  const [activeThread, setActiveThread] = useState<AIChatThread | null>(null);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTaskContext, setActiveTaskContext] = useState<Task | null>(null);
  const [showThreadMenu, setShowThreadMenu] = useState(false);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [credits, setCredits] = useState<AICreditState>(() => aiCreditService.getCredits());
  const [validationAlerts, setValidationAlerts] = useState<PromptValidationAlert[]>([]);

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
    const current = loadedThreads.find(t => t.id === activeId) || loadedThreads[0];
    setActiveThread(current || null);

    const unsub = aiChatStorage.subscribe(updated => {
      setThreads(updated);
      const curId = aiChatStorage.getActiveThreadId();
      setActiveThread(updated.find(t => t.id === curId) || updated[0] || null);
    });

    return unsub;
  }, []);

  // Keyboard shortcut: Cmd+J or Ctrl+J to toggle floating AI
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setIsOpen(prev => !prev);
        setIsMinimized(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auto-scroll messages
  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeThread?.messages, isLoading, isOpen, isMinimized]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, isMinimized]);

  // Auto sync active task context from global selection if open
  useEffect(() => {
    if (selectedTask) {
      setActiveTaskContext(selectedTask);
    }
  }, [selectedTask]);

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
        message: 'You have used all 50 free credits for today. Click Top Up to refill demo credits.'
      });
      setShowCreditModal(true);
      return;
    }

    const userMessage: AIChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString()
    };

    const updatedMessages = [...activeThread.messages, userMessage];

    // Update title if it's the first real question in a new conversation
    let updatedTitle = activeThread.title;
    if (activeThread.title === 'New Conversation' || activeThread.title === 'Workspace Assistant') {
      updatedTitle = text.slice(0, 30) + (text.length > 30 ? '...' : '');
    }

    const updatedThread: AIChatThread = {
      ...activeThread,
      title: updatedTitle,
      messages: updatedMessages,
      updatedAt: new Date().toISOString()
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
        selectedTask: activeTaskContext
      });

      const finalThread: AIChatThread = {
        ...updatedThread,
        messages: [...updatedMessages, response.message],
        updatedAt: new Date().toISOString()
      };

      aiChatStorage.saveThread(finalThread);
      setActiveThread(finalThread);

      if (response.toolInvocations && response.toolInvocations.length > 0) {
        const successes = response.toolInvocations.filter(t => t.result?.success);
        if (successes.length > 0) {
          showToast({
            type: 'success',
            title: 'AI Action Done',
            message: successes[0].result?.message || 'Updated workspace via AI.'
          });
        }
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'AI failed to reply';
      const errorThread: AIChatThread = {
        ...updatedThread,
        messages: [
          ...updatedMessages,
          {
            id: `ai-err-${Date.now()}`,
            role: 'assistant',
            content: `⚠️ ${errorMsg}`,
            timestamp: new Date().toISOString()
          }
        ],
        updatedAt: new Date().toISOString()
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
    setShowThreadMenu(false);
    setInputPrompt('');
  };

  const handleAppendSuggestion = (appendText: string) => {
    setInputPrompt(prev => prev + appendText);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // If floating chat view is minimized or closed:
  if (!isOpen) {
    return (
      <div className="fixed bottom-5 right-5 z-40">
        <button
          id="floating-ai-trigger-btn"
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-2.5 px-3.5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 border border-zinc-700/80 cursor-pointer"
          title="Ask Gemini Assistant (⌘J / Ctrl+J)"
        >
          <div className="relative">
            <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-indigo-500 rounded-full ring-2 ring-zinc-900" />
          </div>
          <span className="text-xs font-semibold tracking-tight hidden sm:inline">Ask AI</span>
          <span className="font-mono text-[10px] bg-zinc-800 group-hover:bg-zinc-700 text-zinc-300 px-1.5 py-0.5 rounded-full border border-zinc-700">
            {credits.remaining}⚡
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end animate-in fade-in slide-in-from-bottom-5 duration-200">
      {/* Floating Chat Container */}
      <div
        id="floating-ai-card"
        className={`bg-white rounded-2xl border border-zinc-200/90 shadow-2xl overflow-hidden flex flex-col transition-all duration-200 ${
          isMinimized
            ? 'w-80 h-14'
            : 'w-[94vw] sm:w-[420px] md:w-[460px] h-[580px] max-h-[85vh]'
        }`}
      >
        {/* Header */}
        <div className="px-4 py-3 bg-zinc-900 text-white flex items-center justify-between shrink-0 select-none">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white shrink-0 shadow-2xs">
              <Sparkles className="w-3.5 h-3.5" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold tracking-tight">Gemini Assistant</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ring-2 ring-emerald-400/20" />
              </div>
              {!isMinimized && (
                <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 truncate">
                  <span className="truncate max-w-[160px]">{activeThread?.title || 'Chat'}</span>
                </div>
              )}
            </div>
          </div>

          {/* Header Controls */}
          <div className="flex items-center gap-1">
            {/* Credits Meter Badge */}
            <button
              onClick={() => setShowCreditModal(true)}
              className="flex items-center gap-1 px-2 py-1 bg-zinc-800/90 hover:bg-zinc-700 text-zinc-200 rounded-md text-[10px] font-mono font-medium transition-colors cursor-pointer"
              title="Daily AI Credits"
            >
              <Zap className="w-3 h-3 text-amber-400" />
              <span>{credits.remaining}/{credits.dailyQuota}</span>
            </button>

            {/* Thread Switcher Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowThreadMenu(!showThreadMenu)}
                className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors cursor-pointer"
                title="Chat History"
              >
                <History className="w-3.5 h-3.5" />
              </button>

              {showThreadMenu && (
                <div className="absolute right-0 top-8 w-60 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl z-50 p-1.5 text-xs text-zinc-200">
                  <div className="flex items-center justify-between px-2 py-1.5 border-b border-zinc-800 font-semibold text-[11px] text-zinc-400">
                    <span>Conversations</span>
                    <button
                      onClick={handleNewChat}
                      className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> New
                    </button>
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-0.5 py-1">
                    {threads.map(th => (
                      <button
                        key={th.id}
                        onClick={() => {
                          aiChatStorage.setActiveThreadId(th.id);
                          setActiveThread(th);
                          setShowThreadMenu(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors truncate cursor-pointer ${
                          th.id === activeThread?.id
                            ? 'bg-indigo-600/30 text-indigo-300 font-medium'
                            : 'hover:bg-zinc-800 text-zinc-300'
                        }`}
                      >
                        <span className="truncate">{th.title}</span>
                        {th.id === activeThread?.id && <Check className="w-3 h-3 text-indigo-400 shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Maximize to full view */}
            <button
              onClick={() => {
                setIsOpen(false);
                setCurrentView('ai-assistant');
              }}
              className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors cursor-pointer"
              title="Open full-page Assistant"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>

            {/* Minimize */}
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors cursor-pointer"
              title={isMinimized ? 'Expand' : 'Minimize'}
            >
              {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
            </button>

            {/* Close */}
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Expanded View Body */}
        {!isMinimized && (
          <div className="flex-1 flex flex-col bg-zinc-50 overflow-hidden">
            {/* Active Context Bar */}
            {activeTaskContext && (
              <div className="px-3.5 py-1.5 bg-indigo-50/80 border-b border-indigo-100 flex items-center justify-between text-xs text-indigo-900">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Layers className="w-3 h-3 text-indigo-600 shrink-0" />
                  <span className="font-medium truncate">Task Context: {activeTaskContext.title}</span>
                </div>
                <button
                  onClick={() => setActiveTaskContext(null)}
                  className="text-indigo-500 hover:text-indigo-800 p-0.5 rounded cursor-pointer"
                  title="Remove context"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-4">
              {activeThread?.messages.map(msg => (
                <AIMessageBubble
                  key={msg.id}
                  message={msg}
                  currentUser={currentUser}
                  onSelectTask={taskId => setSelectedTaskId(taskId)}
                />
              ))}

              {isLoading && (
                <div className="flex items-center gap-2.5 text-xs text-zinc-500 p-2 bg-white rounded-xl border border-zinc-200/80 max-w-[220px] shadow-2xs">
                  <div className="w-4 h-4 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
                  <span>Gemini is analyzing...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Missing Details Smart Alerts */}
            {validationAlerts.length > 0 && (
              <div className="px-3 py-2 bg-amber-50/95 border-t border-amber-200/90 text-amber-900 text-xs">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[11px] text-amber-950">
                      {validationAlerts[0].title}: <span className="font-normal text-amber-800">{validationAlerts[0].message}</span>
                    </p>
                    <div className="flex items-center flex-wrap gap-1.5 mt-1.5">
                      {validationAlerts[0].suggestedAppends.map((s, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleAppendSuggestion(s.appendText)}
                          className="px-2 py-0.5 bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 rounded text-[10px] font-medium transition-colors shadow-2xs cursor-pointer"
                        >
                          + {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Starters if conversation is brand new */}
            {activeThread && activeThread.messages.length <= 1 && (
              <div className="p-2.5 bg-white border-t border-zinc-200/80">
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5 px-1">
                  Suggested Prompts
                </p>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                  {QUICK_STARTERS.map((starter, i) => (
                    <button
                      key={i}
                      onClick={() => handleSendMessage(starter)}
                      className="px-2.5 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-md whitespace-nowrap text-[11px] transition-colors cursor-pointer shrink-0"
                    >
                      {starter}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input Form */}
            <div className="p-3 bg-white border-t border-zinc-200/90 shrink-0">
              <div className="relative flex items-end gap-2 bg-zinc-100/90 rounded-xl p-1.5 border border-zinc-200 focus-within:border-zinc-400 focus-within:bg-white transition-all">
                <textarea
                  ref={inputRef}
                  value={inputPrompt}
                  onChange={e => setInputPrompt(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask Gemini to create, find, or organize tasks..."
                  rows={2}
                  className="flex-1 bg-transparent border-0 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-hidden resize-none p-1.5 max-h-24 font-normal"
                />

                <div className="flex items-center gap-1 shrink-0 pb-1 pr-1">
                  <button
                    onClick={() => handleSendMessage()}
                    disabled={!inputPrompt.trim() || isLoading}
                    className="p-2 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 text-white rounded-lg transition-all shadow-2xs cursor-pointer"
                    title="Send message"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between mt-1.5 px-1 text-[10px] text-zinc-400">
                <span>Press <strong>Enter</strong> to send, <strong>Shift+Enter</strong> for newline</span>
                <span><strong>⌘J</strong> to toggle</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Credit Details Modal */}
      {showCreditModal && (
        <div className="fixed inset-0 bg-zinc-900/40 backdrop-blur-2xs flex items-center justify-center p-4 z-60">
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
