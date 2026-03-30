"use client";

import { MarkdownRenderer } from "@/components/markdown-renderer";

interface KBMarkdownPreviewProps {
  content: string;
  className?: string;
}

export function KBMarkdownPreview({ content, className = "" }: KBMarkdownPreviewProps) {
  return <MarkdownRenderer content={content} className={className} />;
}
