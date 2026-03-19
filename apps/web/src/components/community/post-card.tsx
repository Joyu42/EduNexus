'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Heart, MessageCircle, Share2, Bookmark, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Post, ReactionType } from '@/lib/community/types'
import { toggleLike, toggleBookmark, addReaction, sharePost } from '@/lib/community/post-storage'
import { cn } from '@/lib/utils'

interface PostCardProps {
  post: Post
  currentUserId: string
  onCommentClick?: () => void
  onUserClick?: (userId: string) => void
  onTopicClick?: (topic: string) => void
}

const REACTIONS: ReactionType[] = ['👍', '❤️', '🎉', '🔥', '💡', '🚀']

export function PostCard({ post, currentUserId, onCommentClick, onUserClick, onTopicClick }: PostCardProps) {
  const [isLiked, setIsLiked] = useState(post.isLiked || false)
  const [isBookmarked, setIsBookmarked] = useState(post.isBookmarked || false)
  const [likeCount, setLikeCount] = useState(post.likeCount)
  const [bookmarkCount, setBookmarkCount] = useState(post.bookmarkCount)
  const [shareCount, setShareCount] = useState(post.shareCount)
  const [showReactions, setShowReactions] = useState(false)

  const handleLike = () => {
    const newLiked = toggleLike(post.id, currentUserId)
    setIsLiked(newLiked)
    setLikeCount(prev => newLiked ? prev + 1 : prev - 1)
  }

  const handleBookmark = () => {
    const newBookmarked = toggleBookmark(post.id, currentUserId)
    setIsBookmarked(newBookmarked)
    setBookmarkCount(prev => newBookmarked ? prev + 1 : prev - 1)
  }

  const handleShare = () => {
    sharePost(post.id, currentUserId)
    setShareCount(prev => prev + 1)
    // 这里可以添加分享功能（复制链接、分享到其他平台等）
    navigator.clipboard.writeText(`${window.location.origin}/community/post/${post.id}`)
  }

  const handleReaction = (reaction: ReactionType) => {
    addReaction(post.id, currentUserId, reaction)
    setShowReactions(false)
  }

  const getPostTypeLabel = () => {
    switch (post.type) {
      case 'checkin': return '📅 学习打卡'
      case 'achievement': return '🎉 学习成果'
      case 'note': return '📝 学习笔记'
      case 'article': return '📄 长文分享'
      default: return null
    }
  }

  return (
    <Card className="p-6 hover:shadow-md transition-shadow">
      {/* 用户信息 */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <Avatar
            className="cursor-pointer"
            onClick={() => onUserClick?.(post.userId)}
          >
            <AvatarFallback>{post.userAvatar || post.userName[0]}</AvatarFallback>
          </Avatar>
          <div>
            <div
              className="font-medium cursor-pointer hover:underline"
              onClick={() => onUserClick?.(post.userId)}
            >
              {post.userName}
            </div>
            <div className="text-sm text-muted-foreground">
              {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: zhCN })}
            </div>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>举报</DropdownMenuItem>
            <DropdownMenuItem>屏蔽用户</DropdownMenuItem>
            {post.userId === currentUserId && (
              <>
                <DropdownMenuItem>编辑</DropdownMenuItem>
                <DropdownMenuItem className="text-destructive">删除</DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* 动态类型标签 */}
      {getPostTypeLabel() && (
        <div className="mb-3">
          <Badge variant="secondary">{getPostTypeLabel()}</Badge>
        </div>
      )}

      {/* 动态内容 */}
      <div className="mb-4 whitespace-pre-wrap">{post.content}</div>

      {/* 代码片段 */}
      {post.codeSnippet && (
        <div className="mb-4 rounded-lg bg-muted p-4 overflow-x-auto">
          <pre className="text-sm">
            <code>{post.codeSnippet.code}</code>
          </pre>
        </div>
      )}

      {/* 图片 */}
      {post.images && post.images.length > 0 && (
        <div className="mb-4 grid grid-cols-2 gap-2">
          {post.images.map((img, idx) => (
            <div key={idx} className="rounded-lg overflow-hidden bg-muted aspect-video" />
          ))}
        </div>
      )}

      {/* 话题标签 */}
      {post.topics.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {post.topics.map(topic => (
            <Badge
              key={topic}
              variant="outline"
              className="cursor-pointer hover:bg-accent"
              onClick={() => onTopicClick?.(topic)}
            >
              #{topic}
            </Badge>
          ))}
        </div>
      )}

      {/* 表情反应统计 */}
      {Object.values(post.reactions).some(count => count > 0) && (
        <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
          {REACTIONS.map(reaction => {
            const count = post.reactions[reaction]
            if (count === 0) return null
            return (
              <span key={reaction} className="flex items-center gap-1">
                {reaction} {count}
              </span>
            )
          })}
        </div>
      )}

      {/* 互动按钮 */}
      <div className="flex items-center gap-1 pt-3 border-t">
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            className={cn('gap-2', isLiked && 'text-red-500')}
            onClick={handleLike}
            onMouseEnter={() => setShowReactions(true)}
            onMouseLeave={() => setShowReactions(false)}
          >
            <Heart className={cn('h-4 w-4', isLiked && 'fill-current')} />
            <span>{likeCount}</span>
          </Button>

          {/* 表情反应面板 */}
          {showReactions && (
            <div
              className="absolute bottom-full left-0 mb-2 bg-popover border rounded-lg shadow-lg p-2 flex gap-1 z-10"
              onMouseEnter={() => setShowReactions(true)}
              onMouseLeave={() => setShowReactions(false)}
            >
              {REACTIONS.map(reaction => (
                <button
                  key={reaction}
                  className="text-2xl hover:scale-125 transition-transform"
                  onClick={() => handleReaction(reaction)}
                >
                  {reaction}
                </button>
              ))}
            </div>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="gap-2"
          onClick={onCommentClick}
        >
          <MessageCircle className="h-4 w-4" />
          <span>{post.commentCount}</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="gap-2"
          onClick={handleShare}
        >
          <Share2 className="h-4 w-4" />
          <span>{shareCount}</span>
        </Button>

        <div className="flex-1" />

        <Button
          variant="ghost"
          size="sm"
          className={cn('gap-2', isBookmarked && 'text-amber-500')}
          onClick={handleBookmark}
        >
          <Bookmark className={cn('h-4 w-4', isBookmarked && 'fill-current')} />
          <span>{bookmarkCount}</span>
        </Button>
      </div>
    </Card>
  )
}
