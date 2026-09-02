import { User } from '../types';

export interface PromptValidationAlert {
  type: 'missing_due_date' | 'missing_priority' | 'missing_assignee' | 'vague_title' | 'general_tip';
  title: string;
  message: string;
  suggestedAppends: { label: string; appendText: string }[];
}

export function analyzePromptForMissingDetails(prompt: string, teamUsers: User[] = []): PromptValidationAlert[] {
  const text = prompt.trim().toLowerCase();
  if (!text || text.length < 5) return [];

  const alerts: PromptValidationAlert[] = [];

  const isTaskCreation =
    text.includes('create task') ||
    text.includes('add task') ||
    text.includes('new task') ||
    text.includes('make a task') ||
    text.includes('schedule task') ||
    text.startsWith('task:') ||
    text.startsWith('todo:');

  const isTaskUpdate =
    text.includes('assign') ||
    text.includes('move to') ||
    text.includes('change status') ||
    text.includes('set priority') ||
    text.includes('due date');

  if (isTaskCreation) {
    // 1. Check for Due Date
    const hasDate =
      text.includes('today') ||
      text.includes('tomorrow') ||
      text.includes('yesterday') ||
      text.includes('next week') ||
      text.includes('monday') ||
      text.includes('tuesday') ||
      text.includes('wednesday') ||
      text.includes('thursday') ||
      text.includes('friday') ||
      text.includes('saturday') ||
      text.includes('sunday') ||
      text.includes('by ') ||
      text.includes('due ') ||
      /\d{4}-\d{2}-\d{2}/.test(text) ||
      /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/.test(text);

    if (!hasDate) {
      alerts.push({
        type: 'missing_due_date',
        title: 'Missing Due Date',
        message: 'No deadline was specified. The AI will default to tomorrow or leave it unset.',
        suggestedAppends: [
          { label: '📅 Due Today', appendText: ' due today' },
          { label: '📅 Due Tomorrow', appendText: ' due tomorrow' },
          { label: '📅 Due Friday', appendText: ' due this Friday' },
        ],
      });
    }

    // 2. Check for Priority
    const hasPriority =
      text.includes('urgent') ||
      text.includes('high priority') ||
      text.includes('medium priority') ||
      text.includes('low priority') ||
      text.includes('priority high') ||
      text.includes('priority urgent') ||
      text.includes('critical');

    if (!hasPriority) {
      alerts.push({
        type: 'missing_priority',
        title: 'Missing Priority',
        message: 'Priority not specified (defaults to medium).',
        suggestedAppends: [
          { label: '⚡ High Priority', appendText: ' with high priority' },
          { label: '🔥 Urgent', appendText: ' with urgent priority' },
          { label: '⚪ Low Priority', appendText: ' with low priority' },
        ],
      });
    }

    // 3. Check for Assignee
    const knownNames = teamUsers.map((u) => u.name.toLowerCase().split(' ')[0]).filter((n) => n.length > 2);
    const hasAssignee =
      text.includes('for me') ||
      text.includes('to me') ||
      text.includes('myself') ||
      text.includes('assign to') ||
      text.includes('for ') ||
      knownNames.some((name) => text.includes(name));

    if (!hasAssignee && teamUsers.length > 0) {
      const topUsers = teamUsers.slice(0, 3);
      alerts.push({
        type: 'missing_assignee',
        title: 'Missing Assignee',
        message: 'Who should own this task?',
        suggestedAppends: [
          { label: '👤 For Me', appendText: ' assigned to me' },
          ...topUsers.map((u) => ({
            label: `👤 ${u.name.split(' ')[0]}`,
            appendText: ` assigned to ${u.name.split(' ')[0]}`,
          })),
        ],
      });
    }
  }

  return alerts;
}
