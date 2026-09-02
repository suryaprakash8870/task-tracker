import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  User,
  Workspace,
  Task,
  NotificationItem,
  ViewMode,
  TaskStatus,
  TaskPriority,
  TaskLabel,
  TaskAttachment,
  TaskActivity,
  MemberRole,
  ToastItem,
  ToastType,
  ConfirmDialogOptions
} from '../types';
import { dataService } from '../services/dataService';
import { supabase, isSupabaseConfigured, isDemoModeEnabled } from '../services/supabaseClient';
import { realtimeService } from '../services/realtimeService';
import { storageService } from '../services/storageService';

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
  errorMessage: string | null;
  isConfigured: boolean;
  isDemoMode: boolean;
  realtimeStatus: 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR';

  // Custom in-app Alert / Toast & Confirm Dialog
  toasts: ToastItem[];
  showToast: (toast: Omit<ToastItem, 'id'> | string, type?: ToastType) => string;
  dismissToast: (id: string) => void;
  confirmDialog: ConfirmDialogOptions | null;
  showConfirmDialog: (options: ConfirmDialogOptions) => void;
  closeConfirmDialog: () => void;

  // Actions
  setCurrentView: (view: ViewMode) => void;
  setSelectedTaskId: (taskId: string | null) => void;
  setIsNewTaskModalOpen: (open: boolean) => void;
  setIsAuthModalOpen: (open: boolean) => void;
  setSearchQuery: (query: string) => void;
  toggleTheme: () => void;
  clearError: () => void;
  retryConnection: () => Promise<void>;

  // Real Auth Actions
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (
    email: string,
    password: string,
    profileData: { name: string; role: MemberRole; title?: string; department?: string; avatar?: string }
  ) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateCurrentUserProfile: (updates: Partial<User>) => Promise<void>;
  switchUser: (user: User) => Promise<void>;
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
    subtasks?: { id: string; title: string; completed: boolean; assignedTo?: string }[];
    notes?: string;
  }) => Promise<Task>;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<Task>;
  deleteTask: (taskId: string) => Promise<void>;
  addComment: (taskId: string, content: string) => Promise<void>;
  addSuggestion: (taskId: string, content: string) => Promise<void>;
  updateSuggestionStatus: (
    taskId: string,
    suggestionId: string,
    status: 'open' | 'adopted' | 'dismissed',
    note?: string
  ) => Promise<void>;
  toggleSubtask: (taskId: string, subtaskId: string) => Promise<void>;
  addSubtask: (taskId: string, title: string) => Promise<void>;
  deleteSubtask: (taskId: string, subtaskId: string) => Promise<void>;

  // Attachments (Canonical storage_path with signed URLs)
  uploadAndAddAttachment: (taskId: string, file: File) => Promise<void>;
  addAttachment: (taskId: string, attachment: Omit<TaskAttachment, 'id' | 'uploadedAt'>) => Promise<void>;
  deleteAttachment: (taskId: string, attachmentId: string) => Promise<void>;
  downloadAttachment: (storagePath: string, fileName: string) => Promise<void>;
  getSignedAttachmentUrl: (storagePath: string) => Promise<string>;

  // Notification actions
  markNotificationAsRead: (notifId: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;

  // Reset demo
  resetData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const defaultGuestUser: User = {
  id: 'user-guest',
  name: 'Surya Sakthi',
  email: 'suryasakthi8870@gmail.com',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  role: 'lead',
  title: 'Product Lead & Architect',
  department: 'Product & Engineering'
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User>(defaultGuestUser);
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState<'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR'>('DISCONNECTED');

  // Custom Toast & Confirmation state
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogOptions | null>(null);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((toast: Omit<ToastItem, 'id'> | string, type: ToastType = 'info'): string => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newToast: ToastItem = typeof toast === 'string'
      ? { id, message: toast, type, duration: 4000 }
      : { id, ...toast, type: toast.type || type, duration: toast.duration || 4000 };

    setToasts(prev => [...prev.slice(-4), newToast]); // keep max 5 toasts visible

    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        dismissToast(id);
      }, newToast.duration);
    }

    return id;
  }, [dismissToast]);

  const showConfirmDialog = useCallback((options: ConfirmDialogOptions) => {
    setConfirmDialog(options);
  }, []);

  const closeConfirmDialog = useCallback(() => {
    setConfirmDialog(null);
  }, []);

  const isConfigured = isSupabaseConfigured();
  const isDemoMode = isDemoModeEnabled() || !isConfigured;

  // Theme support - locked to clean light theme
  const [theme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('ttt_theme', 'light');
  }, []);

  const toggleTheme = useCallback(() => {
    document.documentElement.classList.remove('dark');
  }, []);

  const clearError = useCallback(() => {
    setErrorMessage(null);
  }, []);

  // Primary data fetch
  const refreshTasksAndData = useCallback(async (currentWsId?: string, activeUserId?: string) => {
    try {
      const targetWsId = currentWsId && currentWsId !== 'default-workspace' ? currentWsId : undefined;
      const [allTasks, allUsers] = await Promise.all([
        dataService.getTasks(targetWsId),
        dataService.getUsers()
      ]);
      setTasks(allTasks);
      setUsers(allUsers);

      if (activeUserId) {
        const notifs = await dataService.getNotifications(activeUserId);
        setNotifications(notifs);
      }
    } catch (err: unknown) {
      console.warn('refreshTasksAndData error:', err);
    }
  }, []);

  // Initial Load & Auth Initialization
  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      if (!isSupabaseConfigured() && !isDemoModeEnabled()) {
        setErrorMessage(
          'Supabase backend is not configured yet. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment to connect your PostgreSQL database and Supabase Auth.'
        );
        setIsLoading(false);
        return;
      }

      // Check current auth user
      let activeUser = await dataService.getCurrentAuthUser();
      if (!activeUser) {
        if (isDemoModeEnabled()) {
          activeUser = await dataService.getActiveUser();
        } else {
          // In real production with Supabase configured but no session yet, prompt authentication
          setIsAuthModalOpen(true);
          setIsLoading(false);
          return;
        }
      }

      setCurrentUser(activeUser);

      // Load workspace & all team members
      const ws = await dataService.getWorkspace();
      const allUsers = await dataService.getUsers();
      const allTasks = await dataService.getTasks(ws.id);
      const notifs = await dataService.getNotifications(activeUser.id);

      setWorkspace(ws);
      setUsers(allUsers);
      setTasks(allTasks);
      setNotifications(notifs);
    } catch (err: unknown) {
      console.error('Error loading initial app data:', err);
      const msg = err instanceof Error ? err.message : 'Failed to connect to Supabase backend.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();

    // Supabase Auth listener
    if (isSupabaseConfigured()) {
      const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          // Clean up URL hash if redirected back with tokens
          if (window.location.hash && window.location.hash.includes('access_token')) {
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
          }
          setIsAuthModalOpen(false);
          try {
            const user = await dataService.getCurrentAuthUser();
            if (user) {
              setCurrentUser(user);
              await loadInitialData();
            }
          } catch (e) {
            console.error('Error loading auth user on state change:', e);
          }
        } else if (event === 'SIGNED_OUT') {
          setCurrentUser(defaultGuestUser);
          setTasks([]);
          setNotifications([]);
          setWorkspace(null);
          setIsAuthModalOpen(true);
        }
      });

      return () => {
        authListener?.subscription.unsubscribe();
      };
    }
  }, [loadInitialData]);

  // Listen to realtime connection status
  useEffect(() => {
    const unsubStatus = realtimeService.onStatusChange(setRealtimeStatus);
    return () => unsubStatus();
  }, []);

  // Supabase Realtime Subscription with optimistic deduplication and granular updates
  useEffect(() => {
    if (!workspace?.id) return;

    const unsubscribe = realtimeService.subscribeToWorkspace(workspace.id, async (payload) => {
      const { table, eventType, new: newRec, old: oldRec } = payload;

      try {
        if (table === 'tasks') {
          if (eventType === 'INSERT') {
            const taskId = String(newRec.id || '');
            if (!taskId) return;

            // Fetch the fully populated domain task
            const fullTask = await dataService.getTaskById(taskId);
            if (fullTask) {
              setTasks(prev => {
                // If it was already optimistically added, merge/replace with canonical backend record
                const exists = prev.some(t => t.id === taskId);
                if (exists) {
                  return prev.map(t => (t.id === taskId ? { ...fullTask, comments: t.comments.length > fullTask.comments.length ? t.comments : fullTask.comments } : t));
                }
                return [fullTask, ...prev];
              });
            }
          } else if (eventType === 'UPDATE') {
            const taskId = String(newRec.id || oldRec.id || '');
            if (!taskId) return;

            setTasks(prev =>
              prev.map(t => {
                if (t.id !== taskId) return t;
                return {
                  ...t,
                  title: newRec.title !== undefined ? (newRec.title as string) : t.title,
                  description: newRec.description !== undefined ? ((newRec.description as string) || '') : t.description,
                  status: newRec.status !== undefined ? (newRec.status as TaskStatus) : t.status,
                  priority: newRec.priority !== undefined ? (newRec.priority as TaskPriority) : t.priority,
                  assigneeId: newRec.assignee_id !== undefined ? ((newRec.assignee_id as string) || '') : t.assigneeId,
                  dueDate: newRec.due_date !== undefined ? ((newRec.due_date as string) || '') : t.dueDate,
                  updatedAt: (newRec.updated_at as string) || new Date().toISOString()
                };
              })
            );

            // Background refresh to guarantee nested relational integrity
            dataService.getTaskById(taskId).then(synced => {
              if (synced) {
                setTasks(prev => prev.map(t => (t.id === taskId ? synced : t)));
              }
            }).catch(e => console.warn('Realtime task background sync error:', e));
          } else if (eventType === 'DELETE') {
            const taskId = String(oldRec.id || newRec.id || '');
            if (!taskId) return;
            setTasks(prev => prev.filter(t => t.id !== taskId));
            setSelectedTaskId(prevId => (prevId === taskId ? null : prevId));
          }
        } else if (table === 'comments') {
          const taskId = String(newRec.task_id || oldRec.task_id || '');
          if (taskId && taskId !== 'undefined') {
            if (eventType === 'INSERT' && newRec.id) {
              const commentId = String(newRec.id);
              const commentUserId = String(newRec.user_id || '');
              const commentContent = String(newRec.content || '');
              const commentCreatedAt = String(newRec.created_at || new Date().toISOString());

              setTasks(prev =>
                prev.map(t => {
                  if (t.id !== taskId) return t;
                  if (t.comments.some(c => c.id === commentId)) return t;
                  return {
                    ...t,
                    comments: [
                      ...t.comments,
                      {
                        id: commentId,
                        userId: commentUserId,
                        content: commentContent,
                        createdAt: commentCreatedAt
                      }
                    ]
                  };
                })
              );
            }

            // Sync task to fetch avatar / user profile links
            dataService.getTaskById(taskId).then(synced => {
              if (synced) {
                setTasks(prev => prev.map(t => (t.id === taskId ? synced : t)));
              }
            }).catch(e => console.warn('Realtime comment task sync error:', e));
          }
        } else if (table === 'activity_logs') {
          const taskId = String(newRec.task_id || oldRec.task_id || '');
          if (taskId && taskId !== 'undefined' && eventType === 'INSERT' && newRec.id) {
            const actId = String(newRec.id);
            const actUserId = String(newRec.user_id || '');
            const actAction = (newRec.action as TaskActivity['action']) || 'status_changed';
            const actDetails = String(newRec.details || '');
            const actTimestamp = String(newRec.timestamp || newRec.created_at || new Date().toISOString());

            setTasks(prev =>
              prev.map(t => {
                if (t.id !== taskId) return t;
                if (t.activity.some(a => a.id === actId)) return t;
                return {
                  ...t,
                  activity: [
                    {
                      id: actId,
                      taskId,
                      userId: actUserId,
                      action: actAction,
                      details: actDetails,
                      timestamp: actTimestamp
                    },
                    ...t.activity
                  ]
                };
              })
            );
          }
        } else if (
          table === 'task_subtasks' ||
          table === 'suggestions' ||
          table === 'notes' ||
          table === 'attachments' ||
          table === 'task_labels'
        ) {
          const taskId = String(newRec.task_id || oldRec.task_id || '');
          if (taskId && taskId !== 'undefined') {
            dataService.getTaskById(taskId).then(synced => {
              if (synced) {
                setTasks(prev => prev.map(t => (t.id === taskId ? synced : t)));
              }
            }).catch(e => console.warn('Realtime sub-resource sync error:', e));
          }
        } else if (table === 'notifications') {
          if (currentUser?.id) {
            dataService.getNotifications(currentUser.id).then(notifs => {
              setNotifications(notifs);
              // If new notification is unread and for current user, show subtle toast
              if (eventType === 'INSERT' && newRec.user_id === currentUser.id && newRec.actor_id !== currentUser.id) {
                showToast({
                  type: 'info',
                  title: String(newRec.title || 'New Notification'),
                  message: String(newRec.message || 'You have a new update.'),
                  duration: 5000
                });
              }
            }).catch(e => console.warn('Realtime notifications sync error:', e));
          }
        } else if (table === 'profiles') {
          dataService.getUsers().then(setUsers).catch(e => console.warn('Realtime profiles sync error:', e));
        } else if (table === 'workspaces') {
          dataService.getWorkspace().then(setWorkspace).catch(e => console.warn('Realtime workspace sync error:', e));
        }
      } catch (err) {
        console.warn('Error handling realtime event:', err);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [workspace?.id, currentUser.id, showToast]);

  // Auth Handlers
  const signInWithEmail = async (email: string, password: string) => {
    setErrorMessage(null);
    try {
      const user = await dataService.signInWithEmail(email, password);
      setCurrentUser(user);
      setIsAuthModalOpen(false);
      await loadInitialData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign in failed';
      setErrorMessage(msg);
      throw err;
    }
  };

  const signUpWithEmail = async (
    email: string,
    password: string,
    profileData: { name: string; role: MemberRole; title?: string; department?: string; avatar?: string }
  ) => {
    setErrorMessage(null);
    try {
      const user = await dataService.signUpWithEmail(email, password, profileData);
      setCurrentUser(user);
      setIsAuthModalOpen(false);
      await loadInitialData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign up failed';
      setErrorMessage(msg);
      throw err;
    }
  };

  const signInWithGoogle = async () => {
    setErrorMessage(null);
    try {
      await dataService.signInWithGoogle();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google authentication failed';
      setErrorMessage(msg);
      throw err;
    }
  };

  const signOut = async () => {
    await dataService.signOut();
    setCurrentUser(defaultGuestUser);
    setTasks([]);
    setNotifications([]);
    setIsAuthModalOpen(true);
  };

  const resetPassword = async (email: string) => {
    setErrorMessage(null);
    try {
      await dataService.resetPassword(email);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Password reset failed';
      setErrorMessage(msg);
      throw err;
    }
  };

  const updateCurrentUserProfile = async (updates: Partial<User>) => {
    const updated = await dataService.updateUserProfile({ ...currentUser, ...updates });
    setCurrentUser(updated);
    const updatedUsers = await dataService.getUsers();
    setUsers(updatedUsers);
  };

  const switchUser = async (user: User) => {
    await dataService.setActiveUser(user);
    setCurrentUser(user);
    const notifs = await dataService.getNotifications(user.id);
    setNotifications(notifs);
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

  // Task Actions
  const createTask = async (data: {
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    assigneeId: string;
    dueDate: string;
    labels: TaskLabel[];
    subtasks?: { id: string; title: string; completed: boolean; assignedTo?: string }[];
    notes?: string;
  }): Promise<Task> => {
    const wsId = workspace?.id || 'default-workspace';
    
    // Create task in backend / storage
    const createdTask = await dataService.createTask(
      {
        workspaceId: wsId,
        title: data.title,
        description: data.description,
        status: data.status,
        priority: data.priority,
        assigneeId: data.assigneeId,
        creatorId: currentUser.id,
        dueDate: data.dueDate,
        labels: data.labels || [],
        subtasks: (data.subtasks || []).map((st, i) => ({
          id: st.id || `st-${Date.now()}-${i}`,
          title: st.title,
          completed: st.completed,
          assignedTo: st.assignedTo
        })),
        notes: data.notes || ''
      },
      currentUser
    );

    // Immediately update local tasks state so it renders without delay or page refresh
    setTasks(prev => [createdTask, ...prev.filter(t => t.id !== createdTask.id)]);

    // Trigger background sync
    refreshTasksAndData(workspace?.id, currentUser.id).catch(err => console.warn('Background sync error:', err));
    return createdTask;
  };

  const updateTask = async (taskId: string, updates: Partial<Task>): Promise<Task> => {
    // 1. Optimistic immediate state update
    setTasks(prev =>
      prev.map(t => (t.id === taskId ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t))
    );

    // 2. Persist to dataService / backend
    const updated = await dataService.updateTask(taskId, updates, currentUser);

    // 3. Update with authoritative response
    setTasks(prev => prev.map(t => (t.id === taskId ? updated : t)));

    // 4. Background sync
    refreshTasksAndData(workspace?.id, currentUser.id).catch(err => console.warn('Background sync error:', err));
    return updated;
  };

  const deleteTask = async (taskId: string): Promise<void> => {
    // 1. Immediate removal from UI state
    setTasks(prev => prev.filter(t => t.id !== taskId));
    if (selectedTaskId === taskId) {
      setSelectedTaskId(null);
    }

    // 2. Delete from dataService
    await dataService.deleteTask(taskId);

    // 3. Background sync
    refreshTasksAndData(workspace?.id, currentUser.id).catch(err => console.warn('Background sync error:', err));
  };

  const addComment = async (taskId: string, content: string): Promise<void> => {
    const tempComment = {
      id: `comment-temp-${Date.now()}`,
      taskId,
      userId: currentUser.id,
      content,
      createdAt: new Date().toISOString()
    };
    // Immediate UI update
    setTasks(prev =>
      prev.map(t =>
        t.id === taskId
          ? {
              ...t,
              comments: [...t.comments, tempComment],
              activity: [
                {
                  id: `act-temp-${Date.now()}`,
                  taskId,
                  userId: currentUser.id,
                  action: 'commented',
                  details: `${currentUser.name} added a comment`,
                  timestamp: new Date().toISOString()
                },
                ...t.activity
              ]
            }
          : t
      )
    );

    await dataService.addComment(taskId, content, currentUser);
    await refreshTasksAndData(workspace?.id, currentUser.id);
  };

  const addSuggestion = async (taskId: string, content: string): Promise<void> => {
    const tempSuggestion = {
      id: `sug-temp-${Date.now()}`,
      taskId,
      userId: currentUser.id,
      content,
      status: 'open' as const,
      createdAt: new Date().toISOString()
    };
    // Immediate UI update
    setTasks(prev =>
      prev.map(t =>
        t.id === taskId
          ? {
              ...t,
              suggestions: [...t.suggestions, tempSuggestion]
            }
          : t
      )
    );

    await dataService.addSuggestion(taskId, content, currentUser);
    await refreshTasksAndData(workspace?.id, currentUser.id);
  };

  const updateSuggestionStatus = async (
    taskId: string,
    suggestionId: string,
    status: 'open' | 'adopted' | 'dismissed',
    note?: string
  ): Promise<void> => {
    // Immediate UI update
    setTasks(prev =>
      prev.map(t =>
        t.id === taskId
          ? {
              ...t,
              suggestions: t.suggestions.map(s =>
                s.id === suggestionId ? { ...s, status, resolutionNote: note } : s
              )
            }
          : t
      )
    );

    await dataService.updateSuggestionStatus(taskId, suggestionId, status, note);
    await refreshTasksAndData(workspace?.id, currentUser.id);
  };

  const toggleSubtask = async (taskId: string, subtaskId: string): Promise<void> => {
    // Immediate UI update
    setTasks(prev =>
      prev.map(t =>
        t.id === taskId
          ? {
              ...t,
              subtasks: t.subtasks.map(st =>
                st.id === subtaskId ? { ...st, completed: !st.completed } : st
              )
            }
          : t
      )
    );

    await dataService.toggleSubtask(taskId, subtaskId, currentUser);
    await refreshTasksAndData(workspace?.id, currentUser.id);
  };

  const addSubtask = async (taskId: string, title: string): Promise<void> => {
    const tempSubtask = {
      id: `st-temp-${Date.now()}`,
      title,
      completed: false
    };
    // Immediate UI update
    setTasks(prev =>
      prev.map(t =>
        t.id === taskId
          ? {
              ...t,
              subtasks: [...t.subtasks, tempSubtask]
            }
          : t
      )
    );

    await dataService.addSubtask(taskId, title);
    await refreshTasksAndData(workspace?.id, currentUser.id);
  };

  const deleteSubtask = async (taskId: string, subtaskId: string): Promise<void> => {
    // Immediate UI update
    setTasks(prev =>
      prev.map(t =>
        t.id === taskId
          ? {
              ...t,
              subtasks: t.subtasks.filter(st => st.id !== subtaskId)
            }
          : t
      )
    );

    await dataService.deleteSubtask(taskId, subtaskId);
    await refreshTasksAndData(workspace?.id, currentUser.id);
  };

  // Attachments Handling
  const uploadAndAddAttachment = async (taskId: string, file: File): Promise<void> => {
    const wsId = workspace?.id || 'default-workspace';
    if (isSupabaseConfigured()) {
      const uploadResult = await storageService.uploadTaskAttachment(wsId, taskId, file);
      const newAtt = await dataService.addAttachment(
        taskId,
        {
          taskId,
          name: uploadResult.name,
          size: uploadResult.size,
          type: uploadResult.type,
          storagePath: uploadResult.storagePath,
          uploadedBy: currentUser.id
        },
        currentUser
      );
      // Immediate UI update
      setTasks(prev =>
        prev.map(t =>
          t.id === taskId
            ? {
                ...t,
                attachments: [...t.attachments, newAtt]
              }
            : t
        )
      );
    } else {
      // Offline fallback
      const newAtt = await dataService.addAttachment(
        taskId,
        {
          taskId,
          name: file.name,
          size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
          type: file.type || 'application/octet-stream',
          storagePath: `demo/${file.name}`,
          url: URL.createObjectURL(file),
          uploadedBy: currentUser.id
        },
        currentUser
      );
      // Immediate UI update
      setTasks(prev =>
        prev.map(t =>
          t.id === taskId
            ? {
                ...t,
                attachments: [...t.attachments, newAtt]
              }
            : t
        )
      );
    }
    await refreshTasksAndData(workspace?.id, currentUser.id);
  };

  const addAttachment = async (
    taskId: string,
    attachment: Omit<TaskAttachment, 'id' | 'uploadedAt'>
  ): Promise<void> => {
    const newAtt = await dataService.addAttachment(taskId, attachment, currentUser);
    setTasks(prev =>
      prev.map(t =>
        t.id === taskId
          ? {
              ...t,
              attachments: [...t.attachments, newAtt]
            }
          : t
      )
    );
    await refreshTasksAndData(workspace?.id, currentUser.id);
  };

  const deleteAttachment = async (taskId: string, attachmentId: string): Promise<void> => {
    // Immediate UI update
    setTasks(prev =>
      prev.map(t =>
        t.id === taskId
          ? {
              ...t,
              attachments: t.attachments.filter(a => a.id !== attachmentId)
            }
          : t
      )
    );

    await dataService.deleteAttachment(taskId, attachmentId);
    await refreshTasksAndData(workspace?.id, currentUser.id);
  };

  const downloadAttachment = async (storagePath: string, fileName: string): Promise<void> => {
    await storageService.downloadAttachment(storagePath, fileName);
  };

  const getSignedAttachmentUrl = async (storagePath: string): Promise<string> => {
    return storageService.getSignedAttachmentUrl(storagePath);
  };

  // Notifications
  const markNotificationAsRead = async (notifId: string): Promise<void> => {
    await dataService.markNotificationAsRead(notifId);
    const notifs = await dataService.getNotifications(currentUser.id);
    setNotifications(notifs);
  };

  const markAllNotificationsAsRead = async (): Promise<void> => {
    await dataService.markAllNotificationsAsRead(currentUser.id);
    const notifs = await dataService.getNotifications(currentUser.id);
    setNotifications(notifs);
  };

  const resetData = async (): Promise<void> => {
    dataService.resetToDemoData();
    await loadInitialData();
  };

  const retryConnection = async () => {
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
        errorMessage,
        isConfigured,
        isDemoMode,
        realtimeStatus,
        toasts,
        showToast,
        dismissToast,
        confirmDialog,
        showConfirmDialog,
        closeConfirmDialog,
        setCurrentView,
        setSelectedTaskId,
        setIsNewTaskModalOpen,
        setIsAuthModalOpen,
        setSearchQuery,
        toggleTheme,
        clearError,
        retryConnection,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        signOut,
        resetPassword,
        updateCurrentUserProfile,
        switchUser,
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
        uploadAndAddAttachment,
        addAttachment,
        deleteAttachment,
        downloadAttachment,
        getSignedAttachmentUrl,
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
