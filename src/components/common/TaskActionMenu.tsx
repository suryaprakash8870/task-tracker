import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Task, TaskPriority, TaskStatus } from '../../types';
import { exportService } from '../../services/exportService';
import {
  MoreVertical,
  Trash2,
  Edit3,
  CheckCircle2,
  Circle,
  PlayCircle,
  Clock,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Minus,
  FileSpreadsheet,
  FileText
} from 'lucide-react';

interface TaskActionMenuProps {
  task: Task;
  onOpenDetail?: () => void;
  className?: string;
}

export const TaskActionMenu: React.FC<TaskActionMenuProps> = ({
  task,
  onOpenDetail,
  className = ''
}) => {
  const { deleteTask, updateTask, showToast, showConfirmDialog, setSelectedTaskId, users, workspace } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(false);

    showConfirmDialog({
      title: 'Delete Task?',
      message: `Are you sure you want to delete "${task.title}"? This will permanently remove the task along with its subtasks, notes, and comments.`,
      confirmLabel: 'Delete Task',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteTask(task.id);
          showToast({
            type: 'info',
            title: 'Task Deleted',
            message: `"${task.title}" was removed.`
          });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Could not delete task';
          showToast({
            type: 'error',
            title: 'Delete Failed',
            message: msg
          });
        }
      }
    });
  };

  const handleStatusChange = async (e: React.MouseEvent, status: TaskStatus) => {
    e.stopPropagation();
    setIsOpen(false);
    await updateTask(task.id, { status });
    showToast({
      type: 'success',
      message: `Task moved to ${status.replace('_', ' ')}`
    });
  };

  const handlePriorityChange = async (e: React.MouseEvent, priority: TaskPriority) => {
    e.stopPropagation();
    setIsOpen(false);
    await updateTask(task.id, { priority });
    showToast({
      type: 'success',
      message: `Priority set to ${priority}`
    });
  };

  const handleViewDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(false);
    if (onOpenDetail) {
      onOpenDetail();
    } else {
      setSelectedTaskId(task.id);
    }
  };

  return (
    <div ref={menuRef} className={`relative inline-block ${className}`} onClick={e => e.stopPropagation()}>
      <button
        type="button"
        id={`task-menu-btn-${task.id}`}
        onClick={e => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        title="Task actions"
        className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors opacity-80 hover:opacity-100 focus:outline-hidden"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 z-50 mt-1 w-48 bg-white rounded-xl border border-slate-200/90 shadow-xl py-1 text-xs text-slate-700 animate-in fade-in-50 zoom-in-95 duration-100 focus:outline-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* View Details */}
          <button
            type="button"
            onClick={handleViewDetails}
            className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-50 transition-colors text-left font-medium text-slate-700"
          >
            <Edit3 className="w-3.5 h-3.5 text-slate-400" />
            <span>View & Edit Details</span>
          </button>

          <div className="h-px bg-slate-100 my-1" />

          {/* Quick Status Submenu */}
          <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Set Status
          </div>
          <div className="grid grid-cols-2 gap-0.5 px-1.5 py-0.5">
            <button
              type="button"
              onClick={e => handleStatusChange(e, 'todo')}
              className={`px-2 py-1 rounded-md flex items-center gap-1.5 text-[11px] transition-colors ${
                task.status === 'todo' ? 'bg-slate-100 font-semibold text-slate-900' : 'hover:bg-slate-50 text-slate-600'
              }`}
            >
              <Circle className="w-2.5 h-2.5 text-slate-400" />
              <span>To Do</span>
            </button>
            <button
              type="button"
              onClick={e => handleStatusChange(e, 'in_progress')}
              className={`px-2 py-1 rounded-md flex items-center gap-1.5 text-[11px] transition-colors ${
                task.status === 'in_progress' ? 'bg-blue-50 font-semibold text-blue-700' : 'hover:bg-slate-50 text-slate-600'
              }`}
            >
              <PlayCircle className="w-2.5 h-2.5 text-blue-500" />
              <span>In Prog</span>
            </button>
            <button
              type="button"
              onClick={e => handleStatusChange(e, 'review')}
              className={`px-2 py-1 rounded-md flex items-center gap-1.5 text-[11px] transition-colors ${
                task.status === 'review' ? 'bg-amber-50 font-semibold text-amber-700' : 'hover:bg-slate-50 text-slate-600'
              }`}
            >
              <Clock className="w-2.5 h-2.5 text-amber-500" />
              <span>Review</span>
            </button>
            <button
              type="button"
              onClick={e => handleStatusChange(e, 'done')}
              className={`px-2 py-1 rounded-md flex items-center gap-1.5 text-[11px] transition-colors ${
                task.status === 'done' ? 'bg-emerald-50 font-semibold text-emerald-700' : 'hover:bg-slate-50 text-slate-600'
              }`}
            >
              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />
              <span>Done</span>
            </button>
          </div>

          <div className="h-px bg-slate-100 my-1" />

          {/* Quick Priority */}
          <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Set Priority
          </div>
          <div className="grid grid-cols-2 gap-0.5 px-1.5 py-0.5">
            <button
              type="button"
              onClick={e => handlePriorityChange(e, 'urgent')}
              className={`px-2 py-1 rounded-md flex items-center gap-1.5 text-[11px] transition-colors ${
                task.priority === 'urgent' ? 'bg-rose-50 font-semibold text-rose-700' : 'hover:bg-slate-50 text-slate-600'
              }`}
            >
              <AlertTriangle className="w-2.5 h-2.5 text-rose-500" />
              <span>Urgent</span>
            </button>
            <button
              type="button"
              onClick={e => handlePriorityChange(e, 'high')}
              className={`px-2 py-1 rounded-md flex items-center gap-1.5 text-[11px] transition-colors ${
                task.priority === 'high' ? 'bg-amber-50 font-semibold text-amber-700' : 'hover:bg-slate-50 text-slate-600'
              }`}
            >
              <ArrowUp className="w-2.5 h-2.5 text-amber-500" />
              <span>High</span>
            </button>
            <button
              type="button"
              onClick={e => handlePriorityChange(e, 'medium')}
              className={`px-2 py-1 rounded-md flex items-center gap-1.5 text-[11px] transition-colors ${
                task.priority === 'medium' ? 'bg-blue-50 font-semibold text-blue-700' : 'hover:bg-slate-50 text-slate-600'
              }`}
            >
              <Minus className="w-2.5 h-2.5 text-blue-500" />
              <span>Medium</span>
            </button>
            <button
              type="button"
              onClick={e => handlePriorityChange(e, 'low')}
              className={`px-2 py-1 rounded-md flex items-center gap-1.5 text-[11px] transition-colors ${
                task.priority === 'low' ? 'bg-slate-100 font-semibold text-slate-700' : 'hover:bg-slate-50 text-slate-600'
              }`}
            >
              <ArrowDown className="w-2.5 h-2.5 text-slate-400" />
              <span>Low</span>
            </button>
          </div>

          <div className="h-px bg-slate-100 my-1" />

          {/* Export Options */}
          <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Export Task
          </div>
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              setIsOpen(false);
              exportService.exportTaskToExcel(task, users, workspace.name);
              showToast({
                type: 'success',
                title: 'Excel Exported',
                message: `"${task.title}" exported to Excel (.xlsx)`
              });
            }}
            className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 transition-colors text-left font-medium"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export to Excel (.xlsx)</span>
          </button>
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              setIsOpen(false);
              exportService.exportTaskToPDF(task, users, workspace.name);
              showToast({
                type: 'success',
                title: 'PDF Brief Exported',
                message: `"${task.title}" exported as Manager Brief PDF`
              });
            }}
            className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-rose-50 text-slate-700 hover:text-rose-700 transition-colors text-left font-medium"
          >
            <FileText className="w-3.5 h-3.5 text-rose-600" />
            <span>Export to PDF (Manager)</span>
          </button>

          <div className="h-px bg-slate-100 my-1" />

          {/* Delete Task */}
          <button
            type="button"
            id={`task-menu-delete-btn-${task.id}`}
            onClick={handleDelete}
            className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-rose-50 text-rose-600 transition-colors text-left font-medium"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Task</span>
          </button>
        </div>
      )}
    </div>
  );
};
