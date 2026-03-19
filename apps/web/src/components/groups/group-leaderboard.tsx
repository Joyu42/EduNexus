'use client';

import { Trophy, Medal, Award, TrendingUp, Flame } from 'lucide-react';
import type { GroupMember } from '@/lib/groups/group-types';

interface GroupLeaderboardProps {
  members: GroupMember[];
}

export function GroupLeaderboard({ members }: GroupLeaderboardProps) {
  const sortedMembers = [...members].sort((a, b) => b.contribution - a.contribution);
  const topThree = sortedMembers.slice(0, 3);
  const others = sortedMembers.slice(3);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Award className="w-6 h-6 text-orange-600" />;
      default:
        return null;
    }
  };

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-white';
      case 2:
        return 'bg-gradient-to-br from-gray-300 to-gray-500 text-white';
      case 3:
        return 'bg-gradient-to-br from-orange-400 to-orange-600 text-white';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-6 h-6 text-blue-600" />
        <h3 className="text-xl font-bold text-gray-900">贡献度排行榜</h3>
      </div>

      {topThree.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[1, 0, 2].map((index) => {
            const member = topThree[index];
            if (!member) return null;
            const rank = index === 1 ? 1 : index === 0 ? 2 : 3;

            return (
              <div
                key={member.id}
                className={`text-center ${rank === 1 ? 'order-2' : rank === 2 ? 'order-1' : 'order-3'}`}
              >
                <div className={`relative inline-block mb-3 ${rank === 1 ? 'scale-110' : ''}`}>
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-2xl">
                    {member.userAvatar ? (
                      <img src={member.userAvatar} alt={member.userName} className="w-full h-full rounded-full" />
                    ) : (
                      member.userName.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
                    {getRankIcon(rank)}
                  </div>
                </div>
                <h4 className="font-semibold text-gray-900 mb-1">{member.userName}</h4>
                <div className="flex items-center justify-center gap-1 text-orange-600">
                  <Flame className="w-4 h-4" />
                  <span className="font-bold">{member.contribution}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="space-y-2">
        {others.map((member, index) => {
          const rank = index + 4;

          return (
            <div
              key={member.id}
              className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${getRankBadge(rank)}`}>
                  {rank}
                </div>

                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                  {member.userAvatar ? (
                    <img src={member.userAvatar} alt={member.userName} className="w-full h-full rounded-full" />
                  ) : (
                    member.userName.charAt(0).toUpperCase()
                  )}
                </div>

                <div>
                  <div className="font-medium text-gray-900">{member.userName}</div>
                  <div className="text-xs text-gray-500">
                    {member.role === 'owner' && '组长'}
                    {member.role === 'admin' && '管理员'}
                    {member.role === 'member' && '成员'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 text-orange-600 font-semibold">
                <Flame className="w-4 h-4" />
                <span>{member.contribution}</span>
              </div>
            </div>
          );
        })}
      </div>

      {members.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600">还没有成员数据</p>
        </div>
      )}
    </div>
  );
}