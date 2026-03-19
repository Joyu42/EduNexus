// 社区动态类型定义

export type PostType = 'text' | 'note' | 'achievement' | 'checkin' | 'article'

export type ReactionType = '👍' | '❤️' | '🎉' | '🔥' | '💡' | '🚀'

export interface Post {
  id: string
  userId: string
  userName: string
  userAvatar?: string
  type: PostType
  content: string
  images?: string[]
  codeSnippet?: {
    language: string
    code: string
  }
  noteId?: string // 关联的知识库笔记
  achievementId?: string // 关联的成就
  topics: string[] // 话题标签
  createdAt: string
  updatedAt: string
  likeCount: number
  commentCount: number
  shareCount: number
  bookmarkCount: number
  reactions: Record<ReactionType, number>
  isLiked?: boolean
  isBookmarked?: boolean
}

export interface Comment {
  id: string
  postId: string
  userId: string
  userName: string
  userAvatar?: string
  content: string
  parentId?: string // 父评论ID（用于嵌套回复）
  replyToUserId?: string
  replyToUserName?: string
  createdAt: string
  likeCount: number
  isLiked?: boolean
  replies?: Comment[]
}

export interface UserFollow {
  followerId: string // 关注者
  followingId: string // 被关注者
  createdAt: string
}

export interface Topic {
  name: string
  displayName: string
  description?: string
  postCount: number
  followerCount: number
  createdAt: string
  creatorId: string
  isFollowing?: boolean
}

export interface UserProfile {
  userId: string
  userName: string
  avatar?: string
  bio?: string
  followerCount: number
  followingCount: number
  postCount: number
  isFollowing?: boolean
  isMutualFollow?: boolean
}

export interface FeedFilter {
  type?: 'following' | 'recommended' | 'hot' | 'topic'
  postType?: PostType
  topicName?: string
  userId?: string
  sortBy?: 'latest' | 'hot' | 'trending'
}

export interface PostInteraction {
  postId: string
  userId: string
  type: 'like' | 'bookmark' | 'share' | 'reaction'
  reactionType?: ReactionType
  createdAt: string
}
