import React, { useState } from 'react';
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
  Clock
} from 'lucide-react';

export const FilesView: React.FC = () => {
  const { tasks, users, setSelectedTaskId, searchQuery } = useApp();
  const [typeFilter, setTypeFilter] = useState<'all' | 'image' | 'pdf' | 'figma' | 'other'>('all');

  // Aggregate all files across tasks
  const allAttachments = tasks.flatMap(task =>
    task.attachments.map(att => ({
      ...att,
      taskId: task.id,
      taskTitle: task.title,
      taskStatus: task.status
    }))
  );

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
    if (name.endsWith('.fig')) return 'bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400';
    if (name.endsWith('.pdf')) return 'bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400';
    if (type.includes('image')) return 'bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400';
    return 'bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400';
  };

  return (
    <div id="files-view" className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto">
      {/* Top Header & Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
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
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {ft === 'all' ? `All Files (${allAttachments.length})` : ft}
            </button>
          ))}
        </div>

        <div className="text-xs text-slate-500">
          Showing {filteredAttachments.length} files
        </div>
      </div>

      {/* Files Grid */}
      {filteredAttachments.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center text-slate-400">
          <FolderClosed className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
          <p className="font-semibold text-sm text-slate-700 dark:text-slate-300">No files found</p>
          <p className="text-xs text-slate-400 mt-1">Upload files within any task details drawer</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAttachments.map(att => {
            const uploader = getUserById(att.uploadedBy);
            const ext = att.name.split('.').pop()?.toUpperCase() || 'FILE';

            return (
              <div
                key={att.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs hover:border-blue-400 dark:hover:border-blue-600 transition-all flex flex-col justify-between space-y-4 group"
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
                    <h4 className="font-semibold text-xs text-slate-900 dark:text-slate-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                      {att.name}
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {att.size} • {new Date(att.uploadedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Linked Task Context */}
                <div
                  onClick={() => setSelectedTaskId(att.taskId)}
                  className="p-2.5 bg-slate-50 dark:bg-slate-800/50 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 rounded-xl border border-slate-100 dark:border-slate-800 cursor-pointer transition-colors"
                >
                  <span className="text-[10px] text-slate-400 font-medium block">Attached to Task:</span>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {att.taskTitle}
                    </p>
                    <ExternalLink className="w-3 h-3 text-slate-400 flex-shrink-0" />
                  </div>
                </div>

                {/* Footer: Uploader & Download button */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                  <div className="flex items-center gap-2">
                    <Avatar user={uploader} size="xs" />
                    <span className="text-slate-600 dark:text-slate-400 font-medium text-[11px]">
                      {uploader?.name || 'Member'}
                    </span>
                  </div>

                  <a
                    href={att.url}
                    target="_blank"
                    rel="noreferrer"
                    download={att.name}
                    className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1 text-[11px]"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
