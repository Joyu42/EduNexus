"use client";

import { Card } from "@/components/ui/card";
import type { ServerResourceRecord } from "@/lib/resources/resource-storage";
import { ResourceCard } from "./resource-card";

type FolderOption = {
  id: string;
  name: string;
};

type ResourceListProps = {
  resources: ServerResourceRecord[];
  folders: FolderOption[];
  resourceFolderMap: Record<string, string | null>;
  onEdit: (resource: ServerResourceRecord) => void;
  onDelete: (resource: ServerResourceRecord) => void;
  onAssignFolder: (resourceId: string, folderId: string | null) => void;
};

export function ResourceList({
  resources,
  folders,
  resourceFolderMap,
  onEdit,
  onDelete,
  onAssignFolder,
}: ResourceListProps) {
  if (resources.length === 0) {
    return (
      <Card className="p-10 text-center border-dashed">
        <h3 className="text-lg font-medium">没有找到资源</h3>
        <p className="text-sm text-muted-foreground mt-1">尝试创建资源或调整筛选条件。</p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {resources.map((resource) => (
        <ResourceCard
          key={resource.id}
          resource={resource}
          folders={folders}
          assignedFolderId={resourceFolderMap[resource.id] ?? null}
          onEdit={onEdit}
          onDelete={onDelete}
          onAssignFolder={onAssignFolder}
        />
      ))}
    </div>
  );
}
