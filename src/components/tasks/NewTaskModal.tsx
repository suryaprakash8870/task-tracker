import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { TaskStatus, TaskPriority, TaskLabel } from '../../types';
import { Avatar } from '../common/Avatar';
import { X, Plus, Trash2, Calendar, Tag, UserCheck, AlertCircle } from 'lucide-react';

const PRESET_LABELS: TaskLabel[] = [
  { id: 'l-design', name: 'Design', color: 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800' },
  { id: 'l-frontend', name: 'Frontend', color: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800' },
  { id: 'l-backend', name: 'Backend', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' },
  { id: 'l-qa', name: 'QA & Testing', color: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800' },
  { id: 'l-devops', name: 'DevOps', color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800' },
  { id: 'l-docs', name: 'Docs', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700' }
];

export const NewTaskModal: React.FC = () => {
  const { isNewTaskModalOpen, setIsNewTaskModalOpen, users, currentUser, createTask } = useApp();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [assigneeId, setAssigneeId] = useState<string>(currentUser.id);
  const [dueDate, setDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  });
  const [selectedLabels, setSelectedLabels] = useState<TaskLabel[]>([PRESET_LABELS[1]]);
  const [subtasks, setSubtasks] = useState<{ id: string; title: string; completed: boolean }[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isNewTaskModalOpen) return null;

  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    setSubtasks([...subtasks, { id: `st-${Date.now()}`, title: newSubtaskTitle.trim(), completed: false }]);
    setNewSubtaskTitle('');
  };

  const handleRemoveSubtask = (id: string) => {
    setSubtasks(subtasks.filter(st => st.id !== id));
  };

  const toggleLabel = (label: TaskLabel) => {
    if (selectedLabels.some(l => l.id === label.id)) {
      setSelectedLabels(selectedLabels.filter(l => l.id !== label.id));
    } else {
      setSelectedLabels([...selectedLabels, label]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      await createTask({
        title: title.trim(),
        description: description.trim(),
        status,
        priority,
        assigneeId,
        dueDate,
        labels: selectedLabels,
        subtasks,
        notes
      });

      // Reset form
      setTitle('');
      setDescription('');
      setStatus('todo');
      setPriority('medium');
      setSubtasks([]);
      setNotes('');
      setIsNewTaskModalOpen(false);
    } catch (err) {
      console.error('Failed to create task', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="new-task-modal-overlay"
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto"
    >
      <div
        id="new-task-modal-card"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-base">
              Create New Task
            </h3>
            <p className="text-xs text-slate-500">Add an initiative to your workspace board</p>
          </div>
          <button
            onClick={() => setIsNewTaskModalOpen(false)}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Task Title *
            </label>
            <input
              type="text"
              required
              id="new-task-title-input"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Design responsive landing page mockup"
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Provide background, technical details, or success criteria..."
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Meta Grid: Assignee, Priority, Status, Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-800">
            {/* Assignee */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Assignee
              </label>
              <select
                id="new-task-assignee-select"
                value={assigneeId}
                onChange={e => setAssigneeId(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              >
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role} - {u.department})
                  </option>
                ))}
              </select>
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Due Date
              </label>
              <input
                type="date"
                required
                id="new-task-due-date-input"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Priority */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Priority
              </label>
              <select
                id="new-task-priority-select"
                value={priority}
                onChange={e => setPriority(e.target.value as TaskPriority)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
                <option value="urgent">Urgent Priority</option>
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Initial Column
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as TaskStatus)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              >
                <option value="todo">Todo</option>
                <option value="in_progress">In Progress</option>
                <option value="review">Review</option>
                <option value="done">Done</option>
              </select>
            </div>
          </div>

          {/* Labels Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Labels
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_LABELS.map(lbl => {
                const isSelected = selectedLabels.some(l => l.id === lbl.id);
                return (
                  <button
                    key={lbl.id}
                    type="button"
                    onClick={() => toggleLabel(lbl)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-all ${
                      isSelected
                        ? `${lbl.color} ring-1 ring-blue-500/50 shadow-xs font-semibold`
                        : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    {isSelected ? '✓ ' : '+ '}
                    {lbl.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Subtasks */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Subtasks Checklist (Optional)
            </label>
            <div className="space-y-1.5 mb-2">
              {subtasks.map(st => (
                <div
                  key={st.id}
                  className="flex items-center justify-between px-3 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs"
                >
                  <span className="text-slate-800 dark:text-slate-200">{st.title}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSubtask(st.id)}
                    className="text-slate-400 hover:text-rose-500"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newSubtaskTitle}
                onChange={e => setNewSubtaskTitle(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSubtask();
                  }
                }}
                placeholder="Add subtask step (Press Enter)"
                className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400"
              />
              <button
                type="button"
                onClick={handleAddSubtask}
                className="px-3 py-1.5 text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg"
              >
                Add Step
              </button>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsNewTaskModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              id="submit-create-task-btn"
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg shadow-sm shadow-blue-600/20 transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>{isSubmitting ? 'Creating...' : 'Create Task'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
