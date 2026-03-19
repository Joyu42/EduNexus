"use client";

import { useState, useEffect } from "react";
import { Plus, Sparkles, TrendingUp, Bookmark, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResourceUpload } from "@/components/resources/resource-upload";
import { ResourceList } from "@/components/resources/resource-list";
import { ResourceFilters } from "@/components/resources/resource-filters";
import { BookmarkManager } from "@/components/resources/bookmark-manager";
import { ResourceStats } from "@/components/resources/resource-stats";
import {
  getAllResources,
  searchResources,
  getAllBookmarks,
} from "@/lib/resources/resource-storage";
import {
  recommendPopular,
  recommendPersonalized,
  recommendByUserHistory,
} from "@/lib/resources/resource-recommender";
import { generateSampleResources } from "@/lib/resources/sample-data";
import type { Resource, ResourceType } from "@/lib/resources/resource-types";

export default function ResourcesPage() {
  const [showUpload, setShowUpload] = useState(false);
  const [resources, setResources] = useState<Resource[]>([]);
  const [filteredResources, setFilteredResources] = useState<Resource[]>([]);
  const [popularResources, setPopularResources] = useState<Resource[]>([]);
  const [recommendedResources, setRecommendedResources] = useState<Resource[]>([]);
  const [bookmarkedResources, setBookmarkedResources] = useState<Resource[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  const userId = "demo_user";

  const loadResources = () => {
    const allResources = getAllResources();
    setResources(allResources);
    setFilteredResources(allResources);

    // 提取所有标签
    const tags = new Set<string>();
    allResources.forEach((r) => r.tags.forEach((t) => tags.add(t)));
    setAvailableTags(Array.from(tags).sort());

    // 加载热门资源
    const popular = recommendPopular(6);
    setPopularResources(popular.map((r) => r.resource));

    // 加载个性化推荐
    const personalized = recommendPersonalized(userId, undefined, 6);
    setRecommendedResources(personalized.map((r) => r.resource));

    // 加载收藏的资源
    loadBookmarkedResources();
  };

  const loadBookmarkedResources = () => {
    const bookmarks = getAllBookmarks(userId);
    const allResources = getAllResources();

    let filtered = bookmarks
      .map((b) => allResources.find((r) => r.id === b.resourceId))
      .filter((r): r is Resource => r !== undefined);

    // 如果选择了收藏夹，进行筛选
    if (selectedFolder) {
      filtered = filtered.filter((r) => {
        const bookmark = bookmarks.find((b) => b.resourceId === r.id);
        return bookmark?.folderId === selectedFolder;
      });
    }

    setBookmarkedResources(filtered);
  };

  useEffect(() => {
    // 生成示例数据（仅首次）
    generateSampleResources();
    loadResources();
  }, []);

  useEffect(() => {
    loadBookmarkedResources();
  }, [selectedFolder]);

  const handleSearch = (filters: {
    keyword?: string;
    type?: ResourceType;
    tags?: string[];
    sortBy?: "createdAt" | "viewCount" | "bookmarkCount" | "rating";
    sortOrder?: "asc" | "desc";
  }) => {
    const results = searchResources(filters);
    setFilteredResources(results);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50/30 via-amber-50/20 to-rose-50/30">
      <div className="page-container">
        {/* 页面标题 */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-rose-500">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              资源中心
            </h1>
            <p className="text-muted-foreground">
              管理和分享你的学习资源，构建个人知识库，智能推荐优质内容
            </p>
          </div>
          <Button
            onClick={() => setShowUpload(true)}
            size="lg"
            className="bg-gradient-to-br from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600"
          >
            <Plus className="w-5 h-5 mr-2" />
            添加资源
          </Button>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="card-hover border-l-4 border-l-orange-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">全部资源</p>
                  <p className="text-3xl font-bold">{resources.length}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-orange-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-hover border-l-4 border-l-blue-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">我的收藏</p>
                  <p className="text-3xl font-bold">
                    {getAllBookmarks(userId).length}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <Bookmark className="w-6 h-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-hover border-l-4 border-l-green-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">资源标签</p>
                  <p className="text-3xl font-bold">{availableTags.length}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 主内容区 */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* 左侧：收藏夹管理 */}
          <div className="lg:col-span-1">
            <div className="panel sticky top-6">
              <BookmarkManager
                userId={userId}
                onFolderSelect={setSelectedFolder}
              />
            </div>
          </div>

          {/* 右侧：资源列表 */}
          <div className="lg:col-span-3 space-y-8">
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-4 max-w-3xl">
                <TabsTrigger value="all">全部资源</TabsTrigger>
                <TabsTrigger value="bookmarked">我的收藏</TabsTrigger>
                <TabsTrigger value="recommended">推荐</TabsTrigger>
                <TabsTrigger value="stats">统计分析</TabsTrigger>
              </TabsList>

              {/* 全部资源 */}
              <TabsContent value="all" className="space-y-6">
                <div className="panel">
                  <ResourceFilters
                    onSearch={handleSearch}
                    availableTags={availableTags}
                  />
                </div>
                <ResourceList resources={filteredResources} onRefresh={loadResources} />
              </TabsContent>

              {/* 我的收藏 */}
              <TabsContent value="bookmarked" className="space-y-6">
                <div className="panel">
                  <h3 className="text-lg font-semibold mb-2">
                    {selectedFolder ? "收藏夹资源" : "全部收藏"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {bookmarkedResources.length} 个资源
                  </p>
                </div>
                <ResourceList
                  resources={bookmarkedResources}
                  onRefresh={loadResources}
                />
              </TabsContent>

              {/* 推荐资源 */}
              <TabsContent value="recommended" className="space-y-8">
                {/* AI 个性化推荐 */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-semibold">为你推荐</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    基于你的收藏和学习偏好，智能推荐相关资源
                  </p>
                  <ResourceList
                    resources={recommendedResources}
                    onRefresh={loadResources}
                  />
                </div>

                {/* 热门资源 */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-orange-500" />
                    <h3 className="text-lg font-semibold">社区热门</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    最受欢迎的学习资源，由社区用户共同推荐
                  </p>
                  <ResourceList
                    resources={popularResources}
                    onRefresh={loadResources}
                  />
                </div>
              </TabsContent>

              {/* 统计分析 */}
              <TabsContent value="stats" className="space-y-6">
                <div className="panel">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-semibold">资源统计分析</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    深入了解你的资源库使用情况和热门趋势
                  </p>
                </div>
                <ResourceStats resources={resources} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* 上传对话框 */}
      <ResourceUpload
        open={showUpload}
        onOpenChange={setShowUpload}
        onSuccess={loadResources}
      />
    </div>
  );
}
