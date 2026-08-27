import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Avatar } from '../common/Avatar';
import { PriorityBadge } from '../common/PriorityBadge';
import { Task, TaskStatus, TaskPriority, TaskLabel } from '../../types';
import {
  Plus,
  Clock,
  MessageSquare,
  Paperclip,
  CheckCircle2,
  Lightbulb,
  Filter,
  Search,
  MoreHorizontal,
  ChevronRight,
  ArrowRight
} from 'lucide-react';

const COLUMNS: { id: TaskStatus; title: string; color: string; badgeBg: string }[] = [
  { id: 'todo', title: 'Todo', color: 'border-slate-300 dark:border-slate-700', badgeBg: 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300' },
  { id: 'in_progress', title: 'In Progress', color: 'border-blue-400 dark:border-blue-700', badgeBg: 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300' },
  { id: 'review', title: 'Review', color: 'border-amber-400 dark:border-amber-700', badgeBg: 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300' },
  { id: 'done', title: 'Done', color: 'border-emerald-400 dark:border-emerald-700', badgeBg: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' }
];

export const KanbanBoardView: React.FC = () => {
  const {
    tasks,
    users,
    currentUser,
    setSelectedTaskId,
    setIsNewTaskModalOpen,
    updateTask,
    searchQuery,
    setSearchQuery
  } = useApp();

  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  const todayStr = '2026-08-27';

  // Filtering
  const filteredTasks = tasks.filter(task => {
    // Search query filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match =
        task.title.toLowerCase().includes(q) ||
        task.description.toLowerCase().includes(q) ||
        task.labels.some(l => l.name.toLowerCase().includes(q));
      if (!match) return false;
    }
    // Assignee filter
    if (assigneeFilter !== 'all' && task.assigneeId !== assigneeFilter) {
      return false;
    }
    // Priority filter
    if (priorityFilter !== 'all' && task.priority !== priorityFilter) {
      return false;
    }
    return true;
  });

  const getTasksByStatus = (status: TaskStatus) => {
    return filteredTasks.filter(t => t.status === status);
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    setDraggedTaskId(taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (taskId) {
      await updateTask(taskId, { status: targetStatus });
    }
    setDraggedTaskId(null);
  };

  const getUserById = (id: string) => users.find(u => u.id === id);

  return (
    <div id="kanban-board-view" className="p-4 sm:p-6 space-y-4 max-w-[1600px] mx-auto">
      {/* Board Controls & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center flex-wrap gap-2.5 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 font-medium">
            <Filter className="w-3.5 h-3.5" />
            <span>Filters:</span>
          </div>

          {/* Assignee Filter */}
          <select
            id="board-assignee-filter"
            value={assigneeFilter}
            onChange={e => setAssigneeFilter(e.target.value)}
            className="px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-hidden"
          >
            <option value="all">All Assignees</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>
                {u.name} {u.id === currentUser.id ? '(You)' : ''}
              </option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            id="board-priority-filter"
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
            className="px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-hidden"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {(assigneeFilter !== 'all' || priorityFilter !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setAssigneeFilter('all');
                setPriorityFilter('all');
                setSearchQuery('');
              }}
              className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-semibold"
            >
              Reset Filters
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 hidden sm:inline">
            Showing {filteredTasks.length} of {tasks.length} tasks
          </span>
          <button
            onClick={() => setIsNewTaskModalOpen(true)}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Task</span>
          </button>
        </div>
      </div>

      {/* 4-Column Board Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
        {COLUMNS.map(col => {
          const colTasks = getTasksByStatus(col.id);

          return (
            <div
              key={col.id}
              id={`kanban-col-${col.id}`}
              onDragOver={handleDragOver}
              onDrop={e => handleDrop(e, col.id)}
              className="bg-slate-100/70 dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3.5 flex flex-col min-h-[550px] transition-colors"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-xs text-slate-900 dark:text-slate-100 tracking-tight">
                    {col.title}
                  </h3>
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${col.badgeBg}`}
                  >
                    {colTasks.length}
                  </span>
                </div>

                <button
                  onClick={() => setIsNewTaskModalOpen(true)}
                  title={`Add task to ${col.title}`}
                  className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-md hover:bg-white dark:hover:bg-slate-800 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Tasks List */}
              <div className="space-y-3 flex-1 overflow-y-auto pr-0.5">
                {colTasks.map(task => {
                  const assignee = getUserById(task.assigneeId);
                  const isOverdue = task.dueDate < todayStr && task.status !== 'done';
                  const isDueToday = task.dueDate === todayStr && task.status !== 'done';
                  const completedSubtasks = task.subtasks.filter(s => s.completed).length;

                  return (
                    <div
                      key={task.id}
                      id={`task-card-${task.id}`}
                      draggable
                      onDragStart={e => handleDragStart(e, task.id)}
                      onClick={() => setSelectedTaskId(task.id)}
                      className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 shadow-xs hover:shadow-md transition-all cursor-pointer space-y-2.5 group select-none"
                    >
                      {/* Top Badges: Labels & Priority */}
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex flex-wrap gap-1">
                          {task.labels.map(l => (
                            <span
                              key={l.id}
                              className={`px-1.5 py-0.5 text-[10px] font-medium rounded border ${l.color}`}
                            >
                              {l.name}
                            </span>
                          ))}
                        </div>
                        <PriorityBadge priority={task.priority} size="sm" showIcon={false} />
                      </div>

                      {/* Task Title */}
                      <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 line-clamp-2 leading-relaxed transition-colors">
                        {task.title}
                      </h4>

                      {/* Subtasks checklist preview if exists */}
                      {task.subtasks.length > 0 && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] text-slate-400">
                            <span>Checklist</span>
                            <span>{completedSubtasks}/{task.subtasks.length}</span>
                          </div>
                          <div className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-600"
                              style={{ width: `${(completedSubtasks / task.subtasks.length) * 100}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Bottom Footer: Due Date, Counters & Assignee */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px]">
                        <div className="flex items-center gap-2 text-slate-400">
                          {/* Due Date */}
                          <span
                            className={`flex items-center gap-1 ${
                              isOverdue
                                ? 'text-rose-600 dark:text-rose-400 font-semibold'
                                : isDueToday
                                ? 'text-amber-600 dark:text-amber-400 font-semibold'
                                : ''
                            }`}
                          >
                            <Clock className="w-3 h-3" />
                            <span>{task.dueDate.slice(5)}</span>
                          </span>

                          {/* Comments count */}
                          {task.comments.length > 0 && (
                            <span className="flex items-center gap-0.5 text-slate-400" title={`${task.comments.length} comments`}>
                              <MessageSquare className="w-3 h-3" />
                              <span>{task.comments.length}</span>
                            </span>
                          )}

                          {/* Attachments count */}
                          {task.attachments.length > 0 && (
                            <span className="flex items-center gap-0.5 text-slate-400" title={`${task.attachments.length} files`}>
                              <Paperclip className="w-3 h-3" />
                              <span>{task.attachments.length}</span>
                            </span>
                          )}

                          {/* Suggestions count */}
                          {task.suggestions.length > 0 && (
                            <span className="flex items-center gap-0.5 text-amber-500" title={`${task.suggestions.length} suggestions`}>
                              <Lightbulb className="w-3 h-3" />
                              <span>{task.suggestions.length}</span>
                            </span>
                          )}
                        </div>

                        {/* Assignee Avatar */}
                        <Avatar user={assignee} size="xs" />
                      </div>
                    </div>
                  );
                })}

                {colTasks.length === 0 && (
                  <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-xs border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                    Drop tasks here
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
