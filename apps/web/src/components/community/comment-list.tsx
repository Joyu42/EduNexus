'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Heart, MessageCircle, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Comment } from '@/lib/community/types'
import { createComment, getCommentsByPostId } from '@/lib/community/post-storage'
import { cn } from '@/lib/utils'

interface CommentListProps {
  postId: string
  currentUserId: string
  currentUserName: string
  currentUserAvatar?: string
}

export function CommentList({ postId, currentUserId, currentUserName, currentUserAvatar }: CommentListProps) {
  const [comments, setComments] = useState<Comment[]>(getCommentsByPostId(postId))
  const [newComment, setNewComment] = useState('')
  const [replyTo, setReplyTo] = useState<{ commentId: string; userName: string } | null>(null)

  const handleSubmitComment = () => {
    if (!newComment.trim()) return

    const comment = createComment({
      postId,
      userId: currentUserId,
      userName: currentUserName,
      userAvatar: currentUserAvatar,
      content: newComment.trim(),
      parentId: replyTo?.commentId,
      replyToUserId: replyTo ? currentUserId : undefined,
      replyToUserName: replyTo?.userName,
    })

    setComments(getCommentsByPostId(postId))
    setNewComment('')
    setReplyTo(null)
  }

  const handleReply = (commentId: string, userName: string) => {
    setReplyTo({ commentId, userName })
  }

  return (
    <div className="space-y-4">
      {/* 评论输入框 */}
      <div className="flex gap-3">
        <Avatar className="mt-1">
          <AvatarFallback>{currentUserAvatar || currentUserName[0]}</AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-2">
          {replyTo && (
            <div className="text-sm text-muted-foreground">
              回复 @{replyTo.userName}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReplyTo(null)}
                className="ml-2 h-auto p-0 text-xs"
              >
                取消
              </Button>
            </div>
          )}
          <Textarea
            placeholder={replyTo ? '写下你的回复...' : '写下你的评论...'}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="min-h-[80px] resize-none"
          />
          <div className="flex justify-end">
            <Button
              onClick={handleSubmitComment}
              disabled={!newComment.trim()}
              size="sm"
            >
              发布评论
            </Button>
          </div>
        </div>
      </div>

      {/* 评论列表 */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            暂无评论，快来发表第一条评论吧
          </div>
        ) : (
          comments.map(comment => (
            <CommentItem
              key={comment.id}
              comment={comment}
              currentUserId={currentUserId}
              onReply={handleReply}
            />
          ))
        )}
      </div>
    </div>
  )
}

interface CommentItemProps {
  comment: Comment
  currentUserId: string
  onReply: (commentId: string, userName: string) => void
  isReply?: boolean
}

function CommentItem({ comment, currentUserId, onReply, isReply = false }: CommentItemProps) {
  const [isLiked, setIsLiked] = useState(comment.isLiked || false)
  const [likeCount, setLikeCount] = useState(comment.likeCount)

  const handleLike = () => {
    setIsLiked(!isLiked)
    setLikeCount(prev => isLiked ? prev - 1 : prev + 1)
  }

  return (
    <div className={cn('flex gap-3', isReply && 'ml-12')}>
      <Avatar className="mt-1">
        <AvatarFallback>{comment.userAvatar || comment.userName[0]}</AvatarFallback>
      </Avatar>

      <div className="flex-1 space-y-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{comment.userName}</span>
            <span className="text-sm text-muted-foreground">
              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: zhCN })}
            </span>
          </div>

          <div className="mt-1">
            {comment.replyToUserName && (
              <span className="text-primary">@{comment.replyToUserName} </span>
            )}
            {comment.content}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className={cn('h-auto p-1 gap-1', isLiked && 'text-red-500')}
            onClick={handleLike}
          >
            <Heart className={cn('h-3 w-3', isLiked && 'fill-current')} />
            {likeCount > 0 && <span className="text-xs">{likeCount}</span>}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-auto p-1 gap-1"
            onClick={() => onReply(comment.id, comment.userName)}
          >
            <MessageCircle className="h-3 w-3" />
            <span className="text-xs">回复</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-auto p-1">
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>举报</DropdownMenuItem>
              {comment.userId === currentUserId && (
                <DropdownMenuItem className="text-destructive">删除</DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* 嵌套回复 */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="space-y-4 mt-4">
            {comment.replies.map(reply => (
              <CommentItem
                key={reply.id}
                comment={reply}
                currentUserId={currentUserId}
                onReply={onReply}
                isReply
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
