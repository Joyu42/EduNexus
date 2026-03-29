"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpenText, Plus } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FolderTree } from "@/components/resources/folder-tree";
import { ResourceEditorDialog } from "@/components/resources/resource-editor-dialog";
import { ResourceList } from "@/components/resources/resource-list";
import {
  createResourceFolderOnServer,
  createResourceOnServer,
  deleteResourceOnServer,
  fetchResourceFoldersFromServer,
  fetchResourcesFromServer,
  type ServerResourceFolderRecord,
  type ServerResourceRecord,
  updateResourceFolderOnServer,
  updateResourceOnServer,
} from "@/lib/resources/resource-storage";

export default function ResourcesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest" | "title">("newest");
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string>("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<ServerResourceRecord | null>(null);

  const queryClient = useQueryClient();
  const router = useRouter();
  const { data: session, status } = useSession();

  const displayName = session?.user?.name || session?.user?.email || "用户";

  const resourcesQuery = useQuery({
    queryKey: ["resources", { q: searchQuery, sort }],
    queryFn: () => fetchResourcesFromServer({ q: searchQuery, sort, limit: 100 }),
  });

  const foldersQuery = useQuery({
    queryKey: ["resource-folders"],
    queryFn: () => fetchResourceFoldersFromServer(),
    enabled: status === "authenticated",
  });

  const resources = resourcesQuery.data?.resources ?? [];
  const total = resourcesQuery.data?.total ?? 0;
  const folders = foldersQuery.data?.folders ?? [];

  const resourceFolderMap = useMemo(() => {
    const map: Record<string, string | null> = {};
    folders.forEach((folder) => {
      folder.resourceIds.forEach((resourceId) => {
        map[resourceId] = folder.id;
      });
    });
    return map;
  }, [folders]);

  const filteredResources = useMemo(() => {
    let result = resources;

    if (selectedFolderId) {
      const folder = folders.find((item) => item.id === selectedFolderId);
      if (folder) {
        const folderResourceIds = new Set(folder.resourceIds);
        result = result.filter((resource) => folderResourceIds.has(resource.id));
      } else {
        result = [];
      }
    }

    if (selectedType) {
      result = result.filter((resource) => resource.type === selectedType);
    }

    if (selectedTags.length > 0) {
      result = result.filter((resource) => 
        selectedTags.every(tag => resource.tags?.includes(tag))
      );
    }

    return result;
  }, [folders, resources, selectedFolderId, selectedType, selectedTags]);

  const requireAuthenticated = () => {
    if (status !== "unauthenticated") {
      return true;
    }
    toast.error("请先登录后再管理资源");
    router.push(`/login?callbackUrl=${encodeURIComponent("/resources")}`);
    return false;
  };

  const createMutation = useMutation({
    mutationFn: createResourceOnServer,
    onSuccess: () => {
      toast.success("资源创建成功");
      setEditorOpen(false);
      setEditingResource(null);
      queryClient.invalidateQueries({ queryKey: ["resources"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ resourceId, input }: { resourceId: string; input: { title?: string; description?: string; url?: string; type?: "document" | "video" | "tool" | "website" | "book"; tags?: string[] } }) =>
      updateResourceOnServer(resourceId, input),
    onSuccess: () => {
      toast.success("资源更新成功");
      setEditorOpen(false);
      setEditingResource(null);
      queryClient.invalidateQueries({ queryKey: ["resources"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteResourceOnServer,
    onSuccess: () => {
      toast.success("资源已删除");
      queryClient.invalidateQueries({ queryKey: ["resources"] });
      queryClient.invalidateQueries({ queryKey: ["resource-folders"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const createFolderMutation = useMutation({
    mutationFn: createResourceFolderOnServer,
    onSuccess: () => {
      toast.success("文件夹创建成功");
      queryClient.invalidateQueries({ queryKey: ["resource-folders"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const assignFolderMutation = useMutation({
    mutationFn: async ({ resourceId, folderId }: { resourceId: string; folderId: string | null }) => {
      const updates: Array<Promise<ServerResourceFolderRecord>> = [];

      folders.forEach((folder) => {
        const hasResource = folder.resourceIds.includes(resourceId);
        const shouldContain = folder.id === folderId;

        if (hasResource === shouldContain) {
          return;
        }

        const resourceIds = shouldContain
          ? [...folder.resourceIds, resourceId]
          : folder.resourceIds.filter((id) => id !== resourceId);

        updates.push(updateResourceFolderOnServer(folder.id, { resourceIds }));
      });

      await Promise.all(updates);
    },
    onSuccess: () => {
      toast.success("文件夹归类已更新");
      queryClient.invalidateQueries({ queryKey: ["resource-folders"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50/40 via-lime-50/20 to-teal-50/30">
      <div className="container mx-auto px-4 py-8 max-w-6xl space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500 text-white shadow-sm">
              <BookOpenText className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">资源中心</h1>
              <p className="text-muted-foreground mt-1">使用服务端数据统一管理资源、文件夹、笔记与评分。</p>
            </div>
          </div>

          <Button
            className="shrink-0 gap-2"
            onClick={() => {
              if (!requireAuthenticated()) return;
              setEditingResource(null);
              setEditorOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            分享资源
          </Button>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between bg-card p-4 rounded-xl border shadow-sm">
          <div className="w-full lg:max-w-md">
            <Input
              placeholder="搜索资源名称、描述或分享者..."
              className="w-full bg-background"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>
          <select
            className="h-10 rounded-md border bg-background px-3 text-sm"
            value={sort}
            onChange={(event) => setSort(event.target.value as "newest" | "oldest" | "title")}
          >
            <option value="newest">按最新</option>
            <option value="oldest">按最早</option>
            <option value="title">按标题</option>
          </select>
          <div className="flex items-center gap-2 text-sm text-muted-foreground whitespace-nowrap">
            <span>公共资源总数</span>
            <Badge variant="secondary" className="px-2 py-0.5">
              {total}
            </Badge>
            {status === "authenticated" ? (
              <span className="ml-2 text-xs text-muted-foreground">当前用户：{displayName}</span>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
          <FolderTree
            folders={folders.map((folder) => ({
              id: folder.id,
              name: folder.name,
              description: folder.description,
              resourceIds: folder.resourceIds,
            }))}
            selectedFolderId={selectedFolderId}
            pending={createFolderMutation.isPending || assignFolderMutation.isPending}
            onSelectFolder={setSelectedFolderId}
            onCreateFolder={(input) => {
              if (!requireAuthenticated()) return;
              createFolderMutation.mutate(input);
            }}
          />

          <div className="space-y-4">
            <ResourceList
              resources={filteredResources}
              folders={folders.map((folder) => ({ id: folder.id, name: folder.name }))}
              resourceFolderMap={resourceFolderMap}
              onEdit={(resource) => {
                if (!requireAuthenticated()) return;
                setEditingResource(resource);
                setEditorOpen(true);
              }}
              onDelete={(resource) => {
                if (!requireAuthenticated()) return;
                deleteMutation.mutate(resource.id);
              }}
              onAssignFolder={(resourceId, folderId) => {
                if (!requireAuthenticated()) return;
                assignFolderMutation.mutate({ resourceId, folderId });
              }}
            />
            {resourcesQuery.isLoading ? <p className="text-sm text-muted-foreground">加载资源中...</p> : null}
          </div>
        </div>
      </div>

      <ResourceEditorDialog
        open={editorOpen}
        mode={editingResource ? "edit" : "create"}
        initialValue={
          editingResource
            ? {
                title: editingResource.title,
                description: editingResource.description,
                url: editingResource.url,
              }
            : null
        }
        pending={createMutation.isPending || updateMutation.isPending}
        onOpenChange={(open) => {
          setEditorOpen(open);
          if (!open) {
            setEditingResource(null);
          }
        }}
        onSubmit={(value) => {
          if (editingResource) {
            updateMutation.mutate({ resourceId: editingResource.id, input: value });
            return;
          }
          createMutation.mutate(value);
        }}
      />
    </div>
  );
}
