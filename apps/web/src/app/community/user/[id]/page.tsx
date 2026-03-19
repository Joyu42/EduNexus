'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ArrowLeft, MapPin, Calendar, Link as LinkIcon } from 'lucide-react'
import { PostCard } from '@/components/community/post-card'
import { UserFollowButton } from '@/components/community/user-follow-button'
import { getFeed } from '@/lib/community/feed-algorithm'
import { getUserProfile, getFollowersList, getFollowingList } from '@/lib/community/follow-system'
import type { Post, UserProfile } from '@/lib/community/types'

const CURRENT_USER_ID = 'demo_user'

export default function UserProfilePage() {
  const params = useParams()
  const router = useRouter()
  const userId = params.id as string

  const [activeTab, setActiveTab] = useState<'posts' | 'followers' | 'following'>('posts')
  const [posts, setPosts] = useState<Post[]>([])
  const [followers, setFollowers] = useState<UserProfile[]>([])
  const [following, setFollowing] = useState<UserProfile[]>([])

  const userProfile = getUserProfile(userId, CURRENT_USER_ID)

  useEffect(() => {
    if (activeTab === 'posts') {
      const userPosts = getFeed(CURRENT_USER_ID, { userId }, 0, 50)
      setPosts(userPosts)
    } else if (activeTab === 'followers') {
      setFollowers(getFollowersList(userId, CURRENT_USER_ID))
    } else if (activeTab === 'following') {
      setFollowing(getFollowingList(userId, CURRENT_USER_ID))
    }
  }, [activeTab, userId])

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 返回按钮 */}
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          返回
        </Button>

        {/* 用户信息卡片 */}
        <Card className="p-6">
          <div className="flex items-start gap-6">
            <Avatar className="w-24 h-24">
              <AvatarFallback className="text-3xl">
                {userProfile.avatar || userProfile.userName[0]}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-bold mb-1">{userProfile.userName}</h1>
                  {userProfile.bio && (
                    <p className="text-muted-foreground">{userProfile.bio}</p>
                  )}
                </div>
                {userId !== CURRENT_USER_ID && (
                  <UserFollowButton
                    currentUserId={CURRENT_USER_ID}
                    targetUserId={userId}
                    isFollowing={userProfile.isFollowing}
                    isMutualFollow={userProfile.isMutualFollow}
                  />
                )}
              </div>

              <div className="flex items-center gap-6 text-sm">
                <div>
                  <span className="font-semibold">{userProfile.postCount}</span>
                  <span className="text-muted-foreground ml-1">动态</span>
                </div>
                <div className="cursor-pointer hover:underline" onClick={() => setActiveTab('followers')}>
                  <span className="font-semibold">{userProfile.followerCount}</span>
                  <span className="text-muted-foreground ml-1">关注者</span>
                </div>
                <div className="cursor-pointer hover:underline" onClick={() => setActiveTab('following')}>
                  <span className="font-semibold">{userProfile.followingCount}</span>
                  <span className="text-muted-foreground ml-1">关注中</span>
                </div>
              </div>

              <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>加入于 2024年1月</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* 标签页 */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="w-full">
            <TabsTrigger value="posts" className="flex-1">
              动态
            </TabsTrigger>
            <TabsTrigger value="followers" className="flex-1">
              关注者
            </TabsTrigger>
            <TabsTrigger value="following" className="flex-1">
              关注中
            </TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="space-y-4 mt-6">
            {posts.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">暂无动态</p>
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
          </TabsContent>

          <TabsContent value="followers" className="space-y-4 mt-6">
            {followers.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">暂无关注者</p>
              </Card>
            ) : (
              <Card className="p-4">
                <div className="space-y-4">
                  {followers.map(user => (
                    <div key={user.userId} className="flex items-center justify-between">
                      <div
                        className="flex items-center gap-3 cursor-pointer flex-1"
                        onClick={() => router.push(`/community/user/${user.userId}`)}
                      >
                        <Avatar>
                          <AvatarFallback>{user.avatar || user.userName[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{user.userName}</div>
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
            )}
          </TabsContent>

          <TabsContent value="following" className="space-y-4 mt-6">
            {following.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">暂无关注</p>
              </Card>
            ) : (
              <Card className="p-4">
                <div className="space-y-4">
                  {following.map(user => (
                    <div key={user.userId} className="flex items-center justify-between">
                      <div
                        className="flex items-center gap-3 cursor-pointer flex-1"
                        onClick={() => router.push(`/community/user/${user.userId}`)}
                      >
                        <Avatar>
                          <AvatarFallback>{user.avatar || user.userName[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{user.userName}</div>
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
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
