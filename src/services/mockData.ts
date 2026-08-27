import { User, Task, Workspace, NotificationItem } from '../types';

export const initialUsers: User[] = [
  {
    id: 'user-1',
    name: 'Surya Sakthi',
    email: 'surya@teamtracker.dev',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    role: 'lead',
    title: 'Product Lead & Architect',
    department: 'Product & Engineering'
  },
  {
    id: 'user-2',
    name: 'Arun Kumar',
    email: 'arun@teamtracker.dev',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    role: 'developer',
    title: 'Senior Frontend Engineer',
    department: 'Engineering'
  },
  {
    id: 'user-3',
    name: 'Priya Sharma',
    email: 'priya@teamtracker.dev',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    role: 'designer',
    title: 'Lead UI/UX Designer',
    department: 'Design'
  },
  {
    id: 'user-4',
    name: 'Alex Rivera',
    email: 'alex@teamtracker.dev',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    role: 'developer',
    title: 'Senior Backend Engineer',
    department: 'Engineering'
  },
  {
    id: 'user-5',
    name: 'Elena Rostova',
    email: 'elena@teamtracker.dev',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    role: 'member',
    title: 'QA & Release Specialist',
    department: 'Operations'
  }
];

export const initialWorkspace: Workspace = {
  id: 'ws-1',
  name: 'Creative Tech Studio',
  description: 'Core product workspace for sprint planning, design systems & engineering tasks',
  ownerId: 'user-1',
  members: initialUsers,
  createdAt: '2026-01-10T08:00:00Z'
};

// Helper for dynamic date relative to today (Aug 2026 as per system context)
const getRelativeDate = (offsetDays: number): string => {
  const d = new Date('2026-08-27T00:00:00');
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
};

export const initialTasks: Task[] = [
  {
    id: 'task-101',
    workspaceId: 'ws-1',
    title: 'Design System & Component Tokens',
    description: 'Establish standard color variables, button variants, and spacing scale for the new unified web platform interface.',
    status: 'in_progress',
    priority: 'high',
    assigneeId: 'user-3', // Priya
    creatorId: 'user-1', // Surya
    dueDate: getRelativeDate(1), // Tomorrow
    labels: [
      { id: 'l-1', name: 'Design', color: 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800' },
      { id: 'l-2', name: 'UI Tokens', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800' }
    ],
    subtasks: [
      { id: 'st-1', title: 'Audit existing palette and semantic hex codes', completed: true },
      { id: 'st-2', title: 'Create Figma component library with variants', completed: true },
      { id: 'st-3', title: 'Export JSON design tokens for Tailwind theme', completed: false },
      { id: 'st-4', title: 'Review token names with frontend engineering', completed: false }
    ],
    comments: [
      {
        id: 'c-1',
        userId: 'user-2',
        content: 'I checked the preliminary token exports—they map super cleanly to our Tailwind config!',
        createdAt: '2026-08-26T14:30:00Z'
      },
      {
        id: 'c-2',
        userId: 'user-3',
        content: 'Awesome! Finalizing the dark mode contrast values tonight.',
        createdAt: '2026-08-26T16:15:00Z'
      }
    ],
    notes: 'Token JSON will be ingested into `src/tokens/colors.json` on next release.',
    attachments: [
      {
        id: 'att-1',
        taskId: 'task-101',
        name: 'Design-Tokens-v2.fig',
        size: '4.8 MB',
        type: 'figma',
        url: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&auto=format&fit=crop&q=80',
        uploadedBy: 'user-3',
        uploadedAt: '2026-08-25T11:00:00Z'
      },
      {
        id: 'att-2',
        taskId: 'task-101',
        name: 'Color-Palette-Contrast-Spec.pdf',
        size: '1.2 MB',
        type: 'application/pdf',
        url: 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=800&auto=format&fit=crop&q=80',
        uploadedBy: 'user-3',
        uploadedAt: '2026-08-25T14:20:00Z'
      }
    ],
    suggestions: [
      {
        id: 'sug-1',
        taskId: 'task-101',
        userId: 'user-1',
        content: 'Try using the layout tokens from the previous landing page for consistent card paddings.',
        status: 'open',
        createdAt: '2026-08-26T09:00:00Z'
      }
    ],
    activity: [
      {
        id: 'act-1',
        taskId: 'task-101',
        userId: 'user-1',
        action: 'created',
        details: 'Surya created this task',
        timestamp: '2026-08-24T10:00:00Z'
      },
      {
        id: 'act-2',
        taskId: 'task-101',
        userId: 'user-1',
        action: 'assigned',
        details: 'Surya assigned task to Priya',
        timestamp: '2026-08-24T10:02:00Z'
      },
      {
        id: 'act-3',
        taskId: 'task-101',
        userId: 'user-3',
        action: 'status_changed',
        details: 'Priya moved status from Todo to In Progress',
        timestamp: '2026-08-25T09:30:00Z'
      },
      {
        id: 'act-4',
        taskId: 'task-101',
        userId: 'user-1',
        action: 'suggestion_added',
        details: 'Surya posted a new suggestion on token padding',
        timestamp: '2026-08-26T09:00:00Z'
      }
    ],
    createdAt: '2026-08-24T10:00:00Z',
    updatedAt: '2026-08-26T16:15:00Z'
  },
  {
    id: 'task-102',
    workspaceId: 'ws-1',
    title: 'Homepage Design & Hero Section',
    description: 'Implement the refreshed hero banner, interactive preview mockup, and call-to-action flow.',
    status: 'in_progress',
    priority: 'urgent',
    assigneeId: 'user-2', // Arun
    creatorId: 'user-1', // Surya
    dueDate: getRelativeDate(0), // Today!
    labels: [
      { id: 'l-3', name: 'Frontend', color: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800' },
      { id: 'l-1', name: 'Design', color: 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800' }
    ],
    subtasks: [
      { id: 'st-5', title: 'Code responsive navigation bar', completed: true },
      { id: 'st-6', title: 'Implement animated hero gradient & typography', completed: true },
      { id: 'st-7', title: 'Add interactive product screenshot modal', completed: false },
      { id: 'st-8', title: 'Verify mobile viewport breakpoints', completed: false }
    ],
    comments: [
      {
        id: 'c-3',
        userId: 'user-1',
        content: 'Please make sure performance score remains > 95 on Lighthouse.',
        createdAt: '2026-08-25T15:00:00Z'
      }
    ],
    notes: 'Assets are hosted in Figma file `Hero-v4.fig`.',
    attachments: [
      {
        id: 'att-3',
        taskId: 'task-102',
        name: 'Hero-Mockup-4K.png',
        size: '3.4 MB',
        type: 'image/png',
        url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=80',
        uploadedBy: 'user-3',
        uploadedAt: '2026-08-25T10:15:00Z'
      }
    ],
    suggestions: [
      {
        id: 'sug-2',
        taskId: 'task-102',
        userId: 'user-3',
        content: 'Try using the layout from the previous landing page for the social proof badges.',
        status: 'open',
        createdAt: '2026-08-26T11:20:00Z'
      }
    ],
    activity: [
      {
        id: 'act-5',
        taskId: 'task-102',
        userId: 'user-1',
        action: 'assigned',
        details: 'Surya assigned Homepage Design to Arun',
        timestamp: '2026-08-25T08:30:00Z'
      },
      {
        id: 'act-6',
        taskId: 'task-102',
        userId: 'user-2',
        action: 'status_changed',
        details: 'Arun moved status from Todo to In Progress',
        timestamp: '2026-08-25T09:00:00Z'
      }
    ],
    createdAt: '2026-08-25T08:30:00Z',
    updatedAt: '2026-08-26T11:20:00Z'
  },
  {
    id: 'task-103',
    workspaceId: 'ws-1',
    title: 'Refactor Authentication & Session Tokens',
    description: 'Ensure clean architecture for session handling, token refresh logic, and RBAC permission checks.',
    status: 'todo',
    priority: 'high',
    assigneeId: 'user-4', // Alex
    creatorId: 'user-1', // Surya
    dueDate: getRelativeDate(3),
    labels: [
      { id: 'l-4', name: 'Backend', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' },
      { id: 'l-5', name: 'Security', color: 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800' }
    ],
    subtasks: [
      { id: 'st-9', title: 'Define standardized JWT claims schema', completed: false },
      { id: 'st-10', title: 'Implement refresh token rotation mechanism', completed: false },
      { id: 'st-11', title: 'Add middleware for workspace-level role checks', completed: false }
    ],
    comments: [],
    notes: 'Compatible with future Supabase Auth API spec.',
    attachments: [],
    suggestions: [],
    activity: [
      {
        id: 'act-7',
        taskId: 'task-103',
        userId: 'user-1',
        action: 'created',
        details: 'Surya created task and assigned to Alex',
        timestamp: '2026-08-25T14:00:00Z'
      }
    ],
    createdAt: '2026-08-25T14:00:00Z',
    updatedAt: '2026-08-25T14:00:00Z'
  },
  {
    id: 'task-104',
    workspaceId: 'ws-1',
    title: 'Automated E2E Testing Pipeline',
    description: 'Set up automated smoke tests for critical user flows: task creation, status updates, and file attachments.',
    status: 'review',
    priority: 'medium',
    assigneeId: 'user-5', // Elena
    creatorId: 'user-1', // Surya
    dueDate: getRelativeDate(-1), // Overdue by 1 day!
    labels: [
      { id: 'l-6', name: 'QA', color: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800' },
      { id: 'l-7', name: 'DevOps', color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800' }
    ],
    subtasks: [
      { id: 'st-12', title: 'Configure Playwright test runner in CI', completed: true },
      { id: 'st-13', title: 'Write tests for Kanban card drag & drop', completed: true },
      { id: 'st-14', title: 'Generate visual regression baseline snapshots', completed: true },
      { id: 'st-15', title: 'Elena submitted PR for code review', completed: true }
    ],
    comments: [
      {
        id: 'c-4',
        userId: 'user-5',
        content: 'PR #42 is ready for review. All test suites pass on Chromium and WebKit.',
        createdAt: '2026-08-26T17:00:00Z'
      }
    ],
    notes: 'CI job runtime reduced to 1m 45s.',
    attachments: [
      {
        id: 'att-4',
        taskId: 'task-104',
        name: 'e2e-coverage-report.html',
        size: '1.8 MB',
        type: 'text/html',
        url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=80',
        uploadedBy: 'user-5',
        uploadedAt: '2026-08-26T16:50:00Z'
      }
    ],
    suggestions: [
      {
        id: 'sug-3',
        taskId: 'task-104',
        userId: 'user-2',
        content: 'Consider adding a retry policy of 1 for flaky network tests in staging.',
        status: 'adopted',
        createdAt: '2026-08-26T17:30:00Z',
        resolutionNote: 'Adopted: added retries: 1 in playwright.config'
      }
    ],
    activity: [
      {
        id: 'act-8',
        taskId: 'task-104',
        userId: 'user-5',
        action: 'status_changed',
        details: 'Elena moved task to Review',
        timestamp: '2026-08-26T17:00:00Z'
      }
    ],
    createdAt: '2026-08-23T09:00:00Z',
    updatedAt: '2026-08-26T17:30:00Z'
  },
  {
    id: 'task-105',
    workspaceId: 'ws-1',
    title: 'Workspace Settings & Team Member Permissions UI',
    description: 'Build role selector, invite modal, and workspace metadata editor.',
    status: 'done',
    priority: 'medium',
    assigneeId: 'user-1', // Surya
    creatorId: 'user-1',
    dueDate: getRelativeDate(-2), // Completed 2 days ago
    labels: [
      { id: 'l-3', name: 'Frontend', color: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800' }
    ],
    subtasks: [
      { id: 'st-16', title: 'Build team member list with role chips', completed: true },
      { id: 'st-17', title: 'Implement invite member dialog', completed: true },
      { id: 'st-18', title: 'Add workspace rename and delete guard modal', completed: true }
    ],
    comments: [
      {
        id: 'c-5',
        userId: 'user-1',
        content: 'Merged and verified in production preview.',
        createdAt: '2026-08-24T18:00:00Z'
      }
    ],
    notes: 'All roles tested against permissions matrix.',
    attachments: [],
    suggestions: [],
    activity: [
      {
        id: 'act-9',
        taskId: 'task-105',
        userId: 'user-1',
        action: 'status_changed',
        details: 'Surya marked task as Done',
        timestamp: '2026-08-24T18:00:00Z'
      }
    ],
    createdAt: '2026-08-22T10:00:00Z',
    updatedAt: '2026-08-24T18:00:00Z'
  },
  {
    id: 'task-106',
    workspaceId: 'ws-1',
    title: 'Optimize File Uploads & Storage Bucket Policies',
    description: 'Implement client-side image compression and prepare storage hooks for future Supabase storage integration.',
    status: 'todo',
    priority: 'low',
    assigneeId: 'user-4', // Alex
    creatorId: 'user-1',
    dueDate: getRelativeDate(5),
    labels: [
      { id: 'l-4', name: 'Backend', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' }
    ],
    subtasks: [
      { id: 'st-19', title: 'Create storage client abstraction layer', completed: false },
      { id: 'st-20', title: 'Support drag-and-drop file multi-upload', completed: false }
    ],
    comments: [],
    notes: '',
    attachments: [],
    suggestions: [],
    activity: [
      {
        id: 'act-10',
        taskId: 'task-106',
        userId: 'user-1',
        action: 'created',
        details: 'Surya created task',
        timestamp: '2026-08-26T08:00:00Z'
      }
    ],
    createdAt: '2026-08-26T08:00:00Z',
    updatedAt: '2026-08-26T08:00:00Z'
  },
  {
    id: 'task-107',
    workspaceId: 'ws-1',
    title: 'Product Roadmap Q4 Review & Presentation',
    description: 'Compile engineering metrics, velocity charts, and key feature milestones for executive review.',
    status: 'in_progress',
    priority: 'high',
    assigneeId: 'user-1', // Surya
    creatorId: 'user-1',
    dueDate: getRelativeDate(2),
    labels: [
      { id: 'l-8', name: 'Planning', color: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800' }
    ],
    subtasks: [
      { id: 'st-21', title: 'Gather completed sprint statistics', completed: true },
      { id: 'st-22', title: 'Draft slide deck narrative', completed: false },
      { id: 'st-23', title: 'Review with team leads', completed: false }
    ],
    comments: [],
    notes: 'Presentation scheduled for Friday afternoon.',
    attachments: [
      {
        id: 'att-5',
        taskId: 'task-107',
        name: 'Roadmap-Deck-Q4.pdf',
        size: '5.2 MB',
        type: 'application/pdf',
        url: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&auto=format&fit=crop&q=80',
        uploadedBy: 'user-1',
        uploadedAt: '2026-08-26T12:00:00Z'
      }
    ],
    suggestions: [
      {
        id: 'sug-4',
        taskId: 'task-107',
        userId: 'user-3',
        content: 'We can include the design system component count metric in the achievements slide!',
        status: 'open',
        createdAt: '2026-08-26T13:40:00Z'
      }
    ],
    activity: [
      {
        id: 'act-11',
        taskId: 'task-107',
        userId: 'user-1',
        action: 'created',
        details: 'Surya created task',
        timestamp: '2026-08-25T11:00:00Z'
      }
    ],
    createdAt: '2026-08-25T11:00:00Z',
    updatedAt: '2026-08-26T13:40:00Z'
  }
];

export const initialNotifications: NotificationItem[] = [
  {
    id: 'notif-1',
    userId: 'user-1', // Surya
    actorId: 'user-3', // Priya
    taskId: 'task-101',
    type: 'comment',
    title: 'New comment on Design Tokens',
    message: 'Priya commented: "Awesome! Finalizing the dark mode contrast values tonight."',
    read: false,
    createdAt: '2026-08-26T16:15:00Z'
  },
  {
    id: 'notif-2',
    userId: 'user-1',
    actorId: 'user-5', // Elena
    taskId: 'task-104',
    type: 'status_update',
    title: 'Task ready for review',
    message: 'Elena moved Automated E2E Testing Pipeline to Review.',
    read: false,
    createdAt: '2026-08-26T17:00:00Z'
  },
  {
    id: 'notif-3',
    userId: 'user-1',
    actorId: 'user-3',
    taskId: 'task-107',
    type: 'suggestion',
    title: 'New suggestion received',
    message: 'Priya suggested: "We can include the design system component count metric..."',
    read: true,
    createdAt: '2026-08-26T13:40:00Z'
  },
  {
    id: 'notif-4',
    userId: 'user-1',
    actorId: 'user-1',
    taskId: 'task-104',
    type: 'overdue',
    title: 'Task is overdue',
    message: 'Automated E2E Testing Pipeline is past its due date.',
    read: true,
    createdAt: '2026-08-26T00:01:00Z'
  }
];
