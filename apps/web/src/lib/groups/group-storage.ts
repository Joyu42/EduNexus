// 小组存储管理
import type {
  Group,
  GroupMember,
  GroupPost,
  GroupTask,
  GroupResource,
  GroupEvent,
  GroupChallenge,
  GroupCheckIn,
  GroupStats,
  GroupCategory,
  MemberRole,
} from './group-types';

const STORAGE_KEYS = {
  GROUPS: 'edunexus_groups',
  MEMBERS: 'edunexus_group_members',
  POSTS: 'edunexus_group_posts',
  TASKS: 'edunexus_group_tasks',
  RESOURCES: 'edunexus_group_resources',
  EVENTS: 'edunexus_group_events',
  CHALLENGES: 'edunexus_group_challenges',
  CHECKINS: 'edunexus_group_checkins',
  USER_GROUPS: 'edunexus_user_groups',
};

// 生成唯一ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// 生成邀请码
function generateInviteCode(): string {
  return Math.random().toString(36).substr(2, 8).toUpperCase();
}

// ===== 小组管理 =====

export function createGroup(
  name: string,
  description: string,
  category: GroupCategory,
  visibility: 'public' | 'private',
  userId: string,
  userName: string
): Group {
  const group: Group = {
    id: generateId(),
    name,
    description,
    category,
    visibility,
    inviteCode: visibility === 'private' ? generateInviteCode() : undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ownerId: userId,
    memberCount: 1,
    activeLevel: 0,
    tags: [],
    settings: {
      allowMemberPost: true,
      allowMemberInvite: true,
      requireApproval: visibility === 'private',
      maxMembers: 100,
    },
  };

  const groups = getAllGroups();
  groups.push(group);
  localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(groups));

  const member: GroupMember = {
    id: generateId(),
    userId,
    userName,
    role: 'owner',
    joinedAt: new Date().toISOString(),
    contribution: 0,
    lastActive: new Date().toISOString(),
  };
  addMember(group.id, member);

  const userGroups = getUserGroups(userId);
  userGroups.push(group.id);
  localStorage.setItem(`${STORAGE_KEYS.USER_GROUPS}_${userId}`, JSON.stringify(userGroups));

  return group;
}

export function getAllGroups(): Group[] {
  const data = localStorage.getItem(STORAGE_KEYS.GROUPS);
  return data ? JSON.parse(data) : [];
}

export function getGroupById(groupId: string): Group | null {
  const groups = getAllGroups();
  return groups.find((g) => g.id === groupId) || null;
}

export function updateGroup(groupId: string, updates: Partial<Group>): void {
  const groups = getAllGroups();
  const index = groups.findIndex((g) => g.id === groupId);
  if (index !== -1) {
    groups[index] = { ...groups[index], ...updates, updatedAt: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(groups));
  }
}

export function deleteGroup(groupId: string): void {
  const groups = getAllGroups().filter((g) => g.id !== groupId);
  localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(groups));
  localStorage.removeItem(`${STORAGE_KEYS.MEMBERS}_${groupId}`);
  localStorage.removeItem(`${STORAGE_KEYS.POSTS}_${groupId}`);
  localStorage.removeItem(`${STORAGE_KEYS.TASKS}_${groupId}`);
}

export function getUserGroups(userId: string): string[] {
  const data = localStorage.getItem(`${STORAGE_KEYS.USER_GROUPS}_${userId}`);
  return data ? JSON.parse(data) : [];
}

export function searchGroups(query: string, category?: GroupCategory): Group[] {
  const groups = getAllGroups();
  return groups.filter((g) => {
    const matchQuery = g.name.toLowerCase().includes(query.toLowerCase()) ||
      g.description.toLowerCase().includes(query.toLowerCase()) ||
      g.tags.some((t) => t.toLowerCase().includes(query.toLowerCase()));
    const matchCategory = !category || g.category === category;
    return matchQuery && matchCategory && g.visibility === 'public';
  });
}

// ===== 成员管理 =====

export function addMember(groupId: string, member: GroupMember): void {
  const members = getGroupMembers(groupId);
  members.push(member);
  localStorage.setItem(`${STORAGE_KEYS.MEMBERS}_${groupId}`, JSON.stringify(members));

  const group = getGroupById(groupId);
  if (group) {
    updateGroup(groupId, { memberCount: members.length });
  }
}

export function getGroupMembers(groupId: string): GroupMember[] {
  const data = localStorage.getItem(`${STORAGE_KEYS.MEMBERS}_${groupId}`);
  return data ? JSON.parse(data) : [];
}

export function updateMemberRole(groupId: string, userId: string, role: MemberRole): void {
  const members = getGroupMembers(groupId);
  const index = members.findIndex((m) => m.userId === userId);
  if (index !== -1) {
    members[index].role = role;
    localStorage.setItem(`${STORAGE_KEYS.MEMBERS}_${groupId}`, JSON.stringify(members));
  }
}

export function removeMember(groupId: string, userId: string): void {
  const members = getGroupMembers(groupId).filter((m) => m.userId !== userId);
  localStorage.setItem(`${STORAGE_KEYS.MEMBERS}_${groupId}`, JSON.stringify(members));

  const group = getGroupById(groupId);
  if (group) {
    updateGroup(groupId, { memberCount: members.length });
  }
}

export function joinGroup(groupId: string, userId: string, userName: string): boolean {
  const group = getGroupById(groupId);
  if (!group) return false;

  const members = getGroupMembers(groupId);
  if (members.some((m) => m.userId === userId)) return false;
  if (members.length >= group.settings.maxMembers) return false;

  const member: GroupMember = {
    id: generateId(),
    userId,
    userName,
    role: 'member',
    joinedAt: new Date().toISOString(),
    contribution: 0,
    lastActive: new Date().toISOString(),
  };

  addMember(groupId, member);

  const userGroups = getUserGroups(userId);
  userGroups.push(groupId);
  localStorage.setItem(`${STORAGE_KEYS.USER_GROUPS}_${userId}`, JSON.stringify(userGroups));

  return true;
}

export function joinGroupByInviteCode(inviteCode: string, userId: string, userName: string): { success: boolean; groupId?: string; error?: string } {
  const allGroups = getAllGroups();
  const group = allGroups.find((g) => g.inviteCode === inviteCode);

  if (!group) {
    return { success: false, error: '邀请码无效' };
  }

  const members = getGroupMembers(group.id);
  if (members.some((m) => m.userId === userId)) {
    return { success: false, error: '你已经是该小组成员' };
  }

  if (members.length >= group.settings.maxMembers) {
    return { success: false, error: '小组人数已满' };
  }

  const success = joinGroup(group.id, userId, userName);
  if (success) {
    return { success: true, groupId: group.id };
  }

  return { success: false, error: '加入失败，请重试' };
}

// ===== 帖子管理 =====

export function createPost(post: Omit<GroupPost, 'id' | 'createdAt' | 'updatedAt'>): GroupPost {
  const newPost: GroupPost = {
    ...post,
    id: generateId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const posts = getGroupPosts(post.groupId);
  posts.unshift(newPost);
  localStorage.setItem(`${STORAGE_KEYS.POSTS}_${post.groupId}`, JSON.stringify(posts));

  return newPost;
}

export function getGroupPosts(groupId: string): GroupPost[] {
  const data = localStorage.getItem(`${STORAGE_KEYS.POSTS}_${groupId}`);
  return data ? JSON.parse(data) : [];
}

export function likePost(groupId: string, postId: string, userId: string): void {
  const posts = getGroupPosts(groupId);
  const post = posts.find((p) => p.id === postId);
  if (post) {
    if (!post.likedBy.includes(userId)) {
      post.likedBy.push(userId);
      post.likes++;
    } else {
      post.likedBy = post.likedBy.filter((id) => id !== userId);
      post.likes--;
    }
    localStorage.setItem(`${STORAGE_KEYS.POSTS}_${groupId}`, JSON.stringify(posts));
  }
}

export function addComment(
  groupId: string,
  postId: string,
  userId: string,
  userName: string,
  content: string,
  userAvatar?: string
): void {
  const posts = getGroupPosts(groupId);
  const post = posts.find((p) => p.id === postId);
  if (post) {
    const comment = {
      id: generateId(),
      postId,
      authorId: userId,
      authorName: userName,
      authorAvatar: userAvatar,
      content,
      likes: 0,
      createdAt: new Date().toISOString(),
    };
    post.comments.push(comment);
    localStorage.setItem(`${STORAGE_KEYS.POSTS}_${groupId}`, JSON.stringify(posts));
  }
}

// ===== 任务管理 =====

export function createTask(task: Omit<GroupTask, 'id' | 'createdAt'>): GroupTask {
  const newTask: GroupTask = {
    ...task,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };

  const tasks = getGroupTasks(task.groupId);
  tasks.push(newTask);
  localStorage.setItem(`${STORAGE_KEYS.TASKS}_${task.groupId}`, JSON.stringify(tasks));

  return newTask;
}

export function getGroupTasks(groupId: string): GroupTask[] {
  const data = localStorage.getItem(`${STORAGE_KEYS.TASKS}_${groupId}`);
  return data ? JSON.parse(data) : [];
}

export function updateTaskStatus(groupId: string, taskId: string, status: 'pending' | 'in_progress' | 'completed'): void {
  const tasks = getGroupTasks(groupId);
  const task = tasks.find((t) => t.id === taskId);
  if (task) {
    task.status = status;
    if (status === 'completed') {
      task.completedAt = new Date().toISOString();
    }
    localStorage.setItem(`${STORAGE_KEYS.TASKS}_${groupId}`, JSON.stringify(tasks));
  }
}

// ===== 资源管理 =====

export function addResource(resource: Omit<GroupResource, 'id' | 'createdAt'>): GroupResource {
  const newResource: GroupResource = {
    ...resource,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };

  const resources = getGroupResources(resource.groupId);
  resources.push(newResource);
  localStorage.setItem(`${STORAGE_KEYS.RESOURCES}_${resource.groupId}`, JSON.stringify(resources));

  return newResource;
}

export function getGroupResources(groupId: string): GroupResource[] {
  const data = localStorage.getItem(`${STORAGE_KEYS.RESOURCES}_${groupId}`);
  return data ? JSON.parse(data) : [];
}

// ===== 打卡管理 =====

export function checkIn(groupId: string, userId: string, note?: string): GroupCheckIn {
  const today = new Date().toISOString().split('T')[0];
  const checkIns = getGroupCheckIns(groupId);

  const existingCheckIn = checkIns.find(
    (c) => c.userId === userId && c.date === today
  );

  if (existingCheckIn) {
    return existingCheckIn;
  }

  const userCheckIns = checkIns.filter((c) => c.userId === userId).sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  let streak = 1;
  if (userCheckIns.length > 0) {
    const lastCheckIn = userCheckIns[0];
    const lastDate = new Date(lastCheckIn.date);
    const todayDate = new Date(today);
    const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      streak = lastCheckIn.streak + 1;
    }
  }

  const newCheckIn: GroupCheckIn = {
    id: generateId(),
    groupId,
    userId,
    date: today,
    note,
    streak,
  };

  checkIns.push(newCheckIn);
  localStorage.setItem(`${STORAGE_KEYS.CHECKINS}_${groupId}`, JSON.stringify(checkIns));

  return newCheckIn;
}

export function getGroupCheckIns(groupId: string): GroupCheckIn[] {
  const data = localStorage.getItem(`${STORAGE_KEYS.CHECKINS}_${groupId}`);
  return data ? JSON.parse(data) : [];
}

// ===== 统计数据 =====

export function getGroupStats(groupId: string): GroupStats {
  const posts = getGroupPosts(groupId);
  const resources = getGroupResources(groupId);
  const tasks = getGroupTasks(groupId);
  const members = getGroupMembers(groupId);

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const activeMembers = members.filter(
    (m) => new Date(m.lastActive) > weekAgo
  ).length;

  return {
    totalPosts: posts.length,
    totalResources: resources.length,
    totalTasks: tasks.length,
    completedTasks: tasks.filter((t) => t.status === 'completed').length,
    activeMembers,
    weeklyActivity: posts.filter((p) => new Date(p.createdAt) > weekAgo).length,
  };
}

// ===== 初始化示例数据 =====

export function initializeSampleData(): void {
  if (getAllGroups().length > 0) return;

  const sampleGroups = [
    {
      name: 'JavaScript 学习小组',
      description: '一起学习现代 JavaScript 和前端开发技术',
      category: 'programming' as GroupCategory,
      visibility: 'public' as const,
      tags: ['JavaScript', 'React', 'Node.js'],
      activeLevel: 85,
    },
    {
      name: '算法竞赛训练营',
      description: '准备 ACM、LeetCode 等算法竞赛',
      category: 'programming' as GroupCategory,
      visibility: 'public' as const,
      tags: ['算法', '数据结构', '竞赛'],
      activeLevel: 92,
    },
    {
      name: '高等数学互助组',
      description: '大学数学课程学习与讨论',
      category: 'math' as GroupCategory,
      visibility: 'public' as const,
      tags: ['微积分', '线性代数', '概率论'],
      activeLevel: 78,
    },
  ];

  sampleGroups.forEach((groupData, index) => {
    const group = createGroup(
      groupData.name,
      groupData.description,
      groupData.category,
      groupData.visibility,
      'user-1',
      '示例用户'
    );

    updateGroup(group.id, {
      tags: groupData.tags,
      activeLevel: groupData.activeLevel,
    });

    for (let i = 2; i <= 5 + index * 2; i++) {
      joinGroup(group.id, `user-${i}`, `成员 ${i}`);
    }

    const members = getGroupMembers(group.id);
    members.forEach((member, idx) => {
      member.contribution = Math.floor(Math.random() * 500) + 100;
    });
    localStorage.setItem(`${STORAGE_KEYS.MEMBERS}_${group.id}`, JSON.stringify(members));

    createPost({
      groupId: group.id,
      authorId: 'user-1',
      authorName: '示例用户',
      type: 'announcement',
      title: '欢迎加入小组！',
      content: '大家好，欢迎加入我们的学习小组。让我们一起进步！',
      likes: 5,
      likedBy: ['user-2', 'user-3', 'user-4', 'user-5', 'user-6'],
      comments: [],
      isPinned: true,
    });
  });
}
