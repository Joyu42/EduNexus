'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Search, TrendingUp, Hash } from 'lucide-react'
import { getTopics, getHotTopics } from '@/lib/community/post-storage'
import type { Topic } from '@/lib/community/types'

export default function TopicsPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'hot' | 'all'>('hot')

  const allTopics = getTopics()
  const hotTopics = getHotTopics(20)

  const filteredTopics = (activeTab === 'hot' ? hotTopics : allTopics).filter(topic =>
    topic.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    topic.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

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

        {/* 页面标题 */}
        <div>
          <h1 className="text-3xl font-bold mb-2">话题广场</h1>
          <p className="text-muted-foreground">
            探索热门话题，发现感兴趣的学习内容
          </p>
        </div>

        {/* 搜索框 */}
        <Card className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索话题..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </Card>

        {/* 标签页 */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="w-full">
            <TabsTrigger value="hot" className="flex-1">
              <TrendingUp className="h-4 w-4 mr-2" />
              热门话题
            </TabsTrigger>
            <TabsTrigger value="all" className="flex-1">
              <Hash className="h-4 w-4 mr-2" />
              全部话题
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-4 mt-6">
            {filteredTopics.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">
                  {searchQuery ? '未找到相关话题' : '暂无话题'}
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredTopics.map((topic, index) => (
                  <Card
                    key={topic.name}
                    className="p-6 cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => router.push(`/community/topic/${topic.name}`)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-xl font-bold">
                          #
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">#{topic.displayName}</h3>
                          {activeTab === 'hot' && index < 3 && (
                            <Badge variant="destructive" className="text-xs mt-1">
                              TOP {index + 1}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {topic.description && (
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {topic.description}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div>
                        <span className="font-semibold text-foreground">{topic.postCount}</span>
                        <span className="ml-1">条动态</span>
                      </div>
                      <div>
                        <span className="font-semibold text-foreground">{topic.followerCount}</span>
                        <span className="ml-1">关注</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
