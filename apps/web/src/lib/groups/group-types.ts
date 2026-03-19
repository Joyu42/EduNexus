// 小组类型定义

export type GroupCategory =
  | 'programming'
  | 'math'
  | 'language'
  | 'science'
  | 'art'
  | 'business'
  | 'other';

export type GroupVisibility = 'public' | 'private';

export type MemberRole = 'owner' | 'admin' | 'member';

export type PostType = 'discussion' | 'resource' | 'announcement';

export type TaskStatus = 'pending' | 'in_progress' | 'completed';

export interface GroupMember {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  role: MemberRole;
  joinedAt: string;
  contribution: number; // 贡献度
  lastActive: string;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  category: GroupCategory;
  cover?: string;
  visibility: GroupVisibility;
  inviteCode?: string;
  createdAt: string;
  updatedAt: string;
  ownerId: string;
  memberCount: number;
  activeLevel: number; // 活跃度 0-100
  tags: string[];
  settings: GroupSettings;
}

export interface GroupSettings {
  allowMemberPost: boolean;
  allowMemberInvite: boolean;
  requireApproval: boolean;
  maxMembers: number;
}

export interface GroupPost {
  id: string;
  groupId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  type: PostType;
  title: string;
  content: string;
  attachments?: string[];
  likes: number;
  likedBy: string[];
  comments: PostComment[];
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PostComment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  likes: number;
  createdAt: string;
}

export interface GroupTask {
  id: string;
  groupId: string;
  title: string;
  description: string;
  assignedTo: string[];
  status: TaskStatus;
  dueDate: string;
  createdBy: string;
  createdAt: string;
  completedAt?: string;
}

export interface GroupResource {
  id: string;
  groupId: string;
  title: string;
  description: string;
  type: 'file' | 'link' | 'note';
  url?: string;
  fileSize?: number;
  uploadedBy: string;
  uploadedByName: string;
  downloads: number;
  likes: number;
  createdAt: string;
}

export interface GroupEvent {
  id: string;
  groupId: string;
  title: string;
  description: string;
  type: 'meeting' | 'deadline' | 'activity';
  startTime: string;
  endTime?: string;
  location?: string;
  createdBy: string;
  participants: string[];
}

export interface GroupChallenge {
  id: string;
  groupId: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  participants: ChallengeParticipant[];
  prize?: string;
  createdBy: string;
}

export interface ChallengeParticipant {
  userId: string;
  userName: string;
  score: number;
  rank: number;
  completedAt?: string;
}

export interface GroupCheckIn {
  id: string;
  groupId: string;
  userId: string;
  date: string;
  note?: string;
  streak: number;
}

export interface GroupBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface GroupStats {
  totalPosts: number;
  totalResources: number;
  totalTasks: number;
  completedTasks: number;
  activeMembers: number;
  weeklyActivity: number;
}
