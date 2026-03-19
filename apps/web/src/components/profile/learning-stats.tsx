'use client';

import type { UserStats } from '@/lib/server/user-level-types';
import type { UserLevel } from '@/lib/server/user-level-types';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

type LearningStatsProps = {
  stats: UserStats;
  userLevel: UserLevel;
};

export function LearningStats({ stats, userLevel }: LearningStatsProps) {
  const learningHours = Math.floor(stats.learningMinutes / 60);
  const accuracyRate = stats.practiceCorrect + stats.practiceWrong > 0
    ? Math.round((stats.practiceCorrect / (stats.practiceCorrect + stats.practiceWrong)) * 100)
    : 0;

  const levelProgress = ((userLevel.currentExp / (userLevel.totalExp || 1)) * 100);

  return (
    <div className="space-y-6">
      {/* 等级进度 */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {userLevel.titleEmoji} {userLevel.title}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {userLevel.titleDescription}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              Lv.{userLevel.level}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {userLevel.currentExp} / {userLevel.totalExp} EXP
            </div>
          </div>
        </div>
        <Progress value={levelProgress} className="h-3" />
      </Card>

      {/* 学习统计 */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          学习统计
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatItem
            icon="⏱️"
            label="学习时长"
            value={`${learningHours}h`}
            subValue={`${stats.learningMinutes % 60}min`}
          />
          <StatItem
            icon="📝"
            label="笔记数"
            value={stats.notesCreated}
            subValue={`编辑 ${stats.notesEdited} 次`}
          />
          <StatItem
            icon="🎯"
            label="练习题"
            value={stats.practiceCorrect + stats.practiceWrong}
            subValue={`正确率 ${accuracyRate}%`}
          />
          <StatItem
            icon="🔥"
            label="连续学习"
            value={`${stats.currentStreak}天`}
            subValue={`最长 ${stats.longestStreak}天`}
          />
        </div>
      </Card>

      {/* 详细数据 */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          详细数据
        </h3>
        <div className="space-y-3">
          <DataRow label="知识点掌握" value={stats.knowledgePointsMastered} icon="🧠" />
          <DataRow label="学习路径完成" value={stats.pathsCompleted} icon="🛤️" />
          <DataRow label="测验通过" value={stats.quizzesPassed} icon="✅" />
          <DataRow label="社区发帖" value={stats.postsCount} icon="💬" />
          <DataRow label="回答问题" value={stats.answersCount} icon="💡" />
          <DataRow label="被采纳回答" value={stats.answersAccepted} icon="⭐" />
          <DataRow label="获得点赞" value={stats.likesReceived} icon="❤️" />
          <DataRow label="分享笔记" value={stats.notesShared} icon="📤" />
        </div>
      </Card>
    </div>
  );
}

function StatItem({
  icon,
  label,
  value,
  subValue
}: {
  icon: string;
  label: string;
  value: string | number;
  subValue?: string;
}) {
  return (
    <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
      <div className="text-3xl mb-2">{icon}</div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
        {value}
      </div>
      <div className="text-xs text-gray-600 dark:text-gray-400">{label}</div>
      {subValue && (
        <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
          {subValue}
        </div>
      )}
    </div>
  );
}

function DataRow({
  label,
  value,
  icon
}: {
  label: string;
  value: number;
  icon: string;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700 last:border-0">
      <div className="flex items-center space-x-2">
        <span className="text-xl">{icon}</span>
        <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
      </div>
      <span className="text-sm font-semibold text-gray-900 dark:text-white">
        {value}
      </span>
    </div>
  );
}
