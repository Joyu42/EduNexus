"use client";

import { useParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function ProfilePage() {
  const params = useParams();
  const username = String(params.username ?? "unknown");

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-slate-50 to-stone-100">
      <div className="container mx-auto px-4 py-10 max-w-4xl space-y-6">
        <Card className="p-8 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-3xl font-bold">@{username}</h1>
              <p className="text-muted-foreground mt-2">公开学习档案页，匿名可访问。</p>
            </div>
            <Badge variant="secondary">Public Profile</Badge>
          </div>
          <p className="text-sm text-muted-foreground leading-6">
            这里展示该用户公开分享的学习动态、资源和小组参与记录。登录后可关注并与其互动。
          </p>
        </Card>

        <Card className="p-6 space-y-2">
          <h2 className="font-semibold">近期公开活动</h2>
          <p className="text-sm text-muted-foreground">暂未公开动态。</p>
        </Card>
      </div>
    </div>
  );
}
