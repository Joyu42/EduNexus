"use client";

import { use } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Post = {
  id: string;
  title: string;
  content: string;
  authorName: string;
  createdAt: string;
};

type Comment = {
  id: string;
  authorId: string;
  content: string;
  parentCommentId: string | null;
  createdAt: string;
};

export default function CommunityPostDetailPage({ params }: { params: Promise<{ postId: string }> }) {
  const { postId } = use(params);
  const { status } = useSession();
  const queryClient = useQueryClient();

  const postQuery = useQuery({
    queryKey: ["community-post", postId],
    queryFn: async () => {
      const res = await fetch(`/api/community/posts/${postId}`);
      if (!res.ok) throw new Error("获取帖子详情失败");
      const json = await res.json();
      return json.data?.post as Post;
    }
  });

  const commentsQuery = useQuery({
    queryKey: ["community-post-comments", postId],
    queryFn: async () => {
      const res = await fetch(`/api/community/posts/${postId}/comments`);
      if (!res.ok) throw new Error("获取评论失败");
      const json = await res.json();
      return (json.data?.comments ?? []) as Comment[];
    }
  });

  const reactionsQuery = useQuery({
    queryKey: ["community-post-reactions", postId],
    queryFn: async () => {
      const res = await fetch(`/api/community/posts/${postId}/reactions`);
      if (!res.ok) throw new Error("获取 reactions 失败");
      const json = await res.json();
      return (json.data?.stats ?? { total: 0, byType: {} }) as { total: number; byType: Record<string, number> };
    }
  });

  const createComment = useMutation({
    mutationFn: async (formData: FormData) => {
      const content = String(formData.get("content") ?? "").trim();
      const response = await fetch(`/api/community/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content })
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error?.message ?? "发表评论失败");
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success("评论已发布");
      queryClient.invalidateQueries({ queryKey: ["community-post-comments", postId] });
    },
    onError: (error: Error) => toast.error(error.message)
  });

  const reactMutation = useMutation({
    mutationFn: async (type: string) => {
      const response = await fetch(`/api/community/posts/${postId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type })
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error?.message ?? "提交 reaction 失败");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-post-reactions", postId] });
    },
    onError: (error: Error) => toast.error(error.message)
  });

  if (postQuery.isLoading) {
    return <div className="p-8 text-center text-muted-foreground">加载中...</div>;
  }

  if (postQuery.isError || !postQuery.data) {
    return <div className="p-8 text-center text-muted-foreground">帖子不存在或已删除。</div>;
  }

  const post = postQuery.data;
  const comments = commentsQuery.data ?? [];
  const reactions = reactionsQuery.data ?? { total: 0, byType: {} };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50/40 via-orange-50/20 to-red-50/30">
      <div className="container mx-auto px-4 py-8 max-w-4xl space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>{post.title}</CardTitle>
            <div className="text-xs text-muted-foreground">作者 {post.authorName} · {new Date(post.createdAt).toLocaleString("zh-CN")}</div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="whitespace-pre-wrap text-sm leading-7">{post.content}</p>
            <div className="flex gap-2 flex-wrap">
              {(["like", "love", "idea", "celebrate"] as const).map((type) => (
                <Button
                  key={type}
                  size="sm"
                  variant="outline"
                  onClick={() => reactMutation.mutate(type)}
                  disabled={status !== "authenticated" || reactMutation.isPending}
                >
                  {type} {(reactions.byType[type] ?? 0)}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>评论 ({comments.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                createComment.mutate(new FormData(e.currentTarget));
                e.currentTarget.reset();
              }}
            >
              <Input name="content" placeholder={status === "authenticated" ? "写下你的评论" : "登录后可评论"} disabled={status !== "authenticated"} required />
              <Button type="submit" disabled={status !== "authenticated" || createComment.isPending}>发布</Button>
            </form>
            <div className="space-y-2">
              {comments.map((comment) => (
                <div key={comment.id} className="rounded-md border px-3 py-2">
                  <div className="text-xs text-muted-foreground">{comment.authorId} · {new Date(comment.createdAt).toLocaleString("zh-CN")}</div>
                  <div className="text-sm mt-1 whitespace-pre-wrap">{comment.content}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
