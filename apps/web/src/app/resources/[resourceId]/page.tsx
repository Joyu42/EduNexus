"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  BookOpenText, 
  Calendar, 
  ExternalLink, 
  Link as LinkIcon, 
  Loader2, 
  User 
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type PublicResource = {
  id: string;
  title: string;
  description?: string;
  url?: string;
  createdBy: string;
  createdAt: string;
};

export default function ResourceDetailsPage({
  params,
}: {
  params: Promise<{ resourceId: string }>;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { status } = useSession();
  const { resourceId } = use(params);

  const { data: resource, isLoading, error } = useQuery({
    queryKey: ["resource", resourceId],
    queryFn: async () => {
      const response = await fetch(`/api/resources/${resourceId}`);
      if (!response.ok) {
        throw new Error("获取资源详情失败");
      }
      const payload = await response.json();
      return payload.data?.resource as PublicResource;
    },
  });

  const bookmarkQuery = useQuery({
    queryKey: ["resource-bookmarks", resourceId],
    queryFn: async () => {
      const response = await fetch("/api/resources/bookmarks");
      if (!response.ok) return [] as Array<{ id: string; resourceId: string }>;
      const payload = await response.json();
      return (payload.data?.bookmarks ?? []) as Array<{ id: string; resourceId: string }>;
    },
    enabled: status === "authenticated"
  });

  const notesQuery = useQuery({
    queryKey: ["resource-notes", resourceId],
    queryFn: async () => {
      const response = await fetch(`/api/resources/notes?resourceId=${resourceId}`);
      if (!response.ok) return [] as Array<{ id: string; content: string }>;
      const payload = await response.json();
      return (payload.data?.notes ?? []) as Array<{ id: string; content: string }>;
    },
    enabled: status === "authenticated"
  });

  const ratingQuery = useQuery({
    queryKey: ["resource-rating", resourceId],
    queryFn: async () => {
      const response = await fetch(`/api/resources/${resourceId}/rating`);
      if (!response.ok) return null as { id: string; rating: number } | null;
      const payload = await response.json();
      return (payload.data?.rating ?? null) as { id: string; rating: number } | null;
    },
    enabled: status === "authenticated"
  });

  const bookmarkMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/resources/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resourceId })
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error?.message ?? "收藏失败");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("已收藏资源");
      queryClient.invalidateQueries({ queryKey: ["resource-bookmarks", resourceId] });
    },
    onError: (err: Error) => toast.error(err.message)
  });

  const noteMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch("/api/resources/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resourceId, content })
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error?.message ?? "添加笔记失败");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("已添加笔记");
      queryClient.invalidateQueries({ queryKey: ["resource-notes", resourceId] });
    },
    onError: (err: Error) => toast.error(err.message)
  });

  const ratingMutation = useMutation({
    mutationFn: async (rating: number) => {
      const method = ratingQuery.data ? "PATCH" : "POST";
      const res = await fetch(`/api/resources/${resourceId}/rating`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating })
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error?.message ?? "评分失败");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("评分已提交");
      queryClient.invalidateQueries({ queryKey: ["resource-rating", resourceId] });
    },
    onError: (err: Error) => toast.error(err.message)
  });

  const formatDate = (dateString?: string) => {
    if (!dateString) return "未知时间";
    try {
      return new Intl.DateTimeFormat("zh-CN", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(dateString));
    } catch {
      return dateString;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50/40 via-lime-50/20 to-teal-50/30">
      <div className="container mx-auto px-4 py-8 max-w-4xl space-y-8">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="shrink-0" 
            onClick={() => router.back()}
            title="返回上一页"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500 text-white shadow-sm">
              <BookOpenText className="h-5 w-5" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">资源详情</h1>
          </div>
        </div>

        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center text-muted-foreground space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-emerald-500/50" />
            <p className="text-lg animate-pulse">加载资源详情中...</p>
          </div>
        ) : error || !resource ? (
          <Card className="p-12 text-center border-dashed">
            <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <BookOpenText className="h-8 w-8 text-destructive/60" />
            </div>
            <h3 className="text-xl font-medium mb-2">未找到该资源</h3>
            <p className="text-muted-foreground mb-6">
              资源可能已被删除或链接有误。
            </p>
            <Button onClick={() => router.push("/resources")} variant="outline">
              返回资源中心
            </Button>
          </Card>
        ) : (
          <div className="grid gap-6">
            <Card className="border-border/50 shadow-sm overflow-hidden">
              <div className="h-2 w-full bg-gradient-to-r from-emerald-400 to-teal-500" />
              <CardHeader className="space-y-4 pb-6">
                <CardTitle className="text-2xl sm:text-3xl leading-snug">
                  {resource.title}
                </CardTitle>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <User className="h-4 w-4 shrink-0" />
                    <span>分享者: <span className="font-medium text-foreground">{resource.createdBy}</span></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 shrink-0" />
                    <time dateTime={resource.createdAt}>
                      {formatDate(resource.createdAt)}
                    </time>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="prose prose-emerald max-w-none dark:prose-invert">
                  <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                    资源描述
                  </h3>
                  <div className="bg-muted/30 p-4 sm:p-6 rounded-lg text-foreground/90 leading-relaxed whitespace-pre-wrap border border-border/50">
                    {resource.description ? (
                      resource.description
                    ) : (
                      <span className="italic text-muted-foreground">分享者未提供详细描述。</span>
                    )}
                  </div>
                </div>

                {resource.url && (
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <LinkIcon className="h-4 w-4 text-emerald-500" />
                      资源链接
                    </h3>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1 bg-muted/50 p-3 rounded-md border border-border/50 flex items-center overflow-hidden">
                        <span className="truncate text-sm font-medium">
                          {resource.url}
                        </span>
                      </div>
                      <Button asChild className="shrink-0 group shadow-sm">
                        <Link href={resource.url} target="_blank" rel="noreferrer noopener">
                          访问链接
                          <ExternalLink className="ml-2 h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                )}

                {status === "authenticated" && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">个人互动</h3>
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        variant="outline"
                        onClick={() => bookmarkMutation.mutate()}
                        disabled={bookmarkMutation.isPending || (bookmarkQuery.data ?? []).some((item) => item.resourceId === resourceId)}
                      >
                        {(bookmarkQuery.data ?? []).some((item) => item.resourceId === resourceId) ? "已收藏" : "收藏资源"}
                      </Button>
                      {[1, 2, 3, 4, 5].map((score) => (
                        <Button key={score} variant="outline" size="sm" onClick={() => ratingMutation.mutate(score)}>
                          {score} 星
                        </Button>
                      ))}
                      {ratingQuery.data?.rating ? <span className="text-sm text-muted-foreground self-center">当前评分: {ratingQuery.data.rating}</span> : null}
                    </div>
                    <form
                      className="flex gap-2"
                      onSubmit={(event) => {
                        event.preventDefault();
                        const form = event.currentTarget;
                        const formData = new FormData(form);
                        const content = String(formData.get("note") ?? "").trim();
                        if (!content) return;
                        noteMutation.mutate(content);
                        form.reset();
                      }}
                    >
                      <Input name="note" placeholder="添加你的学习笔记" />
                      <Button type="submit" size="sm">保存笔记</Button>
                    </form>
                    <div className="space-y-2">
                      {(notesQuery.data ?? []).map((note) => (
                        <div key={note.id} className="rounded-md border px-3 py-2 text-sm text-muted-foreground">
                          {note.content}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
