'use client'

import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { PostCard } from '@/components/community/post-card'
import { CommentList } from '@/components/community/comment-list'
import { getPostById } from '@/lib/community/post-storage'

const CURRENT_USER_ID = 'demo_user'
const CURRENT_USER_NAME = '演示用户'

export default function PostDetailPage() {
  const params = useParams()
  const router = useRouter()
  const postId = params.id as string

  const post = getPostById(postId)

  if (!post) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">动态不存在</h1>
          <Button onClick={() => router.push('/community')}>
            返回社区
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* 返回按钮 */}
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          返回
        </Button>

        {/* 动态内容 */}
        <PostCard
          post={post}
          currentUserId={CURRENT_USER_ID}
          onUserClick={(userId) => router.push(`/community/user/${userId}`)}
          onTopicClick={(topic) => router.push(`/community/topic/${topic}`)}
        />

        {/* 评论区 */}
        <div className="bg-card rounded-lg border p-6">
          <h2 className="text-xl font-semibold mb-6">
            评论 ({post.commentCount})
          </h2>
          <CommentList
            postId={postId}
            currentUserId={CURRENT_USER_ID}
            currentUserName={CURRENT_USER_NAME}
            currentUserAvatar="👤"
          />
        </div>
      </div>
    </div>
  )
}
