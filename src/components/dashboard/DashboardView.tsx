import React from 'react';
import { useApp } from '../../context/AppContext';
import { Avatar } from '../common/Avatar';
import { PriorityBadge, StatusBadge } from '../common/PriorityBadge';
import { Task } from '../../types';
import {
  CheckSquare,
  Clock,
  AlertCircle,
  Calendar,
  CheckCircle2,
  Activity as ActivityIcon,
  Lightbulb,
  ArrowRight,
  PlusCircle,
  TrendingUp,
  FolderClosed,
  ChevronRight
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const {
    tasks,
    currentUser,
    users,
    setCurrentView,
    setSelectedTaskId,
    setIsNewTaskModalOpen,
    searchQuery
  } = useApp();

  // Helper date calculations
  const todayStr = '2026-08-27'; // Consistent relative date based on current anchor

  // Filter tasks based on global search if any
  const filteredTasks = tasks.filter(t => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.title.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.labels.some(l => l.name.toLowerCase().includes(q))
    );
  });

  // Metric 1: My Tasks (Open)
  const myTasks = filteredTasks.filter(t => t.assigneeId === currentUser.id);
  const myOpenTasks = myTasks.filter(t => t.status !== 'done');

  // Metric 2: Due Today
  const dueTodayTasks = filteredTasks.filter(t => t.dueDate === todayStr && t.status !== 'done');

  // Metric 3: Overdue
  const overdueTasks = filteredTasks.filter(t => t.dueDate < todayStr && t.status !== 'done');

  // Metric 4: Upcoming
  const upcomingTasks = filteredTasks.filter(t => t.dueDate > todayStr && t.status !== 'done');

  // Metric 5: Recently Completed
  const completedTasks = filteredTasks.filter(t => t.status === 'done');

  // All activities aggregated and sorted
  const allActivities = tasks
    .flatMap(t => t.activity.map(a => ({ ...a, taskTitle: t.title, task: t })))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 7);

  // All open suggestions
  const openSuggestions = tasks
    .flatMap(t => t.suggestions.map(s => ({ ...s, taskTitle: t.title, taskId: t.id })))
    .filter(s => s.status === 'open')
    .slice(0, 4);

  const getUserById = (id: string) => users.find(u => u.id === id);

  return (
    <div id="dashboard-view" className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Welcome & Quick Summary Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 text-white p-5 sm:p-6 rounded-2xl shadow-lg shadow-slate-950/10 border border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <span>Creative Tech Workspace</span>
            <span>•</span>
            <span>Sprint Active</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            Welcome back, {currentUser.name.split(' ')[0]}!
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            You have <strong className="text-white">{myOpenTasks.length} tasks</strong> assigned to you, including{' '}
            <strong className="text-rose-300">{overdueTasks.length} overdue</strong> and{' '}
            <strong className="text-amber-300">{dueTodayTasks.length} due today</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setCurrentView('board')}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold border border-slate-700 transition-colors flex items-center gap-1.5"
          >
            <span>Open Board</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsNewTaskModalOpen(true)}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-sm shadow-blue-900/40 transition-colors flex items-center gap-1.5"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* My Tasks */}
        <div
          onClick={() => setCurrentView('my-tasks')}
          className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs hover:border-blue-500 dark:hover:border-blue-500 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">My Tasks</span>
            <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {myOpenTasks.length}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">{myTasks.length} total assigned</p>
        </div>

        {/* Due Today */}
        <div
          onClick={() => setCurrentView('my-tasks')}
          className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs hover:border-amber-500 dark:hover:border-amber-500 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Due Today</span>
            <Clock className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            {dueTodayTasks.length}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Requires focus today</p>
        </div>

        {/* Overdue */}
        <div
          onClick={() => setCurrentView('my-tasks')}
          className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs hover:border-rose-500 dark:hover:border-rose-500 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Overdue</span>
            <AlertCircle className="w-4 h-4 text-rose-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
            {overdueTasks.length}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Needs attention</p>
        </div>

        {/* Upcoming */}
        <div
          onClick={() => setCurrentView('calendar')}
          className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs hover:border-blue-500 dark:hover:border-blue-500 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Upcoming</span>
            <Calendar className="w-4 h-4 text-blue-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {upcomingTasks.length}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Scheduled for next days</p>
        </div>

        {/* Completed */}
        <div
          onClick={() => setCurrentView('board')}
          className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs hover:border-emerald-500 dark:hover:border-emerald-500 transition-all cursor-pointer group col-span-2 sm:col-span-1"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Completed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {completedTasks.length}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Sprint velocity</p>
        </div>
      </div>

      {/* Main Grid: My Action Items & Team Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: My Urgent & Due Tasks */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                  My Priority Tasks
                </h3>
              </div>
              <button
                onClick={() => setCurrentView('my-tasks')}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center gap-1"
              >
                <span>View all</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {myOpenTasks.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs">
                🎉 All caught up! No open tasks assigned to you right now.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {myOpenTasks.map(task => {
                  const isOverdue = task.dueDate < todayStr;
                  const isDueToday = task.dueDate === todayStr;

                  return (
                    <div
                      key={task.id}
                      onClick={() => setSelectedTaskId(task.id)}
                      className="py-3 px-2 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl cursor-pointer transition-colors group"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <StatusBadge status={task.status} size="sm" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">
                            {task.title}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
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
                              {isOverdue
                                ? `Overdue (${task.dueDate})`
                                : isDueToday
                                ? 'Due Today'
                                : `Due ${task.dueDate}`}
                            </span>
                            {task.subtasks.length > 0 && (
                              <span>
                                • {task.subtasks.filter(s => s.completed).length}/{task.subtasks.length} subtasks
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <PriorityBadge priority={task.priority} size="sm" />
                        <div className="flex gap-1">
                          {task.labels.slice(0, 1).map(l => (
                            <span
                              key={l.id}
                              className={`hidden sm:inline-block px-2 py-0.5 text-[10px] font-medium rounded border ${l.color}`}
                            >
                              {l.name}
                            </span>
                          ))}
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Open Suggestions Hub Preview */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                  Recent Team Suggestions
                </h3>
              </div>
              <button
                onClick={() => setCurrentView('suggestions')}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center gap-1"
              >
                <span>View Hub</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {openSuggestions.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">No open suggestions currently.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {openSuggestions.map(sug => {
                  const author = getUserById(sug.userId);
                  return (
                    <div
                      key={sug.id}
                      onClick={() => setSelectedTaskId(sug.taskId)}
                      className="p-3 bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 rounded-xl hover:border-amber-400 transition-colors cursor-pointer text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Avatar user={author} size="xs" />
                          <span className="font-semibold text-slate-900 dark:text-slate-100">
                            {author?.name}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 truncate max-w-[100px]">
                          on {sug.taskTitle}
                        </span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 line-clamp-2 italic">
                        "{sug.content}"
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Team Activity Stream & Members Online */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ActivityIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                  Recent Team Activity
                </h3>
              </div>
              <button
                onClick={() => setCurrentView('activity')}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold"
              >
                All
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {allActivities.map(act => {
                const user = getUserById(act.userId);
                return (
                  <div
                    key={act.id}
                    onClick={() => act.taskId && setSelectedTaskId(act.taskId)}
                    className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors"
                  >
                    <Avatar user={user} size="xs" />
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-800 dark:text-slate-200 leading-snug">
                        <strong className="text-slate-900 dark:text-slate-100">{user?.name}</strong>{' '}
                        {act.details}
                      </p>
                      <span className="text-[10px] text-slate-400 mt-0.5 block">
                        {new Date(act.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Team Quick Workload Widget */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                Team Workload
              </h3>
              <button
                onClick={() => setCurrentView('team')}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold"
              >
                Manage
              </button>
            </div>

            <div className="space-y-2.5">
              {users.map(u => {
                const userTasks = tasks.filter(t => t.assigneeId === u.id && t.status !== 'done');
                return (
                  <div key={u.id} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Avatar user={u} size="xs" />
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {u.name}
                      </span>
                    </div>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {userTasks.length} open
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
