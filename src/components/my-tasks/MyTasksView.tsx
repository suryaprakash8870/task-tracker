import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { PriorityBadge, StatusBadge } from '../common/PriorityBadge';
import { TaskActionMenu } from '../common/TaskActionMenu';
import { Task, TaskStatus } from '../../types';
import {
  CheckSquare,
  Clock,
  AlertCircle,
  Calendar,
  CheckCircle2,
  Plus,
  ArrowUpRight
} from 'lucide-react';

type MyTasksTab = 'assigned' | 'today' | 'upcoming' | 'overdue' | 'completed';

export const MyTasksView: React.FC = () => {
  const {
    tasks,
    currentUser,
    setSelectedTaskId,
    setIsNewTaskModalOpen,
    updateTask,
    searchQuery
  } = useApp();

  const [activeTab, setActiveTab] = useState<MyTasksTab>('assigned');
  const [prioritySort] = useState<'all' | 'high_first'>('all');

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
      {/* Top Segmented Controls & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-2.5 rounded-xl border border-slate-200/90 shadow-2xs">
        {/* Modern Segmented Navigation Tabs */}
        <div className="flex items-center gap-1 bg-zinc-100/90 p-1 rounded-lg overflow-x-auto text-xs font-medium">
          <button
            onClick={() => setActiveTab('assigned')}
            className={`px-3 py-1.5 rounded-md whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'assigned'
                ? 'bg-white text-zinc-900 font-semibold shadow-2xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Assigned</span>
            <span className="font-mono text-[11px] px-1.5 py-0.2 rounded-md bg-zinc-200/70 text-zinc-700">
              {counts.assigned}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('today')}
            className={`px-3 py-1.5 rounded-md whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'today'
                ? 'bg-white text-zinc-900 font-semibold shadow-2xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>Today</span>
            {counts.today > 0 && (
              <span className="font-mono text-[11px] px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-800 font-semibold">
                {counts.today}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('upcoming')}
            className={`px-3 py-1.5 rounded-md whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'upcoming'
                ? 'bg-white text-zinc-900 font-semibold shadow-2xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-blue-500" />
            <span>Upcoming</span>
            <span className="font-mono text-[11px] opacity-70">({counts.upcoming})</span>
          </button>

          <button
            onClick={() => setActiveTab('overdue')}
            className={`px-3 py-1.5 rounded-md whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'overdue'
                ? 'bg-white text-rose-700 font-semibold shadow-2xs'
                : 'text-zinc-600 hover:text-rose-600'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
            <span>Overdue</span>
            {counts.overdue > 0 && (
              <span className="font-mono text-[11px] px-1.5 py-0.2 rounded-md bg-rose-100 text-rose-800 font-semibold">
                {counts.overdue}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('completed')}
            className={`px-3 py-1.5 rounded-md whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'completed'
                ? 'bg-white text-emerald-700 font-semibold shadow-2xs'
                : 'text-zinc-600 hover:text-emerald-700'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Completed</span>
            <span className="font-mono text-[11px] opacity-70">({counts.completed})</span>
          </button>
        </div>

        <button
          onClick={() => setIsNewTaskModalOpen(true)}
          className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-md text-xs font-semibold shadow-2xs flex items-center justify-center gap-1.5 transition-colors flex-shrink-0 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Task</span>
        </button>
      </div>

      {/* Task List Table */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {filteredTasks.length === 0 ? (
          <div className="py-16 text-center text-zinc-400 text-xs">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-zinc-300" />
            <p className="font-semibold text-sm text-zinc-700">No tasks in this view</p>
            <p className="text-xs text-zinc-400 mt-0.5">Everything is up to date.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredTasks.map(task => {
              const isOverdue = task.dueDate < todayStr && task.status !== 'done';
              const isDueToday = task.dueDate === todayStr && task.status !== 'done';
              const completedSubtasks = task.subtasks.filter(s => s.completed).length;

              return (
                <div
                  key={task.id}
                  onClick={() => setSelectedTaskId(task.id)}
                  className="p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:bg-zinc-50 cursor-pointer transition-colors group"
                >
                  {/* Left: Quick complete checkbox & Title */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <button
                      onClick={e => handleToggleDone(e, task)}
                      title={task.status === 'done' ? 'Mark as open' : 'Mark as done'}
                      className={`w-4.5 h-4.5 rounded border flex items-center justify-center transition-all cursor-pointer ${
                        task.status === 'done'
                          ? 'bg-zinc-900 border-zinc-900 text-white'
                          : 'border-zinc-300 hover:border-zinc-500 bg-white'
                      }`}
                    >
                      {task.status === 'done' && <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-semibold group-hover:text-blue-600 truncate transition-colors ${
                            task.status === 'done'
                              ? 'line-through text-zinc-400'
                              : 'text-zinc-900'
                          }`}
                        >
                          {task.title}
                        </span>
                      </div>

                      <div className="flex items-center flex-wrap gap-2 text-[11px] text-zinc-500 mt-1">
                        <span
                          className={`flex items-center gap-1 ${
                            isOverdue
                              ? 'text-rose-600 font-semibold'
                              : isDueToday
                              ? 'text-amber-600 font-semibold'
                              : 'text-zinc-500'
                          }`}
                        >
                          <Clock className="w-3 h-3" />
                          <span className="font-mono text-[10px]">
                            {isOverdue ? `Overdue (${task.dueDate})` : isDueToday ? 'Due Today' : `Due ${task.dueDate}`}
                          </span>
                        </span>

                        {task.subtasks.length > 0 && (
                          <span className="font-mono text-[10px]">
                            • {completedSubtasks}/{task.subtasks.length} subtasks
                          </span>
                        )}

                        {task.labels.map(l => (
                          <span
                            key={l.id}
                            className={`px-1.5 py-0.2 rounded-md text-[10px] font-medium border ${l.color}`}
                          >
                            {l.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right: Status & Priority Badges & Action Menu */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <StatusBadge status={task.status} size="sm" />
                    <PriorityBadge priority={task.priority} size="sm" />
                    <TaskActionMenu task={task} onOpenDetail={() => setSelectedTaskId(task.id)} />
                    <ArrowUpRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-900 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
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

