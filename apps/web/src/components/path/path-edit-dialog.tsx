"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, X, Edit } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import type { LearningPath } from "@/lib/client/path-storage";

type PathEditDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  path: LearningPath | null;
  onSubmit: (data: {
    title: string;
    description: string;
    tags: string[];
  }) => void;
};

export function PathEditDialog({
  open,
  onOpenChange,
  path,
  onSubmit,
}: PathEditDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  useEffect(() => {
    if (path) {
      setTitle(path.title);
      setDescription(path.description);
      setTags(path.tags);
    }
  }, [path]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSubmit({
      title: title.trim(),
      description: description.trim(),
      tags,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5 text-orange-500" />
            编辑学习路径
          </DialogTitle>
          <DialogDescription>
            修改学习路径的基本信息
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">路径名称 *</Label>
            <Input
              id="title"
              placeholder="例如：前端开发基础"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">路径描述</Label>
            <Textarea
              id="description"
              placeholder="描述这个学习路径的目标和内容..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">主题</Label>
            <Input
              id="tags"
              placeholder="输入主题..."
              value={tags.join(', ')}
              onChange={(e) => setTags(e.target.value ? [e.target.value] : [])}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              取消
            </Button>
            <Button
              type="submit"
              className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
            >
              保存修改
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
