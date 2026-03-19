"use client";

import { useState } from "react";
import { X, FileText, Video, Image as ImageIcon, Film } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Resource } from "@/lib/resources/resource-types";

interface ResourcePreviewProps {
  resource: Resource | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ResourcePreview({ resource, open, onOpenChange }: ResourcePreviewProps) {
  if (!resource) return null;

  const renderPreview = () => {
    // PDF 预览
    if (resource.mimeType?.includes("pdf") && resource.fileUrl) {
      return (
        <iframe
          src={resource.fileUrl}
          className="w-full h-[600px] rounded-lg border"
          title={resource.title}
        />
      );
    }

    // 图片预览
    if (resource.type === "document" && resource.mimeType?.startsWith("image/")) {
      return (
        <div className="flex items-center justify-center bg-muted rounded-lg p-8">
          <img
            src={resource.fileUrl || resource.url}
            alt={resource.title}
            className="max-w-full max-h-[600px] rounded-lg shadow-lg"
          />
        </div>
      );
    }

    // 视频预览
    if (resource.type === "video" && resource.url) {
      // YouTube
      if (resource.url.includes("youtube.com") || resource.url.includes("youtu.be")) {
        const videoId = resource.url.includes("youtu.be")
          ? resource.url.split("/").pop()
          : new URL(resource.url).searchParams.get("v");

        return (
          <iframe
            src={`https://www.youtube.com/embed/${videoId}`}
            className="w-full h-[600px] rounded-lg"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={resource.title}
          />
        );
      }

      // Bilibili
      if (resource.url.includes("bilibili.com")) {
        const bvid = resource.url.match(/BV[a-zA-Z0-9]+/)?.[0];
        if (bvid) {
          return (
            <iframe
              src={`https://player.bilibili.com/player.html?bvid=${bvid}`}
              className="w-full h-[600px] rounded-lg"
              allowFullScreen
              title={resource.title}
            />
          );
        }
      }

      // 通用视频
      return (
        <video
          src={resource.fileUrl || resource.url}
          controls
          className="w-full h-[600px] rounded-lg bg-black"
        >
          您的浏览器不支持视频播放
        </video>
      );
    }

    // 网站预览
    if (resource.type === "website" && resource.url) {
      return (
        <iframe
          src={resource.url}
          className="w-full h-[600px] rounded-lg border"
          title={resource.title}
          sandbox="allow-scripts allow-same-origin"
        />
      );
    }

    // 默认：显示资源信息
    return (
      <div className="space-y-6 py-8">
        <div className="flex items-center justify-center">
          {resource.type === "document" && <FileText className="w-24 h-24 text-muted-foreground" />}
          {resource.type === "video" && <Video className="w-24 h-24 text-muted-foreground" />}
          {resource.type === "tool" && <FileText className="w-24 h-24 text-muted-foreground" />}
          {resource.type === "website" && <FileText className="w-24 h-24 text-muted-foreground" />}
          {resource.type === "book" && <FileText className="w-24 h-24 text-muted-foreground" />}
        </div>

        <div className="text-center space-y-2">
          <h3 className="text-xl font-semibold">{resource.title}</h3>
          <p className="text-muted-foreground">{resource.description}</p>
        </div>

        {resource.url && (
          <div className="flex justify-center">
            <a
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              在新窗口中打开
            </a>
          </div>
        )}

        {resource.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-center">
            {resource.tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-sm"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{resource.title}</DialogTitle>
        </DialogHeader>
        {renderPreview()}
      </DialogContent>
    </Dialog>
  );
}
