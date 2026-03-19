'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ProfileHeader } from '@/components/profile/profile-header';
import { LearningStats } from '@/components/profile/learning-stats';
import { AchievementWall } from '@/components/profile/achievement-wall';
import { SkillRadar } from '@/components/profile/skill-radar';
import { ContentTabs } from '@/components/profile/content-tabs';
import { LearningCalendarHeatmap } from '@/components/profile/learning-calendar-heatmap';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { UserProfile, UserSocialStats, SkillRadarData } from '@/lib/profile/profile-types';
import type { UserLevel, UserStats, UserAchievement } from '@/lib/server/user-level-types';
import {
  getUserProfile,
  getSocialStats,
  followUser,
  unfollowUser,
  isFollowing,
  getUserActivities,
  getUserNotes,
  getUserProjects,
  getUserGroups,
  getLearningCalendar,
  initializeSampleProfiles
} from '@/lib/profile/profile-storage';
import { BADGE_CONFIGS } from '@/lib/server/badge-config';

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [socialStats, setSocialStats] = useState<UserSocialStats | null>(null);
  const [userLevel, setUserLevel] = useState<UserLevel | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [achievements, setAchievements] = useState<UserAchievement[]>([]);
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  const currentUserId = 'user_current';
  const isOwnProfile = profile?.userId === currentUserId;

  useEffect(() => {
    initializeSampleProfiles();
    loadProfileData();
  }, [username]);

  const loadProfileData = () => {
    setLoading(true);

    const profiles = typeof window !== 'undefined'
      ? JSON.parse(localStorage.getItem('edunexus_user_profiles') || '{}')
      : {};

    const foundProfile = Object.values(profiles).find(
      (p: any) => p.username === username
    ) as UserProfile | undefined;

    if (!foundProfile) {
      setLoading(false);
      return;
    }

    setProfile(foundProfile);

    const stats = getSocialStats(foundProfile.userId);
    setSocialStats(stats || {
      userId: foundProfile.userId,
      followingCount: 0,
      followersCount: 0,
      likesReceived: 0,
      commentsReceived: 0,
      sharesReceived: 0,
      reputation: 0,
      contributionScore: 0,
      updatedAt: new Date().toISOString()
    });

    const mockUserLevel: UserLevel = {
      userId: foundProfile.userId,
      level: 15,
      currentExp: 3500,
      totalExp: 5000,
      title: '学术大师',
      titleEmoji: '🎓',
      titleDescription: '知识渊博，成就斐然',
      createdAt: foundProfile.createdAt,
      updatedAt: new Date().toISOString()
    };
    setUserLevel(mockUserLevel);

    const mockUserStats: UserStats = {
      userId: foundProfile.userId,
      learningMinutes: 12450,
      notesCreated: 156,
      notesEdited: 423,
      practiceCorrect: 2340,
      practiceWrong: 456,
      knowledgePointsMastered: 234,
      pathsCompleted: 12,
      quizzesPassed: 45,
      postsCount: 89,
      answersCount: 123,
      answersAccepted: 67,
      likesReceived: 3421,
      notesShared: 234,
      currentStreak: 45,
      longestStreak: 120,
      lastActiveDate: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setUserStats(mockUserStats);

    const mockAchievements: UserAchievement[] = BADGE_CONFIGS.slice(0, 15).map((badge, index) => ({
      achievementId: `achievement_${index}`,
      userId: foundProfile.userId,
      badgeId: badge.badgeId,
      unlockedAt: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
      progress: 100,
      isCompleted: true
    }));

    const inProgressAchievements: UserAchievement[] = BADGE_CONFIGS.slice(15, 20).map((badge, index) => ({
      achievementId: `achievement_progress_${index}`,
      userId: foundProfile.userId,
      badgeId: badge.badgeId,
      unlockedAt: '',
      progress: Math.floor(Math.random() * 80) + 10,
      isCompleted: false
    }));

    setAchievements([...mockAchievements, ...inProgressAchievements]);

    setFollowing(isFollowing(currentUserId, foundProfile.userId));
    setLoading(false);
  };

  const handleFollow = () => {
    if (!profile) return;
    followUser(currentUserId, profile.userId);
    setFollowing(true);
    const stats = getSocialStats(profile.userId);
    if (stats) setSocialStats(stats);
  };

  const handleUnfollow = () => {
    if (!profile) return;
    unfollowUser(currentUserId, profile.userId);
    setFollowing(false);
    const stats = getSocialStats(profile.userId);
    if (stats) setSocialStats(stats);
  };

  const handleEditProfile = () => {
    router.push('/profile/edit');
  };

  const skillRadarData: SkillRadarData[] = [
    { skill: '前端开发', value: 85, maxValue: 100 },
    { skill: '后端开发', value: 72, maxValue: 100 },
    { skill: '算法', value: 90, maxValue: 100 },
    { skill: '数据库', value: 68, maxValue: 100 },
    { skill: '系统设计', value: 75, maxValue: 100 },
    { skill: '项目管理', value: 60, maxValue: 100 }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-600 dark:text-gray-400">加载中...</p>
        </div>
      </div>
    );
  }

  if (!profile || !socialStats || !userLevel || !userStats) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="p-12 text-center">
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            用户不存在
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            找不到用户名为 @{username} 的用户
          </p>
          <Button onClick={() => router.push('/')}>
            返回首页
          </Button>
        </Card>
      </div>
    );
  }

  const activities = getUserActivities(profile.userId);
  const notes = getUserNotes(profile.userId);
  const projects = getUserProjects(profile.userId);
  const groups = getUserGroups(profile.userId);
  const calendarData = getLearningCalendar(profile.userId, 365);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <ProfileHeader
            profile={profile}
            socialStats={socialStats}
            userLevel={userLevel}
            isOwnProfile={isOwnProfile}
            isFollowing={following}
            onFollow={handleFollow}
            onUnfollow={handleUnfollow}
            onEditProfile={handleEditProfile}
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <LearningCalendarHeatmap data={calendarData} userId={profile.userId} />

              <ContentTabs
                notes={notes}
                activities={activities}
                projects={projects}
                groups={groups}
              />

              <AchievementWall
                achievements={achievements}
                badges={BADGE_CONFIGS}
              />
            </div>

            <div className="space-y-6">
              <LearningStats stats={userStats} userLevel={userLevel} />
              <SkillRadar skills={skillRadarData} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

