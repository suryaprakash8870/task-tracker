import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { exportService, ExportOptions } from '../../services/exportService';
import {
  FileSpreadsheet,
  FileText,
  Download,
  X,
  CheckCircle2,
  Users,
  Calendar,
  Layers,
  Filter,
  Check,
  Briefcase,
  AlertCircle
} from 'lucide-react';

interface ExportReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportReportModal: React.FC<ExportReportModalProps> = ({ isOpen, onClose }) => {
  const { workspace, tasks, users, showToast } = useApp();

  const [exportFormat, setExportFormat] = useState<'excel' | 'pdf'>('pdf');
  const [selectedAssignee, setSelectedAssignee] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [includeSubtasks, setIncludeSubtasks] = useState<boolean>(true);
  const [includeComments, setIncludeComments] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  if (!isOpen) return null;

  // Filter count preview
  const filteredTasks = tasks.filter(t => {
    if (selectedAssignee !== 'all' && t.assigneeId !== selectedAssignee) return false;
    if (selectedStatus !== 'all' && t.status !== selectedStatus) return false;
    return true;
  });

  const completedCount = filteredTasks.filter(t => t.status === 'done').length;
  const inProgressCount = filteredTasks.filter(t => t.status === 'in_progress').length;
  const overdueCount = filteredTasks.filter(t => {
    const today = new Date().toISOString().split('T')[0];
    return t.dueDate && t.dueDate < today && t.status !== 'done';
  }).length;

  const handleRunExport = () => {
    setIsExporting(true);
    try {
      const options: ExportOptions = {
        includeSubtasks,
        includeComments,
        filteredAssigneeId: selectedAssignee === 'all' ? undefined : selectedAssignee,
        filteredStatus: selectedStatus === 'all' ? undefined : selectedStatus,
      };

      if (exportFormat === 'excel') {
        exportService.exportTeamWorkloadToExcel(tasks, users, workspace.name, options);
        showToast({
          type: 'success',
          title: 'Excel Report Downloaded',
          message: `Generated spreadsheet with ${filteredTasks.length} tasks and team metrics.`,
        });
      } else {
        exportService.exportTeamWorkloadToPDF(tasks, users, workspace.name, options);
        showToast({
          type: 'success',
          title: 'Executive PDF Generated',
          message: `Manager briefing PDF with ${filteredTasks.length} tasks and capacity charts ready.`,
        });
      }
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Export failed';
      console.error('Export error:', err);
      showToast({
        type: 'error',
        title: 'Export Error',
        message: msg,
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div
      id="export-report-modal-overlay"
      className="fixed inset-0 bg-slate-900/40 backdrop-blur-2xs z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in"
      onClick={onClose}
    >
      <div
        id="export-report-card"
        className="bg-white rounded-2xl border border-slate-200/90 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col my-auto animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-2xs">
              <Briefcase className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight">Export Workload Report</h2>
              <p className="text-[11px] text-slate-400">Generate executive summary for managers</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 text-xs text-slate-700 bg-slate-50/50">
          {/* Format Selector Cards */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Select Export Format
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* PDF Card */}
              <button
                type="button"
                onClick={() => setExportFormat('pdf')}
                className={`p-3.5 rounded-xl border text-left flex flex-col gap-1.5 transition-all cursor-pointer ${
                  exportFormat === 'pdf'
                    ? 'border-blue-600 bg-blue-50/70 shadow-2xs ring-2 ring-blue-600/10'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
                    <FileText className="w-4 h-4" />
                  </div>
                  {exportFormat === 'pdf' && (
                    <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center">
                      <Check className="w-2.5 h-2.5" />
                    </span>
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-xs">Executive PDF Report</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    Printable manager brief with KPI cards, team capacity breakdown & sign-off
                  </p>
                </div>
              </button>

              {/* Excel Card */}
              <button
                type="button"
                onClick={() => setExportFormat('excel')}
                className={`p-3.5 rounded-xl border text-left flex flex-col gap-1.5 transition-all cursor-pointer ${
                  exportFormat === 'excel'
                    ? 'border-emerald-600 bg-emerald-50/70 shadow-2xs ring-2 ring-emerald-600/10'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  {exportFormat === 'excel' && (
                    <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                      <Check className="w-2.5 h-2.5" />
                    </span>
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-xs">Excel Workbook (.xlsx)</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    Multi-sheet spreadsheet with all tasks, workload metrics & formulas
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Scope Filters */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 space-y-3">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <Filter className="w-3 h-3" />
              <span>Report Scope & Filters</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Assignee Filter */}
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Team Member Workload
                </label>
                <select
                  value={selectedAssignee}
                  onChange={e => setSelectedAssignee(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-slate-400"
                >
                  <option value="all">Entire Team ({users.length} members)</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Task Status Column
                </label>
                <select
                  value={selectedStatus}
                  onChange={e => setSelectedStatus(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-slate-400"
                >
                  <option value="all">All Statuses (Sprint Overview)</option>
                  <option value="todo">To Do Only</option>
                  <option value="in_progress">In Progress Only</option>
                  <option value="review">Under Review Only</option>
                  <option value="done">Completed / Done Only</option>
                </select>
              </div>
            </div>

            {/* Scope Summary Preview */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>Matching Tasks: <strong className="text-slate-800 font-bold">{filteredTasks.length}</strong></span>
              <span>Done: <strong className="text-emerald-700 font-semibold">{completedCount}</strong> • Active: <strong className="text-blue-700 font-semibold">{inProgressCount}</strong> • Overdue: <strong className="text-rose-600 font-semibold">{overdueCount}</strong></span>
            </div>
          </div>

          {/* Additional Options */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 space-y-2">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Content Inclusions
            </span>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={includeSubtasks}
                  onChange={e => setIncludeSubtasks(e.target.checked)}
                  className="rounded text-blue-600 border-slate-300 focus:ring-blue-500"
                />
                <span>Include Subtask Checklists & Progress %</span>
              </label>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={includeComments}
                  onChange={e => setIncludeComments(e.target.checked)}
                  className="rounded text-blue-600 border-slate-300 focus:ring-blue-500"
                />
                <span>Include Discussion Transcripts & Notes</span>
              </label>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleRunExport}
            disabled={isExporting || filteredTasks.length === 0}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-2xs flex items-center gap-2 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExporting ? 'Generating...' : `Export ${exportFormat === 'pdf' ? 'PDF Report' : 'Excel Sheet'}`}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
