// 社区动态存储（客户端）

import type { Post, Comment, PostInteraction, Topic, UserFollow, UserProfile } from './types'

const STORAGE_KEYS = {
  POSTS: 'edunexus_community_posts',
  COMMENTS: 'edunexus_community_comments',
  INTERACTIONS: 'edunexus_community_interactions',
  TOPICS: 'edunexus_community_topics',
  FOLLOWS: 'edunexus_community_follows',
  USER_PROFILES: 'edunexus_community_profiles',
}

// ==================== 动态管理 ====================

export function getPosts(): Post[] {
  if (typeof window === 'undefined') return []
  const data = localStorage.getItem(STORAGE_KEYS.POSTS)
  if (data) {
    return JSON.parse(data)
  }
  // 初始化默认数据
  const defaultPosts = getDefaultPosts()
  savePosts(defaultPosts)
  return defaultPosts
}

export function savePosts(posts: Post[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(posts))
}

export function createPost(post: Omit<Post, 'id' | 'createdAt' | 'updatedAt' | 'likeCount' | 'commentCount' | 'shareCount' | 'bookmarkCount' | 'reactions'>): Post {
  const posts = getPosts()
  const newPost: Post = {
    ...post,
    id: `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    likeCount: 0,
    commentCount: 0,
    shareCount: 0,
    bookmarkCount: 0,
    reactions: { '👍': 0, '❤️': 0, '🎉': 0, '🔥': 0, '💡': 0, '🚀': 0 },
  }
  posts.unshift(newPost)
  savePosts(posts)

  // 更新话题统计
  post.topics.forEach(topic => {
    incrementTopicPostCount(topic)
  })

  return newPost
}

export function getPostById(postId: string): Post | undefined {
  const posts = getPosts()
  return posts.find(p => p.id === postId)
}

export function deletePost(postId: string): void {
  const posts = getPosts()
  const filtered = posts.filter(p => p.id !== postId)
  savePosts(filtered)
}

// ==================== 评论管理 ====================

export function getComments(): Comment[] {
  if (typeof window === 'undefined') return []
  const data = localStorage.getItem(STORAGE_KEYS.COMMENTS)
  return data ? JSON.parse(data) : []
}

export function saveComments(comments: Comment[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEYS.COMMENTS, JSON.stringify(comments))
}

export function getCommentsByPostId(postId: string): Comment[] {
  const comments = getComments()
  const postComments = comments.filter(c => c.postId === postId && !c.parentId)

  // 构建嵌套回复结构
  return postComments.map(comment => ({
    ...comment,
    replies: comments.filter(c => c.parentId === comment.id)
  }))
}

export function createComment(comment: Omit<Comment, 'id' | 'createdAt' | 'likeCount'>): Comment {
  const comments = getComments()
  const newComment: Comment = {
    ...comment,
    id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date().toISOString(),
    likeCount: 0,
  }
  comments.push(newComment)
  saveComments(comments)

  // 更新动态评论数
  incrementPostCommentCount(comment.postId)

  return newComment
}

export function deleteComment(commentId: string): void {
  const comments = getComments()
  const filtered = comments.filter(c => c.id !== commentId && c.parentId !== commentId)
  saveComments(filtered)
}

// ==================== 互动管理 ====================

export function getInteractions(): PostInteraction[] {
  if (typeof window === 'undefined') return []
  const data = localStorage.getItem(STORAGE_KEYS.INTERACTIONS)
  return data ? JSON.parse(data) : []
}

export function saveInteractions(interactions: PostInteraction[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEYS.INTERACTIONS, JSON.stringify(interactions))
}

export function toggleLike(postId: string, userId: string): boolean {
  const interactions = getInteractions()
  const existing = interactions.find(i => i.postId === postId && i.userId === userId && i.type === 'like')

  if (existing) {
    const filtered = interactions.filter(i => !(i.postId === postId && i.userId === userId && i.type === 'like'))
    saveInteractions(filtered)
    decrementPostLikeCount(postId)
    return false
  } else {
    interactions.push({
      postId,
      userId,
      type: 'like',
      createdAt: new Date().toISOString()
    })
    saveInteractions(interactions)
    incrementPostLikeCount(postId)
    return true
  }
}

export function toggleBookmark(postId: string, userId: string): boolean {
  const interactions = getInteractions()
  const existing = interactions.find(i => i.postId === postId && i.userId === userId && i.type === 'bookmark')

  if (existing) {
    const filtered = interactions.filter(i => !(i.postId === postId && i.userId === userId && i.type === 'bookmark'))
    saveInteractions(filtered)
    decrementPostBookmarkCount(postId)
    return false
  } else {
    interactions.push({
      postId,
      userId,
      type: 'bookmark',
      createdAt: new Date().toISOString()
    })
    saveInteractions(interactions)
    incrementPostBookmarkCount(postId)
    return true
  }
}

export function addReaction(postId: string, userId: string, reactionType: string): void {
  const interactions = getInteractions()
  // 移除旧反应
  const filtered = interactions.filter(i => !(i.postId === postId && i.userId === userId && i.type === 'reaction'))

  filtered.push({
    postId,
    userId,
    type: 'reaction',
    reactionType: reactionType as any,
    createdAt: new Date().toISOString()
  })
  saveInteractions(filtered)
  incrementPostReaction(postId, reactionType)
}

export function sharePost(postId: string, userId: string): void {
  const interactions = getInteractions()
  interactions.push({
    postId,
    userId,
    type: 'share',
    createdAt: new Date().toISOString()
  })
  saveInteractions(interactions)
  incrementPostShareCount(postId)
}

// ==================== 话题管理 ====================

export function getTopics(): Topic[] {
  if (typeof window === 'undefined') return []
  const data = localStorage.getItem(STORAGE_KEYS.TOPICS)
  if (data) {
    return JSON.parse(data)
  }
  // 初始化默认数据
  const defaultTopics = getDefaultTopics()
  saveTopics(defaultTopics)
  return defaultTopics
}

export function saveTopics(topics: Topic[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEYS.TOPICS, JSON.stringify(topics))
}

export function getTopicByName(name: string): Topic | undefined {
  const topics = getTopics()
  return topics.find(t => t.name === name)
}

export function createTopic(name: string, displayName: string, creatorId: string, description?: string): Topic {
  const topics = getTopics()
  const existing = topics.find(t => t.name === name)
  if (existing) return existing

  const newTopic: Topic = {
    name,
    displayName,
    description,
    postCount: 0,
    followerCount: 0,
    createdAt: new Date().toISOString(),
    creatorId,
  }
  topics.push(newTopic)
  saveTopics(topics)
  return newTopic
}

export function incrementTopicPostCount(topicName: string): void {
  const topics = getTopics()
  const topic = topics.find(t => t.name === topicName)
  if (topic) {
    topic.postCount++
    saveTopics(topics)
  }
}

export function getHotTopics(limit: number = 10): Topic[] {
  const topics = getTopics()
  return topics
    .sort((a, b) => b.postCount - a.postCount)
    .slice(0, limit)
}

// ==================== 关注系统 ====================

export function getFollows(): UserFollow[] {
  if (typeof window === 'undefined') return []
  const data = localStorage.getItem(STORAGE_KEYS.FOLLOWS)
  return data ? JSON.parse(data) : []
}

export function saveFollows(follows: UserFollow[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEYS.FOLLOWS, JSON.stringify(follows))
}

export function toggleFollow(followerId: string, followingId: string): boolean {
  const follows = getFollows()
  const existing = follows.find(f => f.followerId === followerId && f.followingId === followingId)

  if (existing) {
    const filtered = follows.filter(f => !(f.followerId === followerId && f.followingId === followingId))
    saveFollows(filtered)
    return false
  } else {
    follows.push({
      followerId,
      followingId,
      createdAt: new Date().toISOString()
    })
    saveFollows(follows)
    return true
  }
}

export function isFollowing(followerId: string, followingId: string): boolean {
  const follows = getFollows()
  return follows.some(f => f.followerId === followerId && f.followingId === followingId)
}

export function getFollowers(userId: string): string[] {
  const follows = getFollows()
  return follows.filter(f => f.followingId === userId).map(f => f.followerId)
}

export function getFollowing(userId: string): string[] {
  const follows = getFollows()
  return follows.filter(f => f.followerId === userId).map(f => f.followingId)
}

// ==================== 用户统计 ====================

export function getUserPostCount(userId: string): number {
  const posts = getPosts()
  return posts.filter(p => p.userId === userId).length
}

export function getUserProfiles(): UserProfile[] {
  if (typeof window === 'undefined') return []
  const data = localStorage.getItem(STORAGE_KEYS.USER_PROFILES)
  if (data) {
    return JSON.parse(data)
  }
  // 初始化默认用户数据
  const defaultProfiles = getDefaultUserProfiles()
  saveUserProfiles(defaultProfiles)
  return defaultProfiles
}

export function saveUserProfiles(profiles: UserProfile[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEYS.USER_PROFILES, JSON.stringify(profiles))
}

export function getUserProfileById(userId: string): UserProfile | undefined {
  const profiles = getUserProfiles()
  return profiles.find(p => p.userId === userId)
}

// ==================== 辅助函数 ====================

function incrementPostLikeCount(postId: string): void {
  const posts = getPosts()
  const post = posts.find(p => p.id === postId)
  if (post) {
    post.likeCount++
    savePosts(posts)
  }
}

function decrementPostLikeCount(postId: string): void {
  const posts = getPosts()
  const post = posts.find(p => p.id === postId)
  if (post && post.likeCount > 0) {
    post.likeCount--
    savePosts(posts)
  }
}

function incrementPostCommentCount(postId: string): void {
  const posts = getPosts()
  const post = posts.find(p => p.id === postId)
  if (post) {
    post.commentCount++
    savePosts(posts)
  }
}

function incrementPostShareCount(postId: string): void {
  const posts = getPosts()
  const post = posts.find(p => p.id === postId)
  if (post) {
    post.shareCount++
    savePosts(posts)
  }
}

function incrementPostBookmarkCount(postId: string): void {
  const posts = getPosts()
  const post = posts.find(p => p.id === postId)
  if (post) {
    post.bookmarkCount++
    savePosts(posts)
  }
}

function decrementPostBookmarkCount(postId: string): void {
  const posts = getPosts()
  const post = posts.find(p => p.id === postId)
  if (post && post.bookmarkCount > 0) {
    post.bookmarkCount--
    savePosts(posts)
  }
}

function incrementPostReaction(postId: string, reactionType: string): void {
  const posts = getPosts()
  const post = posts.find(p => p.id === postId)
  if (post && reactionType in post.reactions) {
    post.reactions[reactionType as keyof typeof post.reactions]++
    savePosts(posts)
  }
}

// ==================== 示例数据 ====================

function getDefaultPosts(): Post[] {
  return [
    {
      id: 'post_1',
      userId: 'user_1',
      userName: '张小明',
      userAvatar: '👨‍💻',
      type: 'text',
      content: '今天终于搞懂了 React Hooks 的闭包陷阱！分享一下我的理解：useEffect 的依赖数组很重要，如果不加依赖，每次渲染都会创建新的闭包，导致拿到的是旧的 state 值。#React #前端开发',
      topics: ['React', '前端开发'],
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      likeCount: 42,
      commentCount: 8,
      shareCount: 5,
      bookmarkCount: 15,
      reactions: { '👍': 20, '❤️': 12, '🎉': 5, '🔥': 3, '💡': 2, '🚀': 0 },
    },
    {
      id: 'post_2',
      userId: 'user_2',
      userName: '李华',
      userAvatar: '👩‍🎓',
      type: 'checkin',
      content: '📅 学习打卡 Day 30\n\n今天学习内容：\n✅ 完成了 TypeScript 高级类型章节\n✅ 做了 10 道算法题\n✅ 复习了设计模式\n\n坚持就是胜利！💪 #学习打卡 #TypeScript',
      topics: ['学习打卡', 'TypeScript'],
      createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      likeCount: 28,
      commentCount: 3,
      shareCount: 1,
      bookmarkCount: 5,
      reactions: { '👍': 15, '❤️': 8, '🎉': 3, '🔥': 2, '💡': 0, '🚀': 0 },
    },
    {
      id: 'post_3',
      userId: 'user_3',
      userName: '王芳',
      userAvatar: '👩‍💼',
      type: 'achievement',
      content: '🎉 终于拿到了 AWS 认证！\n\n经过 3 个月的准备，今天顺利通过了 AWS Solutions Architect Associate 考试！感谢这段时间的努力和坚持。\n\n给准备考试的朋友们一些建议：\n1. 多做实验，理论结合实践\n2. 刷题很重要\n3. 官方文档要仔细看\n\n#AWS #云计算 #认证',
      achievementId: 'achievement_aws_cert',
      topics: ['AWS', '云计算', '认证'],
      createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
      likeCount: 156,
      commentCount: 24,
      shareCount: 12,
      bookmarkCount: 45,
      reactions: { '👍': 50, '❤️': 30, '🎉': 40, '🔥': 20, '💡': 10, '🚀': 6 },
    },
    {
      id: 'post_4',
      userId: 'user_4',
      userName: '赵强',
      userAvatar: '👨‍🔬',
      type: 'text',
      content: '分享一个 Python 小技巧：使用 dataclass 可以大大简化数据类的定义！\n\n```python\nfrom dataclasses import dataclass\n\n@dataclass\nclass User:\n    name: str\n    age: int\n    email: str\n```\n\n自动生成 __init__、__repr__、__eq__ 等方法，代码更简洁！#Python #编程技巧',
      codeSnippet: {
        language: 'python',
        code: 'from dataclasses import dataclass\n\n@dataclass\nclass User:\n    name: str\n    age: int\n    email: str'
      },
      topics: ['Python', '编程技巧'],
      createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      likeCount: 67,
      commentCount: 12,
      shareCount: 8,
      bookmarkCount: 32,
      reactions: { '👍': 30, '❤️': 15, '🎉': 5, '🔥': 10, '💡': 7, '🚀': 0 },
    },
    {
      id: 'post_5',
      userId: 'user_5',
      userName: '陈敏',
      userAvatar: '👩‍🏫',
      type: 'article',
      content: '📝 深入理解 JavaScript 事件循环\n\n很多人对 JavaScript 的异步执行机制感到困惑，今天我写了一篇详细的文章，从宏任务、微任务到事件循环的完整流程，配合图解和代码示例，希望能帮助大家理解。\n\n文章要点：\n• 调用栈与任务队列\n• 宏任务 vs 微任务\n• Promise 的执行时机\n• async/await 的本质\n\n#JavaScript #异步编程 #事件循环',
      topics: ['JavaScript', '异步编程', '事件循环'],
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      likeCount: 234,
      commentCount: 45,
      shareCount: 67,
      bookmarkCount: 123,
      reactions: { '👍': 100, '❤️': 60, '🎉': 20, '🔥': 30, '💡': 20, '🚀': 4 },
    },
  ]
}

function getDefaultTopics(): Topic[] {
  return [
    { name: 'React', displayName: 'React', description: 'React 框架学习与讨论', postCount: 156, followerCount: 1234, createdAt: new Date().toISOString(), creatorId: 'system' },
    { name: '前端开发', displayName: '前端开发', description: '前端技术交流', postCount: 342, followerCount: 2345, createdAt: new Date().toISOString(), creatorId: 'system' },
    { name: 'Python', displayName: 'Python', description: 'Python 编程', postCount: 289, followerCount: 1876, createdAt: new Date().toISOString(), creatorId: 'system' },
    { name: 'JavaScript', displayName: 'JavaScript', description: 'JavaScript 技术', postCount: 412, followerCount: 2567, createdAt: new Date().toISOString(), creatorId: 'system' },
    { name: '学习打卡', displayName: '学习打卡', description: '每日学习记录', postCount: 567, followerCount: 3456, createdAt: new Date().toISOString(), creatorId: 'system' },
    { name: 'AWS', displayName: 'AWS', description: 'AWS 云服务', postCount: 123, followerCount: 876, createdAt: new Date().toISOString(), creatorId: 'system' },
    { name: '算法', displayName: '算法', description: '算法与数据结构', postCount: 234, followerCount: 1543, createdAt: new Date().toISOString(), creatorId: 'system' },
    { name: '面试', displayName: '面试', description: '面试经验分享', postCount: 198, followerCount: 2134, createdAt: new Date().toISOString(), creatorId: 'system' },
  ]
}

function getDefaultUserProfiles(): UserProfile[] {
  return [
    {
      userId: 'user_1',
      userName: '张小明',
      avatar: '👨‍💻',
      bio: '全栈工程师，热爱学习新技术',
      followerCount: 1234,
      followingCount: 567,
      postCount: 89,
    },
    {
      userId: 'user_2',
      userName: '李华',
      avatar: '👩‍🎓',
      bio: '前端开发者，TypeScript 爱好者',
      followerCount: 890,
      followingCount: 234,
      postCount: 156,
    },
    {
      userId: 'user_3',
      userName: '王芳',
      avatar: '👩‍💼',
      bio: 'AWS 认证架构师',
      followerCount: 2345,
      followingCount: 678,
      postCount: 234,
    },
    {
      userId: 'user_4',
      userName: '赵强',
      avatar: '👨‍🔬',
      bio: 'Python 开发者，数据科学爱好者',
      followerCount: 1567,
      followingCount: 890,
      postCount: 178,
    },
    {
      userId: 'user_5',
      userName: '陈敏',
      avatar: '👩‍🏫',
      bio: '技术博主，专注前端技术分享',
      followerCount: 3456,
      followingCount: 1234,
      postCount: 345,
    },
    {
      userId: 'demo_user',
      userName: '演示用户',
      avatar: '👤',
      bio: '欢迎来到 EduNexus 学习社区',
      followerCount: 0,
      followingCount: 0,
      postCount: 0,
    },
  ]
}

