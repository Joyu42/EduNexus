"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type CommunityPost = {
  id: string;
  title: string;
  content: string;
  authorName: string;
  createdAt: string;
};

export default function CommunityPage() {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/community/posts", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("failed to fetch posts");
        }
        const payload = (await response.json()) as {
          data?: { posts?: CommunityPost[] };
        };
        setPosts(payload.data?.posts ?? []);
      })
      .catch(() => {
        setPosts([]);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50/40 via-orange-50/20 to-red-50/30">
      <div className="container mx-auto px-4 py-8 max-w-5xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">学习社区</h1>
          <p className="text-muted-foreground">匿名可浏览，登录后可发布和互动。</p>
        </div>

        <Card className="p-4 flex items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">社区动态</span>
          <Badge variant="secondary">{posts.length} 条帖子</Badge>
        </Card>

        <div className="space-y-4">
          {loading ? (
            <Card className="p-8 text-center text-muted-foreground">加载中...</Card>
          ) : posts.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">暂无社区动态</Card>
          ) : (
            posts.map((post) => (
              <Card key={post.id} className="p-5 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold">{post.title}</h2>
                  <span className="text-xs text-muted-foreground">
                    {new Date(post.createdAt).toLocaleString("zh-CN")}
                  </span>
                </div>
                <p className="text-sm leading-6 text-muted-foreground">{post.content}</p>
                <p className="text-xs text-muted-foreground">作者：{post.authorName || "社区成员"}</p>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
