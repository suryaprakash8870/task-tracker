import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Avatar } from '../common/Avatar';
import { PriorityBadge, StatusBadge } from '../common/PriorityBadge';
import { TaskStatus, TaskPriority, TaskLabel } from '../../types';
import {
  X,
  Calendar,
  CheckCircle2,
  Circle,
  MessageSquare,
  Lightbulb,
  FileText,
  Paperclip,
  History,
  Trash2,
  Send,
  Plus,
  ArrowRight,
  Upload,
  Download,
  Check,
  Tag,
  Clock,
  Sparkles
} from 'lucide-react';

const PRESET_LABELS: TaskLabel[] = [
  { id: 'l-design', name: 'Design', color: 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800' },
  { id: 'l-frontend', name: 'Frontend', color: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800' },
  { id: 'l-backend', name: 'Backend', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' },
  { id: 'l-qa', name: 'QA & Testing', color: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800' },
  { id: 'l-devops', name: 'DevOps', color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800' },
  { id: 'l-docs', name: 'Docs', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700' }
];

export const TaskDetailModal: React.FC = () => {
  const {
    selectedTask,
    setSelectedTaskId,
    users,
    currentUser,
    updateTask,
    deleteTask,
    addComment,
    addSuggestion,
    updateSuggestionStatus,
    toggleSubtask,
    addSubtask,
    deleteSubtask,
    addAttachment,
    deleteAttachment
  } = useApp();

  const [activeTab, setActiveTab] = useState<'comments' | 'suggestions' | 'notes' | 'attachments' | 'activity'>('comments');
  const [commentInput, setCommentInput] = useState('');
  const [suggestionInput, setSuggestionInput] = useState('');
  const [newSubtaskInput, setNewSubtaskInput] = useState('');
  const [notesContent, setNotesContent] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [editedDesc, setEditedDesc] = useState('');
  const [showLabelPicker, setShowLabelPicker] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Sync state when task changes
  React.useEffect(() => {
    if (selectedTask) {
      setEditedTitle(selectedTask.title);
      setEditedDesc(selectedTask.description);
      setNotesContent(selectedTask.notes || '');
    }
  }, [selectedTask?.id]);

  if (!selectedTask) return null;

  const assignee = users.find(u => u.id === selectedTask.assigneeId);
  const creator = users.find(u => u.id === selectedTask.creatorId);

  const completedSubtasksCount = selectedTask.subtasks.filter(st => st.completed).length;
  const subtaskProgress = selectedTask.subtasks.length > 0 
    ? Math.round((completedSubtasksCount / selectedTask.subtasks.length) * 100) 
    : 0;

  const handleSaveTitle = async () => {
    if (editedTitle.trim() && editedTitle !== selectedTask.title) {
      await updateTask(selectedTask.id, { title: editedTitle.trim() });
    }
    setIsEditingTitle(false);
  };

  const handleSaveDesc = async () => {
    if (editedDesc !== selectedTask.description) {
      await updateTask(selectedTask.id, { description: editedDesc });
    }
    setIsEditingDesc(false);
  };

  const handleSaveNotes = async () => {
    await updateTask(selectedTask.id, { notes: notesContent });
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim()) return;
    await addComment(selectedTask.id, commentInput.trim());
    setCommentInput('');
  };

  const handlePostSuggestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suggestionInput.trim()) return;
    await addSuggestion(selectedTask.id, suggestionInput.trim());
    setSuggestionInput('');
  };

  const handleAddSubtaskItem = async () => {
    if (!newSubtaskInput.trim()) return;
    await addSubtask(selectedTask.id, newSubtaskInput.trim());
    setNewSubtaskInput('');
  };

  const handleAdoptSuggestion = async (suggestionId: string, suggestionText: string) => {
    // 1. Add as subtask
    await addSubtask(selectedTask.id, `Suggestion: ${suggestionText}`);
    // 2. Mark suggestion adopted
    await updateSuggestionStatus(selectedTask.id, suggestionId, 'adopted', 'Converted into task subtask checklist');
  };

  const handleSimulatedFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setTimeout(async () => {
      await addAttachment(selectedTask.id, {
        taskId: selectedTask.id,
        name: file.name,
        size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        type: file.type || 'application/octet-stream',
        url: URL.createObjectURL(file),
        uploadedBy: currentUser.id
      });
      setIsUploading(false);
    }, 600);
  };

  const toggleLabel = async (label: TaskLabel) => {
    const exists = selectedTask.labels.some(l => l.id === label.id);
    const newLabels = exists
      ? selectedTask.labels.filter(l => l.id !== label.id)
      : [...selectedTask.labels, label];
    await updateTask(selectedTask.id, { labels: newLabels });
  };

  const getUserById = (id: string) => users.find(u => u.id === id);

  return (
    <div
      id="task-detail-modal-overlay"
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
    >
      <div
        id="task-detail-card"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Top Control Bar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center flex-wrap gap-2 text-xs">
            {/* Status Selector */}
            <select
              id="detail-status-select"
              value={selectedTask.status}
              onChange={e => updateTask(selectedTask.id, { status: e.target.value as TaskStatus })}
              className="px-2.5 py-1 font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 shadow-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="todo">⚪ Todo</option>
              <option value="in_progress">🔵 In Progress</option>
              <option value="review">🟡 Review</option>
              <option value="done">🟢 Done</option>
            </select>

            {/* Priority Selector */}
            <select
              id="detail-priority-select"
              value={selectedTask.priority}
              onChange={e => updateTask(selectedTask.id, { priority: e.target.value as TaskPriority })}
              className="px-2.5 py-1 font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 shadow-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="low">⬇ Low Priority</option>
              <option value="medium">➖ Medium Priority</option>
              <option value="high">⬆ High Priority</option>
              <option value="urgent">🔥 Urgent Priority</option>
            </select>

            {/* Due Date Picker */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xs">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="date"
                value={selectedTask.dueDate}
                onChange={e => updateTask(selectedTask.id, { dueDate: e.target.value })}
                className="text-xs bg-transparent text-slate-800 dark:text-slate-200 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="detail-delete-task-btn"
              onClick={() => {
                if (window.confirm('Are you sure you want to delete this task?')) {
                  deleteTask(selectedTask.id);
                }
              }}
              title="Delete task"
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setSelectedTaskId(null)}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Title Area */}
          <div>
            {isEditingTitle ? (
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={editedTitle}
                  onChange={e => setEditedTitle(e.target.value)}
                  onBlur={handleSaveTitle}
                  onKeyDown={e => e.key === 'Enter' && handleSaveTitle()}
                  autoFocus
                  className="flex-1 text-lg sm:text-xl font-bold px-2 py-1 rounded border border-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden"
                />
                <button
                  onClick={handleSaveTitle}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-semibold"
                >
                  Save
                </button>
              </div>
            ) : (
              <h2
                onClick={() => setIsEditingTitle(true)}
                title="Click to edit title"
                className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors"
              >
                {selectedTask.title}
              </h2>
            )}
          </div>

          {/* Meta Overview Row: Assignee, Creator, Labels */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs">
            {/* Assignee */}
            <div>
              <span className="text-slate-400 font-medium block mb-1">Assignee</span>
              <div className="flex items-center gap-2">
                <Avatar user={assignee} size="sm" />
                <select
                  value={selectedTask.assigneeId}
                  onChange={e => updateTask(selectedTask.id, { assigneeId: e.target.value })}
                  className="bg-transparent font-medium text-slate-800 dark:text-slate-200 focus:outline-hidden cursor-pointer"
                >
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Created By */}
            <div>
              <span className="text-slate-400 font-medium block mb-1">Created By</span>
              <div className="flex items-center gap-2">
                <Avatar user={creator} size="sm" />
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {creator?.name || 'Workspace Lead'}
                </span>
              </div>
            </div>

            {/* Labels */}
            <div className="relative">
              <div className="flex items-center justify-between mb-1">
                <span className="text-slate-400 font-medium">Labels</span>
                <button
                  type="button"
                  onClick={() => setShowLabelPicker(!showLabelPicker)}
                  className="text-blue-600 dark:text-blue-400 hover:underline text-[11px] font-semibold"
                >
                  {showLabelPicker ? 'Done' : '+ Edit'}
                </button>
              </div>

              <div className="flex flex-wrap gap-1">
                {selectedTask.labels.length === 0 && !showLabelPicker && (
                  <span className="text-slate-400 italic">No labels</span>
                )}
                {selectedTask.labels.map(l => (
                  <span
                    key={l.id}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium border ${l.color}`}
                  >
                    {l.name}
                  </span>
                ))}
              </div>

              {/* Label selector popup */}
              {showLabelPicker && (
                <div className="absolute top-full left-0 mt-2 p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-20 w-48 space-y-1">
                  {PRESET_LABELS.map(lbl => {
                    const isSelected = selectedTask.labels.some(l => l.id === lbl.id);
                    return (
                      <button
                        key={lbl.id}
                        type="button"
                        onClick={() => toggleLabel(lbl)}
                        className={`w-full text-left px-2 py-1 rounded text-xs flex items-center justify-between transition-colors ${
                          isSelected
                            ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span>{lbl.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Description
              </label>
              {!isEditingDesc && (
                <button
                  onClick={() => setIsEditingDesc(true)}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Edit
                </button>
              )}
            </div>

            {isEditingDesc ? (
              <div className="space-y-2">
                <textarea
                  rows={3}
                  value={editedDesc}
                  onChange={e => setEditedDesc(e.target.value)}
                  placeholder="Task details and scope..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setIsEditingDesc(false)}
                    className="px-2.5 py-1 text-xs text-slate-600 dark:text-slate-400"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveDesc}
                    className="px-3 py-1 text-xs font-semibold text-white bg-blue-600 rounded-md"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <p
                onClick={() => setIsEditingDesc(true)}
                className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed cursor-pointer p-2.5 rounded-lg bg-slate-50/50 dark:bg-slate-800/20 border border-transparent hover:border-slate-200 dark:hover:border-slate-800"
              >
                {selectedTask.description || <span className="italic text-slate-400">Click to add description...</span>}
              </p>
            )}
          </div>

          {/* Subtasks Checklist */}
          <div className="border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  Subtasks Checklist
                </h4>
                <span className="text-[11px] text-slate-500">
                  ({completedSubtasksCount}/{selectedTask.subtasks.length})
                </span>
              </div>
              <span className="text-xs font-medium text-slate-500">{subtaskProgress}%</span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-300"
                style={{ width: `${subtaskProgress}%` }}
              />
            </div>

            {/* List */}
            <div className="space-y-1.5">
              {selectedTask.subtasks.map(st => (
                <div
                  key={st.id}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 text-xs transition-colors group"
                >
                  <label className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={st.completed}
                      onChange={() => toggleSubtask(selectedTask.id, st.id)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                    <span
                      className={`truncate ${
                        st.completed
                          ? 'line-through text-slate-400 dark:text-slate-500'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {st.title}
                    </span>
                  </label>

                  <button
                    onClick={() => deleteSubtask(selectedTask.id, st.id)}
                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500 p-1 rounded transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add Subtask input */}
            <div className="flex gap-2 pt-1">
              <input
                type="text"
                value={newSubtaskInput}
                onChange={e => setNewSubtaskInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddSubtaskItem()}
                placeholder="Add another step... (Press Enter)"
                className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={handleAddSubtaskItem}
                className="px-3 py-1.5 text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg transition-colors"
              >
                Add
              </button>
            </div>
          </div>

          {/* Tab Navigation for Detailed Sections */}
          <div>
            <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 sm:gap-4 overflow-x-auto text-xs font-medium">
              <button
                id="tab-comments"
                onClick={() => setActiveTab('comments')}
                className={`py-2 px-1 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                  activeTab === 'comments'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-semibold'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Comments ({selectedTask.comments.length})</span>
              </button>

              <button
                id="tab-suggestions"
                onClick={() => setActiveTab('suggestions')}
                className={`py-2 px-1 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                  activeTab === 'suggestions'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-semibold'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                <Lightbulb className="w-3.5 h-3.5" />
                <span>Suggestions ({selectedTask.suggestions.length})</span>
              </button>

              <button
                id="tab-notes"
                onClick={() => setActiveTab('notes')}
                className={`py-2 px-1 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                  activeTab === 'notes'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-semibold'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Notes & Scratchpad</span>
              </button>

              <button
                id="tab-attachments"
                onClick={() => setActiveTab('attachments')}
                className={`py-2 px-1 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                  activeTab === 'attachments'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-semibold'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                <Paperclip className="w-3.5 h-3.5" />
                <span>Files ({selectedTask.attachments.length})</span>
              </button>

              <button
                id="tab-activity"
                onClick={() => setActiveTab('activity')}
                className={`py-2 px-1 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                  activeTab === 'activity'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-semibold'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Activity History</span>
              </button>
            </div>

            {/* Tab Panes */}
            <div className="pt-4">
              {/* 1. Comments Pane */}
              {activeTab === 'comments' && (
                <div className="space-y-4">
                  {selectedTask.comments.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-6">
                      No comments yet. Start a discussion with the team.
                    </p>
                  ) : (
                    <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                      {selectedTask.comments.map(c => {
                        const author = getUserById(c.userId);
                        return (
                          <div key={c.id} className="flex items-start gap-3 text-xs">
                            <Avatar user={author} size="sm" />
                            <div className="flex-1 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-semibold text-slate-900 dark:text-slate-100">
                                  {author?.name || 'Team Member'}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                                {c.content}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Post Comment Input */}
                  <form onSubmit={handlePostComment} className="flex gap-2">
                    <Avatar user={currentUser} size="sm" />
                    <div className="flex-1 flex gap-2">
                      <input
                        type="text"
                        id="comment-input-field"
                        value={commentInput}
                        onChange={e => setCommentInput(e.target.value)}
                        placeholder="Write a comment... (Type to collaborate)"
                        className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="submit"
                        disabled={!commentInput.trim()}
                        className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Send</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* 2. Suggestions Pane */}
              {activeTab === 'suggestions' && (
                <div className="space-y-4">
                  <div className="bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/40 p-3 rounded-xl text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
                    <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold block">Team Suggestions</span>
                      Propose technical recommendations or creative advice for this task. The assignee can adopt them directly into subtasks.
                    </div>
                  </div>

                  {selectedTask.suggestions.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4">
                      No suggestions submitted yet for this task.
                    </p>
                  ) : (
                    <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                      {selectedTask.suggestions.map(sug => {
                        const author = getUserById(sug.userId);
                        return (
                          <div
                            key={sug.id}
                            className={`p-3 rounded-xl border text-xs space-y-2 ${
                              sug.status === 'adopted'
                                ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
                                : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Avatar user={author} size="xs" />
                                <span className="font-semibold text-slate-900 dark:text-slate-100">
                                  {author?.name}
                                </span>
                              </div>
                              <span
                                className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                  sug.status === 'adopted'
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                                    : sug.status === 'dismissed'
                                    ? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                                  }`}
                              >
                                {sug.status}
                              </span>
                            </div>

                            <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                              "{sug.content}"
                            </p>

                            {sug.resolutionNote && (
                              <div className="text-[11px] text-emerald-700 dark:text-emerald-400 italic">
                                Note: {sug.resolutionNote}
                              </div>
                            )}

                            {sug.status === 'open' && (
                              <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-700">
                                <button
                                  onClick={() => handleAdoptSuggestion(sug.id, sug.content)}
                                  className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-semibold flex items-center gap-1 transition-colors"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>Adopt into Checklist</span>
                                </button>
                                <button
                                  onClick={() =>
                                    updateSuggestionStatus(selectedTask.id, sug.id, 'dismissed', 'Marked as reviewed')
                                  }
                                  className="px-2.5 py-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 text-[11px]"
                                >
                                  Dismiss
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Suggestion input form */}
                  <form onSubmit={handlePostSuggestion} className="space-y-2 pt-1">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Submit a Suggestion
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={suggestionInput}
                        onChange={e => setSuggestionInput(e.target.value)}
                        placeholder="e.g. Try using the layout from the previous landing page..."
                        className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="submit"
                        disabled={!suggestionInput.trim()}
                        className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Suggest</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* 3. Notes Pane */}
              {activeTab === 'notes' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">
                      Personal & team notes, technical snippets, or meeting minutes for this task.
                    </span>
                    <button
                      onClick={handleSaveNotes}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold transition-colors"
                    >
                      Save Notes
                    </button>
                  </div>
                  <textarea
                    rows={8}
                    value={notesContent}
                    onChange={e => setNotesContent(e.target.value)}
                    onBlur={handleSaveNotes}
                    placeholder="Enter task notes, architecture snippets, or checklist reminders here..."
                    className="w-full p-3 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500 leading-relaxed"
                  />
                </div>
              )}

              {/* 4. Files Pane */}
              {activeTab === 'attachments' && (
                <div className="space-y-4">
                  {/* Upload Simulator Area */}
                  <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-4 text-center hover:border-blue-500 transition-colors">
                    <label className="cursor-pointer flex flex-col items-center justify-center gap-1.5">
                      <Upload className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {isUploading ? 'Uploading file...' : 'Click to upload or drag files here'}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        PNG, JPG, PDF, FIG, ZIP up to 50MB
                      </span>
                      <input
                        type="file"
                        onChange={handleSimulatedFileUpload}
                        disabled={isUploading}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Attachment List */}
                  {selectedTask.attachments.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4">
                      No files attached yet.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {selectedTask.attachments.map(att => {
                        const uploader = getUserById(att.uploadedBy);
                        return (
                          <div
                            key={att.id}
                            className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-[10px] flex-shrink-0">
                                {att.name.split('.').pop()?.toUpperCase() || 'FILE'}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                                  {att.name}
                                </p>
                                <p className="text-[10px] text-slate-500">
                                  {att.size} • by {uploader?.name || 'Member'}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 flex-shrink-0">
                              <a
                                href={att.url}
                                target="_blank"
                                rel="noreferrer"
                                download={att.name}
                                className="p-1.5 text-slate-400 hover:text-blue-600 rounded"
                                title="Download / Open"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </a>
                              <button
                                onClick={() => deleteAttachment(selectedTask.id, att.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded"
                                title="Delete attachment"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* 5. Activity Pane */}
              {activeTab === 'activity' && (
                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {selectedTask.activity.map(act => {
                    const user = getUserById(act.userId);
                    return (
                      <div key={act.id} className="flex items-start gap-2.5 text-xs">
                        <Avatar user={user} size="xs" />
                        <div className="flex-1">
                          <p className="text-slate-800 dark:text-slate-200">
                            <span className="font-semibold">{user?.name || 'Member'}</span>{' '}
                            <span className="text-slate-600 dark:text-slate-400">{act.details}</span>
                          </p>
                          <span className="text-[10px] text-slate-400">
                            {new Date(act.timestamp).toLocaleDateString()} at{' '}
                            {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
