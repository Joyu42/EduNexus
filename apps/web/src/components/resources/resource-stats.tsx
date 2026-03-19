"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Eye, Bookmark, Star, Tag } from "lucide-react";
import type { Resource } from "@/lib/resources/resource-types";

interface ResourceStatsProps {
  resources: Resource[];
}

export function ResourceStats({ resources }: ResourceStatsProps) {
  const stats = useMemo(() => {
    const totalViews = resources.reduce((sum, r) => sum + r.viewCount, 0);
    const totalBookmarks = resources.reduce((sum, r) => sum + r.bookmarkCount, 0);
    const avgRating = resources.length > 0
      ? resources.reduce((sum, r) => sum + r.rating, 0) / resources.length
      : 0;

    // 统计资源类型分布
    const typeDistribution = resources.reduce((acc, r) => {
      acc[r.type] = (acc[r.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // 最热门的标签
    const tagCounts = new Map<string, number>();
    resources.forEach(r => {
      r.tags.forEach(tag => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    });
    const topTags = Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // 最受欢迎的资源
    const topResources = [...resources]
      .sort((a, b) => {
        const scoreA = a.bookmarkCount * 2 + a.viewCount * 0.1 + a.rating * 10;
        const scoreB = b.bookmarkCount * 2 + b.viewCount * 0.1 + b.rating * 10;
        return scoreB - scoreA;
      })
      .slice(0, 3);

    return {
      totalViews,
      totalBookmarks,
      avgRating,
      typeDistribution,
      topTags,
      topResources,
    };
  }, [resources]);

  const typeLabels: Record<string, string> = {
    document: "文档",
    video: "视频",
    tool: "工具",
    website: "网站",
    book: "书籍",
  };

  return (
    <div className="space-y-6">
      {/* 总体统计 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">总浏览量</p>
                <p className="text-2xl font-bold">{stats.totalViews.toLocaleString()}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Eye className="w-5 h-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">总收藏数</p>
                <p className="text-2xl font-bold">{stats.totalBookmarks.toLocaleString()}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                <Bookmark className="w-5 h-5 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">平均评分</p>
                <p className="text-2xl font-bold">{stats.avgRating.toFixed(1)}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <Star className="w-5 h-5 text-yellow-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 资源类型分布 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            资源类型分布
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(stats.typeDistribution).map(([type, count]) => {
              const percentage = (count / resources.length) * 100;
              return (
                <div key={type}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{typeLabels[type] || type}</span>
                    <span className="text-sm text-muted-foreground">
                      {count} ({percentage.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div
                      className="bg-primary rounded-full h-2 transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 热门标签 */}
      {stats.topTags.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Tag className="w-5 h-5" />
              热门标签
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {stats.topTags.map(([tag, count]) => (
                <div
                  key={tag}
                  className="px-3 py-1.5 bg-secondary rounded-full text-sm font-medium flex items-center gap-2"
                >
                  <span>{tag}</span>
                  <span className="text-xs text-muted-foreground">×{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 最受欢迎的资源 */}
      {stats.topResources.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Star className="w-5 h-5" />
              最受欢迎
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.topResources.map((resource, index) => (
                <div
                  key={resource.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">{resource.title}</h4>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {resource.viewCount}
                      </span>
                      <span className="flex items-center gap-1">
                        <Bookmark className="w-3 h-3" />
                        {resource.bookmarkCount}
                      </span>
                      {resource.rating > 0 && (
                        <span className="flex items-center gap-1">
                          <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                          {resource.rating.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
