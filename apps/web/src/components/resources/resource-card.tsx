"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { ServerResourceRecord, ResourceType } from "@/lib/resources/resource-storage";

type FolderOption = {
  id: string;
  name: string;
};

const RESOURCE_TYPE_LABELS: Record<string, string> = {
  document: "文档",
  video: "视频",
  tool: "工具",
  website: "网站",
  book: "书籍",
};

type ResourceCardProps = {
  resource: ServerResourceRecord;
  folders: FolderOption[];
  assignedFolderId: string | null;
  onEdit: (resource: ServerResourceRecord) => void;
  onDelete: (resource: ServerResourceRecord) => void;
  onAssignFolder: (resourceId: string, folderId: string | null) => void;
};

export function ResourceCard({
  resource,
  folders,
  assignedFolderId,
  onEdit,
  onDelete,
  onAssignFolder,
}: ResourceCardProps) {
  return (
    <Card className="p-5 flex flex-col gap-4 transition-shadow hover:shadow-md border-border/50">
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <Link href={`/resources/${resource.id}`} className="text-lg font-semibold leading-tight hover:text-emerald-600">
            {resource.title}
          </Link>
          {resource.url ? (
            <Link href={resource.url} target="_blank" rel="noreferrer noopener" className="text-muted-foreground">
              <ExternalLink className="h-4 w-4" />
            </Link>
          ) : null}
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {resource.description || <span className="italic opacity-70">该资源暂未提供描述。</span>}
        </p>

        {(resource.type || (resource.tags && resource.tags.length > 0)) && (
          <div className="flex flex-wrap gap-2 pt-1">
            {resource.type && (
              <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200">
                {RESOURCE_TYPE_LABELS[resource.type] || resource.type}
              </Badge>
            )}
            {resource.tags?.map((tag) => (
              <Badge key={tag} variant="outline" className="text-muted-foreground">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor={`resource-folder-${resource.id}`} className="text-xs text-muted-foreground">
          文件夹
        </label>
        <select
          id={`resource-folder-${resource.id}`}
          className="h-9 w-full rounded-md border bg-background px-2 text-sm"
          value={assignedFolderId ?? ""}
          onChange={(event) => {
            const value = event.target.value;
            onAssignFolder(resource.id, value ? value : null);
          }}
        >
          <option value="">未分类</option>
          {folders.map((folder) => (
            <option key={folder.id} value={folder.id}>
              {folder.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>分享者：{resource.createdByName ?? resource.createdBy}</span>
      </div>

      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => onEdit(resource)}>
          编辑
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => onDelete(resource)}>
          删除
        </Button>
      </div>
    </Card>
  );
}
