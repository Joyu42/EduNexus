'use client';

import { useEffect, useState } from 'react';
import { UserLevelCard } from '@/components/user-level-card';
import { BadgeDisplay } from '@/components/badge-display';
import { UserStatsDisplay } from '@/components/user-stats-display';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface UserLevelData {
  level: {
    userId: string;
    level: number;
    currentExp: number;
    totalExp: number;
    title: string;
    titleEmoji: string;
    titleDescription: string;
  };
  experience: {
    learningTimeExp: number;
    knowledgeMasteryExp: number;
    practiceExp: number;
    communityExp: number;
    streakExp: number;
    totalExp: number;
  };
  stats: any;
  nextLevel: any;
}

interface AchievementsData {
  badges: any[];
  stats: {
    total: number;
    unlocked: number;
    progress: number;
  };
}

export default function UserLevelPage() {
  const [levelData, setLevelData] = useState<UserLevelData | null>(null);
  const [achievementsData, setAchievementsData] = useState<AchievementsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [levelRes, achievementsRes] = await Promise.all([
          fetch('/api/user/level?userId=demo_user'),
          fetch('/api/user/achievements?userId=demo_user')
        ]);

        const levelJson = await levelRes.json();
        const achievementsJson = await achievementsRes.json();

        if (levelJson.success) {
          setLevelData(levelJson.data);
        }

        if (achievementsJson.success) {
          setAchievementsData(achievementsJson.data);
        }
      } catch (error) {
        console.error('加载用户等级数据失败:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">加载中...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!levelData) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center text-muted-foreground">
          加载失败，请刷新页面重试
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">我的等级</h1>
        <p className="text-muted-foreground">
          查看你的学习成长历程，解锁更多成就徽章
        </p>
      </div>

      <UserLevelCard
        level={levelData.level.level}
        title={levelData.level.title}
        titleEmoji={levelData.level.titleEmoji}
        titleDescription={levelData.level.titleDescription}
        currentExp={levelData.level.currentExp}
        totalExp={levelData.level.totalExp}
        nextLevel={levelData.nextLevel}
      />

      <Tabs defaultValue="stats" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="stats">学习统计</TabsTrigger>
          <TabsTrigger value="badges">徽章成就</TabsTrigger>
          <TabsTrigger value="experience">经验详情</TabsTrigger>
        </TabsList>

        <TabsContent value="stats" className="mt-6">
          <UserStatsDisplay stats={levelData.stats} />
        </TabsContent>

        <TabsContent value="badges" className="mt-6">
          {achievementsData && (
            <BadgeDisplay badges={achievementsData.badges} />
          )}
        </TabsContent>

        <TabsContent value="experience" className="mt-6">
          <div className="rounded-lg border bg-card p-6">
            <h3 className="text-lg font-semibold mb-4">经验值分布</h3>
            <div className="space-y-4">
              <ExpBreakdown
                label="学习时长经验"
                value={levelData.experience.learningTimeExp}
                total={levelData.experience.totalExp}
                icon="⏱️"
                color="bg-blue-500"
              />
              <ExpBreakdown
                label="知识掌握经验"
                value={levelData.experience.knowledgeMasteryExp}
                total={levelData.experience.totalExp}
                icon="🎯"
                color="bg-green-500"
              />
              <ExpBreakdown
                label="练习完成经验"
                value={levelData.experience.practiceExp}
                total={levelData.experience.totalExp}
                icon="💪"
                color="bg-yellow-500"
              />
              <ExpBreakdown
                label="社区贡献经验"
                value={levelData.experience.communityExp}
                total={levelData.experience.totalExp}
                icon="🤝"
                color="bg-purple-500"
              />
              <ExpBreakdown
                label="连续学习经验"
                value={levelData.experience.streakExp}
                total={levelData.experience.totalExp}
                icon="🔥"
                color="bg-red-500"
              />
            </div>
            <div className="mt-6 pt-6 border-t">
              <div className="flex items-center justify-between">
                <span className="font-semibold">总经验值</span>
                <span className="text-2xl font-bold text-primary">
                  {levelData.experience.totalExp.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ExpBreakdown({
  label,
  value,
  total,
  icon,
  color
}: {
  label: string;
  value: number;
  total: number;
  icon: string;
  color: string;
}) {
  const percentage = total > 0 ? (value / total) * 100 : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <span className="text-sm font-medium">{label}</span>
        </div>
        <span className="text-sm font-semibold">
          {value.toLocaleString()} ({percentage.toFixed(1)}%)
        </span>
      </div>
      <div className="h-3 bg-secondary rounded-full overflow-hidden">
        <div
          className={`h-full ${color} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
