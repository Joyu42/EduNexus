"use client";

import { ResourceCard } from "./resource-card";
import type { Resource } from "@/lib/resources/resource-types";
import { FileQuestion, Loader2 } from "lucide-react";
import { useResourceSync } from "@/lib/sync";

interface ResourceListProps {
  resources: Resource[];
  onRefresh?: () => void;
  loading?: boolean;
}

export function ResourceList({ resources, onRefresh, loading = false }: ResourceListProps) {
  // 监听资源变化，自动刷新列表
  useResourceSync(() => {
    if (onRefresh) {
      onRefresh();
    }
  });
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Loader2 className="w-16 h-16 text-primary animate-spin mb-4" />
        <h3 className="text-lg font-semibold mb-2">加载中...</h3>
        <p className="text-sm text-muted-foreground">
          正在获取资源列表
        </p>
      </div>
    );
  }

  if (resources.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <FileQuestion className="w-16 h-16 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-semibold mb-2">暂无资源</h3>
        <p className="text-sm text-muted-foreground">
          添加你的第一个学习资源，开始构建知识库
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {resources.map((resource) => (
        <ResourceCard
          key={resource.id}
          resource={resource}
          onDelete={onRefresh}
          onEdit={onRefresh}
          onBookmark={onRefresh}
        />
      ))}
    </div>
  );
}
