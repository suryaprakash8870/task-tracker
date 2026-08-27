import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Avatar } from '../common/Avatar';
import { TaskActivity } from '../../types';
import {
  Activity,
  Filter,
  UserCheck,
  RefreshCw,
  MessageSquare,
  Lightbulb,
  Paperclip,
  CheckCircle2,
  ExternalLink,
  Search
} from 'lucide-react';

export const ActivityView: React.FC = () => {
  const { tasks, users, setSelectedTaskId, searchQuery } = useApp();
  const [actorFilter, setActorFilter] = useState<string>('all');
  const [actionTypeFilter, setActionTypeFilter] = useState<string>('all');

  // Flatten all activities with task metadata
  const allActivities = tasks
    .flatMap(task =>
      task.activity.map(act => ({
        ...act,
        taskId: task.id,
        taskTitle: task.title
      }))
    )
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const filteredActivities = allActivities.filter(act => {
    if (actorFilter !== 'all' && act.userId !== actorFilter) return false;
    if (actionTypeFilter !== 'all' && act.action !== actionTypeFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        act.details.toLowerCase().includes(q) ||
        act.taskTitle.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getUserById = (id: string) => users.find(u => u.id === id);

  const getActionIcon = (action: TaskActivity['action']) => {
    switch (action) {
      case 'assigned':
        return <UserCheck className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />;
      case 'status_changed':
        return <RefreshCw className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />;
      case 'commented':
        return <MessageSquare className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />;
      case 'suggestion_added':
        return <Lightbulb className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />;
      case 'attachment_added':
        return <Paperclip className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />;
      case 'subtask_completed':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />;
      default:
        return <Activity className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  return (
    <div id="activity-view" className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto">
      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 font-medium">
            <Filter className="w-3.5 h-3.5" />
            <span>Filters:</span>
          </div>

          {/* Actor */}
          <select
            value={actorFilter}
            onChange={e => setActorFilter(e.target.value)}
            className="px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-hidden"
          >
            <option value="all">All Team Members</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>

          {/* Action Type */}
          <select
            value={actionTypeFilter}
            onChange={e => setActionTypeFilter(e.target.value)}
            className="px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-hidden"
          >
            <option value="all">All Action Types</option>
            <option value="assigned">Assignments</option>
            <option value="status_changed">Status Changes</option>
            <option value="commented">Comments</option>
            <option value="suggestion_added">Suggestions</option>
            <option value="attachment_added">Files & Attachments</option>
            <option value="subtask_completed">Checklist Progress</option>
          </select>
        </div>

        <div className="text-xs text-slate-500">
          Showing {filteredActivities.length} team events
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 sm:p-6">
        {filteredActivities.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            No activity records match the selected filters.
          </div>
        ) : (
          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100 dark:before:bg-slate-800">
            {filteredActivities.map(act => {
              const user = getUserById(act.userId);

              return (
                <div key={act.id} className="relative flex items-start justify-between gap-4 group">
                  {/* Timeline dot */}
                  <div className="absolute -left-6 top-0.5 p-1 rounded-full bg-white dark:bg-slate-900 ring-2 ring-slate-100 dark:ring-slate-800 shadow-xs">
                    {getActionIcon(act.action)}
                  </div>

                  {/* Main Event Card */}
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Avatar user={user} size="xs" />
                      <span className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                        {user?.name || 'Team Member'}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(act.timestamp).toLocaleDateString()} at{' '}
                        {new Date(act.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 dark:text-slate-300 pl-6">
                      {act.details}
                    </p>
                  </div>

                  {/* Link to Task */}
                  <button
                    onClick={() => setSelectedTaskId(act.taskId)}
                    className="px-2.5 py-1 bg-slate-50 dark:bg-slate-800/80 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors flex-shrink-0"
                    title="View task"
                  >
                    <span className="truncate max-w-[150px]">{act.taskTitle}</span>
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
