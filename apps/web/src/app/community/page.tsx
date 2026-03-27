"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquareQuote, Search, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { PostList } from "@/components/community/post-list";
import { CreatePostDialog } from "@/components/community/create-post-dialog";
import { PublicPostRecord } from "@/lib/server/store";

type CommunityTopic = {
  id: string;
  name: string;
  postCount?: number;
};

export default function CommunityPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [topicFilter, setTopicFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<PublicPostRecord | null>(null);
  const queryClient = useQueryClient();
  const router = useRouter();
  const { data: session, status } = useSession();
  const displayName = session?.user?.name || session?.user?.email || "用户";
  const currentUserId = session?.user?.id;

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["community-posts"],
    queryFn: async () => {
      const response = await fetch("/api/community/posts");
      if (!response.ok) {
        throw new Error("获取帖子失败");
      }
      const payload = await response.json();
      return (payload.data?.posts ?? []) as PublicPostRecord[];
    },
  });

  const { data: topics = [] } = useQuery({
    queryKey: ["community-topics"],
    queryFn: async () => {
      const response = await fetch("/api/community/topics");
      if (!response.ok) {
        throw new Error("获取话题失败");
      }
      const payload = await response.json();
      return (payload.data?.topics ?? []) as CommunityTopic[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: { title: string; content: string }) => {
      const response = await fetch("/api/community/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message =
          typeof errorData?.error?.message === "string"
            ? errorData.error.message
            : "发布帖子失败";
        throw new Error(message);
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success("发布成功");
      setIsDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["community-posts"] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; title: string; content: string }) => {
      const response = await fetch(`/api/community/posts/${data.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title: data.title, content: data.content }),
      });

      if (!response.ok) {
        throw new Error("更新帖子失败");
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success("更新成功");
      setIsDialogOpen(false);
      setEditingPost(null);
      queryClient.invalidateQueries({ queryKey: ["community-posts"] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (data: { title: string; content: string }) => {
    if (status === "unauthenticated") {
      toast.error("请先登录后再操作");
      router.push(`/login?callbackUrl=${encodeURIComponent("/community")}`);
      return;
    }
    if (editingPost) {
      updateMutation.mutate({ id: editingPost.id, title: data.title, content: data.content });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (post: PublicPostRecord) => {
    setEditingPost(post);
    setIsDialogOpen(true);
  };

  const handleOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingPost(null);
    }
  };

  const filteredPosts = posts.filter((post) => {
    const byTopic =
      topicFilter === "all"
        ? true
        : (`${post.title}\n${post.content}`.toLowerCase().includes(`#${topicFilter.toLowerCase()}`));
    if (!byTopic) return false;
    if (!searchQuery) return true;
    const lowerQuery = searchQuery.toLowerCase();
    return (
      post.title.toLowerCase().includes(lowerQuery) ||
      post.content.toLowerCase().includes(lowerQuery) ||
      post.authorName?.toLowerCase().includes(lowerQuery)
    );
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50/40 via-orange-50/20 to-red-50/30">
      <div className="container mx-auto px-4 py-8 max-w-5xl space-y-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-500 text-white shadow-sm">
              <MessageSquareQuote className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">学习社区</h1>
              <p className="text-muted-foreground mt-1">讨论学习问题，分享经验与见解。</p>
            </div>
          </div>
          
          <CreatePostDialog 
            open={isDialogOpen} 
            onOpenChange={handleOpenChange}
            onSubmit={handleSubmit}
            displayName={displayName}
            isPending={createMutation.isPending || updateMutation.isPending}
            editPost={editingPost}
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card p-4 rounded-xl border shadow-sm">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索帖子标题、内容或作者..."
              className="pl-9 w-full bg-background"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select
            className="h-10 rounded-md border bg-background px-3 text-sm"
            value={topicFilter}
            onChange={(e) => setTopicFilter(e.target.value)}
          >
            <option value="all">全部话题</option>
            {topics.map((topic) => (
              <option key={topic.id} value={topic.name}>
                #{topic.name}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2 text-sm text-muted-foreground whitespace-nowrap shrink-0">
            <span>社区动态总数</span>
            <Badge variant="secondary" className="px-2 py-0.5">{posts.length}</Badge>
          </div>
        </div>

        <div className="space-y-4">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-muted-foreground space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-orange-500/50" />
              <p>加载动态中...</p>
            </div>
          ) : (
            <PostList 
              posts={filteredPosts} 
              currentUserId={currentUserId} 
              searchQuery={searchQuery}
              onEdit={handleEdit}
            />
          )}
        </div>
      </div>
    </div>
  );
}
