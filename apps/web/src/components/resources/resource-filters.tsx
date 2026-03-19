"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { ResourceType } from "@/lib/resources/resource-types";

interface ResourceFiltersProps {
  onSearch: (filters: {
    keyword?: string;
    type?: ResourceType;
    tags?: string[];
    sortBy?: "createdAt" | "viewCount" | "bookmarkCount" | "rating";
    sortOrder?: "asc" | "desc";
  }) => void;
  availableTags?: string[];
}

export function ResourceFilters({ onSearch, availableTags = [] }: ResourceFiltersProps) {
  const [keyword, setKeyword] = useState("");
  const [type, setType] = useState<ResourceType | "all">("all");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<"createdAt" | "viewCount" | "bookmarkCount" | "rating">("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Debounced search
  const debouncedSearch = useCallback(() => {
    const timer = setTimeout(() => {
      onSearch({
        keyword: keyword || undefined,
        type: type === "all" ? undefined : type,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        sortBy,
        sortOrder,
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [keyword, type, selectedTags, sortBy, sortOrder, onSearch]);

  useEffect(() => {
    const cleanup = debouncedSearch();
    return cleanup;
  }, [keyword, type, selectedTags, sortBy, sortOrder]);

  const handleSearch = () => {
    onSearch({
      keyword: keyword || undefined,
      type: type === "all" ? undefined : type,
      tags: selectedTags.length > 0 ? selectedTags : undefined,
      sortBy,
      sortOrder,
    });
  };

  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleClearFilters = () => {
    setKeyword("");
    setType("all");
    setSelectedTags([]);
    setSortBy("createdAt");
    setSortOrder("desc");
    onSearch({});
  };

  const hasActiveFilters = keyword || type !== "all" || selectedTags.length > 0;

  return (
    <div className="space-y-4">
      {/* 搜索栏 */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜索资源标题、描述或标签..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="pl-10"
          />
        </div>
        <Button onClick={handleSearch}>搜索</Button>
        {hasActiveFilters && (
          <Button variant="outline" onClick={handleClearFilters}>
            <X className="w-4 h-4 mr-2" />
            清除
          </Button>
        )}
      </div>

      {/* 筛选器 */}
      <div className="flex flex-wrap items-center gap-3">
        {/* 类型筛选 */}
        <Select value={type} onValueChange={(v) => setType(v as ResourceType | "all")}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="资源类型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部类型</SelectItem>
            <SelectItem value="document">文档</SelectItem>
            <SelectItem value="video">视频</SelectItem>
            <SelectItem value="tool">工具</SelectItem>
            <SelectItem value="website">网站</SelectItem>
            <SelectItem value="book">书籍</SelectItem>
          </SelectContent>
        </Select>

        {/* 排序 */}
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="排序方式" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="createdAt">最新添加</SelectItem>
            <SelectItem value="viewCount">浏览最多</SelectItem>
            <SelectItem value="bookmarkCount">收藏最多</SelectItem>
            <SelectItem value="rating">评分最高</SelectItem>
          </SelectContent>
        </Select>

        {/* 排序顺序 */}
        <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as "asc" | "desc")}>
          <SelectTrigger className="w-[100px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="desc">降序</SelectItem>
            <SelectItem value="asc">升序</SelectItem>
          </SelectContent>
        </Select>

        {/* 标签筛选 */}
        {availableTags.length > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <SlidersHorizontal className="w-4 h-4 mr-2" />
                标签筛选
                {selectedTags.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {selectedTags.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="start">
              <div className="space-y-3">
                <h4 className="font-medium text-sm">选择标签</h4>
                <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto">
                  {availableTags.map((tag) => (
                    <Badge
                      key={tag}
                      variant={selectedTags.includes(tag) ? "default" : "outline"}
                      className="cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => handleTagToggle(tag)}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>

      {/* 已选标签 */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedTags.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1">
              {tag}
              <X
                className="w-3 h-3 cursor-pointer hover:text-destructive"
                onClick={() => handleTagToggle(tag)}
              />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
