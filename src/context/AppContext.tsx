import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User, Workspace, Task, NotificationItem, ViewMode, TaskStatus, TaskPriority, TaskLabel, TaskAttachment } from '../types';
import { dataService } from '../services/dataService';

interface AppContextType {
  currentUser: User;
  users: User[];
  workspace: Workspace | null;
  tasks: Task[];
  notifications: NotificationItem[];
  unreadNotificationCount: number;
  currentView: ViewMode;
  selectedTaskId: string | null;
  selectedTask: Task | null;
  isNewTaskModalOpen: boolean;
  isAuthModalOpen: boolean;
  theme: 'light' | 'dark';
  searchQuery: string;
  isLoading: boolean;

  // Actions
  setCurrentView: (view: ViewMode) => void;
  setSelectedTaskId: (taskId: string | null) => void;
  setIsNewTaskModalOpen: (open: boolean) => void;
  setIsAuthModalOpen: (open: boolean) => void;
  setSearchQuery: (query: string) => void;
  toggleTheme: () => void;
  switchUser: (user: User) => Promise<void>;
  updateCurrentUserProfile: (updates: Partial<User>) => Promise<void>;
  addNewUser: (user: Omit<User, 'id'>) => Promise<User>;

  // Task actions
  createTask: (data: {
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    assigneeId: string;
    dueDate: string;
    labels: TaskLabel[];
    subtasks?: { id: string; title: string; completed: boolean }[];
    notes?: string;
  }) => Promise<Task>;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<Task>;
  deleteTask: (taskId: string) => Promise<void>;
  addComment: (taskId: string, content: string) => Promise<void>;
  addSuggestion: (taskId: string, content: string) => Promise<void>;
  updateSuggestionStatus: (taskId: string, suggestionId: string, status: 'open' | 'adopted' | 'dismissed', note?: string) => Promise<void>;
  toggleSubtask: (taskId: string, subtaskId: string) => Promise<void>;
  addSubtask: (taskId: string, title: string) => Promise<void>;
  deleteSubtask: (taskId: string, subtaskId: string) => Promise<void>;
  addAttachment: (taskId: string, attachment: Omit<TaskAttachment, 'id' | 'uploadedAt'>) => Promise<void>;
  deleteAttachment: (taskId: string, attachmentId: string) => Promise<void>;

  // Notification actions
  markNotificationAsRead: (notifId: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;

  // Reset demo
  resetData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User>({
    id: 'user-1',
    name: 'Surya Sakthi',
    email: 'surya@teamtracker.dev',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    role: 'lead',
    title: 'Product Lead & Architect',
    department: 'Product & Engineering'
  });
  const [users, setUsers] = useState<User[]>([]);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [currentView, setCurrentView] = useState<ViewMode>('dashboard');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Theme support
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('ttt_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('ttt_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  // Initial Load
  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    try {
      const activeUser = await dataService.getActiveUser();
      const allUsers = await dataService.getUsers();
      const ws = await dataService.getWorkspace();
      const allTasks = await dataService.getTasks();
      const notifs = await dataService.getNotifications(activeUser.id);

      setCurrentUser(activeUser);
      setUsers(allUsers);
      setWorkspace(ws);
      setTasks(allTasks);
      setNotifications(notifs);
    } catch (err) {
      console.error('Error loading initial app data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Refresh notifications when current user changes
  const refreshNotifications = useCallback(async (userId: string) => {
    const notifs = await dataService.getNotifications(userId);
    setNotifications(notifs);
  }, []);

  const switchUser = async (user: User) => {
    await dataService.setActiveUser(user);
    setCurrentUser(user);
    await refreshNotifications(user.id);
  };

  const updateCurrentUserProfile = async (updates: Partial<User>) => {
    const updated = await dataService.updateUserProfile({ ...currentUser, ...updates });
    setCurrentUser(updated);
    const updatedUsers = await dataService.getUsers();
    setUsers(updatedUsers);
  };

  const addNewUser = async (userData: Omit<User, 'id'>): Promise<User> => {
    const newUser: User = {
      ...userData,
      id: `user-${Date.now()}`
    };
    const created = await dataService.addUser(newUser);
    const updatedUsers = await dataService.getUsers();
    setUsers(updatedUsers);
    return created;
  };

  const createTask = async (data: {
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    assigneeId: string;
    dueDate: string;
    labels: TaskLabel[];
    subtasks?: { id: string; title: string; completed: boolean }[];
    notes?: string;
  }): Promise<Task> => {
    const newTask = await dataService.createTask(
      {
        workspaceId: workspace?.id || 'ws-1',
        title: data.title,
        description: data.description,
        status: data.status,
        priority: data.priority,
        assigneeId: data.assigneeId,
        creatorId: currentUser.id,
        dueDate: data.dueDate,
        labels: data.labels || [],
        subtasks: data.subtasks || [],
        notes: data.notes || ''
      },
      currentUser
    );

    const updatedTasks = await dataService.getTasks();
    setTasks(updatedTasks);
    await refreshNotifications(currentUser.id);
    return newTask;
  };

  const updateTask = async (taskId: string, updates: Partial<Task>): Promise<Task> => {
    const updated = await dataService.updateTask(taskId, updates, currentUser);
    const updatedTasks = await dataService.getTasks();
    setTasks(updatedTasks);
    await refreshNotifications(currentUser.id);
    return updated;
  };

  const deleteTask = async (taskId: string): Promise<void> => {
    await dataService.deleteTask(taskId);
    if (selectedTaskId === taskId) {
      setSelectedTaskId(null);
    }
    const updatedTasks = await dataService.getTasks();
    setTasks(updatedTasks);
  };

  const addComment = async (taskId: string, content: string): Promise<void> => {
    await dataService.addComment(taskId, content, currentUser);
    const updatedTasks = await dataService.getTasks();
    setTasks(updatedTasks);
    await refreshNotifications(currentUser.id);
  };

  const addSuggestion = async (taskId: string, content: string): Promise<void> => {
    await dataService.addSuggestion(taskId, content, currentUser);
    const updatedTasks = await dataService.getTasks();
    setTasks(updatedTasks);
    await refreshNotifications(currentUser.id);
  };

  const updateSuggestionStatus = async (
    taskId: string,
    suggestionId: string,
    status: 'open' | 'adopted' | 'dismissed',
    note?: string
  ): Promise<void> => {
    await dataService.updateSuggestionStatus(taskId, suggestionId, status, note);
    const updatedTasks = await dataService.getTasks();
    setTasks(updatedTasks);
  };

  const toggleSubtask = async (taskId: string, subtaskId: string): Promise<void> => {
    await dataService.toggleSubtask(taskId, subtaskId, currentUser);
    const updatedTasks = await dataService.getTasks();
    setTasks(updatedTasks);
  };

  const addSubtask = async (taskId: string, title: string): Promise<void> => {
    await dataService.addSubtask(taskId, title);
    const updatedTasks = await dataService.getTasks();
    setTasks(updatedTasks);
  };

  const deleteSubtask = async (taskId: string, subtaskId: string): Promise<void> => {
    await dataService.deleteSubtask(taskId, subtaskId);
    const updatedTasks = await dataService.getTasks();
    setTasks(updatedTasks);
  };

  const addAttachment = async (
    taskId: string,
    attachment: Omit<TaskAttachment, 'id' | 'uploadedAt'>
  ): Promise<void> => {
    await dataService.addAttachment(taskId, attachment, currentUser);
    const updatedTasks = await dataService.getTasks();
    setTasks(updatedTasks);
  };

  const deleteAttachment = async (taskId: string, attachmentId: string): Promise<void> => {
    await dataService.deleteAttachment(taskId, attachmentId);
    const updatedTasks = await dataService.getTasks();
    setTasks(updatedTasks);
  };

  const markNotificationAsRead = async (notifId: string): Promise<void> => {
    await dataService.markNotificationAsRead(notifId);
    await refreshNotifications(currentUser.id);
  };

  const markAllNotificationsAsRead = async (): Promise<void> => {
    await dataService.markAllNotificationsAsRead(currentUser.id);
    await refreshNotifications(currentUser.id);
  };

  const resetData = async (): Promise<void> => {
    dataService.resetToDemoData();
    await loadInitialData();
  };

  const selectedTask = selectedTaskId ? tasks.find(t => t.id === selectedTaskId) || null : null;
  const unreadNotificationCount = notifications.filter(n => !n.read).length;

  return (
    <AppContext.Provider
      value={{
        currentUser,
        users,
        workspace,
        tasks,
        notifications,
        unreadNotificationCount,
        currentView,
        selectedTaskId,
        selectedTask,
        isNewTaskModalOpen,
        isAuthModalOpen,
        theme,
        searchQuery,
        isLoading,
        setCurrentView,
        setSelectedTaskId,
        setIsNewTaskModalOpen,
        setIsAuthModalOpen,
        setSearchQuery,
        toggleTheme,
        switchUser,
        updateCurrentUserProfile,
        addNewUser,
        createTask,
        updateTask,
        deleteTask,
        addComment,
        addSuggestion,
        updateSuggestionStatus,
        toggleSubtask,
        addSubtask,
        deleteSubtask,
        addAttachment,
        deleteAttachment,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        resetData
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
