import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Avatar } from '../common/Avatar';
import { NotificationItem } from '../../types';
import { 
  CheckCheck, 
  MessageSquare, 
  UserCheck, 
  Lightbulb, 
  Clock, 
  AlertCircle, 
  RefreshCw,
  X
} from 'lucide-react';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ isOpen, onClose }) => {
  const { 
    notifications, 
    users, 
    markNotificationAsRead, 
    markAllNotificationsAsRead, 
    setSelectedTaskId 
  } = useApp();
  
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  if (!isOpen) return null;

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.read;
    return true;
  });

  const getActor = (actorId: string) => {
    return users.find(u => u.id === actorId);
  };

  const getIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'comment':
        return <MessageSquare className="w-3.5 h-3.5 text-blue-500" />;
      case 'assigned':
        return <UserCheck className="w-3.5 h-3.5 text-purple-500" />;
      case 'suggestion':
        return <Lightbulb className="w-3.5 h-3.5 text-amber-500" />;
      case 'due_soon':
        return <Clock className="w-3.5 h-3.5 text-orange-500" />;
      case 'overdue':
        return <AlertCircle className="w-3.5 h-3.5 text-rose-500" />;
      case 'status_update':
      default:
        return <RefreshCw className="w-3.5 h-3.5 text-emerald-500" />;
    }
  };

  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.read) {
      await markNotificationAsRead(notif.id);
    }
    if (notif.taskId) {
      setSelectedTaskId(notif.taskId);
      onClose();
    }
  };

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div
      id="notification-center-dropdown"
      className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden flex flex-col max-h-[500px]"
    >
      {/* Header */}
      <div className="p-3.5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm text-slate-900">
            Notifications
          </h3>
          {notifications.filter(n => !n.read).length > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-blue-100 text-blue-700 rounded-full">
              {notifications.filter(n => !n.read).length} new
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            id="mark-all-read-btn"
            onClick={() => markAllNotificationsAsRead()}
            title="Mark all as read"
            className="p-1 text-slate-500 hover:text-slate-800 text-xs flex items-center gap-1 hover:bg-slate-100 rounded transition-colors"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[11px]">Mark all read</span>
          </button>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-3 py-1.5 bg-slate-50/70 border-b border-slate-100 flex items-center gap-2 text-xs">
        <button
          onClick={() => setFilter('all')}
          className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
            filter === 'all'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
            filter === 'unread'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Unread ({notifications.filter(n => !n.read).length})
        </button>
      </div>

      {/* Notifications List */}
      <div className="overflow-y-auto divide-y divide-slate-100 max-h-96">
        {filteredNotifications.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            No {filter === 'unread' ? 'unread ' : ''}notifications yet
          </div>
        ) : (
          filteredNotifications.map(notif => {
            const actor = getActor(notif.actorId);
            return (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`p-3 transition-colors cursor-pointer hover:bg-slate-50 flex items-start gap-3 relative ${
                  !notif.read ? 'bg-blue-50/30' : ''
                }`}
              >
                {!notif.read && (
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 absolute top-4 left-1.5" />
                )}

                <div className="relative flex-shrink-0">
                  <Avatar user={actor} size="sm" />
                  <div className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-white shadow-xs border border-slate-100">
                    {getIcon(notif.type)}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <p className="text-xs font-semibold text-slate-800 truncate">
                      {notif.title}
                    </p>
                    <span className="text-[10px] text-slate-400 flex-shrink-0">
                      {formatTime(notif.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {notif.message}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
