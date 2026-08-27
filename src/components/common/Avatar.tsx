import React from 'react';
import { User, MemberRole } from '../../types';

interface AvatarProps {
  user?: User | null;
  name?: string;
  avatarUrl?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showRoleBadge?: boolean;
}

export const Avatar: React.FC<AvatarProps> = ({
  user,
  name,
  avatarUrl,
  size = 'md',
  className = '',
  showRoleBadge = false
}) => {
  const displayName = user ? user.name : (name || 'User');
  const photo = user?.avatar || avatarUrl;
  const initials = displayName
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const sizeClasses = {
    xs: 'w-5 h-5 text-[10px]',
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-11 h-11 text-base font-medium',
    xl: 'w-16 h-16 text-xl font-semibold'
  };

  const roleColors: Record<MemberRole, string> = {
    admin: 'bg-rose-500 text-white',
    lead: 'bg-purple-600 text-white',
    developer: 'bg-blue-600 text-white',
    designer: 'bg-pink-600 text-white',
    member: 'bg-gray-600 text-white'
  };

  return (
    <div className={`relative inline-flex flex-shrink-0 items-center justify-center ${className}`}>
      {photo ? (
        <img
          src={photo}
          alt={displayName}
          referrerPolicy="no-referrer"
          className={`${sizeClasses[size]} rounded-full object-cover ring-1 ring-black/5 dark:ring-white/10`}
        />
      ) : (
        <div
          className={`${sizeClasses[size]} rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-medium ring-1 ring-black/5 dark:ring-white/10 select-none`}
        >
          {initials}
        </div>
      )}
      {showRoleBadge && user?.role && (
        <span
          title={`Role: ${user.role}`}
          className={`absolute -bottom-0.5 -right-0.5 text-[9px] font-bold px-1 rounded-full uppercase leading-tight ${roleColors[user.role] || 'bg-slate-500'}`}
        >
          {user.role[0]}
        </span>
      )}
    </div>
  );
};
