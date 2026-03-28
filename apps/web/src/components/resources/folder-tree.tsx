"use client";

import { useState } from "react";
import { FolderPlus } from "lucide-react";
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
};

export function FolderTree({
  folders,
  selectedFolderId,
  pending = false,
  onSelectFolder,
  onCreateFolder,
}: FolderTreeProps) {
  const [folderName, setFolderName] = useState("");

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
        {folders.map((folder) => (
          <Button
            key={folder.id}
            type="button"
            variant={selectedFolderId === folder.id ? "default" : "outline"}
            className="w-full justify-between"
            onClick={() => onSelectFolder(folder.id)}
          >
            <span>{folder.name}</span>
            <span className="text-xs text-muted-foreground">{folder.resourceIds.length}</span>
          </Button>
        ))}
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
