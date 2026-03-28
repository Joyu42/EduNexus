"use client";

import { use } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CommentThread } from "@/components/community/comment-thread";
import { PublicPostRecord, CommunityCommentRecord } from "@/lib/server/store";

export default function CommunityPostDetailPage({ params }: { params: Promise<{ postId: string }> }) {
  const { postId } = use(params);
  const { data: session, status } = useSession();
  const queryClient = useQueryClient();
  const currentUserId = session?.user?.id;

  const postQuery = useQuery({
    queryKey: ["community-post", postId],
    queryFn: async () => {
      const res = await fetch(`/api/community/posts/${postId}`);
      if (!res.ok) throw new Error("获取帖子详情失败");
      const json = await res.json();
      return json.data?.post as PublicPostRecord;
    }
  });

  const commentsQuery = useQuery({
    queryKey: ["community-post-comments", postId],
    queryFn: async () => {
      const res = await fetch(`/api/community/posts/${postId}/comments`);
      if (!res.ok) throw new Error("获取评论失败");
      const json = await res.json();
      return (json.data?.comments ?? []) as CommunityCommentRecord[];
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
    mutationFn: async (content: string) => {
      if (!content.trim()) return;
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

  const updateComment = useMutation({
    mutationFn: async ({ commentId, content }: { commentId: string, content: string }) => {
      const response = await fetch(`/api/community/comments/${commentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content })
      });
      if (!response.ok) {
        throw new Error("更新评论失败");
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success("评论已更新");
      queryClient.invalidateQueries({ queryKey: ["community-post-comments", postId] });
    },
    onError: (error: Error) => toast.error(error.message)
  });

  const deleteComment = useMutation({
    mutationFn: async (commentId: string) => {
      const response = await fetch(`/api/community/comments/${commentId}`, {
        method: "DELETE"
      });
      if (!response.ok) {
        throw new Error("删除评论失败");
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success("评论已删除");
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

  const handleSubmitComment = (content: string) => {
    if (status !== "authenticated") {
      toast.error("请先登录后再评论");
      return;
    }
    createComment.mutate(content);
  };

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

        <CommentThread 
          comments={comments} 
          postId={postId} 
          currentUserId={currentUserId}
          onSubmitComment={handleSubmitComment}
          isSubmitting={createComment.isPending}
          onEditComment={(commentId, content) => updateComment.mutate({ commentId, content })}
          onDeleteComment={(commentId) => deleteComment.mutate(commentId)}
        />
      </div>
    </div>
  );
}
