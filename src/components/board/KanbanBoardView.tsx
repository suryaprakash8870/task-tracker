import React, { useState, useMemo } from 'react';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult
} from '@hello-pangea/dnd';
import { useApp } from '../../context/AppContext';
import { Avatar } from '../common/Avatar';
import { PriorityBadge } from '../common/PriorityBadge';
import { CustomSelect } from '../common/CustomSelect';
import { TaskActionMenu } from '../common/TaskActionMenu';
import { Task, TaskStatus } from '../../types';
import {
  Plus,
  Clock,
  MessageSquare,
  Paperclip,
  Lightbulb,
  Filter,
  ChevronRight,
  ChevronLeft,
  GripVertical,
  Layers,
  CheckSquare,
  X
} from 'lucide-react';

interface ColumnConfig {
  id: TaskStatus;
  title: string;
  dotColor: string;
  badgeBg: string;
}

const COLUMNS: ColumnConfig[] = [
  {
    id: 'todo',
    title: 'To Do',
    dotColor: 'bg-zinc-400',
    badgeBg: 'bg-zinc-100 text-zinc-700'
  },
  {
    id: 'in_progress',
    title: 'In Progress',
    dotColor: 'bg-blue-500',
    badgeBg: 'bg-blue-50 text-blue-700'
  },
  {
    id: 'review',
    title: 'In Review',
    dotColor: 'bg-amber-500',
    badgeBg: 'bg-amber-50 text-amber-700'
  },
  {
    id: 'done',
    title: 'Done',
    dotColor: 'bg-emerald-500',
    badgeBg: 'bg-emerald-50 text-emerald-700'
  }
];

export const KanbanBoardView: React.FC = () => {
  const {
    tasks,
    users,
    currentUser,
    setSelectedTaskId,
    setIsNewTaskModalOpen,
    createTask,
    updateTask,
    searchQuery,
    setSearchQuery,
    showToast
  } = useApp();

  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [quickAddColumn, setQuickAddColumn] = useState<TaskStatus | null>(null);
  const [quickTitle, setQuickTitle] = useState('');
  const [isQuickSubmitting, setIsQuickSubmitting] = useState(false);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Filter tasks with memoization for snappy rendering
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const match =
          task.title.toLowerCase().includes(q) ||
          task.description.toLowerCase().includes(q) ||
          task.labels.some(l => l.name.toLowerCase().includes(q));
        if (!match) return false;
      }
      if (assigneeFilter !== 'all' && task.assigneeId !== assigneeFilter) {
        return false;
      }
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) {
        return false;
      }
      return true;
    });
  }, [tasks, searchQuery, assigneeFilter, priorityFilter]);

  // Group filtered tasks by column
  const columnTasks = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = {
      todo: [],
      in_progress: [],
      review: [],
      done: []
    };
    filteredTasks.forEach(task => {
      if (map[task.status]) {
        map[task.status].push(task);
      } else {
        map.todo.push(task);
      }
    });
    return map;
  }, [filteredTasks]);

  // Drag-and-Drop handler
  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const sourceStatus = source.droppableId as TaskStatus;
    const destStatus = destination.droppableId as TaskStatus;

    if (sourceStatus !== destStatus) {
      try {
        await updateTask(draggableId, { status: destStatus });
        showToast({
          type: 'success',
          message: `Moved to ${destStatus.replace('_', ' ')}`
        });
      } catch (err) {
        console.error('Drag update failed:', err);
      }
    }
  };

  // Quick Inline Task Creator per Column
  const handleQuickAddSubmit = async (status: TaskStatus) => {
    if (!quickTitle.trim() || isQuickSubmitting) return;

    setIsQuickSubmitting(true);
    try {
      const nextDue = new Date();
      nextDue.setDate(nextDue.getDate() + 2);

      await createTask({
        title: quickTitle.trim(),
        description: '',
        status,
        priority: 'medium',
        assigneeId: currentUser.id,
        dueDate: nextDue.toISOString().split('T')[0],
        labels: []
      });

      setQuickTitle('');
      setQuickAddColumn(null);
      showToast({
        type: 'success',
        title: 'Task Created',
        message: `Added to ${status.replace('_', ' ')}`
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not create task';
      showToast({
        type: 'error',
        title: 'Creation Failed',
        message: msg
      });
    } finally {
      setIsQuickSubmitting(false);
    }
  };

  const getUserById = (id: string) => users.find(u => u.id === id);

  // Quick Move task to adjacent column
  const handleMoveAdjacent = async (
    e: React.MouseEvent,
    taskId: string,
    currentStatus: TaskStatus,
    direction: 'next' | 'prev'
  ) => {
    e.stopPropagation();
    const order: TaskStatus[] = ['todo', 'in_progress', 'review', 'done'];
    const currentIndex = order.indexOf(currentStatus);
    const targetIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;

    if (targetIndex >= 0 && targetIndex < order.length) {
      const targetStatus = order[targetIndex];
      await updateTask(taskId, { status: targetStatus });
      showToast({
        type: 'info',
        message: `Moved to ${targetStatus.replace('_', ' ')}`
      });
    }
  };

  return (
    <div id="kanban-board-view" className="p-4 sm:p-6 space-y-4 max-w-[1680px] mx-auto">
      {/* Board Controls & Filters Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs">
        <div className="flex items-center flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-zinc-500 font-semibold pl-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter:</span>
          </div>

          {/* Assignee Filter */}
          <CustomSelect
            id="board-assignee-filter"
            value={assigneeFilter}
            onChange={setAssigneeFilter}
            size="sm"
            className="w-40"
            options={[
              { value: 'all', label: 'All Assignees' },
              ...users.map(u => ({
                value: u.id,
                label: `${u.name} ${u.id === currentUser.id ? '(You)' : ''}`
              }))
            ]}
          />

          {/* Priority Filter */}
          <CustomSelect
            id="board-priority-filter"
            value={priorityFilter}
            onChange={setPriorityFilter}
            size="sm"
            className="w-36"
            options={[
              { value: 'all', label: 'All Priorities' },
              { value: 'urgent', label: 'Urgent', colorDot: '#e11d48' },
              { value: 'high', label: 'High', colorDot: '#f59e0b' },
              { value: 'medium', label: 'Medium', colorDot: '#3b82f6' },
              { value: 'low', label: 'Low', colorDot: '#94a3b8' }
            ]}
          />

          {(assigneeFilter !== 'all' || priorityFilter !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setAssigneeFilter('all');
                setPriorityFilter('all');
                setSearchQuery('');
              }}
              className="text-xs text-zinc-600 hover:text-zinc-900 font-medium px-2 py-1 bg-zinc-100 hover:bg-zinc-200 rounded-md transition-colors cursor-pointer flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium bg-zinc-50 px-2.5 py-1 rounded-md border border-zinc-200/80">
            <Layers className="w-3.5 h-3.5 text-zinc-400" />
            <span>
              <strong className="font-mono text-zinc-800">{filteredTasks.length}</strong> of {tasks.length}
            </span>
          </div>

          <button
            onClick={() => setIsNewTaskModalOpen(true)}
            id="kanban-add-task-btn"
            className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-md text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* Drag and Drop Kanban Columns */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
          {COLUMNS.map(col => {
            const colTasks = columnTasks[col.id] || [];
            const isQuickAdding = quickAddColumn === col.id;

            return (
              <div
                key={col.id}
                id={`kanban-col-${col.id}`}
                className="bg-zinc-100/70 rounded-xl border border-slate-200/80 p-2.5 flex flex-col min-h-[600px] transition-all"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between mb-2 px-1.5 py-1 border-b border-zinc-200/70">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${col.dotColor}`} />
                    <h3 className="font-bold text-xs text-zinc-900 uppercase tracking-wider">
                      {col.title}
                    </h3>
                    <span
                      className={`text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded-md ${col.badgeBg}`}
                    >
                      {colTasks.length}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      if (isQuickAdding) {
                        setQuickAddColumn(null);
                      } else {
                        setQuickAddColumn(col.id);
                        setQuickTitle('');
                      }
                    }}
                    title={`Quick add task in ${col.title}`}
                    className="p-1 text-zinc-400 hover:text-zinc-800 rounded-md hover:bg-white transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Quick Add Form inside column */}
                {isQuickAdding && (
                  <div className="mb-2.5 p-2.5 bg-white rounded-lg border border-zinc-300 shadow-xs animate-in fade-in-50 zoom-in-95 duration-100">
                    <input
                      type="text"
                      autoFocus
                      value={quickTitle}
                      onChange={e => setQuickTitle(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleQuickAddSubmit(col.id);
                        } else if (e.key === 'Escape') {
                          setQuickAddColumn(null);
                        }
                      }}
                      placeholder="What needs to be done? (Enter to save)"
                      className="w-full text-xs font-medium text-zinc-900 placeholder-zinc-400 bg-transparent border-none focus:outline-hidden mb-2"
                    />
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setQuickAddColumn(null)}
                        className="px-2 py-1 text-[11px] font-medium text-zinc-500 hover:bg-zinc-100 rounded-md transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={!quickTitle.trim() || isQuickSubmitting}
                        onClick={() => handleQuickAddSubmit(col.id)}
                        className="px-2.5 py-1 text-[11px] font-semibold bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-white rounded-md transition-colors cursor-pointer"
                      >
                        {isQuickSubmitting ? 'Adding...' : 'Add'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Droppable Card Container */}
                <Droppable droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 space-y-2 overflow-y-auto pr-0.5 rounded-lg transition-colors duration-150 min-h-[120px] ${
                        snapshot.isDraggingOver
                          ? 'bg-zinc-200/50 ring-2 ring-zinc-400/40 ring-inset rounded-lg p-1'
                          : ''
                      }`}
                    >
                      {colTasks.map((task, index) => {
                        const assignee = getUserById(task.assigneeId);
                        const isOverdue =
                          task.dueDate < todayStr && task.status !== 'done';
                        const isDueToday =
                          task.dueDate === todayStr && task.status !== 'done';
                        const completedSubtasks = task.subtasks.filter(
                          s => s.completed
                        ).length;

                        return (
                          <React.Fragment key={task.id}>
                            <Draggable
                              draggableId={task.id}
                              index={index}
                            >
                              {(dragProvided, dragSnapshot) => (
                                <div
                                  ref={dragProvided.innerRef}
                                  {...dragProvided.draggableProps}
                                  id={`task-card-${task.id}`}
                                  onClick={() => setSelectedTaskId(task.id)}
                                  className={`p-3 bg-white rounded-lg border transition-all duration-150 cursor-pointer space-y-2 group select-none relative shadow-2xs ${
                                    dragSnapshot.isDragging
                                      ? 'border-zinc-900 shadow-lg ring-2 ring-zinc-900/10 rotate-1 scale-[1.01] z-50'
                                      : 'border-slate-200/90 hover:border-zinc-300 hover:shadow-xs'
                                  }`}
                                >
                                  {/* Top Row: Drag Handle, Labels, Priority, Actions */}
                                  <div className="flex items-center justify-between gap-1.5">
                                    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                                      <div
                                        {...dragProvided.dragHandleProps}
                                        className="text-zinc-300 group-hover:text-zinc-500 hover:text-zinc-900 transition-colors p-0.5 rounded cursor-grab active:cursor-grabbing"
                                        title="Drag to reorder or change column"
                                        onClick={e => e.stopPropagation()}
                                      >
                                        <GripVertical className="w-3.5 h-3.5" />
                                      </div>

                                      {task.labels.map(l => (
                                        <span
                                          key={l.id}
                                          className={`px-1.5 py-0.5 text-[10px] font-medium rounded-md border ${l.color}`}
                                        >
                                          {l.name}
                                        </span>
                                      ))}
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0">
                                      <PriorityBadge
                                        priority={task.priority}
                                        size="sm"
                                        showIcon={false}
                                      />
                                      <TaskActionMenu
                                        task={task}
                                        onOpenDetail={() => setSelectedTaskId(task.id)}
                                      />
                                    </div>
                                  </div>

                                  {/* Task Title */}
                                  <h4 className="text-xs font-semibold text-zinc-900 group-hover:text-blue-600 line-clamp-2 leading-relaxed transition-colors">
                                    {task.title}
                                  </h4>

                                  {/* Subtasks Progress Bar (if any) */}
                                  {task.subtasks.length > 0 && (
                                    <div className="space-y-1 bg-zinc-50 p-1.5 rounded-md border border-zinc-100">
                                      <div className="flex items-center justify-between text-[10px] text-zinc-500 font-medium">
                                        <span className="flex items-center gap-1">
                                          <CheckSquare className="w-3 h-3 text-zinc-400" />
                                          <span>Checklist</span>
                                        </span>
                                        <span className="font-mono">
                                          {completedSubtasks}/{task.subtasks.length}
                                        </span>
                                      </div>
                                      <div className="w-full h-1 bg-zinc-200 rounded-full overflow-hidden">
                                        <div
                                          className="h-full bg-zinc-900 rounded-full transition-all duration-300"
                                          style={{
                                            width: `${
                                              (completedSubtasks /
                                                task.subtasks.length) *
                                              100
                                            }%`
                                          }}
                                        />
                                      </div>
                                    </div>
                                  )}

                                  {/* Bottom Footer: Quick Shift Buttons, Due Date, Badges & Assignee */}
                                  <div className="flex items-center justify-between pt-2 border-t border-zinc-100 text-[11px]">
                                    <div className="flex items-center gap-2 text-zinc-400">
                                      {/* Due Date Indicator */}
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
                                        <span className="font-mono text-[10px]">{task.dueDate.slice(5)}</span>
                                      </span>

                                      {/* Comments badge */}
                                      {task.comments.length > 0 && (
                                        <span
                                          className="flex items-center gap-0.5 text-zinc-400 font-mono text-[10px]"
                                          title={`${task.comments.length} comments`}
                                        >
                                          <MessageSquare className="w-3 h-3" />
                                          <span>{task.comments.length}</span>
                                        </span>
                                      )}

                                      {/* Attachments badge */}
                                      {task.attachments.length > 0 && (
                                        <span
                                          className="flex items-center gap-0.5 text-zinc-400 font-mono text-[10px]"
                                          title={`${task.attachments.length} files`}
                                        >
                                          <Paperclip className="w-3 h-3" />
                                          <span>{task.attachments.length}</span>
                                        </span>
                                      )}

                                      {/* Suggestions badge */}
                                      {task.suggestions.length > 0 && (
                                        <span
                                          className="flex items-center gap-0.5 text-amber-500 font-mono text-[10px]"
                                          title={`${task.suggestions.length} suggestions`}
                                        >
                                          <Lightbulb className="w-3 h-3" />
                                          <span>{task.suggestions.length}</span>
                                        </span>
                                      )}
                                    </div>

                                    {/* Quick Column Shift Helpers on Hover */}
                                    <div className="flex items-center gap-1.5">
                                      <div className="hidden group-hover:flex items-center gap-0.5 bg-zinc-100 p-0.5 rounded-md border border-zinc-200">
                                        {col.id !== 'todo' && (
                                          <button
                                            type="button"
                                            title="Move to previous column"
                                            onClick={e =>
                                              handleMoveAdjacent(
                                                e,
                                                task.id,
                                                col.id,
                                                'prev'
                                              )
                                            }
                                            className="p-1 text-zinc-500 hover:text-zinc-900 hover:bg-white rounded transition-colors cursor-pointer"
                                          >
                                            <ChevronLeft className="w-3 h-3" />
                                          </button>
                                        )}
                                        {col.id !== 'done' && (
                                          <button
                                            type="button"
                                            title="Move to next column"
                                            onClick={e =>
                                              handleMoveAdjacent(
                                                e,
                                                task.id,
                                                col.id,
                                                'next'
                                              )
                                            }
                                            className="p-1 text-zinc-500 hover:text-zinc-900 hover:bg-white rounded transition-colors cursor-pointer"
                                          >
                                            <ChevronRight className="w-3 h-3" />
                                          </button>
                                        )}
                                      </div>

                                      {/* Assignee Avatar */}
                                      <Avatar user={assignee} size="xs" />
                                    </div>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          </React.Fragment>
                        );
                      })}

                      {provided.placeholder}

                      {colTasks.length === 0 && !isQuickAdding && (
                        <div className="py-12 text-center text-zinc-400 text-xs border border-dashed border-zinc-200/90 rounded-lg bg-white/40">
                          Drop tasks here
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
};

