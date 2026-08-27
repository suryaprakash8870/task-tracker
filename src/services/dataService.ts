import { Task, User, Workspace, NotificationItem, TaskStatus, TaskPriority, TaskLabel, TaskComment, TaskSuggestion, TaskAttachment, TaskActivity } from '../types';
import { initialTasks, initialUsers, initialWorkspace, initialNotifications } from './mockData';

const TASKS_STORAGE_KEY = 'ttt_tasks_v1';
const USERS_STORAGE_KEY = 'ttt_users_v1';
const WORKSPACE_STORAGE_KEY = 'ttt_workspace_v1';
const NOTIFICATIONS_STORAGE_KEY = 'ttt_notifications_v1';
const ACTIVE_USER_KEY = 'ttt_active_user_v1';

class DataService {
  // --- Initialization & Local Storage Persistence ---
  private getItem<T>(key: string, defaultValue: T): T {
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Fallback
    }
    return defaultValue;
  }

  private setItem<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn('Failed to save to localStorage', e);
    }
  }

  // --- Users & Auth ---
  public async getUsers(): Promise<User[]> {
    return this.getItem<User[]>(USERS_STORAGE_KEY, initialUsers);
  }

  public async getUserById(userId: string): Promise<User | undefined> {
    const users = await this.getUsers();
    return users.find(u => u.id === userId);
  }

  public async getActiveUser(): Promise<User> {
    const defaultUser = initialUsers[0];
    return this.getItem<User>(ACTIVE_USER_KEY, defaultUser);
  }

  public async setActiveUser(user: User): Promise<void> {
    this.setItem(ACTIVE_USER_KEY, user);
  }

  public async updateUserProfile(updatedUser: User): Promise<User> {
    const users = await this.getUsers();
    const idx = users.findIndex(u => u.id === updatedUser.id);
    if (idx !== -1) {
      users[idx] = updatedUser;
      this.setItem(USERS_STORAGE_KEY, users);
    }
    const active = await this.getActiveUser();
    if (active.id === updatedUser.id) {
      await this.setActiveUser(updatedUser);
    }
    return updatedUser;
  }

  public async addUser(newUser: User): Promise<User> {
    const users = await this.getUsers();
    users.push(newUser);
    this.setItem(USERS_STORAGE_KEY, users);
    return newUser;
  }

  // --- Workspace ---
  public async getWorkspace(): Promise<Workspace> {
    const ws = this.getItem<Workspace>(WORKSPACE_STORAGE_KEY, initialWorkspace);
    const users = await this.getUsers();
    ws.members = users;
    return ws;
  }

  public async updateWorkspace(workspace: Workspace): Promise<Workspace> {
    this.setItem(WORKSPACE_STORAGE_KEY, workspace);
    return workspace;
  }

  // --- Tasks ---
  public async getTasks(): Promise<Task[]> {
    return this.getItem<Task[]>(TASKS_STORAGE_KEY, initialTasks);
  }

  public async getTaskById(taskId: string): Promise<Task | undefined> {
    const tasks = await this.getTasks();
    return tasks.find(t => t.id === taskId);
  }

  public async createTask(
    taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'activity' | 'comments' | 'attachments' | 'suggestions'>,
    author: User
  ): Promise<Task> {
    const tasks = await this.getTasks();
    const now = new Date().toISOString();
    const newTask: Task = {
      ...taskData,
      id: `task-${Date.now()}`,
      comments: [],
      attachments: [],
      suggestions: [],
      createdAt: now,
      updatedAt: now,
      activity: [
        {
          id: `act-${Date.now()}`,
          taskId: `task-${Date.now()}`,
          userId: author.id,
          action: 'created',
          details: `${author.name} created this task`,
          timestamp: now
        }
      ]
    };

    tasks.unshift(newTask);
    this.setItem(TASKS_STORAGE_KEY, tasks);

    // If assigned to someone else, trigger notification
    if (newTask.assigneeId && newTask.assigneeId !== author.id) {
      await this.addNotification({
        userId: newTask.assigneeId,
        actorId: author.id,
        taskId: newTask.id,
        type: 'assigned',
        title: 'New task assigned to you',
        message: `${author.name} assigned "${newTask.title}" to you.`
      });
    }

    return newTask;
  }

  public async updateTask(taskId: string, updates: Partial<Task>, actor: User): Promise<Task> {
    const tasks = await this.getTasks();
    const index = tasks.findIndex(t => t.id === taskId);
    if (index === -1) throw new Error(`Task with id ${taskId} not found`);

    const currentTask = tasks[index];
    const now = new Date().toISOString();
    const newActivity: TaskActivity[] = [...currentTask.activity];

    // Detect key changes for activity logging & notifications
    if (updates.status && updates.status !== currentTask.status) {
      const statusLabels: Record<TaskStatus, string> = {
        todo: 'Todo',
        in_progress: 'In Progress',
        review: 'Review',
        done: 'Done'
      };
      newActivity.unshift({
        id: `act-${Date.now()}-status`,
        taskId,
        userId: actor.id,
        action: 'status_changed',
        details: `${actor.name} moved status to ${statusLabels[updates.status]}`,
        timestamp: now
      });

      if (currentTask.assigneeId !== actor.id) {
        await this.addNotification({
          userId: currentTask.assigneeId,
          actorId: actor.id,
          taskId,
          type: 'status_update',
          title: 'Task status updated',
          message: `${actor.name} changed status to "${statusLabels[updates.status]}" on "${currentTask.title}".`
        });
      }
    }

    if (updates.assigneeId && updates.assigneeId !== currentTask.assigneeId) {
      const allUsers = await this.getUsers();
      const newAssignee = allUsers.find(u => u.id === updates.assigneeId);
      newActivity.unshift({
        id: `act-${Date.now()}-assign`,
        taskId,
        userId: actor.id,
        action: 'assigned',
        details: `${actor.name} assigned task to ${newAssignee ? newAssignee.name : 'unassigned'}`,
        timestamp: now
      });

      if (updates.assigneeId !== actor.id) {
        await this.addNotification({
          userId: updates.assigneeId,
          actorId: actor.id,
          taskId,
          type: 'assigned',
          title: 'Task assigned to you',
          message: `${actor.name} assigned "${currentTask.title}" to you.`
        });
      }
    }

    if (updates.priority && updates.priority !== currentTask.priority) {
      newActivity.unshift({
        id: `act-${Date.now()}-prio`,
        taskId,
        userId: actor.id,
        action: 'priority_changed',
        details: `${actor.name} changed priority to ${updates.priority.toUpperCase()}`,
        timestamp: now
      });
    }

    const updatedTask: Task = {
      ...currentTask,
      ...updates,
      activity: newActivity,
      updatedAt: now
    };

    tasks[index] = updatedTask;
    this.setItem(TASKS_STORAGE_KEY, tasks);
    return updatedTask;
  }

  public async deleteTask(taskId: string): Promise<void> {
    const tasks = await this.getTasks();
    const filtered = tasks.filter(t => t.id !== taskId);
    this.setItem(TASKS_STORAGE_KEY, filtered);
  }

  // --- Comments ---
  public async addComment(taskId: string, content: string, user: User): Promise<Task> {
    const tasks = await this.getTasks();
    const index = tasks.findIndex(t => t.id === taskId);
    if (index === -1) throw new Error('Task not found');

    const task = tasks[index];
    const now = new Date().toISOString();
    const newComment: TaskComment = {
      id: `c-${Date.now()}`,
      userId: user.id,
      content,
      createdAt: now
    };

    task.comments.push(newComment);
    task.activity.unshift({
      id: `act-${Date.now()}`,
      taskId,
      userId: user.id,
      action: 'commented',
      details: `${user.name} commented: "${content.slice(0, 40)}${content.length > 40 ? '...' : ''}"`,
      timestamp: now
    });
    task.updatedAt = now;

    tasks[index] = task;
    this.setItem(TASKS_STORAGE_KEY, tasks);

    // Notify assignee if not the author
    if (task.assigneeId && task.assigneeId !== user.id) {
      await this.addNotification({
        userId: task.assigneeId,
        actorId: user.id,
        taskId,
        type: 'comment',
        title: `New comment on ${task.title}`,
        message: `${user.name}: "${content.slice(0, 80)}"`
      });
    }

    return task;
  }

  // --- Suggestions ---
  public async addSuggestion(taskId: string, content: string, user: User): Promise<Task> {
    const tasks = await this.getTasks();
    const index = tasks.findIndex(t => t.id === taskId);
    if (index === -1) throw new Error('Task not found');

    const task = tasks[index];
    const now = new Date().toISOString();
    const newSuggestion: TaskSuggestion = {
      id: `sug-${Date.now()}`,
      taskId,
      userId: user.id,
      content,
      status: 'open',
      createdAt: now
    };

    task.suggestions.unshift(newSuggestion);
    task.activity.unshift({
      id: `act-${Date.now()}`,
      taskId,
      userId: user.id,
      action: 'suggestion_added',
      details: `${user.name} suggested: "${content.slice(0, 45)}..."`,
      timestamp: now
    });
    task.updatedAt = now;

    tasks[index] = task;
    this.setItem(TASKS_STORAGE_KEY, tasks);

    if (task.assigneeId && task.assigneeId !== user.id) {
      await this.addNotification({
        userId: task.assigneeId,
        actorId: user.id,
        taskId,
        type: 'suggestion',
        title: `New suggestion for ${task.title}`,
        message: `${user.name} suggested: "${content.slice(0, 80)}"`
      });
    }

    return task;
  }

  public async updateSuggestionStatus(
    taskId: string,
    suggestionId: string,
    status: 'open' | 'adopted' | 'dismissed',
    resolutionNote?: string
  ): Promise<Task> {
    const tasks = await this.getTasks();
    const index = tasks.findIndex(t => t.id === taskId);
    if (index === -1) throw new Error('Task not found');

    const task = tasks[index];
    const sug = task.suggestions.find(s => s.id === suggestionId);
    if (sug) {
      sug.status = status;
      if (resolutionNote) sug.resolutionNote = resolutionNote;
    }

    task.updatedAt = new Date().toISOString();
    tasks[index] = task;
    this.setItem(TASKS_STORAGE_KEY, tasks);
    return task;
  }

  // --- Attachments ---
  public async addAttachment(taskId: string, attachment: Omit<TaskAttachment, 'id' | 'uploadedAt'>, user: User): Promise<Task> {
    const tasks = await this.getTasks();
    const index = tasks.findIndex(t => t.id === taskId);
    if (index === -1) throw new Error('Task not found');

    const task = tasks[index];
    const now = new Date().toISOString();
    const newAtt: TaskAttachment = {
      ...attachment,
      id: `att-${Date.now()}`,
      uploadedAt: now
    };

    task.attachments.unshift(newAtt);
    task.activity.unshift({
      id: `act-${Date.now()}`,
      taskId,
      userId: user.id,
      action: 'attachment_added',
      details: `${user.name} attached file ${attachment.name}`,
      timestamp: now
    });
    task.updatedAt = now;

    tasks[index] = task;
    this.setItem(TASKS_STORAGE_KEY, tasks);
    return task;
  }

  public async deleteAttachment(taskId: string, attachmentId: string): Promise<Task> {
    const tasks = await this.getTasks();
    const index = tasks.findIndex(t => t.id === taskId);
    if (index === -1) throw new Error('Task not found');

    const task = tasks[index];
    task.attachments = task.attachments.filter(a => a.id !== attachmentId);
    task.updatedAt = new Date().toISOString();

    tasks[index] = task;
    this.setItem(TASKS_STORAGE_KEY, tasks);
    return task;
  }

  // --- Subtasks ---
  public async toggleSubtask(taskId: string, subtaskId: string, actor: User): Promise<Task> {
    const tasks = await this.getTasks();
    const index = tasks.findIndex(t => t.id === taskId);
    if (index === -1) throw new Error('Task not found');

    const task = tasks[index];
    const subtask = task.subtasks.find(st => st.id === subtaskId);
    if (subtask) {
      subtask.completed = !subtask.completed;
      if (subtask.completed) {
        task.activity.unshift({
          id: `act-${Date.now()}`,
          taskId,
          userId: actor.id,
          action: 'subtask_completed',
          details: `${actor.name} completed subtask: "${subtask.title}"`,
          timestamp: new Date().toISOString()
        });
      }
    }
    task.updatedAt = new Date().toISOString();
    tasks[index] = task;
    this.setItem(TASKS_STORAGE_KEY, tasks);
    return task;
  }

  public async addSubtask(taskId: string, title: string): Promise<Task> {
    const tasks = await this.getTasks();
    const index = tasks.findIndex(t => t.id === taskId);
    if (index === -1) throw new Error('Task not found');

    const task = tasks[index];
    task.subtasks.push({
      id: `st-${Date.now()}`,
      title,
      completed: false
    });
    task.updatedAt = new Date().toISOString();
    tasks[index] = task;
    this.setItem(TASKS_STORAGE_KEY, tasks);
    return task;
  }

  public async deleteSubtask(taskId: string, subtaskId: string): Promise<Task> {
    const tasks = await this.getTasks();
    const index = tasks.findIndex(t => t.id === taskId);
    if (index === -1) throw new Error('Task not found');

    const task = tasks[index];
    task.subtasks = task.subtasks.filter(st => st.id !== subtaskId);
    task.updatedAt = new Date().toISOString();
    tasks[index] = task;
    this.setItem(TASKS_STORAGE_KEY, tasks);
    return task;
  }

  // --- Notifications ---
  public async getNotifications(userId: string): Promise<NotificationItem[]> {
    const all = this.getItem<NotificationItem[]>(NOTIFICATIONS_STORAGE_KEY, initialNotifications);
    return all.filter(n => n.userId === userId);
  }

  public async addNotification(notif: Omit<NotificationItem, 'id' | 'createdAt' | 'read'>): Promise<NotificationItem> {
    const all = this.getItem<NotificationItem[]>(NOTIFICATIONS_STORAGE_KEY, initialNotifications);
    const newNotif: NotificationItem = {
      ...notif,
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      read: false,
      createdAt: new Date().toISOString()
    };
    all.unshift(newNotif);
    this.setItem(NOTIFICATIONS_STORAGE_KEY, all);
    return newNotif;
  }

  public async markNotificationAsRead(notifId: string): Promise<void> {
    const all = this.getItem<NotificationItem[]>(NOTIFICATIONS_STORAGE_KEY, initialNotifications);
    const item = all.find(n => n.id === notifId);
    if (item) {
      item.read = true;
      this.setItem(NOTIFICATIONS_STORAGE_KEY, all);
    }
  }

  public async markAllNotificationsAsRead(userId: string): Promise<void> {
    const all = this.getItem<NotificationItem[]>(NOTIFICATIONS_STORAGE_KEY, initialNotifications);
    all.forEach(n => {
      if (n.userId === userId) n.read = true;
    });
    this.setItem(NOTIFICATIONS_STORAGE_KEY, all);
  }

  // --- Reset to Demo Data ---
  public resetToDemoData(): void {
    localStorage.removeItem(TASKS_STORAGE_KEY);
    localStorage.removeItem(USERS_STORAGE_KEY);
    localStorage.removeItem(WORKSPACE_STORAGE_KEY);
    localStorage.removeItem(NOTIFICATIONS_STORAGE_KEY);
    localStorage.removeItem(ACTIVE_USER_KEY);
  }
}

export const dataService = new DataService();
