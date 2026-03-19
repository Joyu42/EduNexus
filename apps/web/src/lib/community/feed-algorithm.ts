// 动态流推荐算法

import type { Post, FeedFilter } from './types'
import { getPosts, getInteractions, getFollowing } from './post-storage'

export function getFeed(currentUserId: string, filter: FeedFilter, page: number = 0, pageSize: number = 20): Post[] {
  let posts = getPosts()

  // 应用过滤器
  if (filter.type === 'following') {
    const following = getFollowing(currentUserId)
    posts = posts.filter(p => following.includes(p.userId))
  } else if (filter.type === 'topic' && filter.topicName) {
    posts = posts.filter(p => p.topics.includes(filter.topicName!))
  } else if (filter.userId) {
    posts = posts.filter(p => p.userId === filter.userId)
  }

  if (filter.postType) {
    posts = posts.filter(p => p.type === filter.postType)
  }

  // 应用排序
  if (filter.sortBy === 'hot') {
    posts = sortByHot(posts)
  } else if (filter.sortBy === 'trending') {
    posts = sortByTrending(posts)
  } else {
    // 默认按时间排序
    posts = posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }

  // 分页
  const start = page * pageSize
  const end = start + pageSize
  return posts.slice(start, end)
}

export function getRecommendedFeed(currentUserId: string, page: number = 0, pageSize: number = 20): Post[] {
  const posts = getPosts()
  const interactions = getInteractions()
  const following = getFollowing(currentUserId)

  // 计算每个动态的推荐分数
  const scoredPosts = posts.map(post => {
    let score = 0

    // 关注用户的动态加分
    if (following.includes(post.userId)) {
      score += 50
    }

    // 互动数加分
    score += post.likeCount * 2
    score += post.commentCount * 5
    score += post.shareCount * 10
    score += post.bookmarkCount * 3

    // 时间衰减（越新的动态分数越高）
    const hoursSincePost = (Date.now() - new Date(post.createdAt).getTime()) / (1000 * 60 * 60)
    const timeDecay = Math.exp(-hoursSincePost / 24) // 24小时衰减
    score *= timeDecay

    // 用户已互动过的动态降低分数
    const userInteracted = interactions.some(i => i.postId === post.id && i.userId === currentUserId)
    if (userInteracted) {
      score *= 0.3
    }

    return { post, score }
  })

  // 按分数排序
  scoredPosts.sort((a, b) => b.score - a.score)

  // 分页
  const start = page * pageSize
  const end = start + pageSize
  return scoredPosts.slice(start, end).map(item => item.post)
}

function sortByHot(posts: Post[]): Post[] {
  return posts.sort((a, b) => {
    const scoreA = a.likeCount * 2 + a.commentCount * 5 + a.shareCount * 10
    const scoreB = b.likeCount * 2 + b.commentCount * 5 + b.shareCount * 10
    return scoreB - scoreA
  })
}

function sortByTrending(posts: Post[]): Post[] {
  return posts.sort((a, b) => {
    const now = Date.now()
    const hoursA = (now - new Date(a.createdAt).getTime()) / (1000 * 60 * 60)
    const hoursB = (now - new Date(b.createdAt).getTime()) / (1000 * 60 * 60)

    // 趋势分数 = 互动数 / (时间 + 2)^1.5
    const scoreA = (a.likeCount + a.commentCount * 2 + a.shareCount * 3) / Math.pow(hoursA + 2, 1.5)
    const scoreB = (b.likeCount + b.commentCount * 2 + b.shareCount * 3) / Math.pow(hoursB + 2, 1.5)

    return scoreB - scoreA
  })
}

export function getHotPosts(limit: number = 10): Post[] {
  const posts = getPosts()
  return sortByHot(posts).slice(0, limit)
}

export function getTrendingPosts(limit: number = 10): Post[] {
  const posts = getPosts()
  return sortByTrending(posts).slice(0, limit)
}

export function searchPosts(query: string, filter?: FeedFilter): Post[] {
  let posts = getPosts()

  // 应用过滤器
  if (filter?.postType) {
    posts = posts.filter(p => p.type === filter.postType)
  }
  if (filter?.topicName) {
    posts = posts.filter(p => p.topics.includes(filter.topicName!))
  }

  // 搜索内容
  const lowerQuery = query.toLowerCase()
  return posts.filter(post =>
    post.content.toLowerCase().includes(lowerQuery) ||
    post.topics.some(t => t.toLowerCase().includes(lowerQuery)) ||
    post.userName.toLowerCase().includes(lowerQuery)
  )
}
