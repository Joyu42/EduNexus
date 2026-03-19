'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Users,
  MessageSquare,
  CheckSquare,
  FileText,
  Calendar,
  Trophy,
  Settings,
  ArrowLeft,
  UserPlus,
  TrendingUp,
  Share2,
} from 'lucide-react';
import { GroupMembers } from '@/components/groups/group-members';
import { GroupDiscussion } from '@/components/groups/group-discussion';
import { GroupTasks } from '@/components/groups/group-tasks';
import { GroupResources } from '@/components/groups/group-resources';
import { GroupLeaderboard } from '@/components/groups/group-leaderboard';
import { GroupShareDialog } from '@/components/groups/group-share-dialog';
import {
  getGroupById,
  getGroupMembers,
  getGroupPosts,
  getGroupTasks,
  getGroupResources,
  getGroupStats,
  joinGroup,
  createPost,
  likePost,
  addComment,
  createTask,
  updateTaskStatus,
  addResource,
} from '@/lib/groups/group-storage';
import type { Group, GroupMember, GroupPost, GroupTask, GroupResource, GroupStats } from '@/lib/groups/group-types';

type TabType = 'discussion' | 'members' | 'tasks' | 'resources' | 'leaderboard' | 'stats';

export default function GroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.id as string;

  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [posts, setPosts] = useState<GroupPost[]>([]);
  const [tasks, setTasks] = useState<GroupTask[]>([]);
  const [resources, setResources] = useState<GroupResource[]>([]);
  const [stats, setStats] = useState<GroupStats | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('discussion');
  const [isMember, setIsMember] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);

  const currentUserId = 'user-1';

  useEffect(() => {
    loadGroupData();
  }, [groupId]);

  const loadGroupData = () => {
    const groupData = getGroupById(groupId);
    if (!groupData) {
      router.push('/groups');
      return;
    }

    setGroup(groupData);
    const membersData = getGroupMembers(groupId);
    setMembers(membersData);
    setPosts(getGroupPosts(groupId));
    setTasks(getGroupTasks(groupId));
    setResources(getGroupResources(groupId));
    setStats(getGroupStats(groupId));
    setIsMember(membersData.some((m) => m.userId === currentUserId));
  };

  const handleJoinGroup = () => {
    if (joinGroup(groupId, currentUserId, '当前用户')) {
      loadGroupData();
    }
  };

  const handleCreatePost = (title: string, content: string, type: 'discussion' | 'resource' | 'announcement') => {
    createPost({
      groupId,
      authorId: currentUserId,
      authorName: '当前用户',
      type,
      title,
      content,
      likes: 0,
      likedBy: [],
      comments: [],
      isPinned: false,
    });
    setPosts(getGroupPosts(groupId));
  };

  const handleLikePost = (postId: string) => {
    likePost(groupId, postId, currentUserId);
    setPosts(getGroupPosts(groupId));
  };

  const handleComment = (postId: string, content: string) => {
    addComment(groupId, postId, currentUserId, '当前用户', content);
    setPosts(getGroupPosts(groupId));
  };

  const handleCreateTask = (title: string, description: string, assignedTo: string[], dueDate: string) => {
    createTask({
      groupId,
      title,
      description,
      assignedTo,
      status: 'pending',
      dueDate,
      createdBy: currentUserId,
    });
    setTasks(getGroupTasks(groupId));
  };

  const handleUpdateTaskStatus = (taskId: string, status: 'pending' | 'in_progress' | 'completed') => {
    updateTaskStatus(groupId, taskId, status);
    setTasks(getGroupTasks(groupId));
  };

  const handleAddResource = (title: string, description: string, type: 'file' | 'link' | 'note', url?: string) => {
    addResource({
      groupId,
      title,
      description,
      type,
      url,
      uploadedBy: currentUserId,
      uploadedByName: '当前用户',
      downloads: 0,
      likes: 0,
    });
    setResources(getGroupResources(groupId));
  };

  if (!group) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'discussion' as TabType, label: '讨论', icon: MessageSquare, count: posts.length },
    { id: 'members' as TabType, label: '成员', icon: Users, count: members.length },
    { id: 'tasks' as TabType, label: '任务', icon: CheckSquare, count: tasks.length },
    { id: 'resources' as TabType, label: '资源', icon: FileText, count: resources.length },
    { id: 'leaderboard' as TabType, label: '排行榜', icon: Trophy },
    { id: 'stats' as TabType, label: '统计', icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <button
            onClick={() => router.push('/groups')}
            className="flex items-center gap-2 text-white/90 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            返回小组列表
          </button>

          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">{group.name}</h1>
              <p className="text-white/90 mb-4">{group.description}</p>

              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>{group.memberCount} 成员</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  <span>活跃度 {group.activeLevel}</span>
                </div>
              </div>

              {group.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {group.tags.map((tag) => (
                    <span key={tag} className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {!isMember && (
              <button
                onClick={handleJoinGroup}
                className="px-6 py-3 bg-white text-blue-600 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-2 font-medium"
              >
                <UserPlus className="w-5 h-5" />
                加入小组
              </button>
            )}

            {isMember && (
              <button
                onClick={() => setShowShareDialog(true)}
                className="px-6 py-3 bg-white text-blue-600 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-2 font-medium"
              >
                <Share2 className="w-5 h-5" />
                分享小组
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg border border-gray-200 mb-6">
          <div className="flex border-b border-gray-200">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors relative ${
                    activeTab === tab.id
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="p-6">
            {activeTab === 'discussion' && (
              <GroupDiscussion
                posts={posts}
                currentUserId={currentUserId}
                onLike={handleLikePost}
                onComment={handleComment}
                onCreatePost={handleCreatePost}
              />
            )}

            {activeTab === 'members' && (
              <GroupMembers
                members={members}
                currentUserId={currentUserId}
              />
            )}

            {activeTab === 'tasks' && (
              <GroupTasks
                tasks={tasks}
                members={members.map((m) => ({ userId: m.userId, userName: m.userName }))}
                onCreateTask={handleCreateTask}
                onUpdateStatus={handleUpdateTaskStatus}
              />
            )}

            {activeTab === 'resources' && (
              <GroupResources
                resources={resources}
                onAddResource={handleAddResource}
              />
            )}

            {activeTab === 'leaderboard' && (
              <GroupLeaderboard members={members} />
            )}

            {activeTab === 'stats' && stats && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-2">
                    <MessageSquare className="w-8 h-8 text-blue-600" />
                    <span className="text-3xl font-bold text-blue-900">{stats.totalPosts}</span>
                  </div>
                  <p className="text-blue-700 font-medium">总帖子数</p>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-2">
                    <CheckSquare className="w-8 h-8 text-green-600" />
                    <span className="text-3xl font-bold text-green-900">
                      {stats.completedTasks}/{stats.totalTasks}
                    </span>
                  </div>
                  <p className="text-green-700 font-medium">任务完成率</p>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-2">
                    <Users className="w-8 h-8 text-purple-600" />
                    <span className="text-3xl font-bold text-purple-900">{stats.activeMembers}</span>
                  </div>
                  <p className="text-purple-700 font-medium">活跃成员</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showShareDialog && (
        <GroupShareDialog group={group} onClose={() => setShowShareDialog(false)} />
      )}
    </div>
  );
}