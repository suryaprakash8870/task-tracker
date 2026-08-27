import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Avatar } from '../common/Avatar';
import {
  Lightbulb,
  Plus,
  Check,
  X,
  ExternalLink,
  Filter,
  CheckCircle2,
  Sparkles,
  MessageSquare
} from 'lucide-react';

export const SuggestionsView: React.FC = () => {
  const {
    tasks,
    users,
    currentUser,
    setSelectedTaskId,
    addSuggestion,
    updateSuggestionStatus,
    addSubtask,
    searchQuery
  } = useApp();

  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'adopted' | 'dismissed'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTaskForNewSug, setSelectedTaskForNewSug] = useState(tasks[0]?.id || '');
  const [newSuggestionText, setNewSuggestionText] = useState('');

  // Collect all suggestions across tasks
  const allSuggestions = tasks.flatMap(task =>
    task.suggestions.map(sug => ({
      ...sug,
      taskId: task.id,
      taskTitle: task.title,
      taskAssigneeId: task.assigneeId,
      taskStatus: task.status
    }))
  );

  const filteredSuggestions = allSuggestions.filter(sug => {
    if (statusFilter !== 'all' && sug.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        sug.content.toLowerCase().includes(q) ||
        sug.taskTitle.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getUserById = (id: string) => users.find(u => u.id === id);

  const handleAdopt = async (taskId: string, suggestionId: string, content: string) => {
    await addSubtask(taskId, `Suggestion: ${content}`);
    await updateSuggestionStatus(taskId, suggestionId, 'adopted', 'Adopted into task subtasks checklist');
  };

  const handleDismiss = async (taskId: string, suggestionId: string) => {
    await updateSuggestionStatus(taskId, suggestionId, 'dismissed', 'Marked as reviewed');
  };

  const handleCreateSuggestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaskForNewSug || !newSuggestionText.trim()) return;

    await addSuggestion(selectedTaskForNewSug, newSuggestionText.trim());
    setNewSuggestionText('');
    setIsModalOpen(false);
  };

  return (
    <div id="suggestions-view" className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-amber-500/10 border border-amber-500/20 p-4 sm:p-5 rounded-2xl">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-amber-500 text-white rounded-xl shadow-xs">
            <Lightbulb className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
              Team Suggestions Hub
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Propose ideas, improvements, or design tips on any task. Adopted suggestions are converted into actionable checklists.
            </p>
          </div>
        </div>

        <button
          id="new-suggestion-btn"
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition-colors flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Suggestion</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-medium">
        {(['all', 'open', 'adopted', 'dismissed'] as const).map(st => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1.5 rounded-xl capitalize transition-colors ${
              statusFilter === st
                ? 'bg-blue-600 text-white font-semibold shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
            }`}
          >
            {st} ({allSuggestions.filter(s => (st === 'all' ? true : s.status === st)).length})
          </button>
        ))}
      </div>

      {/* Suggestions List */}
      <div className="space-y-3">
        {filteredSuggestions.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center text-slate-400">
            <Lightbulb className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
            <p className="font-semibold text-sm text-slate-700 dark:text-slate-300">No suggestions found</p>
            <p className="text-xs text-slate-400 mt-1">Submit your first suggestion to collaborate with the team</p>
          </div>
        ) : (
          filteredSuggestions.map(sug => {
            const author = getUserById(sug.userId);
            const taskAssignee = getUserById(sug.taskAssigneeId);

            return (
              <div
                key={sug.id}
                className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                  sug.status === 'adopted'
                    ? 'bg-emerald-50/30 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-900/40'
                    : sug.status === 'dismissed'
                    ? 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 opacity-75'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs hover:border-amber-400'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  {/* Left: Author & Suggestion text */}
                  <div className="flex items-start gap-3 flex-1">
                    <Avatar user={author} size="md" />
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                          {author?.name}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          • {new Date(sug.createdAt).toLocaleDateString()}
                        </span>
                        <span
                          className={`text-[10px] font-bold uppercase px-1.5 py-0.2 rounded ${
                            sug.status === 'adopted'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                              : sug.status === 'dismissed'
                              ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 text-slate-400'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                          }`}
                        >
                          {sug.status}
                        </span>
                      </div>

                      <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                        "{sug.content}"
                      </p>

                      {sug.resolutionNote && (
                        <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                          ✓ {sug.resolutionNote}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Linked Task badge & actions */}
                  <div className="flex sm:flex-col items-end justify-between sm:justify-start gap-2 flex-shrink-0">
                    <div
                      onClick={() => setSelectedTaskId(sug.taskId)}
                      className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer transition-colors"
                      title="Open linked task"
                    >
                      <span className="truncate max-w-[180px]">{sug.taskTitle}</span>
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </div>

                    {sug.status === 'open' && (
                      <div className="flex items-center gap-1.5 pt-1">
                        <button
                          onClick={() => handleAdopt(sug.taskId, sug.id, sug.content)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors"
                        >
                          <Check className="w-3 h-3" />
                          <span>Adopt</span>
                        </button>
                        <button
                          onClick={() => handleDismiss(sug.taskId, sug.id)}
                          className="px-2 py-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
                        >
                          Dismiss
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* New Suggestion Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                  Submit Team Suggestion
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSuggestion} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Select Target Task *
                </label>
                <select
                  value={selectedTaskForNewSug}
                  onChange={e => setSelectedTaskForNewSug(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                >
                  {tasks.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.title} ({t.status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Suggestion Note *
                </label>
                <textarea
                  required
                  rows={3}
                  value={newSuggestionText}
                  onChange={e => setNewSuggestionText(e.target.value)}
                  placeholder="e.g. Try using the layout from the previous landing page..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs text-slate-600 dark:text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newSuggestionText.trim()}
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white rounded-lg text-xs font-semibold shadow-xs"
                >
                  Post Suggestion
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
