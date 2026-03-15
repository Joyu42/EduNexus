'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Plus, TrendingUp, Users, Filter, Key } from 'lucide-react';
import { GroupCard } from '@/components/groups/group-card';
import { GroupRecommendations } from '@/components/groups/group-recommendations';
import { JoinByInviteCode } from '@/components/groups/join-by-invite-code';
import {
  getAllGroups,
  searchGroups,
  initializeSampleData,
  joinGroupByInviteCode,
} from '@/lib/groups/group-storage';
import type { Group, GroupCategory } from '@/lib/groups/group-types';

const categories: Array<{ value: GroupCategory | 'all'; label: string }> = [
  { value: 'all', label: '全部' },
  { value: 'programming', label: '编程' },
  { value: 'math', label: '数学' },
  { value: 'language', label: '语言' },
  { value: 'science', label: '科学' },
  { value: 'art', label: '艺术' },
  { value: 'business', label: '商业' },
  { value: 'other', label: '其他' },
];

type SortBy = 'activity' | 'members' | 'newest';

export default function GroupsPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<Group[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<GroupCategory | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortBy>('activity');
  const [showInviteCodeDialog, setShowInviteCodeDialog] = useState(false);

  useEffect(() => {
    initializeSampleData();
    loadGroups();
  }, []);

  useEffect(() => {
    filterAndSortGroups();
  }, [groups, searchQuery, selectedCategory, sortBy]);

  const loadGroups = () => {
    const allGroups = getAllGroups();
    setGroups(allGroups);
  };

  const filterAndSortGroups = () => {
    let filtered = groups;

    if (searchQuery) {
      const category = selectedCategory === 'all' ? undefined : selectedCategory;
      filtered = searchGroups(searchQuery, category);
    } else if (selectedCategory !== 'all') {
      filtered = groups.filter((g) => g.category === selectedCategory);
    }

    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'activity':
          return b.activeLevel - a.activeLevel;
        case 'members':
          return b.memberCount - a.memberCount;
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        default:
          return 0;
      }
    });

    setFilteredGroups(sorted);
  };

  const handleJoinByInviteCode = (inviteCode: string) => {
    const result = joinGroupByInviteCode(inviteCode, 'user-1', '当前用户');
    if (result.success && result.groupId) {
      setShowInviteCodeDialog(false);
      router.push(`/groups/${result.groupId}`);
    } else {
      alert(result.error || '加入失败');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">学习小组</h1>
              <p className="text-muted-foreground">加入小组，与志同道合的伙伴一起学习进步</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowInviteCodeDialog(true)}
                className="px-6 py-3 bg-card border border-border text-foreground rounded-lg hover:bg-accent/10 transition-colors flex items-center gap-2 font-medium"
              >
                <Key className="w-5 h-5" />
                邀请码加入
              </button>
              <button
                onClick={() => router.push('/groups/create')}
                className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 font-medium"
              >
                <Plus className="w-5 h-5" />
                创建小组
              </button>
            </div>
          </div>

          <div className="bg-card rounded-lg border border-border p-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="搜索小组名称、描述或标签..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
              />
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">分类:</span>
                <div className="flex gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat.value}
                      onClick={() => setSelectedCategory(cat.value)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        selectedCategory === cat.value
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <span className="text-sm font-medium text-foreground">排序:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortBy)}
                  className="px-3 py-1.5 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                >
                  <option value="activity">活跃度</option>
                  <option value="members">成员数</option>
                  <option value="newest">最新创建</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {filteredGroups.map((group) => (
                <GroupCard
                  key={group.id}
                  group={group}
                  onClick={() => router.push(`/groups/${group.id}`)}
                />
              ))}
            </div>

            {filteredGroups.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">没有找到小组</h3>
                <p className="text-muted-foreground mb-4">试试其他搜索条件，或创建一个新小组</p>
                <button
                  onClick={() => router.push('/groups/create')}
                  className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  创建小组
                </button>
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            <GroupRecommendations
              userId="user-1"
              onGroupClick={(groupId) => router.push(`/groups/${groupId}`)}
            />
          </div>
        </div>
      </div>

      {showInviteCodeDialog && (
        <JoinByInviteCode
          onJoin={handleJoinByInviteCode}
          onClose={() => setShowInviteCodeDialog(false)}
        />
      )}
    </div>
  );
}