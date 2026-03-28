"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type PublicProfile = {
  id: string;
  username: string;
  followers: number;
  following: number;
  posts: Array<{
    id: string;
    title: string;
    content: string;
    createdAt: string;
  }>;
};

export default function ProfilePage() {
  const params = useParams();
  const username = String(params.username ?? "");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["public-profile", username],
    queryFn: async () => {
      const response = await fetch(`/api/profile/${encodeURIComponent(username)}`);
      if (!response.ok) {
        throw new Error("获取用户主页失败");
      }
      const payload = await response.json();
      return payload.data?.profile as PublicProfile;
    },
    enabled: Boolean(username)
  });

  if (isLoading) {
    return <div className="min-h-screen p-10 text-center text-muted-foreground">加载中...</div>;
  }

  if (isError || !data) {
    return <div className="min-h-screen p-10 text-center text-muted-foreground">用户不存在或已删除。</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-slate-50 to-stone-100">
      <div className="container mx-auto px-4 py-10 max-w-4xl space-y-6">
        <Card className="p-8 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-3xl font-bold">@{data.username}</h1>
              <p className="text-muted-foreground mt-2">公开学习档案页，匿名可访问。</p>
            </div>
            <Badge variant="secondary">Public Profile</Badge>
          </div>
          <div className="flex gap-3 text-sm text-muted-foreground">
            <span>关注者 {data.followers}</span>
            <span>关注中 {data.following}</span>
            <span>动态 {data.posts.length}</span>
          </div>
        </Card>

        <Card className="p-6 space-y-3">
          <h2 className="font-semibold">近期公开活动</h2>
          {data.posts.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂未公开动态。</p>
          ) : (
            <div className="space-y-2">
              {data.posts.map((post) => (
                <div key={post.id} className="rounded-md border p-3">
                  <div className="font-medium text-sm">{post.title}</div>
                  <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{post.content}</div>
                  <div className="text-xs text-muted-foreground mt-1">{new Date(post.createdAt).toLocaleString("zh-CN")}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
