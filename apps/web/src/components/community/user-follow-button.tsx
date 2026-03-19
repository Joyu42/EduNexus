'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { UserPlus, UserCheck } from 'lucide-react'
import { followUser, unfollowUser } from '@/lib/community/follow-system'
import { cn } from '@/lib/utils'

interface UserFollowButtonProps {
  currentUserId: string
  targetUserId: string
  isFollowing?: boolean
  isMutualFollow?: boolean
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  onFollowChange?: (isFollowing: boolean) => void
}

export function UserFollowButton({
  currentUserId,
  targetUserId,
  isFollowing: initialIsFollowing = false,
  isMutualFollow = false,
  variant = 'default',
  size = 'md',
  className,
  onFollowChange,
}: UserFollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing)
  const [isHovered, setIsHovered] = useState(false)

  if (currentUserId === targetUserId) {
    return null
  }

  const handleToggleFollow = () => {
    if (isFollowing) {
      unfollowUser(currentUserId, targetUserId)
      setIsFollowing(false)
      onFollowChange?.(false)
    } else {
      followUser(currentUserId, targetUserId)
      setIsFollowing(true)
      onFollowChange?.(true)
    }
  }

  const getButtonText = () => {
    if (!isFollowing) {
      return '关注'
    }
    if (isMutualFollow) {
      return isHovered ? '取消关注' : '互相关注'
    }
    return isHovered ? '取消关注' : '已关注'
  }

  const getButtonVariant = () => {
    if (!isFollowing) {
      return variant
    }
    return isHovered ? 'outline' : 'secondary'
  }

  return (
    <Button
      variant={getButtonVariant()}
      size={size}
      className={cn(className)}
      onClick={handleToggleFollow}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isFollowing ? (
        <UserCheck className="h-4 w-4 mr-2" />
      ) : (
        <UserPlus className="h-4 w-4 mr-2" />
      )}
      {getButtonText()}
    </Button>
  )
}
