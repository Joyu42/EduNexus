'use client';

import { useState } from 'react';
import type { UserAchievement, Badge } from '@/lib/server/user-level-types';
import { Card } from '@/components/ui/card';
import { Badge as UIBadge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type AchievementWallProps = {
  achievements: UserAchievement[];
  badges: Badge[];
};

export function AchievementWall({ achievements, badges }: AchievementWallProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const completedAchievements = achievements.filter(a => a.isCompleted);
  const inProgressAchievements = achievements.filter(a => !a.isCompleted && a.progress > 0);

  const categories = [
    { id: 'all', label: '全部', icon: '🏆' },
    { id: 'learning', label: '学习', icon: '📚' },
    { id: 'practice', label: '练习', icon: '🎯' },
    { id: 'community', label: '社区', icon: '👥' },
    { id: 'special', label: '特殊', icon: '⭐' }
  ];

  const getBadgeInfo = (badgeId: string): Badge | undefined => {
    return badges.find(b => b.badgeId === badgeId);
  };

  const filterAchievements = (list: UserAchievement[]) => {
    if (selectedCategory === 'all') return list;
    return list.filter(a => {
      const badge = getBadgeInfo(a.badgeId);
      return badge?.category === selectedCategory;
    });
  };

  const filteredCompleted = filterAchievements(completedAchievements);
  const filteredInProgress = filterAchievements(inProgressAchievements);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          成就墙
        </h3>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          已获得 {completedAchievements.length} / {badges.length} 个徽章
        </div>
      </div>

      {/* 分类筛选 */}
      <div className="flex flex-wrap gap-2 mb-6">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedCategory === cat.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <span className="mr-1">{cat.icon}</span>
            {cat.label}
          </button>
        ))}
      </div>

      <Tabs defaultValue="completed" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="completed">
            已获得 ({filteredCompleted.length})
          </TabsTrigger>
          <TabsTrigger value="progress">
            进行中 ({filteredInProgress.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="completed" className="mt-6">
          {filteredCompleted.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredCompleted.map(achievement => {
                const badge = getBadgeInfo(achievement.badgeId);
                if (!badge) return null;
                return (
                  <BadgeCard
                    key={achievement.achievementId}
                    badge={badge}
                    achievement={achievement}
                    isCompleted
                  />
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              暂无已获得的徽章
            </div>
          )}
        </TabsContent>

        <TabsContent value="progress" className="mt-6">
          {filteredInProgress.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredInProgress.map(achievement => {
                const badge = getBadgeInfo(achievement.badgeId);
                if (!badge) return null;
                return (
                  <BadgeCard
                    key={achievement.achievementId}
                    badge={badge}
                    achievement={achievement}
                    isCompleted={false}
                  />
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              暂无进行中的徽章
            </div>
          )}
        </TabsContent>
      </Tabs>
    </Card>
  );
}

function BadgeCard({
  badge,
  achievement,
  isCompleted
}: {
  badge: Badge;
  achievement: UserAchievement;
  isCompleted: boolean;
}) {
  const categoryColors = {
    learning: 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700',
    practice: 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700',
    community: 'bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700',
    special: 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700',
    limited: 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700'
  };

  const colorClass = categoryColors[badge.category];

  return (
    <div
      className={`relative p-4 rounded-lg border-2 transition-all hover:scale-105 ${
        isCompleted
          ? colorClass
          : 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 opacity-60'
      }`}
    >
      <div className="text-center">
        <div className={`text-5xl mb-2 ${!isCompleted && 'grayscale'}`}>
          {badge.emoji}
        </div>
        <div className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
          {badge.name}
        </div>
        <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
          {badge.description}
        </div>
        {!isCompleted && (
          <div className="mt-2">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${achievement.progress}%` }}
              />
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {achievement.progress}%
            </div>
          </div>
        )}
        {isCompleted && achievement.unlockedAt && (
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            {new Date(achievement.unlockedAt).toLocaleDateString('zh-CN')}
          </div>
        )}
        <UIBadge variant="secondary" className="mt-2 text-xs">
          +{badge.expReward} EXP
        </UIBadge>
      </div>
    </div>
  );
}
