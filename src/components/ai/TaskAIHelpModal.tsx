import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Task, AITaskHelpAction } from '../../types';
import { aiClient } from '../../services/aiClient';
import { aiCreditService, AICreditState } from '../../services/aiCreditService';
import {
  Sparkles,
  X,
  CheckCircle2,
  ListTodo,
  FileText,
  AlertTriangle,
  Users,
  MessageSquare,
  ArrowRight,
  RefreshCw,
  Plus,
  Copy,
  Check,
  Zap
} from 'lucide-react';

interface TaskAIHelpModalProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
}

const AI_ACTIONS: {
  id: AITaskHelpAction;
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: 'next_steps',
    label: 'Suggest Next Steps',
    desc: 'Actionable steps to move this task towards completion.',
    icon: ArrowRight,
  },
  {
    id: 'generate_checklist',
    label: 'Generate Checklist',
    desc: 'Break down requirements into subtasks you can add directly.',
    icon: ListTodo,
  },
  {
    id: 'improve_description',
    label: 'Improve Description',
    desc: 'Professional rewrite with overview, deliverables & criteria.',
    icon: FileText,
  },
  {
    id: 'blockers',
    label: 'Find Possible Blockers',
    desc: 'Identify risks, dependency bottlenecks & mitigations.',
    icon: AlertTriangle,
  },
  {
    id: 'summarize',
    label: 'Summarize Task',
    desc: 'Concise executive brief of the task state and progress.',
    icon: Sparkles,
  },
  {
    id: 'suggest_teammate',
    label: 'Suggest a Teammate',
    desc: 'Recommend roles or skills best suited for this task.',
    icon: Users,
  },
  {
    id: 'summarize_comments',
    label: 'Summarize Comments',
    desc: 'Key takeaways and decisions from team discussions.',
    icon: MessageSquare,
  },
];

export const TaskAIHelpModal: React.FC<TaskAIHelpModalProps> = ({
  task,
  isOpen,
  onClose,
}) => {
  const { currentUser, workspace, updateTask, addSubtask, showToast } = useApp();

  const [selectedAction, setSelectedAction] = useState<AITaskHelpAction>('next_steps');
  const [customInstruction, setCustomInstruction] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [credits, setCredits] = useState<AICreditState>(() => aiCreditService.getCredits());
  const [aiResult, setAiResult] = useState<{
    title: string;
    content: string;
    structuredItems?: string[];
    suggestedPayload?: Record<string, any>;
  } | null>(null);

  const [selectedChecklistItems, setSelectedChecklistItems] = useState<Record<number, boolean>>({});
  const [copied, setCopied] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    const unsub = aiCreditService.subscribe(setCredits);
    return unsub;
  }, []);

  if (!isOpen) return null;

  const handleRunAI = async (actionToRun: AITaskHelpAction) => {
    if (credits.remaining <= 0) {
      showToast({
        type: 'warning',
        title: 'Daily AI Limit Reached',
        message: 'No AI credits remaining for today. Please top up or try tomorrow.'
      });
      return;
    }

    setSelectedAction(actionToRun);
    setIsLoading(true);
    setAiResult(null);
    setSelectedChecklistItems({});

    // Deduct 1 credit
    aiCreditService.useCredits(1);

    try {
      const res = await aiClient.getTaskHelp({
        action: actionToRun,
        task,
        currentUser,
        workspace,
        customInstruction: customInstruction.trim() || undefined,
      });

      setAiResult(res);

      if (res.structuredItems && res.structuredItems.length > 0) {
        // Pre-select all generated items
        const initialSelected: Record<number, boolean> = {};
        res.structuredItems.forEach((_, idx) => {
          initialSelected[idx] = true;
        });
        setSelectedChecklistItems(initialSelected);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'AI task help failed';
      showToast({ type: 'error', title: 'AI Help Unavailable', message: msg });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyDescription = async () => {
    if (!aiResult?.suggestedPayload?.description) return;
    setIsApplying(true);
    try {
      await updateTask(task.id, { description: aiResult.suggestedPayload.description });
      showToast({ type: 'success', title: 'Description Updated', message: 'Applied AI improved description to task.' });
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Update failed';
      showToast({ type: 'error', message: msg });
    } finally {
      setIsApplying(false);
    }
  };

  const handleAddSelectedSubtasks = async () => {
    if (!aiResult?.structuredItems || aiResult.structuredItems.length === 0) return;
    setIsApplying(true);

    const itemsToAdd = aiResult.structuredItems.filter((_, idx) => selectedChecklistItems[idx]);

    try {
      for (const item of itemsToAdd) {
        await addSubtask(task.id, item);
      }
      showToast({
        type: 'success',
        title: 'Checklist Added',
        message: `Added ${itemsToAdd.length} subtasks to this task.`,
      });
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed adding subtasks';
      showToast({ type: 'error', message: msg });
    } finally {
      setIsApplying(false);
    }
  };

  const handleCopyText = () => {
    if (aiResult?.content) {
      navigator.clipboard.writeText(aiResult.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      showToast({ type: 'info', message: 'Copied to clipboard.' });
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900">✨ Get AI Help for Task</h2>
                <span className="font-mono text-[10px] bg-zinc-100 text-zinc-700 px-1.5 py-0.2 rounded border border-zinc-200 flex items-center gap-0.5">
                  <Zap className="w-2.5 h-2.5 text-amber-500" />
                  {credits.remaining}⚡
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate max-w-md">"{task.title}"</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Selection Pills */}
        <div className="p-4 border-b border-slate-100 bg-white">
          <div className="text-xs font-semibold text-slate-700 mb-2">Select an AI Capability:</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {AI_ACTIONS.map((act) => {
              const Icon = act.icon;
              const isSelected = selectedAction === act.id;
              return (
                <button
                  key={act.id}
                  onClick={() => handleRunAI(act.id)}
                  disabled={isLoading}
                  className={`flex items-start gap-2 p-2.5 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'bg-blue-50 border-blue-300 text-blue-900 ring-1 ring-blue-500/20'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold leading-snug">{act.label}</div>
                    <div className="text-[10px] text-slate-500 truncate">{act.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Optional Custom Instruction */}
          <div className="mt-3 flex items-center gap-2">
            <input
              type="text"
              placeholder="Optional: Add specific guidance (e.g. 'Focus on frontend animation checklist')..."
              value={customInstruction}
              onChange={(e) => setCustomInstruction(e.target.value)}
              className="flex-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              onClick={() => handleRunAI(selectedAction)}
              disabled={isLoading}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white disabled:text-slate-400 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shrink-0"
            >
              {isLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>Generate</span>
            </button>
          </div>
        </div>

        {/* Content & Results Preview */}
        <div className="flex-1 overflow-y-auto p-5 bg-slate-50/50 space-y-4">
          {isLoading && (
            <div className="py-12 text-center space-y-3">
              <RefreshCw className="w-6 h-6 text-blue-600 animate-spin mx-auto" />
              <div className="text-sm font-medium text-slate-700">Gemini is analyzing the task details...</div>
              <p className="text-xs text-slate-400">Reviewing description, subtasks, notes, and discussion history.</p>
            </div>
          )}

          {!isLoading && !aiResult && (
            <div className="py-12 text-center space-y-2 text-slate-400">
              <Sparkles className="w-8 h-8 text-blue-400 mx-auto stroke-1" />
              <div className="text-sm font-medium text-slate-600">Choose an action above to generate AI advice</div>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                AI will examine this task in context and generate summaries, next steps, or subtasks.
              </p>
            </div>
          )}

          {!isLoading && aiResult && (
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{aiResult.title}</span>
                </div>
                <button
                  onClick={handleCopyText}
                  className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800 bg-slate-100 px-2 py-1 rounded transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              {/* Structured Checklist Preview */}
              {aiResult.structuredItems && aiResult.structuredItems.length > 0 ? (
                <div className="space-y-2">
                  <div className="text-xs text-slate-500 font-medium">Select subtasks to add to this task:</div>
                  <div className="space-y-1.5">
                    {aiResult.structuredItems.map((item, idx) => (
                      <label
                        key={idx}
                        className={`flex items-start gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                          selectedChecklistItems[idx]
                            ? 'bg-blue-50/70 border-blue-200 text-blue-950 font-medium'
                            : 'bg-slate-50 border-slate-200 text-slate-600'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={Boolean(selectedChecklistItems[idx])}
                          onChange={(e) =>
                            setSelectedChecklistItems((prev) => ({
                              ...prev,
                              [idx]: e.target.checked,
                            }))
                          }
                          className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span>{item}</span>
                      </label>
                    ))}
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={handleAddSelectedSubtasks}
                      disabled={isApplying}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span>
                        Add{' '}
                        {Object.values(selectedChecklistItems).filter(Boolean).length} Selected Subtasks
                      </span>
                    </button>
                  </div>
                </div>
              ) : selectedAction === 'improve_description' ? (
                <div className="space-y-3">
                  <div className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">
                    {aiResult.content}
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={handleApplyDescription}
                      disabled={isApplying}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
                    >
                      <Check className="w-4 h-4" />
                      <span>Apply to Task Description</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                  {aiResult.content}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-white flex items-center justify-between text-xs text-slate-500">
          <span>AI outputs are suggestions. You remain in full control.</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-slate-600 hover:text-slate-900 font-medium rounded-lg hover:bg-slate-100 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
