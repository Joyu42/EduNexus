'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, Hash, TrendingUp } from 'lucide-react'
import { PostCard } from '@/components/community/post-card'
import { getFeed } from '@/lib/community/feed-algorithm'
import { getTopicByName, getHotTopics } from '@/lib/community/post-storage'
import type { Post } from '@/lib/community/types'

const CURRENT_USER_ID = 'demo_user'

export default function TopicPage() {
  const params = useParams()
  const router = useRouter()
  const topicName = decodeURIComponent(params.name as string)

  const [posts, setPosts] = useState<Post[]>([])
  const topic = getTopicByName(topicName)
  const relatedTopics = getHotTopics(6).filter(t => t.name !== topicName)

  useEffect(() => {
    const topicPosts = getFeed(CURRENT_USER_ID, {
      type: 'topic',
      topicName,
      sortBy: 'latest',
    }, 0, 50)
    setPosts(topicPosts)
  }, [topicName])

  if (!topic) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">话题不存在</h1>
          <Button onClick={() => router.push('/community')}>
            返回社区
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 主内容区 */}
        <div className="lg:col-span-8 space-y-6">
          {/* 返回按钮 */}
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            返回
          </Button>

          {/* 话题信息 */}
          <Card className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-xl">
                    #
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold">#{topic.displayName}</h1>
                    <p className="text-muted-foreground">
                      {topic.postCount} 条动态 · {topic.followerCount} 关注
                    </p>
                  </div>
                </div>
                {topic.description && (
                  <p className="text-muted-foreground mt-4">{topic.description}</p>
                )}
              </div>
              <Button>
                <Hash className="h-4 w-4 mr-2" />
                关注话题
              </Button>
            </div>
          </Card>

          {/* 动态列表 */}
          <div className="space-y-4">
            {posts.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">该话题下暂无动态</p>
              </Card>
            ) : (
              posts.map(post => (
                <PostCard
                  key={post.id}
                  post={post}
                  currentUserId={CURRENT_USER_ID}
                  onCommentClick={() => router.push(`/community/post/${post.id}`)}
                  onUserClick={(userId) => router.push(`/community/user/${userId}`)}
                  onTopicClick={(topic) => router.push(`/community/topic/${topic}`)}
                />
              ))
            )}
          </div>
        </div>

        {/* 侧边栏 */}
        <div className="lg:col-span-4 space-y-6">
          {/* 相关话题 */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5" />
              <h3 className="font-semibold">相关话题</h3>
            </div>
            <div className="space-y-3">
              {relatedTopics.map(relatedTopic => (
                <div
                  key={relatedTopic.name}
                  className="flex items-center justify-between cursor-pointer hover:bg-accent p-2 rounded-lg transition-colors"
                  onClick={() => router.push(`/community/topic/${relatedTopic.name}`)}
                >
                  <div>
                    <div className="font-medium">#{relatedTopic.displayName}</div>
                    <div className="text-sm text-muted-foreground">
                      {relatedTopic.postCount} 条动态
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Separator className="my-4" />
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => router.push('/community/topics')}
            >
              查看更多话题
            </Button>
          </Card>

          {/* 话题统计 */}
          <Card className="p-4">
            <h3 className="font-semibold mb-4">话题统计</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">动态数量</span>
                <span className="font-semibold">{topic.postCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">关注人数</span>
                <span className="font-semibold">{topic.followerCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">创建时间</span>
                <span className="font-semibold">
                  {new Date(topic.createdAt).toLocaleDateString('zh-CN')}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
