'use client';

import { useEffect, useState } from 'react';
import { Sparkles, TrendingUp, Clock, ChevronRight } from 'lucide-react';
import { GroupCard } from './group-card';
import {
  recommendGroups,
  recommendBasedOnHistory,
  getPopularGroups,
  getNewGroups,
  type GroupRecommendation,
  type UserInterests,
} from '@/lib/groups/group-recommendations';
import { getUserGroups } from '@/lib/groups/group-storage';
import type { Group } from '@/lib/groups/group-types';

interface GroupRecommendationsProps {
  userId: string;
  onGroupClick: (groupId: string) => void;
}

export function GroupRecommendations({ userId, onGroupClick }: GroupRecommendationsProps) {
  const [aiRecommendations, setAiRecommendations] = useState<GroupRecommendation[]>([]);
  const [popularGroups, setPopularGroups] = useState<Group[]>([]);
  const [newGroups, setNewGroups] = useState<Group[]>([]);
  const [activeTab, setActiveTab] = useState<'ai' | 'popular' | 'new'>('ai');

  useEffect(() => {
    loadRecommendations();
  }, [userId]);

  const loadRecommendations = () => {
    // 模拟用户兴趣（实际应用中应从用户配置或历史行为中获取）
    const userInterests: UserInterests = {
      categories: ['programming', 'math'],
      tags: ['JavaScript', 'React', '算法'],
      activityLevel: 'high',
      preferredGroupSize: 'medium',
    };

    // 获取AI推荐
    const userGroups = getUserGroups(userId);
    if (userGroups.length > 0) {
      const historyRecs = recommendBasedOnHistory(userId, userGroups, 5);
      setAiRecommendations(historyRecs);
    } else {
      const interestRecs = recommendGroups(userId, userInterests, 5);
      setAiRecommendations(interestRecs);
    }

    // 获取热门小组
    setPopularGroups(getPopularGroups(5));

    // 获取新建小组
    setNewGroups(getNewGroups(5));
  };

  const tabs = [
    { id: 'ai' as const, label: 'AI 推荐', icon: Sparkles, count: aiRecommendations.length },
    { id: 'popular' as const, label: '热门小组', icon: TrendingUp, count: popularGroups.length },
    { id: 'new' as const, label: '最新小组', icon: Clock, count: newGroups.length },
  ];

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">为你推荐</h2>

      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 font-medium transition-colors relative ${
                activeTab === tab.id
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="space-y-4">
        {activeTab === 'ai' && (
          <>
            {aiRecommendations.length > 0 ? (
              aiRecommendations.map((rec) => (
                <div key={rec.group.id} className="space-y-2">
                  <GroupCard group={rec.group} onClick={() => onGroupClick(rec.group.id)} />
                  <div className="ml-4 space-y-1">
                    <div className="flex items-center gap-2 text-sm font-medium text-blue-600">
                      <Sparkles className="w-4 h-4" />
                      <span>匹配度: {rec.score}%</span>
                    </div>
                    <ul className="space-y-1">
                      {rec.reasons.map((reason, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                          <ChevronRight className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-400" />
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Sparkles className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>暂无推荐小组</p>
                <p className="text-sm mt-1">加入一些小组后，我们会为你推荐更多相关小组</p>
              </div>
            )}
          </>
        )}

        {activeTab === 'popular' && (
          <>
            {popularGroups.map((group) => (
              <GroupCard key={group.id} group={group} onClick={() => onGroupClick(group.id)} />
            ))}
          </>
        )}

        {activeTab === 'new' && (
          <>
            {newGroups.map((group) => (
              <GroupCard key={group.id} group={group} onClick={() => onGroupClick(group.id)} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
