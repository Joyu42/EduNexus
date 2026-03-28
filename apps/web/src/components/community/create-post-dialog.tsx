import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { User, Loader2, Plus } from "lucide-react";
import React from "react";
import { PublicPostRecord } from "@/lib/server/store";

export interface CreatePostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { title: string; content: string }) => void;
  displayName?: string;
  isPending?: boolean;
  editPost?: PublicPostRecord | null;
}

export function CreatePostDialog({
  open,
  onOpenChange,
  onSubmit,
  displayName = "用户",
  isPending = false,
  editPost = null,
}: CreatePostDialogProps) {
  const isEditing = !!editPost;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    onSubmit({
      title: formData.get("title") as string,
      content: formData.get("content") as string,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {!isEditing && (
        <DialogTrigger asChild>
          <Button className="shrink-0 gap-2">
            <Plus className="h-4 w-4" />
            发布动态
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "编辑动态" : "发布新动态"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "修改你的动态内容" : "在社区分享你的问题、经验或学习心得。"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="title">
              标题 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              name="title"
              placeholder="例如: Next.js 14 的新特性体验..."
              required
              autoComplete="off"
              defaultValue={editPost?.title || ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="content">
              内容 <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="content"
              name="content"
              placeholder="详细描述你的问题或分享..."
              rows={5}
              required
              defaultValue={editPost?.content || ""}
            />
          </div>
          <div className="space-y-2">
            <Label>发布为</Label>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span className="font-medium text-foreground">{editPost?.authorName || displayName}</span>
            </div>
          </div>
          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              取消
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "保存" : "发布"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
