"use client";

import { useState } from "react";
import {
  FileText,
  Video,
  Wrench,
  Globe,
  BookOpen,
  Star,
  Bookmark,
  Eye,
  ExternalLink,
  MoreVertical,
  Trash2,
  Edit,
  BookmarkCheck,
  Maximize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ResourcePreview } from "./resource-preview";
import type { Resource } from "@/lib/resources/resource-types";
import {
  getBookmarkByResourceId,
  createBookmark,
  deleteBookmark,
  incrementViewCount,
  deleteResource,
} from "@/lib/resources/resource-storage";

interface ResourceCardProps {
  resource: Resource;
  onDelete?: () => void;
  onEdit?: () => void;
  onBookmark?: () => void;
}

const typeIcons = {
  document: FileText,
  video: Video,
  tool: Wrench,
  website: Globe,
  book: BookOpen,
};

const typeColors = {
  document: "bg-blue-500/10 text-blue-500",
  video: "bg-red-500/10 text-red-500",
  tool: "bg-green-500/10 text-green-500",
  website: "bg-purple-500/10 text-purple-500",
  book: "bg-orange-500/10 text-orange-500",
};

export function ResourceCard({ resource, onDelete, onEdit, onBookmark }: ResourceCardProps) {
  const [isBookmarked, setIsBookmarked] = useState(() => {
    return getBookmarkByResourceId(resource.id, "demo_user") !== null;
  });
  const [showPreview, setShowPreview] = useState(false);

  const Icon = typeIcons[resource.type];

  const handleBookmark = () => {
    if (isBookmarked) {
      const bookmark = getBookmarkByResourceId(resource.id, "demo_user");
      if (bookmark) {
        deleteBookmark(bookmark.id);
        setIsBookmarked(false);
      }
    } else {
      createBookmark({
        userId: "demo_user",
        resourceId: resource.id,
      });
      setIsBookmarked(true);
    }
    onBookmark?.();
  };

  const handleView = () => {
    incrementViewCount(resource.id);
    if (resource.url) {
      window.open(resource.url, "_blank");
    }
  };

  const handleDelete = () => {
    if (confirm(`确定要删除资源"${resource.title}"吗？`)) {
      deleteResource(resource.id);
      onDelete?.();
    }
  };

  const handlePreview = () => {
    incrementViewCount(resource.id);
    setShowPreview(true);
  };

  return (
    <>
      <div className="group relative bg-card border border-border rounded-xl p-5 hover:shadow-lg hover:border-primary/30 transition-all duration-300">
        {/* 类型图标 */}
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg mb-4 ${typeColors[resource.type]}`}>
          <Icon className="w-4 h-4" />
          <span className="text-xs font-medium">
            {resource.type === "document" && "文档"}
            {resource.type === "video" && "视频"}
            {resource.type === "tool" && "工具"}
            {resource.type === "website" && "网站"}
            {resource.type === "book" && "书籍"}
          </span>
        </div>

        {/* 标题和描述 */}
        <h3 className="text-lg font-semibold mb-2 line-clamp-2 group-hover:text-primary transition-colors">
          {resource.title}
        </h3>
        <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
          {resource.description}
        </p>

        {/* 标签 */}
        {resource.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {resource.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {resource.tags.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{resource.tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* 统计信息 */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
          <div className="flex items-center gap-1">
            <Eye className="w-3.5 h-3.5" />
            <span>{resource.viewCount}</span>
          </div>
          <div className="flex items-center gap-1">
            <Bookmark className="w-3.5 h-3.5" />
            <span>{resource.bookmarkCount}</span>
          </div>
          {resource.ratingCount > 0 && (
            <div className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />
              <span>{resource.rating.toFixed(1)}</span>
              <span className="text-muted-foreground/60">({resource.ratingCount})</span>
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handlePreview}
            className="flex-1"
          >
            <Maximize2 className="w-4 h-4 mr-2" />
            预览
          </Button>

          {resource.url && (
            <Button
              size="sm"
              onClick={handleView}
              className="flex-1"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              打开
            </Button>
          )}

          <Button
            size="sm"
            variant={isBookmarked ? "default" : "outline"}
            onClick={handleBookmark}
          >
            {isBookmarked ? (
              <BookmarkCheck className="w-4 h-4" />
            ) : (
              <Bookmark className="w-4 h-4" />
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="w-4 h-4 mr-2" />
                编辑
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                删除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* 作者和来源 */}
        {(resource.author || resource.source) && (
          <div className="mt-4 pt-4 border-t border-border text-xs text-muted-foreground">
            {resource.author && <div>作者：{resource.author}</div>}
            {resource.source && <div>来源：{resource.source}</div>}
          </div>
        )}
      </div>

      {/* 预览对话框 */}
      <ResourcePreview
        resource={resource}
        open={showPreview}
        onOpenChange={setShowPreview}
      />
    </>
  );
}
