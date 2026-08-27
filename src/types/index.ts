export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export type MemberRole = 'admin' | 'lead' | 'developer' | 'designer' | 'member';

export type ViewMode = 
  | 'dashboard'
  | 'my-tasks'
  | 'board'
  | 'calendar'
  | 'files'
  | 'suggestions'
  | 'activity'
  | 'team'
  | 'settings';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: MemberRole;
  title: string;
  department: string;
}

export interface TaskLabel {
  id: string;
  name: string;
  color: string; // Tailwind color class or hex
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  assignedTo?: string; // userId
}

export interface TaskComment {
  id: string;
  userId: string;
  content: string;
  createdAt: string;
}

export interface TaskSuggestion {
  id: string;
  taskId: string;
  userId: string;
  content: string;
  status: 'open' | 'adopted' | 'dismissed';
  createdAt: string;
  resolutionNote?: string;
}

export interface TaskAttachment {
  id: string;
  taskId: string;
  name: string;
  size: string; // e.g. "2.4 MB"
  type: string; // e.g. "image/png", "application/pdf", "figma"
  url: string;
  uploadedBy: string; // userId
  uploadedAt: string;
}

export interface TaskActivity {
  id: string;
  taskId: string;
  userId: string;
  action: 'created' | 'status_changed' | 'assigned' | 'commented' | 'suggestion_added' | 'attachment_added' | 'priority_changed' | 'subtask_completed';
  details: string;
  timestamp: string;
}

export interface Task {
  id: string;
  workspaceId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string;
  creatorId: string;
  dueDate: string; // YYYY-MM-DD
  labels: TaskLabel[];
  subtasks: Subtask[];
  comments: TaskComment[];
  notes: string;
  attachments: TaskAttachment[];
  suggestions: TaskSuggestion[];
  activity: TaskActivity[];
  createdAt: string;
  updatedAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  members: User[];
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  actorId: string;
  taskId?: string;
  type: 'assigned' | 'mention' | 'comment' | 'suggestion' | 'due_soon' | 'overdue' | 'status_update';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface TaskFilter {
  search: string;
  assigneeId?: string;
  priority?: TaskPriority | 'all';
  status?: TaskStatus | 'all';
  label?: string;
  dueDateRange?: 'today' | 'upcoming' | 'overdue' | 'all';
}
