import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Avatar } from '../common/Avatar';
import { User, MemberRole } from '../../types';
import { X, Check, Shield, UserPlus, LogIn, Sparkles, Building } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, users, switchUser, addNewUser, updateCurrentUserProfile } = useApp();
  const [tab, setTab] = useState<'switch' | 'login' | 'signup' | 'profile'>('switch');

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<MemberRole>('developer');
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [avatar, setAvatar] = useState('');

  if (!isOpen) return null;

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;

    const created = await addNewUser({
      name,
      email,
      role,
      title: title || 'Team Contributor',
      department: department || 'Engineering',
      avatar: avatar || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80`
    });

    await switchUser(created);
    onClose();
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateCurrentUserProfile({
      name: name || currentUser.name,
      title: title || currentUser.title,
      department: department || currentUser.department
    });
    onClose();
  };

  return (
    <div
      id="auth-modal-overlay"
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
    >
      <div
        id="auth-modal-card"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
              TT
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                Team Task Tracker
              </h3>
              <p className="text-[11px] text-slate-500">Authentication & Workspace Members</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 p-1 gap-1">
          <button
            onClick={() => setTab('switch')}
            className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
              tab === 'switch'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs border border-slate-200/60 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Switch Member
          </button>
          <button
            onClick={() => {
              setTab('profile');
              setName(currentUser.name);
              setTitle(currentUser.title);
              setDepartment(currentUser.department);
            }}
            className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
              tab === 'profile'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs border border-slate-200/60 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            My Profile
          </button>
          <button
            onClick={() => setTab('signup')}
            className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
              tab === 'signup'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs border border-slate-200/60 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            Sign Up
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-5">
          {tab === 'switch' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-500 mb-2">
                Select any team persona to immediately test roles, task assignments, and permissions:
              </div>
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {users.map(u => {
                  const isActive = u.id === currentUser.id;
                  return (
                    <div
                      key={u.id}
                      onClick={async () => {
                        await switchUser(u);
                        onClose();
                      }}
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        isActive
                          ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 ring-1 ring-blue-600'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar user={u} size="md" showRoleBadge />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                              {u.name}
                            </span>
                            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                              {u.role}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {u.title} • {u.department}
                          </p>
                        </div>
                      </div>

                      {isActive ? (
                        <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400 text-xs font-semibold">
                          <Check className="w-4 h-4" />
                          <span>Active</span>
                        </div>
                      ) : (
                        <span className="text-xs font-medium text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                          Switch →
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'profile' && (
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/70 dark:border-slate-800">
                <Avatar user={currentUser} size="lg" />
                <div>
                  <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100">{currentUser.name}</h4>
                  <p className="text-xs text-slate-500">{currentUser.email}</p>
                  <span className="inline-block mt-1 text-[11px] px-2 py-0.5 rounded-md font-medium bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
                    Role: {currentUser.role.toUpperCase()}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Job Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    value={department}
                    onChange={e => setDepartment(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
                >
                  Save Profile
                </button>
              </div>
            </form>
          )}

          {tab === 'signup' && (
            <form onSubmit={handleSignup} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maya Lin"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Work Email *
                </label>
                <input
                  type="email"
                  required
                  placeholder="maya@company.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Role in Team
                  </label>
                  <select
                    value={role}
                    onChange={e => setRole(e.target.value as MemberRole)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="developer">Developer</option>
                    <option value="designer">Designer</option>
                    <option value="lead">Lead</option>
                    <option value="admin">Admin</option>
                    <option value="member">Member</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Job Title
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Design Technologist"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Department
                </label>
                <input
                  type="text"
                  placeholder="e.g. Engineering, Design, Marketing"
                  value={department}
                  onChange={e => setDepartment(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Join Team
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
