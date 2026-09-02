import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Avatar } from '../common/Avatar';
import { PriorityBadge, StatusBadge } from '../common/PriorityBadge';
import { ExportReportModal } from '../common/ExportReportModal';
import {
  CheckSquare,
  Clock,
  AlertCircle,
  Calendar,
  CheckCircle2,
  Activity as ActivityIcon,
  Lightbulb,
  ArrowRight,
  Plus,
  Sparkles,
  ChevronRight,
  ArrowUpRight,
  Download
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

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const todayStr = '2026-08-27';

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

  const myTasks = filteredTasks.filter(t => t.assigneeId === currentUser.id);
  const myOpenTasks = myTasks.filter(t => t.status !== 'done');
  const dueTodayTasks = filteredTasks.filter(t => t.dueDate === todayStr && t.status !== 'done');
  const overdueTasks = filteredTasks.filter(t => t.dueDate < todayStr && t.status !== 'done');
  const upcomingTasks = filteredTasks.filter(t => t.dueDate > todayStr && t.status !== 'done');
  const completedTasks = filteredTasks.filter(t => t.status === 'done');

  const allActivities = tasks
    .flatMap(t => t.activity.map(a => ({ ...a, taskTitle: t.title, task: t })))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 6);

  const openSuggestions = tasks
    .flatMap(t => t.suggestions.map(s => ({ ...s, taskTitle: t.title, taskId: t.id })))
    .filter(s => s.status === 'open')
    .slice(0, 4);

  const getUserById = (id: string) => users.find(u => u.id === id);

  return (
    <div id="dashboard-view" className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Workspace Header & Action Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-xl border border-slate-200/90 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 text-zinc-500 text-[11px] font-semibold uppercase tracking-wider mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Sprint Active</span>
            <span>•</span>
            <span>{currentUser.role} View</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900">
            Welcome back, {currentUser.name.split(' ')[0]}
          </h2>
          <p className="text-xs sm:text-sm text-zinc-600 mt-1">
            You have <span className="font-semibold text-zinc-900">{myOpenTasks.length} assigned tasks</span> across active projects, including{' '}
            <span className="font-semibold text-rose-600">{overdueTasks.length} overdue</span> and{' '}
            <span className="font-semibold text-amber-600">{dueTodayTasks.length} due today</span>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="px-3 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-lg text-xs font-semibold border border-zinc-200 transition-all flex items-center gap-1.5 cursor-pointer"
            title="Export Team Workload to Excel or Manager PDF"
          >
            <Download className="w-3.5 h-3.5 text-zinc-600" />
            <span>Export Report</span>
          </button>
          <button
            onClick={() => setCurrentView('ai-assistant')}
            className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold border border-indigo-200/70 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ask AI</span>
          </button>
          <button
            onClick={() => setCurrentView('board')}
            className="px-3 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-lg text-xs font-semibold border border-zinc-200 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span>Team Board</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsNewTaskModalOpen(true)}
            className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-semibold shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* My Tasks */}
        <div
          onClick={() => setCurrentView('my-tasks')}
          className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-2xs hover:border-zinc-400 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-xs font-medium text-zinc-600">My Tasks</span>
            <CheckSquare className="w-4 h-4 text-zinc-700 group-hover:text-zinc-900 transition-colors" />
          </div>
          <div className="text-2xl font-bold font-mono text-zinc-900 tracking-tight">
            {myOpenTasks.length}
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">{myTasks.length} total assigned</p>
        </div>

        {/* Due Today */}
        <div
          onClick={() => setCurrentView('my-tasks')}
          className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-2xs hover:border-amber-400 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-xs font-medium text-zinc-600">Due Today</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-600 tracking-tight">
            {dueTodayTasks.length}
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">Requires immediate attention</p>
        </div>

        {/* Overdue */}
        <div
          onClick={() => setCurrentView('my-tasks')}
          className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-2xs hover:border-rose-400 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-xs font-medium text-zinc-600">Overdue</span>
            <AlertCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-600 tracking-tight">
            {overdueTasks.length}
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">Needs resolution</p>
        </div>

        {/* Upcoming */}
        <div
          onClick={() => setCurrentView('calendar')}
          className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-2xs hover:border-blue-400 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-xs font-medium text-zinc-600">Upcoming</span>
            <Calendar className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-blue-600 tracking-tight">
            {upcomingTasks.length}
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">Scheduled for this sprint</p>
        </div>

        {/* Completed */}
        <div
          onClick={() => setCurrentView('board')}
          className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-2xs hover:border-emerald-400 transition-all cursor-pointer group col-span-2 sm:col-span-1"
        >
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-xs font-medium text-zinc-600">Completed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-600 tracking-tight">
            {completedTasks.length}
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">Sprint velocity</p>
        </div>
      </div>

      {/* Main Grid: My Action Items & Team Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Priority Tasks */}
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-zinc-700" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-800">
                  Assigned to Me
                </h3>
                <span className="text-xs font-mono text-zinc-400 font-semibold">({myOpenTasks.length})</span>
              </div>
              <button
                onClick={() => setCurrentView('my-tasks')}
                className="text-xs text-zinc-600 hover:text-zinc-900 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>View all</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {myOpenTasks.length === 0 ? (
              <div className="text-center py-12 text-zinc-400 text-xs">
                No active tasks assigned to you right now.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {myOpenTasks.map(task => {
                  const isOverdue = task.dueDate < todayStr;
                  const isDueToday = task.dueDate === todayStr;

                  return (
                    <div
                      key={task.id}
                      onClick={() => setSelectedTaskId(task.id)}
                      className="py-3 px-2 flex items-center justify-between gap-3 hover:bg-zinc-50 rounded-lg cursor-pointer transition-colors group"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <StatusBadge status={task.status} size="sm" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-zinc-900 group-hover:text-blue-600 truncate">
                            {task.title}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-zinc-500 mt-0.5">
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
                        {task.labels.slice(0, 1).map(l => (
                          <span
                            key={l.id}
                            className={`hidden sm:inline-block px-2 py-0.5 text-[10px] font-medium rounded-md border ${l.color}`}
                          >
                            {l.name}
                          </span>
                        ))}
                        <ArrowUpRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-900 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Open Suggestions Hub Preview */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-800">
                  Open Suggestions & Reviews
                </h3>
              </div>
              <button
                onClick={() => setCurrentView('suggestions')}
                className="text-xs text-zinc-600 hover:text-zinc-900 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>View all</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {openSuggestions.length === 0 ? (
              <p className="text-xs text-zinc-400 py-3 text-center">No open suggestions currently.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {openSuggestions.map(sug => {
                  const author = getUserById(sug.userId);
                  return (
                    <div
                      key={sug.id}
                      onClick={() => setSelectedTaskId(sug.taskId)}
                      className="p-3 bg-zinc-50 border border-zinc-200/80 rounded-lg hover:border-zinc-300 hover:bg-white transition-all cursor-pointer text-xs space-y-1.5 shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Avatar user={author} size="xs" />
                          <span className="font-semibold text-zinc-900 text-xs">
                            {author?.name}
                          </span>
                        </div>
                        <span className="text-[10px] text-zinc-500 truncate max-w-[110px]">
                          on {sug.taskTitle}
                        </span>
                      </div>
                      <p className="text-zinc-700 line-clamp-2 italic text-xs">
                        "{sug.content}"
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Team Activity Stream & Workload */}
        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ActivityIcon className="w-4 h-4 text-zinc-700" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-800">
                  Recent Activity
                </h3>
              </div>
              <button
                onClick={() => setCurrentView('activity')}
                className="text-xs text-zinc-600 hover:text-zinc-900 font-semibold cursor-pointer"
              >
                Log
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              {allActivities.map(act => {
                const user = getUserById(act.userId);
                return (
                  <div
                    key={act.id}
                    onClick={() => act.taskId && setSelectedTaskId(act.taskId)}
                    className="flex items-start gap-2.5 p-2 rounded-md hover:bg-zinc-50 cursor-pointer transition-colors"
                  >
                    <Avatar user={user} size="xs" />
                    <div className="flex-1 min-w-0">
                      <p className="text-zinc-800 leading-snug">
                        <strong className="text-zinc-900 font-semibold">{user?.name}</strong>{' '}
                        {act.details}
                      </p>
                      <span className="text-[10px] text-zinc-400 mt-0.5 block font-mono">
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

          {/* Team Workload Widget */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-800">
                Team Workload
              </h3>
              <button
                onClick={() => setCurrentView('team')}
                className="text-xs text-zinc-600 hover:text-zinc-900 font-semibold cursor-pointer"
              >
                Manage
              </button>
            </div>

            <div className="space-y-2.5">
              {users.map(u => {
                const userTasks = tasks.filter(t => t.assigneeId === u.id && t.status !== 'done');
                return (
                  <div key={u.id} className="flex items-center justify-between text-xs py-1">
                    <div className="flex items-center gap-2">
                      <Avatar user={u} size="xs" />
                      <span className="font-medium text-zinc-800">
                        {u.name}
                      </span>
                    </div>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 font-mono">
                      {userTasks.length} open
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Export Report Modal */}
      <ExportReportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />
    </div>
  );
};

