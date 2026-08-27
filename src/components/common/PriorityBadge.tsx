import React from 'react';
import { TaskPriority, TaskStatus } from '../../types';
import { ArrowUp, ArrowDown, Minus, Flame, CircleDot, Clock, CheckCircle2, Eye } from 'lucide-react';

interface PriorityBadgeProps {
  priority: TaskPriority;
  size?: 'sm' | 'md';
  showIcon?: boolean;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({
  priority,
  size = 'md',
  showIcon = true
}) => {
  const configs: Record<TaskPriority, { label: string; bg: string; text: string; border: string; icon: React.ReactNode }> = {
    urgent: {
      label: 'Urgent',
      bg: 'bg-rose-50 dark:bg-rose-950/40',
      text: 'text-rose-700 dark:text-rose-300',
      border: 'border-rose-200 dark:border-rose-800/60',
      icon: <Flame className="w-3.5 h-3.5" />
    },
    high: {
      label: 'High',
      bg: 'bg-orange-50 dark:bg-orange-950/40',
      text: 'text-orange-700 dark:text-orange-300',
      border: 'border-orange-200 dark:border-orange-800/60',
      icon: <ArrowUp className="w-3.5 h-3.5" />
    },
    medium: {
      label: 'Medium',
      bg: 'bg-blue-50 dark:bg-blue-950/40',
      text: 'text-blue-700 dark:text-blue-300',
      border: 'border-blue-200 dark:border-blue-800/60',
      icon: <Minus className="w-3.5 h-3.5" />
    },
    low: {
      label: 'Low',
      bg: 'bg-slate-100 dark:bg-slate-800/60',
      text: 'text-slate-600 dark:text-slate-400',
      border: 'border-slate-200 dark:border-slate-700',
      icon: <ArrowDown className="w-3.5 h-3.5" />
    }
  };

  const config = configs[priority] || configs.medium;
  const sizeClasses = size === 'sm' ? 'px-1.5 py-0.5 text-[11px] gap-1' : 'px-2 py-0.5 text-xs gap-1.5';

  return (
    <span
      className={`inline-flex items-center font-medium rounded-md border ${sizeClasses} ${config.bg} ${config.text} ${config.border}`}
    >
      {showIcon && config.icon}
      <span>{config.label}</span>
    </span>
  );
};

interface StatusBadgeProps {
  status: TaskStatus;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const configs: Record<TaskStatus, { label: string; bg: string; text: string; border: string; icon: React.ReactNode }> = {
    todo: {
      label: 'Todo',
      bg: 'bg-slate-100 dark:bg-slate-800',
      text: 'text-slate-700 dark:text-slate-300',
      border: 'border-slate-200 dark:border-slate-700',
      icon: <CircleDot className="w-3.5 h-3.5 text-slate-500" />
    },
    in_progress: {
      label: 'In Progress',
      bg: 'bg-blue-50 dark:bg-blue-950/50',
      text: 'text-blue-700 dark:text-blue-300',
      border: 'border-blue-200 dark:border-blue-800',
      icon: <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
    },
    review: {
      label: 'Review',
      bg: 'bg-amber-50 dark:bg-amber-950/50',
      text: 'text-amber-700 dark:text-amber-300',
      border: 'border-amber-200 dark:border-amber-800',
      icon: <Eye className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
    },
    done: {
      label: 'Done',
      bg: 'bg-emerald-50 dark:bg-emerald-950/50',
      text: 'text-emerald-700 dark:text-emerald-300',
      border: 'border-emerald-200 dark:border-emerald-800',
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
    }
  };

  const config = configs[status] || configs.todo;
  const sizeClasses = size === 'sm' ? 'px-1.5 py-0.5 text-[11px] gap-1' : 'px-2 py-0.5 text-xs gap-1.5';

  return (
    <span
      className={`inline-flex items-center font-medium rounded-md border ${sizeClasses} ${config.bg} ${config.text} ${config.border}`}
    >
      {config.icon}
      <span>{config.label}</span>
    </span>
  );
};
