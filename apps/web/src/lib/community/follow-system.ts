// 关注系统

import { getFollows, getFollowers, getFollowing, isFollowing, toggleFollow, getUserProfileById, getUserPostCount } from './post-storage'
import type { UserProfile } from './types'

export function getUserProfile(userId: string, currentUserId: string): UserProfile {
  const followers = getFollowers(userId)
  const following = getFollowing(userId)
  const isCurrentUserFollowing = isFollowing(currentUserId, userId)
  const isMutual = isCurrentUserFollowing && isFollowing(userId, currentUserId)

  // 从存储中获取用户资料
  const storedProfile = getUserProfileById(userId)
  const postCount = getUserPostCount(userId)

  return {
    userId,
    userName: storedProfile?.userName || `用户${userId}`,
    avatar: storedProfile?.avatar,
    bio: storedProfile?.bio,
    followerCount: followers.length,
    followingCount: following.length,
    postCount,
    isFollowing: isCurrentUserFollowing,
    isMutualFollow: isMutual,
  }
}

export function getRecommendedUsers(currentUserId: string, limit: number = 10): UserProfile[] {
  const following = getFollowing(currentUserId)
  const recommendations = new Set<string>()

  // 算法1：推荐关注者的关注者（二度关系）
  following.forEach(userId => {
    const secondDegree = getFollowing(userId)
    secondDegree.forEach(id => {
      if (id !== currentUserId && !following.includes(id)) {
        recommendations.add(id)
      }
    })
  })

  // 算法2：如果推荐用户不足，从所有用户中推荐活跃用户
  const { getUserProfiles } = require('./post-storage')
  const allProfiles = getUserProfiles()

  if (recommendations.size < limit) {
    allProfiles
      .filter((p: any) => p.userId !== currentUserId && !following.includes(p.userId))
      .sort((a: any, b: any) => (b.followerCount + b.postCount) - (a.followerCount + a.postCount))
      .slice(0, limit - recommendations.size)
      .forEach((p: any) => recommendations.add(p.userId))
  }

  return Array.from(recommendations)
    .slice(0, limit)
    .map(userId => getUserProfile(userId, currentUserId))
}

export function followUser(followerId: string, followingId: string): boolean {
  if (followerId === followingId) return false
  return toggleFollow(followerId, followingId)
}

export function unfollowUser(followerId: string, followingId: string): boolean {
  return toggleFollow(followerId, followingId)
}

export function getFollowersList(userId: string, currentUserId: string): UserProfile[] {
  const followers = getFollowers(userId)
  return followers.map(id => getUserProfile(id, currentUserId))
}

export function getFollowingList(userId: string, currentUserId: string): UserProfile[] {
  const following = getFollowing(userId)
  return following.map(id => getUserProfile(id, currentUserId))
}

export function getMutualFollows(userId: string): string[] {
  const followers = getFollowers(userId)
  const following = getFollowing(userId)
  return followers.filter(id => following.includes(id))
}
