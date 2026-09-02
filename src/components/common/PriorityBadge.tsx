import React from 'react';
import { TaskPriority, TaskStatus } from '../../types';
import { Flame, ArrowUp, Minus, ArrowDown, CircleDot, Clock, Eye, CheckCircle2 } from 'lucide-react';

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
  const configs: Record<TaskPriority, { label: string; bg: string; text: string; border: string; dot: string; icon: React.ReactNode }> = {
    urgent: {
      label: 'Urgent',
      bg: 'bg-rose-50/80',
      text: 'text-rose-700',
      border: 'border-rose-200/80',
      dot: 'bg-rose-500',
      icon: <Flame className="w-3 h-3 text-rose-600" />
    },
    high: {
      label: 'High',
      bg: 'bg-amber-50/80',
      text: 'text-amber-800',
      border: 'border-amber-200/80',
      dot: 'bg-amber-500',
      icon: <ArrowUp className="w-3 h-3 text-amber-600" />
    },
    medium: {
      label: 'Medium',
      bg: 'bg-blue-50/70',
      text: 'text-blue-700',
      border: 'border-blue-200/70',
      dot: 'bg-blue-500',
      icon: <Minus className="w-3 h-3 text-blue-600" />
    },
    low: {
      label: 'Low',
      bg: 'bg-zinc-100/80',
      text: 'text-zinc-700',
      border: 'border-zinc-200/80',
      dot: 'bg-zinc-400',
      icon: <ArrowDown className="w-3 h-3 text-zinc-500" />
    }
  };

  const config = configs[priority] || configs.medium;
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[11px] gap-1.5' : 'px-2.5 py-0.5 text-xs gap-1.5';

  return (
    <span
      className={`inline-flex items-center font-medium rounded-md border tracking-tight shadow-2xs ${sizeClasses} ${config.bg} ${config.text} ${config.border}`}
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
      bg: 'bg-zinc-100',
      text: 'text-zinc-700',
      border: 'border-zinc-200',
      icon: <CircleDot className="w-3 h-3 text-zinc-500" />
    },
    in_progress: {
      label: 'In Progress',
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-200/80',
      icon: <Clock className="w-3 h-3 text-blue-600" />
    },
    review: {
      label: 'In Review',
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-200/80',
      icon: <Eye className="w-3 h-3 text-amber-600" />
    },
    done: {
      label: 'Completed',
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200/80',
      icon: <CheckCircle2 className="w-3 h-3 text-emerald-600" />
    }
  };

  const config = configs[status] || configs.todo;
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[11px] gap-1.5' : 'px-2.5 py-0.5 text-xs gap-1.5';

  return (
    <span
      className={`inline-flex items-center font-medium rounded-md border tracking-tight shadow-2xs ${sizeClasses} ${config.bg} ${config.text} ${config.border}`}
    >
      {config.icon}
      <span>{config.label}</span>
    </span>
  );
};

