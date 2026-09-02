import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { TaskStatus, TaskPriority, TaskLabel } from '../../types';
import { Avatar } from '../common/Avatar';
import { CustomSelect } from '../common/CustomSelect';
import { X, Plus, Trash2, Calendar, Tag, UserCheck, AlertCircle } from 'lucide-react';

const PRESET_LABELS: TaskLabel[] = [
  { id: 'l-design', name: 'Design', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { id: 'l-frontend', name: 'Frontend', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { id: 'l-backend', name: 'Backend', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { id: 'l-qa', name: 'QA & Testing', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { id: 'l-devops', name: 'DevOps', color: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
  { id: 'l-docs', name: 'Docs', color: 'bg-slate-100 text-slate-700 border-slate-200' }
];

export const NewTaskModal: React.FC = () => {
  const { isNewTaskModalOpen, setIsNewTaskModalOpen, users, currentUser, createTask, showToast } = useApp();

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

      showToast({
        type: 'success',
        title: 'Task Created',
        message: `Task "${title.trim()}" was created successfully.`
      });

      // Reset form
      setTitle('');
      setDescription('');
      setStatus('todo');
      setPriority('medium');
      setSubtasks([]);
      setNotes('');
      setIsNewTaskModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create task';
      console.error('Failed to create task', err);
      showToast({
        type: 'error',
        title: 'Error Creating Task',
        message: msg
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="new-task-modal-overlay"
      className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto"
    >
      <div
        id="new-task-modal-card"
        className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <div>
            <h3 className="font-semibold text-slate-900 text-base">
              Create New Task
            </h3>
            <p className="text-xs text-slate-500">Add an initiative to your workspace board</p>
          </div>
          <button
            onClick={() => setIsNewTaskModalOpen(false)}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Task Title *
            </label>
            <input
              type="text"
              required
              id="new-task-title-input"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Design responsive landing page mockup"
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Provide background, technical details, or success criteria..."
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Meta Grid: Assignee, Priority, Status, Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
            {/* Assignee */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Assignee
              </label>
              <CustomSelect
                id="new-task-assignee-select"
                value={assigneeId}
                onChange={setAssigneeId}
                size="sm"
                className="w-full"
                options={users.map(u => ({
                  value: u.id,
                  label: `${u.name} (${u.role})`
                }))}
              />
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Due Date
              </label>
              <input
                type="date"
                required
                id="new-task-due-date-input"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Priority */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Priority
              </label>
              <CustomSelect
                id="new-task-priority-select"
                value={priority}
                onChange={val => setPriority(val as TaskPriority)}
                size="sm"
                className="w-full"
                options={[
                  { value: 'urgent', label: 'Urgent', colorDot: '#e11d48' },
                  { value: 'high', label: 'High', colorDot: '#f59e0b' },
                  { value: 'medium', label: 'Medium', colorDot: '#3b82f6' },
                  { value: 'low', label: 'Low', colorDot: '#94a3b8' }
                ]}
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Initial Column
              </label>
              <CustomSelect
                id="new-task-status-select"
                value={status}
                onChange={val => setStatus(val as TaskStatus)}
                size="sm"
                className="w-full"
                options={[
                  { value: 'todo', label: 'Todo', colorDot: '#94a3b8' },
                  { value: 'in_progress', label: 'In Progress', colorDot: '#3b82f6' },
                  { value: 'review', label: 'Review', colorDot: '#f59e0b' },
                  { value: 'done', label: 'Done', colorDot: '#10b981' }
                ]}
              />
            </div>
          </div>

          {/* Labels Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
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
                        : 'border-slate-200 text-slate-500 hover:border-slate-300'
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
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Subtasks Checklist (Optional)
            </label>
            <div className="space-y-1.5 mb-2">
              {subtasks.map(st => (
                <div
                  key={st.id}
                  className="flex items-center justify-between px-3 py-1.5 bg-slate-50 rounded-lg text-xs"
                >
                  <span className="text-slate-800">{st.title}</span>
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
                className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-900 placeholder-slate-400"
              />
              <button
                type="button"
                onClick={handleAddSubtask}
                className="px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg"
              >
                Add Step
              </button>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsNewTaskModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
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
