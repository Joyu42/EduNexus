"use client";

import { useState } from "react";
import {
  Folder,
  Plus,
  Edit,
  Trash2,
  Share2,
  Download,
  MoreVertical,
  FolderOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  getAllFolders,
  createFolder,
  updateFolder,
  deleteFolder,
  generateShareToken,
  exportFolderToMarkdown,
  getAllBookmarks,
} from "@/lib/resources/resource-storage";
import type { BookmarkFolder } from "@/lib/resources/resource-types";

interface BookmarkManagerProps {
  userId: string;
  onFolderSelect?: (folderId: string | null) => void;
}

export function BookmarkManager({ userId, onFolderSelect }: BookmarkManagerProps) {
  const [folders, setFolders] = useState<BookmarkFolder[]>(() => getAllFolders(userId));
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingFolder, setEditingFolder] = useState<BookmarkFolder | null>(null);

  const [folderName, setFolderName] = useState("");
  const [folderDescription, setFolderDescription] = useState("");
  const [folderColor, setFolderColor] = useState("#f97316");

  const refreshFolders = () => {
    setFolders(getAllFolders(userId));
  };

  const handleCreateFolder = () => {
    if (!folderName.trim()) return;

    createFolder({
      userId,
      name: folderName,
      description: folderDescription || undefined,
      color: folderColor,
      isPublic: false,
    });

    setFolderName("");
    setFolderDescription("");
    setFolderColor("#f97316");
    setShowCreateDialog(false);
    refreshFolders();
  };

  const handleUpdateFolder = () => {
    if (!editingFolder || !folderName.trim()) return;

    updateFolder(editingFolder.id, {
      name: folderName,
      description: folderDescription || undefined,
      color: folderColor,
    });

    setEditingFolder(null);
    setFolderName("");
    setFolderDescription("");
    setFolderColor("#f97316");
    refreshFolders();
  };

  const handleDeleteFolder = (folderId: string) => {
    if (confirm("确定要删除这个收藏夹吗？收藏的资源将移到未分类。")) {
      deleteFolder(folderId);
      if (selectedFolder === folderId) {
        setSelectedFolder(null);
        onFolderSelect?.(null);
      }
      refreshFolders();
    }
  };

  const handleShareFolder = (folderId: string) => {
    const token = generateShareToken(folderId);
    if (token) {
      const shareUrl = `${window.location.origin}/resources/shared/${token}`;
      navigator.clipboard.writeText(shareUrl);
      alert("分享链接已复制到剪贴板");
      refreshFolders();
    }
  };

  const handleExportFolder = (folderId: string) => {
    const markdown = exportFolderToMarkdown(folderId);
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `收藏夹-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFolderClick = (folderId: string) => {
    const newSelected = selectedFolder === folderId ? null : folderId;
    setSelectedFolder(newSelected);
    onFolderSelect?.(newSelected);
  };

  const openEditDialog = (folder: BookmarkFolder) => {
    setEditingFolder(folder);
    setFolderName(folder.name);
    setFolderDescription(folder.description || "");
    setFolderColor(folder.color || "#f97316");
  };

  const getBookmarkCount = (folderId: string) => {
    return getAllBookmarks(userId).filter((b) => b.folderId === folderId).length;
  };

  return (
    <div className="space-y-4">
      {/* 标题和创建按钮 */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">我的收藏夹</h3>
        <Button size="sm" onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          新建收藏夹
        </Button>
      </div>

      {/* 全部资源 */}
      <div
        className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-all ${
          selectedFolder === null
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50"
        }`}
        onClick={() => handleFolderClick("")}
      >
        <div className="flex items-center gap-3">
          <FolderOpen className="w-5 h-5 text-primary" />
          <div>
            <div className="font-medium">全部资源</div>
            <div className="text-xs text-muted-foreground">
              {getAllBookmarks(userId).length} 个收藏
            </div>
          </div>
        </div>
      </div>

      {/* 收藏夹列表 */}
      <div className="space-y-2">
        {folders.map((folder) => (
          <div
            key={folder.id}
            className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-all ${
              selectedFolder === folder.id
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            }`}
            onClick={() => handleFolderClick(folder.id)}
          >
            <div className="flex items-center gap-3 flex-1">
              <Folder
                className="w-5 h-5"
                style={{ color: folder.color || "#f97316" }}
              />
              <div className="flex-1">
                <div className="font-medium">{folder.name}</div>
                {folder.description && (
                  <div className="text-xs text-muted-foreground line-clamp-1">
                    {folder.description}
                  </div>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">
                    {getBookmarkCount(folder.id)} 个收藏
                  </span>
                  {folder.isPublic && (
                    <Badge variant="secondary" className="text-xs">
                      已分享
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button size="sm" variant="ghost">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => openEditDialog(folder)}>
                  <Edit className="w-4 h-4 mr-2" />
                  编辑
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleShareFolder(folder.id)}>
                  <Share2 className="w-4 h-4 mr-2" />
                  分享
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExportFolder(folder.id)}>
                  <Download className="w-4 h-4 mr-2" />
                  导出
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleDeleteFolder(folder.id)}
                  className="text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  删除
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
      </div>

      {/* 创建/编辑对话框 */}
      <Dialog
        open={showCreateDialog || editingFolder !== null}
        onOpenChange={(open) => {
          if (!open) {
            setShowCreateDialog(false);
            setEditingFolder(null);
            setFolderName("");
            setFolderDescription("");
            setFolderColor("#f97316");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingFolder ? "编辑收藏夹" : "创建收藏夹"}
            </DialogTitle>
            <DialogDescription>
              {editingFolder
                ? "修改收藏夹信息"
                : "创建一个新的收藏夹来组织你的资源"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="folder-name">收藏夹名称</Label>
              <Input
                id="folder-name"
                placeholder="输入收藏夹名称"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="folder-description">描述（可选）</Label>
              <Textarea
                id="folder-description"
                placeholder="简要描述这个收藏夹的用途"
                value={folderDescription}
                onChange={(e) => setFolderDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="folder-color">颜色</Label>
              <div className="flex gap-2">
                {["#f97316", "#3b82f6", "#10b981", "#8b5cf6", "#ec4899", "#f59e0b"].map(
                  (color) => (
                    <button
                      key={color}
                      type="button"
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        folderColor === color
                          ? "border-foreground scale-110"
                          : "border-transparent"
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setFolderColor(color)}
                    />
                  )
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateDialog(false);
                  setEditingFolder(null);
                }}
              >
                取消
              </Button>
              <Button
                onClick={editingFolder ? handleUpdateFolder : handleCreateFolder}
              >
                {editingFolder ? "保存" : "创建"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
