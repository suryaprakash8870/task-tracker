import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Task, User, Workspace } from '../types';

export interface ExportOptions {
  includeSubtasks?: boolean;
  includeComments?: boolean;
  includeActivity?: boolean;
  filteredAssigneeId?: string;
  filteredStatus?: string;
}

export class ExportService {
  /**
   * Export a single task to a formatted Excel file (.xlsx)
   */
  public exportTaskToExcel(task: Task, users: User[], workspaceName: string = 'Team Workspace') {
    const assignee = users.find(u => u.id === task.assigneeId);
    const creator = users.find(u => u.id === task.creatorId);

    const completedSubtasks = task.subtasks.filter(s => s.completed).length;
    const progress = task.subtasks.length > 0 ? `${Math.round((completedSubtasks / task.subtasks.length) * 100)}%` : 'N/A';

    // 1. Task Summary Sheet
    const summaryData = [
      ['Task Report', task.title],
      ['Workspace', workspaceName],
      ['Export Date', new Date().toLocaleString()],
      [''],
      ['Field', 'Value'],
      ['Task ID', task.id],
      ['Title', task.title],
      ['Description', task.description || 'No description provided'],
      ['Status', task.status.replace('_', ' ').toUpperCase()],
      ['Priority', task.priority.toUpperCase()],
      ['Assignee', assignee ? `${assignee.name} (${assignee.role})` : 'Unassigned'],
      ['Creator', creator ? creator.name : 'Unknown'],
      ['Due Date', task.dueDate || 'No deadline'],
      ['Checklist Progress', `${completedSubtasks}/${task.subtasks.length} completed (${progress})`],
      ['Labels', task.labels.map(l => l.name).join(', ') || 'None'],
      ['Created At', new Date(task.createdAt).toLocaleString()],
      ['Last Updated', new Date(task.updatedAt).toLocaleString()],
      ['Notes', task.notes || 'None']
    ];

    const wb = XLSX.utils.book_new();
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    wsSummary['!cols'] = [{ wch: 20 }, { wch: 60 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Task Summary');

    // 2. Subtasks Sheet
    if (task.subtasks.length > 0) {
      const subtaskHeaders = ['#', 'Subtask Title', 'Completed', 'Status'];
      const subtaskRows = task.subtasks.map((st, idx) => [
        idx + 1,
        st.title,
        st.completed ? 'YES' : 'NO',
        st.completed ? 'Done' : 'Pending'
      ]);
      const wsSubtasks = XLSX.utils.aoa_to_sheet([subtaskHeaders, ...subtaskRows]);
      wsSubtasks['!cols'] = [{ wch: 6 }, { wch: 50 }, { wch: 15 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(wb, wsSubtasks, 'Subtasks Checklist');
    }

    // 3. Comments Sheet
    if (task.comments && task.comments.length > 0) {
      const commentHeaders = ['#', 'Author', 'Timestamp', 'Comment Message'];
      const commentRows = task.comments.map((c, idx) => {
        const author = users.find(u => u.id === c.userId);
        return [
          idx + 1,
          author ? author.name : 'Team Member',
          new Date(c.createdAt).toLocaleString(),
          c.content
        ];
      });
      const wsComments = XLSX.utils.aoa_to_sheet([commentHeaders, ...commentRows]);
      wsComments['!cols'] = [{ wch: 6 }, { wch: 25 }, { wch: 25 }, { wch: 60 }];
      XLSX.utils.book_append_sheet(wb, wsComments, 'Comments & Discussions');
    }

    // 4. Suggestions Sheet
    if (task.suggestions && task.suggestions.length > 0) {
      const suggHeaders = ['#', 'Suggested By', 'Status', 'Suggestion Content', 'Created At'];
      const suggRows = task.suggestions.map((s, idx) => {
        const user = users.find(u => u.id === s.userId);
        return [
          idx + 1,
          user ? user.name : 'Team Member',
          s.status.toUpperCase(),
          s.content,
          new Date(s.createdAt).toLocaleString()
        ];
      });
      const wsSugg = XLSX.utils.aoa_to_sheet([suggHeaders, ...suggRows]);
      wsSugg['!cols'] = [{ wch: 6 }, { wch: 25 }, { wch: 15 }, { wch: 60 }, { wch: 25 }];
      XLSX.utils.book_append_sheet(wb, wsSugg, 'Peer Suggestions');
    }

    // Download file
    const safeTitle = task.title.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
    XLSX.writeFile(wb, `Task_${safeTitle}_${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  /**
   * Export single task to executive manager PDF briefing document
   */
  public exportTaskToPDF(task: Task, users: User[], workspaceName: string = 'Team Workspace') {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const assignee = users.find(u => u.id === task.assigneeId);
    const creator = users.find(u => u.id === task.creatorId);
    const completedSubtasks = task.subtasks.filter(s => s.completed).length;

    // Header Background Banner
    doc.setFillColor(30, 41, 59); // Slate 800
    doc.rect(0, 0, 210, 32, 'F');

    // Header Text
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text('TASK EXECUTIVE BRIEFING', 14, 15);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184); // Slate 400
    doc.text(`Workspace: ${workspaceName}  |  Exported: ${new Date().toLocaleString()}`, 14, 23);

    // Main Task Title Section
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(15, 23, 42); // Slate 900
    const splitTitle = doc.splitTextToSize(task.title, 180);
    doc.text(splitTitle, 14, 43);

    let currentY = 43 + splitTitle.length * 6 + 2;

    // Key Metadata Table
    const metadataRows = [
      ['Status', task.status.replace('_', ' ').toUpperCase(), 'Priority', task.priority.toUpperCase()],
      ['Assignee', assignee ? `${assignee.name} (${assignee.role})` : 'Unassigned', 'Due Date', task.dueDate ? task.dueDate : 'No deadline'],
      ['Created By', creator ? creator.name : 'Unknown', 'Checklist Progress', `${completedSubtasks} of ${task.subtasks.length} Completed`],
      ['Labels', task.labels.map(l => l.name).join(', ') || 'None', 'Last Updated', new Date(task.updatedAt).toLocaleDateString()]
    ];

    autoTable(doc, {
      startY: currentY,
      head: [],
      body: metadataRows,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 3, textColor: [51, 65, 85] },
      columnStyles: {
        0: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 32 },
        1: { cellWidth: 58 },
        2: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 32 },
        3: { cellWidth: 58 }
      },
      margin: { left: 14, right: 14 }
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;

    // Description Section
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text('Description & Objective', 14, currentY);
    currentY += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    const descText = task.description || 'No description provided for this task.';
    const splitDesc = doc.splitTextToSize(descText, 182);
    doc.text(splitDesc, 14, currentY);
    currentY += splitDesc.length * 4.5 + 6;

    // Subtasks Checklist Table
    if (task.subtasks.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      doc.text(`Subtasks Checklist (${completedSubtasks}/${task.subtasks.length})`, 14, currentY);
      currentY += 4;

      const subtaskTableRows = task.subtasks.map((st, i) => [
        st.completed ? '[X] Done' : '[  ] Pending',
        st.title
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [['Status', 'Subtask Item']],
        body: subtaskTableRows,
        theme: 'striped',
        headStyles: { fillColor: [51, 65, 85], textColor: 255, fontStyle: 'bold', fontSize: 9 },
        styles: { fontSize: 8.5, cellPadding: 2.5 },
        columnStyles: {
          0: { cellWidth: 35, fontStyle: 'bold' },
          1: { cellWidth: 147 }
        },
        margin: { left: 14, right: 14 }
      });

      currentY = (doc as any).lastAutoTable.finalY + 8;
    }

    // Task Notes (if present)
    if (task.notes && task.notes.trim()) {
      if (currentY > 240) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      doc.text('Internal Work Notes', 14, currentY);
      currentY += 5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      const splitNotes = doc.splitTextToSize(task.notes, 182);
      doc.text(splitNotes, 14, currentY);
      currentY += splitNotes.length * 4 + 6;
    }

    // Recent Discussion Comments
    if (task.comments && task.comments.length > 0) {
      if (currentY > 230) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      doc.text(`Discussion & Activity History (${task.comments.length})`, 14, currentY);
      currentY += 4;

      const commentTableRows = task.comments.slice(-6).map(c => {
        const author = users.find(u => u.id === c.userId);
        return [
          author ? author.name : 'Team Member',
          new Date(c.createdAt).toLocaleDateString(),
          c.content
        ];
      });

      autoTable(doc, {
        startY: currentY,
        head: [['Author', 'Date', 'Comment']],
        body: commentTableRows,
        theme: 'plain',
        headStyles: { fillColor: [241, 245, 249], textColor: [51, 65, 85], fontStyle: 'bold', fontSize: 8.5 },
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: {
          0: { cellWidth: 40, fontStyle: 'bold' },
          1: { cellWidth: 30 },
          2: { cellWidth: 112 }
        },
        margin: { left: 14, right: 14 }
      });

      currentY = (doc as any).lastAutoTable.finalY + 8;
    }

    // Manager Sign-off Footer Box (if space permits)
    if (currentY < 250) {
      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, 255, 182, 26, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text('Manager Review & Status Sign-off:', 20, 263);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text('Reviewed By: ___________________________', 20, 274);
      doc.text('Date: ____________', 110, 274);
      doc.text('Sign: ___________________', 145, 274);
    }

    // Add page numbers
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(`Page ${i} of ${totalPages} - ${workspaceName} Task Brief`, 105, 290, { align: 'center' });
    }

    const safeTitle = task.title.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
    doc.save(`Task_${safeTitle}_Brief.pdf`);
  }

  /**
   * Export All Tasks / Filtered Team Workload to Excel (.xlsx) for Managers
   */
  public exportTeamWorkloadToExcel(
    tasks: Task[],
    users: User[],
    workspaceName: string = 'Team Workspace',
    options: ExportOptions = {}
  ) {
    let filtered = [...tasks];

    if (options.filteredAssigneeId) {
      filtered = filtered.filter(t => t.assigneeId === options.filteredAssigneeId);
    }
    if (options.filteredStatus) {
      filtered = filtered.filter(t => t.status === options.filteredStatus);
    }

    const todayStr = new Date().toISOString().split('T')[0];

    // Sheet 1: Master Tasks Register
    const headers = [
      'Task ID',
      'Title',
      'Assignee Name',
      'Assignee Role',
      'Status',
      'Priority',
      'Due Date',
      'Is Overdue',
      'Completed Subtasks',
      'Total Subtasks',
      'Progress %',
      'Labels',
      'Created By',
      'Created Date',
      'Last Updated',
      'Comments Count',
      'Description Preview'
    ];

    const dataRows = filtered.map(t => {
      const assignee = users.find(u => u.id === t.assigneeId);
      const creator = users.find(u => u.id === t.creatorId);
      const completedSubtasks = t.subtasks.filter(s => s.completed).length;
      const totalSubtasks = t.subtasks.length;
      const progressPercent = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : (t.status === 'done' ? 100 : 0);
      const isOverdue = t.dueDate && t.dueDate < todayStr && t.status !== 'done' ? 'YES' : 'NO';

      return [
        t.id,
        t.title,
        assignee ? assignee.name : 'Unassigned',
        assignee ? assignee.role : 'N/A',
        t.status.replace('_', ' ').toUpperCase(),
        t.priority.toUpperCase(),
        t.dueDate || 'No Date',
        isOverdue,
        completedSubtasks,
        totalSubtasks,
        `${progressPercent}%`,
        t.labels.map(l => l.name).join(', ') || 'None',
        creator ? creator.name : 'Unknown',
        new Date(t.createdAt).toLocaleDateString(),
        new Date(t.updatedAt).toLocaleDateString(),
        t.comments ? t.comments.length : 0,
        (t.description || '').replace(/\n/g, ' ').slice(0, 100)
      ];
    });

    const wb = XLSX.utils.book_new();
    const wsTasks = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);
    wsTasks['!cols'] = [
      { wch: 14 },
      { wch: 35 },
      { wch: 20 },
      { wch: 18 },
      { wch: 14 },
      { wch: 12 },
      { wch: 14 },
      { wch: 12 },
      { wch: 18 },
      { wch: 14 },
      { wch: 12 },
      { wch: 20 },
      { wch: 18 },
      { wch: 14 },
      { wch: 14 },
      { wch: 16 },
      { wch: 45 }
    ];
    XLSX.utils.book_append_sheet(wb, wsTasks, 'Team Tasks Register');

    // Sheet 2: Team Member Workload Summary
    const memberHeaders = [
      'Member Name',
      'Role',
      'Total Tasks',
      'Completed (Done)',
      'In Progress',
      'In Review',
      'To Do',
      'Overdue Tasks',
      'Completion Rate'
    ];

    const memberRows = users.map(u => {
      const userTasks = tasks.filter(t => t.assigneeId === u.id);
      const done = userTasks.filter(t => t.status === 'done').length;
      const inProg = userTasks.filter(t => t.status === 'in_progress').length;
      const review = userTasks.filter(t => t.status === 'review').length;
      const todo = userTasks.filter(t => t.status === 'todo').length;
      const overdue = userTasks.filter(t => t.dueDate && t.dueDate < todayStr && t.status !== 'done').length;
      const rate = userTasks.length > 0 ? `${Math.round((done / userTasks.length) * 100)}%` : '0%';

      return [
        u.name,
        u.role,
        userTasks.length,
        done,
        inProg,
        review,
        todo,
        overdue,
        rate
      ];
    });

    // Add unassigned row
    const unassignedTasks = tasks.filter(t => !t.assigneeId);
    if (unassignedTasks.length > 0) {
      const done = unassignedTasks.filter(t => t.status === 'done').length;
      const inProg = unassignedTasks.filter(t => t.status === 'in_progress').length;
      const review = unassignedTasks.filter(t => t.status === 'review').length;
      const todo = unassignedTasks.filter(t => t.status === 'todo').length;
      const overdue = unassignedTasks.filter(t => t.dueDate && t.dueDate < todayStr && t.status !== 'done').length;

      memberRows.push([
        'Unassigned Pool',
        'N/A',
        unassignedTasks.length,
        done,
        inProg,
        review,
        todo,
        overdue,
        unassignedTasks.length > 0 ? `${Math.round((done / unassignedTasks.length) * 100)}%` : '0%'
      ]);
    }

    const wsMembers = XLSX.utils.aoa_to_sheet([memberHeaders, ...memberRows]);
    wsMembers['!cols'] = [
      { wch: 22 },
      { wch: 20 },
      { wch: 14 },
      { wch: 18 },
      { wch: 14 },
      { wch: 14 },
      { wch: 12 },
      { wch: 14 },
      { wch: 18 }
    ];
    XLSX.utils.book_append_sheet(wb, wsMembers, 'Team Member Summary');

    // Sheet 3: Status & Priority KPI Metrics
    const totalDone = tasks.filter(t => t.status === 'done').length;
    const totalInProg = tasks.filter(t => t.status === 'in_progress').length;
    const totalReview = tasks.filter(t => t.status === 'review').length;
    const totalTodo = tasks.filter(t => t.status === 'todo').length;
    const totalOverdue = tasks.filter(t => t.dueDate && t.dueDate < todayStr && t.status !== 'done').length;

    const kpiData = [
      ['Workload Executive Summary', workspaceName],
      ['Generated On', new Date().toLocaleString()],
      ['Total Workspace Tasks', tasks.length],
      ['Overall Completion Rate', tasks.length > 0 ? `${Math.round((totalDone / tasks.length) * 100)}%` : '0%'],
      [''],
      ['Status Breakdown', 'Count', 'Percentage of Total'],
      ['Done / Completed', totalDone, tasks.length > 0 ? `${Math.round((totalDone / tasks.length) * 100)}%` : '0%'],
      ['In Progress', totalInProg, tasks.length > 0 ? `${Math.round((totalInProg / tasks.length) * 100)}%` : '0%'],
      ['In Review', totalReview, tasks.length > 0 ? `${Math.round((totalReview / tasks.length) * 100)}%` : '0%'],
      ['To Do', totalTodo, tasks.length > 0 ? `${Math.round((totalTodo / tasks.length) * 100)}%` : '0%'],
      ['Overdue Tasks Requiring Action', totalOverdue, tasks.length > 0 ? `${Math.round((totalOverdue / tasks.length) * 100)}%` : '0%'],
      [''],
      ['Priority Distribution', 'Count', 'Percentage'],
      ['Urgent', tasks.filter(t => t.priority === 'urgent').length, `${Math.round((tasks.filter(t => t.priority === 'urgent').length / (tasks.length || 1)) * 100)}%`],
      ['High', tasks.filter(t => t.priority === 'high').length, `${Math.round((tasks.filter(t => t.priority === 'high').length / (tasks.length || 1)) * 100)}%`],
      ['Medium', tasks.filter(t => t.priority === 'medium').length, `${Math.round((tasks.filter(t => t.priority === 'medium').length / (tasks.length || 1)) * 100)}%`],
      ['Low', tasks.filter(t => t.priority === 'low').length, `${Math.round((tasks.filter(t => t.priority === 'low').length / (tasks.length || 1)) * 100)}%`]
    ];

    const wsKpi = XLSX.utils.aoa_to_sheet(kpiData);
    wsKpi['!cols'] = [{ wch: 32 }, { wch: 16 }, { wch: 22 }];
    XLSX.utils.book_append_sheet(wb, wsKpi, 'Executive KPI Metrics');

    XLSX.writeFile(wb, `Team_Workload_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  /**
   * Export All Tasks / Team Workload to Executive Manager PDF Report
   */
  public exportTeamWorkloadToPDF(
    tasks: Task[],
    users: User[],
    workspaceName: string = 'Team Workspace',
    options: ExportOptions = {}
  ) {
    let filtered = [...tasks];
    if (options.filteredAssigneeId) {
      filtered = filtered.filter(t => t.assigneeId === options.filteredAssigneeId);
    }
    if (options.filteredStatus) {
      filtered = filtered.filter(t => t.status === options.filteredStatus);
    }

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const todayStr = new Date().toISOString().split('T')[0];
    const totalDone = filtered.filter(t => t.status === 'done').length;
    const totalInProg = filtered.filter(t => t.status === 'in_progress').length;
    const totalReview = filtered.filter(t => t.status === 'review').length;
    const totalTodo = filtered.filter(t => t.status === 'todo').length;
    const totalOverdue = filtered.filter(t => t.dueDate && t.dueDate < todayStr && t.status !== 'done').length;
    const completionPercent = filtered.length > 0 ? Math.round((totalDone / filtered.length) * 100) : 0;

    // Header Dark Banner
    doc.setFillColor(15, 23, 42); // Slate 900
    doc.rect(0, 0, 297, 28, 'F');

    // Title & Subtitle
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text('TEAM WORKLOAD & TASK EXECUTIVE REPORT', 14, 13);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text(`Workspace: ${workspaceName}  |  Generated for Management Review  |  ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`, 14, 21);

    // KPI Summary Cards
    const cardY = 34;
    const cardWidth = 50;
    const cardHeight = 18;
    const cardGap = 7;

    const kpis = [
      { label: 'TOTAL TASKS', val: `${filtered.length}`, color: [241, 245, 249], textColor: [15, 23, 42] },
      { label: 'COMPLETION RATE', val: `${completionPercent}%`, color: [236, 253, 245], textColor: [5, 150, 105] },
      { label: 'IN PROGRESS', val: `${totalInProg}`, color: [239, 246, 255], textColor: [37, 99, 235] },
      { label: 'IN REVIEW', val: `${totalReview}`, color: [254, 243, 199], textColor: [217, 119, 6] },
      { label: 'OVERDUE ITEMS', val: `${totalOverdue}`, color: [255, 241, 242], textColor: [225, 29, 72] }
    ];

    kpis.forEach((kpi, idx) => {
      const x = 14 + idx * (cardWidth + cardGap);
      doc.setFillColor(kpi.color[0], kpi.color[1], kpi.color[2]);
      doc.roundedRect(x, cardY, cardWidth, cardHeight, 2, 2, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(kpi.label, x + 4, cardY + 6);

      doc.setFontSize(13);
      doc.setTextColor(kpi.textColor[0], kpi.textColor[1], kpi.textColor[2]);
      doc.text(kpi.val, x + 4, cardY + 14);
    });

    let currentY = cardY + cardHeight + 8;

    // Team Member Capacity Table
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('Team Member Workload & Capacity Breakdown', 14, currentY);
    currentY += 4;

    const teamTableRows = users.map(u => {
      const userTasks = tasks.filter(t => t.assigneeId === u.id);
      const done = userTasks.filter(t => t.status === 'done').length;
      const active = userTasks.filter(t => t.status === 'in_progress' || t.status === 'review').length;
      const todo = userTasks.filter(t => t.status === 'todo').length;
      const overdue = userTasks.filter(t => t.dueDate && t.dueDate < todayStr && t.status !== 'done').length;
      const rate = userTasks.length > 0 ? `${Math.round((done / userTasks.length) * 100)}%` : '0%';

      return [
        u.name,
        u.role,
        `${userTasks.length} tasks`,
        `${active} in flight`,
        `${done} completed`,
        overdue > 0 ? `${overdue} OVERDUE` : '0',
        rate
      ];
    });

    autoTable(doc, {
      startY: currentY,
      head: [['Team Member', 'Role', 'Total Assigned', 'Active (In Progress/Review)', 'Completed', 'Overdue Alerts', 'Progress Rate']],
      body: teamTableRows,
      theme: 'grid',
      headStyles: { fillColor: [51, 65, 85], textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 45 },
        1: { cellWidth: 45 },
        2: { cellWidth: 32 },
        3: { cellWidth: 50 },
        4: { cellWidth: 32 },
        5: { cellWidth: 35, fontStyle: 'bold' },
        6: { cellWidth: 30 }
      },
      margin: { left: 14, right: 14 }
    });

    // Page 2: Detailed Master Task Table
    doc.addPage();

    // Secondary Header
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, 297, 16, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text('MASTER TASK REGISTER & STATUS TRACKER', 14, 11);

    const taskTableRows = filtered.map(t => {
      const assignee = users.find(u => u.id === t.assigneeId);
      const completedSubtasks = t.subtasks.filter(s => s.completed).length;
      const checklistStr = t.subtasks.length > 0 ? `${completedSubtasks}/${t.subtasks.length}` : '-';
      const isOverdue = t.dueDate && t.dueDate < todayStr && t.status !== 'done';

      return [
        t.title.slice(0, 45),
        assignee ? assignee.name : 'Unassigned',
        t.status.replace('_', ' ').toUpperCase(),
        t.priority.toUpperCase(),
        t.dueDate || 'No Date',
        isOverdue ? 'YES (OVERDUE)' : 'On Track',
        checklistStr,
        t.labels.map(l => l.name).join(', ') || '-'
      ];
    });

    autoTable(doc, {
      startY: 22,
      head: [['Task Title', 'Assignee', 'Status', 'Priority', 'Due Date', 'Timeline Health', 'Checklist', 'Labels']],
      body: taskTableRows,
      theme: 'striped',
      headStyles: { fillColor: [51, 65, 85], textColor: 255, fontStyle: 'bold', fontSize: 8 },
      styles: { fontSize: 7.5, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 70, fontStyle: 'bold' },
        1: { cellWidth: 40 },
        2: { cellWidth: 30 },
        3: { cellWidth: 24 },
        4: { cellWidth: 26 },
        5: { cellWidth: 32 },
        6: { cellWidth: 20 },
        7: { cellWidth: 27 }
      },
      margin: { left: 14, right: 14 }
    });

    // Add page numbers
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(`Page ${i} of ${totalPages}  |  ${workspaceName} Manager Report  |  Confidential`, 148, 202, { align: 'center' });
    }

    doc.save(`Team_Executive_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  }
}

export const exportService = new ExportService();
