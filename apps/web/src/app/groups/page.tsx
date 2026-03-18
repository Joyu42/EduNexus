"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Plus, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type PublicGroup = {
  id: string;
  name: string;
  description: string;
  memberCount: number;
};

export default function GroupsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const router = useRouter();
  const { status } = useSession();

  const { data: groups = [], isLoading: loading } = useQuery({
    queryKey: ["groups"],
    queryFn: async () => {
      const response = await fetch("/api/groups");
      if (!response.ok) {
        throw new Error("获取小组失败");
      }
      const payload = await response.json();
      return (payload.data?.groups ?? []) as PublicGroup[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const name = formData.get("name") as string;
      const description = formData.get("description") as string;

      const response = await fetch("/api/groups", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          description: description || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message =
          typeof errorData?.error?.message === "string"
            ? errorData.error.message
            : "创建小组失败";
        throw new Error(message);
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success("小组创建成功");
      setIsDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (status === "unauthenticated") {
      toast.error("请先登录后再创建小组");
      router.push(`/login?callbackUrl=${encodeURIComponent("/groups")}`);
      return;
    }
    const formData = new FormData(e.currentTarget);
    createMutation.mutate(formData);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50/40 via-sky-50/20 to-blue-50/40">
      <div className="container mx-auto px-4 py-8 max-w-6xl space-y-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500 text-white shadow-sm">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">学习小组</h1>
              <p className="text-muted-foreground mt-1">公开浏览小组，登录后创建并加入。</p>
            </div>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="shrink-0 gap-2">
                <Plus className="h-4 w-4" />
                创建小组
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>创建学习小组</DialogTitle>
                <DialogDescription>
                  创建一个新的学习小组，邀请其他成员一起学习。
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="name">小组名称 <span className="text-destructive">*</span></Label>
                  <Input 
                    id="name" 
                    name="name" 
                    placeholder="例如: Next.js 学习交流群" 
                    required 
                    autoComplete="off"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">小组简介</Label>
                  <Textarea 
                    id="description" 
                    name="description" 
                    placeholder="简单介绍一下这个小组的学习目标..." 
                    rows={3}
                  />
                </div>
                <DialogFooter className="pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsDialogOpen(false)}
                    disabled={createMutation.isPending}
                  >
                    取消
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    创建小组
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {loading ? (
            <Card className="p-8 text-center text-muted-foreground md:col-span-2">加载中...</Card>
          ) : groups.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground md:col-span-2">暂无公开小组</Card>
          ) : (
            groups.map((group) => (
              <Card key={group.id} className="p-5 flex flex-col transition-shadow hover:shadow-md border-border/50">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <h2 className="text-lg font-semibold leading-tight group-hover:text-blue-600 transition-colors line-clamp-2">
                    {group.name}
                  </h2>
                  <Badge variant="secondary" className="shrink-0">{group.memberCount} 成员</Badge>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed flex-grow line-clamp-3">
                  {group.description || <span className="italic opacity-50">这个小组正在筹备学习活动。</span>}
                </p>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
