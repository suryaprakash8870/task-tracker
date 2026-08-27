import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Avatar } from '../common/Avatar';
import { PriorityBadge, StatusBadge } from '../common/PriorityBadge';
import { Task, TaskStatus } from '../../types';
import {
  CheckSquare,
  Clock,
  AlertCircle,
  Calendar,
  CheckCircle2,
  Filter,
  Search,
  Plus,
  ChevronRight,
  MoreVertical
} from 'lucide-react';

type MyTasksTab = 'assigned' | 'today' | 'upcoming' | 'overdue' | 'completed';

export const MyTasksView: React.FC = () => {
  const {
    tasks,
    currentUser,
    users,
    setSelectedTaskId,
    setIsNewTaskModalOpen,
    updateTask,
    searchQuery
  } = useApp();

  const [activeTab, setActiveTab] = useState<MyTasksTab>('assigned');
  const [prioritySort, setPrioritySort] = useState<'all' | 'high_first'>('all');

  const todayStr = '2026-08-27';

  // Base tasks for current user
  const userTasks = tasks.filter(t => t.assigneeId === currentUser.id);

  // Filter based on tab
  const getFilteredTasks = () => {
    let list: Task[] = [];
    switch (activeTab) {
      case 'assigned':
        list = userTasks.filter(t => t.status !== 'done');
        break;
      case 'today':
        list = userTasks.filter(t => t.dueDate === todayStr && t.status !== 'done');
        break;
      case 'upcoming':
        list = userTasks.filter(t => t.dueDate > todayStr && t.status !== 'done');
        break;
      case 'overdue':
        list = userTasks.filter(t => t.dueDate < todayStr && t.status !== 'done');
        break;
      case 'completed':
        list = userTasks.filter(t => t.status === 'done');
        break;
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        t =>
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.labels.some(l => l.name.toLowerCase().includes(q))
      );
    }

    if (prioritySort === 'high_first') {
      const pWeights = { urgent: 4, high: 3, medium: 2, low: 1 };
      list.sort((a, b) => pWeights[b.priority] - pWeights[a.priority]);
    }

    return list;
  };

  const filteredTasks = getFilteredTasks();

  const counts = {
    assigned: userTasks.filter(t => t.status !== 'done').length,
    today: userTasks.filter(t => t.dueDate === todayStr && t.status !== 'done').length,
    upcoming: userTasks.filter(t => t.dueDate > todayStr && t.status !== 'done').length,
    overdue: userTasks.filter(t => t.dueDate < todayStr && t.status !== 'done').length,
    completed: userTasks.filter(t => t.status === 'done').length
  };

  const handleToggleDone = async (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    const newStatus: TaskStatus = task.status === 'done' ? 'in_progress' : 'done';
    await updateTask(task.id, { status: newStatus });
  };

  return (
    <div id="my-tasks-view" className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto">
      {/* Top Tabs Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-2 sm:p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 text-xs font-medium">
          <button
            onClick={() => setActiveTab('assigned')}
            className={`px-3 py-2 rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === 'assigned'
                ? 'bg-blue-600 text-white font-semibold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Assigned to Me</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'assigned' ? 'bg-blue-700 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
              {counts.assigned}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('today')}
            className={`px-3 py-2 rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === 'today'
                ? 'bg-blue-600 text-white font-semibold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Due Today</span>
            {counts.today > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-white">
                {counts.today}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('upcoming')}
            className={`px-3 py-2 rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === 'upcoming'
                ? 'bg-blue-600 text-white font-semibold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Upcoming</span>
            <span className="text-[10px] opacity-70">({counts.upcoming})</span>
          </button>

          <button
            onClick={() => setActiveTab('overdue')}
            className={`px-3 py-2 rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === 'overdue'
                ? 'bg-rose-600 text-white font-semibold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Overdue</span>
            {counts.overdue > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500 text-white font-bold">
                {counts.overdue}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('completed')}
            className={`px-3 py-2 rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === 'completed'
                ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Completed</span>
            <span className="text-[10px] opacity-70">({counts.completed})</span>
          </button>
        </div>

        <button
          onClick={() => setIsNewTaskModalOpen(true)}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center justify-center gap-1 transition-colors flex-shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Task</span>
        </button>
      </div>

      {/* Task List / Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {filteredTasks.length === 0 ? (
          <div className="py-16 text-center text-slate-400 dark:text-slate-500 text-xs">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
            <p className="font-semibold text-sm text-slate-700 dark:text-slate-300">No tasks in this view</p>
            <p className="text-xs text-slate-400 mt-0.5">Everything looks great and up to date!</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredTasks.map(task => {
              const isOverdue = task.dueDate < todayStr && task.status !== 'done';
              const isDueToday = task.dueDate === todayStr && task.status !== 'done';
              const completedSubtasks = task.subtasks.filter(s => s.completed).length;

              return (
                <div
                  key={task.id}
                  onClick={() => setSelectedTaskId(task.id)}
                  className="p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors group"
                >
                  {/* Left: Quick complete checkbox & Title */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <button
                      onClick={e => handleToggleDone(e, task)}
                      title={task.status === 'done' ? 'Mark as open' : 'Mark as done'}
                      className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                        task.status === 'done'
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'border-slate-300 dark:border-slate-600 hover:border-blue-600 bg-white dark:bg-slate-800'
                      }`}
                    >
                      {task.status === 'done' && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-semibold group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate ${
                            task.status === 'done'
                              ? 'line-through text-slate-400 dark:text-slate-500'
                              : 'text-slate-900 dark:text-slate-100'
                          }`}
                        >
                          {task.title}
                        </span>
                      </div>

                      <div className="flex items-center flex-wrap gap-2 text-[11px] text-slate-400 mt-1">
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
                          <span>
                            {isOverdue ? `Overdue (${task.dueDate})` : isDueToday ? 'Due Today' : `Due ${task.dueDate}`}
                          </span>
                        </span>

                        {task.subtasks.length > 0 && (
                          <span>
                            • {completedSubtasks}/{task.subtasks.length} subtasks
                          </span>
                        )}

                        {task.labels.map(l => (
                          <span
                            key={l.id}
                            className={`px-1.5 py-0.2 rounded text-[10px] border ${l.color}`}
                          >
                            {l.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right: Status & Priority Badges */}
                  <div className="flex items-center gap-2.5 flex-shrink-0">
                    <StatusBadge status={task.status} size="sm" />
                    <PriorityBadge priority={task.priority} size="sm" />
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
