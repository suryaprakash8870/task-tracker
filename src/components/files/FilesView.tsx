import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { Avatar } from '../common/Avatar';
import {
  FolderClosed,
  FileText,
  Image as ImageIcon,
  Download,
  ExternalLink,
  Search,
  Filter,
  Paperclip,
  Clock,
  Upload,
  Plus,
  X,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export const FilesView: React.FC = () => {
  const { tasks, users, setSelectedTaskId, searchQuery, downloadAttachment, uploadAndAddAttachment, showToast } = useApp();
  const [typeFilter, setTypeFilter] = useState<'all' | 'image' | 'pdf' | 'figma' | 'other'>('all');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedTaskForUpload, setSelectedTaskForUpload] = useState<string>(tasks[0]?.id || '');
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Aggregate all files across tasks
  const allAttachments = tasks.flatMap(task =>
    task.attachments.map(att => ({
      ...att,
      taskId: task.id,
      taskTitle: task.title,
      taskStatus: task.status
    }))
  );

  const handleDownload = async (storagePath: string, fileName: string, id: string) => {
    setDownloadingId(id);
    try {
      await downloadAttachment(storagePath, fileName);
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const targetTaskId = selectedTaskForUpload || tasks[0]?.id;
    if (!targetTaskId) {
      showToast({
        type: 'error',
        title: 'No Task Selected',
        message: 'Please create a task first to attach files to.'
      });
      return;
    }

    setIsUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        await uploadAndAddAttachment(targetTaskId, files[i]);
      }
      showToast({
        type: 'success',
        title: 'File Uploaded',
        message: `Successfully uploaded ${files.length} file${files.length > 1 ? 's' : ''}.`
      });
      setIsUploadModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to upload file';
      showToast({
        type: 'error',
        title: 'Upload Failed',
        message: msg
      });
    } finally {
      setIsUploading(false);
    }
  };

  const filteredAttachments = allAttachments.filter(att => {
    // Type Filter
    if (typeFilter === 'image' && !att.type.includes('image')) return false;
    if (typeFilter === 'pdf' && !att.name.toLowerCase().endsWith('.pdf')) return false;
    if (typeFilter === 'figma' && !att.name.toLowerCase().endsWith('.fig')) return false;
    if (typeFilter === 'other' && (att.type.includes('image') || att.name.endsWith('.pdf') || att.name.endsWith('.fig'))) return false;

    // Search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        att.name.toLowerCase().includes(q) ||
        att.taskTitle.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getUserById = (id: string) => users.find(u => u.id === id);

  const getFileIconColor = (name: string, type: string) => {
    if (name.endsWith('.fig')) return 'bg-purple-100 text-purple-600';
    if (name.endsWith('.pdf')) return 'bg-rose-100 text-rose-600';
    if (type.includes('image')) return 'bg-blue-100 text-blue-600';
    return 'bg-amber-100 text-amber-600';
  };

  return (
    <div id="files-view" className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto">
      {/* Top Header & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center flex-wrap gap-2 text-xs font-medium">
          <div className="flex items-center gap-1.5 text-slate-500">
            <Filter className="w-3.5 h-3.5" />
            <span>Type:</span>
          </div>
          {(['all', 'figma', 'pdf', 'image', 'other'] as const).map(ft => (
            <button
              key={ft}
              onClick={() => setTypeFilter(ft)}
              className={`px-3 py-1.5 rounded-lg capitalize transition-colors ${
                typeFilter === ft
                  ? 'bg-blue-600 text-white font-semibold shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {ft === 'all' ? `All Files (${allAttachments.length})` : ft}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs text-slate-500">
            Showing {filteredAttachments.length} files
          </div>
          <button
            onClick={() => {
              if (tasks.length > 0 && !selectedTaskForUpload) {
                setSelectedTaskForUpload(tasks[0].id);
              }
              setIsUploadModalOpen(true);
            }}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload File</span>
          </button>
        </div>
      </div>

      {/* Files Grid */}
      {filteredAttachments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
          <FolderClosed className="w-10 h-10 mx-auto mb-2 text-slate-300" />
          <p className="font-semibold text-sm text-slate-700">No files found</p>
          <p className="text-xs text-slate-400 mt-1 mb-4">Upload files directly to any task or initiative</p>
          <button
            onClick={() => {
              if (tasks.length > 0 && !selectedTaskForUpload) {
                setSelectedTaskForUpload(tasks[0].id);
              }
              setIsUploadModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg shadow-xs transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Your First File</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAttachments.map(att => {
            const uploader = getUserById(att.uploadedBy);
            const ext = att.name.split('.').pop()?.toUpperCase() || 'FILE';

            return (
              <div
                key={att.id}
                className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs hover:border-blue-400 transition-all flex flex-col justify-between space-y-4 group"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0 ${getFileIconColor(
                      att.name,
                      att.type
                    )}`}
                  >
                    {ext}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h4 className="font-semibold text-xs text-slate-900 truncate group-hover:text-blue-600">
                      {att.name}
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {att.size} • {new Date(att.uploadedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Linked Task Context */}
                <div
                  onClick={() => setSelectedTaskId(att.taskId)}
                  className="p-2.5 bg-slate-50 hover:bg-blue-50/50 rounded-xl border border-slate-100 cursor-pointer transition-colors"
                >
                  <span className="text-[10px] text-slate-400 font-medium block">Attached to Task:</span>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <p className="text-xs font-semibold text-slate-800 truncate">
                      {att.taskTitle}
                    </p>
                    <ExternalLink className="w-3 h-3 text-slate-400 flex-shrink-0" />
                  </div>
                </div>

                {/* Footer: Uploader & Download button */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <div className="flex items-center gap-2">
                    <Avatar user={uploader} size="xs" />
                    <span className="text-slate-600 font-medium text-[11px]">
                      {uploader?.name || 'Member'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDownload(att.storagePath, att.name, att.id)}
                    disabled={downloadingId === att.id}
                    className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1 text-[11px] disabled:opacity-50"
                  >
                    <Download className={`w-3.5 h-3.5 ${downloadingId === att.id ? 'animate-spin' : ''}`} />
                    <span>Download</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload File Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 text-sm">Upload File</h3>
                  <p className="text-xs text-slate-500">Attach documents, images, or archives</p>
                </div>
              </div>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Task Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Task / Initiative *
                </label>
                {tasks.length === 0 ? (
                  <div className="p-3 bg-amber-50 text-amber-800 text-xs rounded-xl border border-amber-200">
                    No tasks found. Please create a task first before uploading files.
                  </div>
                ) : (
                  <select
                    value={selectedTaskForUpload}
                    onChange={e => setSelectedTaskForUpload(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    {tasks.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.title} ({t.status.toUpperCase()})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Drag and drop upload zone */}
              <div
                onDragOver={e => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={e => {
                  e.preventDefault();
                  setDragActive(false);
                  handleFileUpload(e.dataTransfer.files);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                  dragActive
                    ? 'border-blue-500 bg-blue-50/50'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={e => handleFileUpload(e.target.files)}
                  className="hidden"
                />
                <Paperclip className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                <p className="text-xs font-semibold text-slate-700">
                  Click to browse or drag & drop files
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Supports Images, PDFs, Figma, ZIPs up to 50MB
                </p>
              </div>

              {isUploading && (
                <div className="flex items-center justify-center gap-2 py-2 text-xs text-blue-600 font-medium">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <span>Uploading to workspace storage...</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 p-3.5 bg-slate-50 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

