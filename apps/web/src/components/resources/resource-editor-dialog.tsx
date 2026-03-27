"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type ResourceEditorValue = {
  title: string;
  description?: string;
  url?: string;
};

type ResourceEditorDialogProps = {
  open: boolean;
  mode: "create" | "edit";
  initialValue: ResourceEditorValue | null;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (value: ResourceEditorValue) => void;
};

export function ResourceEditorDialog({
  open,
  mode,
  initialValue,
  pending,
  onOpenChange,
  onSubmit,
}: ResourceEditorDialogProps) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }
    setTitle(initialValue?.title ?? "");
    setUrl(initialValue?.url ?? "");
    setDescription(initialValue?.description ?? "");
  }, [open, initialValue]);

  const submitLabel = mode === "create" ? "发布资源" : "保存修改";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "分享公共资源" : "编辑资源"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "添加一个对社区有用的学习资源，所有用户均可查看。"
              : "更新资源信息，帮助社区更快理解内容价值。"}
          </DialogDescription>
        </DialogHeader>

        <form
          data-testid="resource-editor-form"
          className="space-y-4 pt-2"
          onSubmit={(event) => {
            event.preventDefault();
            const nextTitle = title.trim();
            if (!nextTitle) {
              return;
            }
            onSubmit({
              title: nextTitle,
              description: description.trim() || undefined,
              url: url.trim() || undefined,
            });
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="resource-editor-title">
              资源名称 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="resource-editor-title"
              name="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="例如: Next.js 官方文档"
              required
              autoComplete="off"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="resource-editor-url">链接地址</Label>
            <Input
              id="resource-editor-url"
              name="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              type="url"
              placeholder="https://"
              autoComplete="off"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="resource-editor-description">资源描述</Label>
            <Textarea
              id="resource-editor-description"
              name="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="简单介绍一下这个资源的作用..."
              rows={3}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              取消
            </Button>
            <Button type="submit" disabled={pending}>
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
