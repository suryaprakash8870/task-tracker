import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Avatar } from '../common/Avatar';
import { MemberRole, User } from '../../types';
import {
  Users,
  UserPlus,
  Mail,
  Briefcase,
  CheckCircle2,
  Clock,
  Shield,
  X,
  Plus
} from 'lucide-react';

export const TeamView: React.FC = () => {
  const {
    users,
    tasks,
    workspace,
    addNewUser,
    switchUser,
    currentUser,
    setCurrentView
  } = useApp();

  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<MemberRole>('developer');
  const [inviteTitle, setInviteTitle] = useState('');
  const [inviteDepartment, setInviteDepartment] = useState('Engineering');

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName || !inviteEmail) return;

    await addNewUser({
      name: inviteName,
      email: inviteEmail,
      role: inviteRole,
      title: inviteTitle || 'Team Contributor',
      department: inviteDepartment || 'Engineering',
      avatar: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80`
    });

    setInviteName('');
    setInviteEmail('');
    setInviteTitle('');
    setIsInviteOpen(false);
  };

  const getRoleBadge = (role: MemberRole) => {
    const map: Record<MemberRole, { bg: string; text: string; label: string }> = {
      admin: { bg: 'bg-rose-100 dark:bg-rose-950/60', text: 'text-rose-700 dark:text-rose-300', label: 'Admin' },
      lead: { bg: 'bg-purple-100 dark:bg-purple-950/60', text: 'text-purple-700 dark:text-purple-300', label: 'Team Lead' },
      developer: { bg: 'bg-blue-100 dark:bg-blue-950/60', text: 'text-blue-700 dark:text-blue-300', label: 'Developer' },
      designer: { bg: 'bg-pink-100 dark:bg-pink-950/60', text: 'text-pink-700 dark:text-pink-300', label: 'Designer' },
      member: { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300', label: 'Member' }
    };
    const c = map[role] || map.member;
    return (
      <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${c.bg} ${c.text}`}>
        {c.label}
      </span>
    );
  };

  return (
    <div id="team-view" className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Workspace Summary Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-blue-600/20">
            {workspace?.name.slice(0, 2).toUpperCase() || 'WS'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                {workspace?.name || 'Creative Tech Studio'}
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                Active Workspace
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {workspace?.description || 'Team workspace for sprint tracking and tasks'}
            </p>
          </div>
        </div>

        <button
          id="invite-member-btn"
          onClick={() => setIsInviteOpen(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition-colors flex-shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Invite Member</span>
        </button>
      </div>

      {/* Team Members Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map(u => {
          const userOpenTasks = tasks.filter(t => t.assigneeId === u.id && t.status !== 'done');
          const userDoneTasks = tasks.filter(t => t.assigneeId === u.id && t.status === 'done');
          const isMe = u.id === currentUser.id;

          return (
            <div
              key={u.id}
              className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 shadow-xs transition-all space-y-4 ${
                isMe
                  ? 'border-blue-500/60 ring-1 ring-blue-500/30'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              {/* Member Card Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Avatar user={u} size="lg" showRoleBadge />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                        {u.name}
                      </h4>
                      {isMe && (
                        <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
                          (You)
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">{u.title}</p>
                    <p className="text-[11px] text-slate-400">{u.department}</p>
                  </div>
                </div>

                {getRoleBadge(u.role)}
              </div>

              {/* Workload Stats */}
              <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-center">
                <div>
                  <span className="text-[10px] text-slate-400 font-medium block">Open Tasks</span>
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    {userOpenTasks.length}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-medium block">Completed</span>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    {userDoneTasks.length}
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                <div className="flex items-center gap-1 text-slate-400 text-[11px] truncate">
                  <Mail className="w-3.5 h-3.5" />
                  <span className="truncate">{u.email}</span>
                </div>

                {!isMe && (
                  <button
                    onClick={() => switchUser(u)}
                    className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex-shrink-0"
                  >
                    Switch to persona →
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Invite Member Dialog */}
      {isInviteOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-blue-600" />
                <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                  Invite New Team Member
                </h3>
              </div>
              <button
                onClick={() => setIsInviteOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleInvite} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rachel Green"
                  value={inviteName}
                  onChange={e => setInviteName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Work Email *
                </label>
                <input
                  type="email"
                  required
                  placeholder="rachel@teamtracker.dev"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Role
                  </label>
                  <select
                    value={inviteRole}
                    onChange={e => setInviteRole(e.target.value as MemberRole)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden"
                  >
                    <option value="developer">Developer</option>
                    <option value="designer">Designer</option>
                    <option value="lead">Lead</option>
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Job Title
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Design Lead"
                    value={inviteTitle}
                    onChange={e => setInviteTitle(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsInviteOpen(false)}
                  className="px-3.5 py-1.5 text-xs text-slate-600 dark:text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                >
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
