"use client";

import { useState } from "react";
import { FolderPlus, Pencil, Trash2, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type FolderOption = {
  id: string;
  name: string;
  description?: string;
  resourceIds: string[];
};

type FolderTreeProps = {
  folders: FolderOption[];
  selectedFolderId: string | null;
  pending?: boolean;
  onSelectFolder: (folderId: string | null) => void;
  onCreateFolder: (input: { name: string; description?: string }) => void;
  onEditFolder?: (folderId: string, name: string) => void;
  onDeleteFolder?: (folderId: string) => void;
};

export function FolderTree({
  folders,
  selectedFolderId,
  pending = false,
  onSelectFolder,
  onCreateFolder,
  onEditFolder,
  onDeleteFolder,
}: FolderTreeProps) {
  const [folderName, setFolderName] = useState("");
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState("");

  return (
    <Card className="p-4 space-y-4">
      <div>
        <h3 className="text-sm font-semibold">文件夹</h3>
        <p className="text-xs text-muted-foreground">按学习主题整理资源</p>
      </div>

      <div className="space-y-2">
        <Button
          type="button"
          variant={selectedFolderId === null ? "default" : "outline"}
          className="w-full justify-start"
          onClick={() => onSelectFolder(null)}
        >
          全部资源
        </Button>
        {folders.map((folder) => {
          const isEditing = editingFolderId === folder.id;

          if (isEditing) {
            return (
              <div key={folder.id} className="flex gap-1 items-center">
                <Input
                  className="h-9"
                  value={editingFolderName}
                  onChange={(e) => setEditingFolderName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (editingFolderName.trim() && onEditFolder) {
                        onEditFolder(folder.id, editingFolderName.trim());
                      }
                      setEditingFolderId(null);
                    } else if (e.key === "Escape") {
                      setEditingFolderId(null);
                    }
                  }}
                  autoFocus
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9 shrink-0"
                  onClick={() => {
                    if (editingFolderName.trim() && onEditFolder) {
                      onEditFolder(folder.id, editingFolderName.trim());
                    }
                    setEditingFolderId(null);
                  }}
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9 shrink-0 text-muted-foreground"
                  onClick={() => setEditingFolderId(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            );
          }

          return (
            <div key={folder.id} className="group relative flex w-full items-center">
              <Button
                type="button"
                variant={selectedFolderId === folder.id ? "default" : "outline"}
                className="w-full justify-between pr-14"
                onClick={() => onSelectFolder(folder.id)}
              >
                <span className="truncate">{folder.name}</span>
                <span className="text-xs text-muted-foreground">{folder.resourceIds.length}</span>
              </Button>
              <div className="absolute right-1 top-1/2 -translate-y-1/2 flex opacity-0 group-hover:opacity-100 transition-opacity">
                {onEditFolder && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingFolderId(folder.id);
                      setEditingFolderName(folder.name);
                    }}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                )}
                {onDeleteFolder && folder.resourceIds.length === 0 && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm("确定要删除这个文件夹吗？")) {
                        onDeleteFolder(folder.id);
                      }
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <form
        data-testid="folder-create-form"
        className="space-y-2 border-t pt-3"
        onSubmit={(event) => {
          event.preventDefault();
          const nextName = folderName.trim();
          if (!nextName) {
            return;
          }
          onCreateFolder({ name: nextName });
          setFolderName("");
        }}
      >
        <Label htmlFor="new-folder-name">新建文件夹</Label>
        <div className="flex gap-2">
          <Input
            id="new-folder-name"
            value={folderName}
            onChange={(event) => setFolderName(event.target.value)}
            placeholder="例如：IELTS"
            disabled={pending}
          />
          <Button type="submit" size="icon" disabled={pending}>
            <FolderPlus className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </Card>
  );
}
