"use client";

import { useState } from "react";
import { Upload, Link as LinkIcon, X, FileText, Video, Wrench, Globe, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createResource } from "@/lib/resources/resource-storage";
import type { ResourceType } from "@/lib/resources/resource-types";

interface ResourceUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const resourceTypes: { value: ResourceType; label: string; icon: typeof FileText }[] = [
  { value: "document", label: "文档", icon: FileText },
  { value: "video", label: "视频", icon: Video },
  { value: "tool", label: "工具", icon: Wrench },
  { value: "website", label: "网站", icon: Globe },
  { value: "book", label: "书籍", icon: BookOpen },
];

export function ResourceUpload({ open, onOpenChange, onSuccess }: ResourceUploadProps) {
  const [uploadType, setUploadType] = useState<"file" | "url">("url");
  const [type, setType] = useState<ResourceType>("document");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [tags, setTags] = useState("");
  const [author, setAuthor] = useState("");
  const [source, setSource] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // 自动填充标题
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setUploadProgress(0);

    try {
      // 模拟文件上传进度
      if (uploadType === "file" && selectedFile) {
        for (let i = 0; i <= 100; i += 10) {
          setUploadProgress(i);
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      createResource({
        title,
        description,
        type,
        status: "active",
        url: uploadType === "url" ? url : undefined,
        fileUrl: uploadType === "file" && selectedFile ? URL.createObjectURL(selectedFile) : undefined,
        fileName: selectedFile?.name,
        fileSize: selectedFile?.size,
        mimeType: selectedFile?.type,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        author: author || undefined,
        source: source || undefined,
        userId: "demo_user",
      });

      // 重置表单
      setTitle("");
      setDescription("");
      setUrl("");
      setTags("");
      setAuthor("");
      setSource("");
      setSelectedFile(null);
      setUploadProgress(0);

      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to create resource:", error);
      alert("资源添加失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>添加学习资源</DialogTitle>
          <DialogDescription>
            上传文件或添加链接，构建你的学习资源库
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 上传方式选择 */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant={uploadType === "url" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setUploadType("url")}
            >
              <LinkIcon className="w-4 h-4 mr-2" />
              添加链接
            </Button>
            <Button
              type="button"
              variant={uploadType === "file" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setUploadType("file")}
            >
              <Upload className="w-4 h-4 mr-2" />
              上传文件
            </Button>
          </div>

          {/* 资源类型 */}
          <div className="space-y-2">
            <Label>资源类型</Label>
            <Select value={type} onValueChange={(v) => setType(v as ResourceType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {resourceTypes.map((rt) => {
                  const Icon = rt.icon;
                  return (
                    <SelectItem key={rt.value} value={rt.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4" />
                        {rt.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* URL 输入 */}
          {uploadType === "url" && (
            <div className="space-y-2">
              <Label htmlFor="url">资源链接</Label>
              <Input
                id="url"
                type="url"
                placeholder="https://example.com/resource"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
              />
            </div>
          )}

          {/* 文件上传 */}
          {uploadType === "file" && (
            <div className="space-y-2">
              <Label>上传文件</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.mp4,.mov"
                  onChange={handleFileSelect}
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  {selectedFile ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      {uploadProgress > 0 && uploadProgress < 100 && (
                        <div className="w-full bg-secondary rounded-full h-2 mt-2">
                          <div
                            className="bg-primary rounded-full h-2 transition-all"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-muted-foreground mb-2">
                        点击上传或拖拽文件到此处
                      </p>
                      <p className="text-xs text-muted-foreground">
                        支持 PDF、图片、视频等格式，最大 100MB
                      </p>
                    </>
                  )}
                </label>
              </div>
            </div>
          )}

          {/* 标题 */}
          <div className="space-y-2">
            <Label htmlFor="title">资源标题</Label>
            <Input
              id="title"
              placeholder="输入资源标题"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          {/* 描述 */}
          <div className="space-y-2">
            <Label htmlFor="description">资源描述</Label>
            <Textarea
              id="description"
              placeholder="简要描述这个资源的内容和用途"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              required
            />
          </div>

          {/* 标签 */}
          <div className="space-y-2">
            <Label htmlFor="tags">标签</Label>
            <Input
              id="tags"
              placeholder="用逗号分隔，如：Python, 机器学习, 教程"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </div>

          {/* 作者和来源 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="author">作者（可选）</Label>
              <Input
                id="author"
                placeholder="资源作者"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="source">来源（可选）</Label>
              <Input
                id="source"
                placeholder="资源来源"
                value={source}
                onChange={(e) => setSource(e.target.value)}
              />
            </div>
          </div>

          {/* 提交按钮 */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              取消
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "添加中..." : "添加资源"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
