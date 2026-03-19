'use client';

import { Crown, Shield, User, MoreVertical } from 'lucide-react';
import type { GroupMember } from '@/lib/groups/group-types';

interface GroupMembersProps {
  members: GroupMember[];
  currentUserId?: string;
  isAdmin?: boolean;
  onRoleChange?: (userId: string, role: 'owner' | 'admin' | 'member') => void;
  onRemove?: (userId: string) => void;
}

const roleIcons = {
  owner: Crown,
  admin: Shield,
  member: User,
};

const roleLabels = {
  owner: '组长',
  admin: '管理员',
  member: '成员',
};

const roleColors = {
  owner: 'text-yellow-600',
  admin: 'text-blue-600',
  member: 'text-gray-600',
};

export function GroupMembers({ members, currentUserId, isAdmin, onRoleChange, onRemove }: GroupMembersProps) {
  const sortedMembers = [...members].sort((a, b) => {
    const roleOrder = { owner: 0, admin: 1, member: 2 };
    if (roleOrder[a.role] !== roleOrder[b.role]) {
      return roleOrder[a.role] - roleOrder[b.role];
    }
    return b.contribution - a.contribution;
  });

  return (
    <div className="space-y-3">
      {sortedMembers.map((member) => {
        const RoleIcon = roleIcons[member.role];
        const isCurrentUser = member.userId === currentUserId;

        return (
          <div
            key={member.id}
            className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
          >
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                {member.userAvatar ? (
                  <img src={member.userAvatar} alt={member.userName} className="w-full h-full rounded-full" />
                ) : (
                  member.userName.charAt(0).toUpperCase()
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">
                    {member.userName}
                    {isCurrentUser && <span className="text-xs text-gray-500 ml-1">(你)</span>}
                  </span>
                  <div className={`flex items-center gap-1 ${roleColors[member.role]}`}>
                    <RoleIcon className="w-4 h-4" />
                    <span className="text-xs">{roleLabels[member.role]}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                  <span>贡献度: {member.contribution}</span>
                  <span>加入于 {new Date(member.joinedAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {isAdmin && !isCurrentUser && member.role !== 'owner' && (
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <MoreVertical className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}