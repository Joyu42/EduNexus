'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { TrendingUp, Users, Hash, Search } from 'lucide-react'
import { PostCard } from '@/components/community/post-card'
import { PostEditor } from '@/components/community/post-editor'
import { UserFollowButton } from '@/components/community/user-follow-button'
import { getFeed, getRecommendedFeed, getHotPosts } from '@/lib/community/feed-algorithm'
import { getHotTopics } from '@/lib/community/post-storage'
import { getRecommendedUsers } from '@/lib/community/follow-system'
import type { Post, FeedFilter } from '@/lib/community/types'
import { useRouter } from 'next/navigation'

const CURRENT_USER_ID = 'demo_user'
const CURRENT_USER_NAME = '演示用户'

export default function CommunityPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'recommended' | 'following' | 'hot'>('recommended')
  const [posts, setPosts] = useState<Post[]>([])
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  const loadPosts = useCallback((pageNum: number, reset: boolean = false) => {
    setIsLoading(true)

    let newPosts: Post[] = []
    const filter: FeedFilter = {
      type: activeTab === 'following' ? 'following' : activeTab === 'hot' ? 'hot' : 'recommended',
      sortBy: activeTab === 'hot' ? 'hot' : 'latest',
    }

    if (activeTab === 'recommended') {
      newPosts = getRecommendedFeed(CURRENT_USER_ID, pageNum, 10)
    } else {
      newPosts = getFeed(CURRENT_USER_ID, filter, pageNum, 10)
    }

    if (reset) {
      setPosts(newPosts)
    } else {
      setPosts(prev => [...prev, ...newPosts])
    }

    setHasMore(newPosts.length === 10)
    setIsLoading(false)
  }, [activeTab])

  useEffect(() => {
    setPage(0)
    loadPosts(0, true)
  }, [activeTab, loadPosts])

  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect()
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          const nextPage = page + 1
          setPage(nextPage)
          loadPosts(nextPage)
        }
      },
      { threshold: 0.1 }
    )

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current)
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [page, hasMore, isLoading, loadPosts])

  const handlePostCreated = () => {
    setPage(0)
    loadPosts(0, true)
  }

  const handleUserClick = (userId: string) => {
    router.push(`/community/user/${userId}`)
  }

  const handleTopicClick = (topic: string) => {
    router.push(`/community/topic/${topic}`)
  }

  const handlePostClick = (postId: string) => {
    router.push(`/community/post/${postId}`)
  }

  const hotTopics = getHotTopics(8)
  const recommendedUsers = getRecommendedUsers(CURRENT_USER_ID, 5)

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 主内容区 */}
        <div className="lg:col-span-8 space-y-6">
          {/* 页面标题 */}
          <div>
            <h1 className="text-3xl font-bold mb-2">学习社区</h1>
            <p className="text-muted-foreground">
              分享学习动态，交流学习心得，共同成长
            </p>
          </div>

          {/* 发布动态 */}
          <PostEditor
            currentUserId={CURRENT_USER_ID}
            currentUserName={CURRENT_USER_NAME}
            currentUserAvatar="👤"
            onPostCreated={handlePostCreated}
          />

          {/* 动态流标签 */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="w-full">
              <TabsTrigger value="recommended" className="flex-1">
                <TrendingUp className="h-4 w-4 mr-2" />
                推荐
              </TabsTrigger>
              <TabsTrigger value="following" className="flex-1">
                <Users className="h-4 w-4 mr-2" />
                关注
              </TabsTrigger>
              <TabsTrigger value="hot" className="flex-1">
                🔥 热门
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="space-y-4 mt-6">
              {posts.length === 0 && !isLoading ? (
                <Card className="p-12 text-center">
                  <p className="text-muted-foreground">暂无动态</p>
                  {activeTab === 'following' && (
                    <p className="text-sm text-muted-foreground mt-2">
                      关注更多用户，查看他们的学习动态
                    </p>
                  )}
                </Card>
              ) : (
                <>
                  {posts.map(post => (
                    <PostCard
                      key={post.id}
                      post={post}
                      currentUserId={CURRENT_USER_ID}
                      onCommentClick={() => handlePostClick(post.id)}
                      onUserClick={handleUserClick}
                      onTopicClick={handleTopicClick}
                    />
                  ))}

                  {/* 无限滚动加载触发器 */}
                  <div ref={loadMoreRef} className="py-4 text-center">
                    {isLoading && <p className="text-muted-foreground">加载中...</p>}
                    {!hasMore && posts.length > 0 && (
                      <p className="text-muted-foreground">没有更多动态了</p>
                    )}
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* 侧边栏 */}
        <div className="lg:col-span-4 space-y-6">
          {/* 搜索 */}
          <Card className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索动态、话题、用户..."
                className="pl-10"
              />
            </div>
          </Card>

          {/* 热门话题 */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Hash className="h-5 w-5" />
              <h3 className="font-semibold">热门话题</h3>
            </div>
            <div className="space-y-3">
              {hotTopics.map((topic, index) => (
                <div
                  key={topic.name}
                  className="flex items-center justify-between cursor-pointer hover:bg-accent p-2 rounded-lg transition-colors"
                  onClick={() => handleTopicClick(topic.name)}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-muted-foreground w-6">
                      {index + 1}
                    </span>
                    <div>
                      <div className="font-medium">#{topic.displayName}</div>
                      <div className="text-sm text-muted-foreground">
                        {topic.postCount} 条动态
                      </div>
                    </div>
                  </div>
                  {index < 3 && (
                    <Badge variant="destructive" className="text-xs">
                      HOT
                    </Badge>
                  )}
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

          {/* 推荐用户 */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-5 w-5" />
              <h3 className="font-semibold">推荐关注</h3>
            </div>
            <div className="space-y-4">
              {recommendedUsers.map(user => (
                <div key={user.userId} className="flex items-center justify-between">
                  <div
                    className="flex items-center gap-3 cursor-pointer flex-1"
                    onClick={() => handleUserClick(user.userId)}
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold">
                      {user.userName[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{user.userName}</div>
                      <div className="text-sm text-muted-foreground">
                        {user.followerCount} 关注者
                      </div>
                    </div>
                  </div>
                  <UserFollowButton
                    currentUserId={CURRENT_USER_ID}
                    targetUserId={user.userId}
                    isFollowing={user.isFollowing}
                    size="sm"
                  />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
