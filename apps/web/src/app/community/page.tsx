"use client";

import { useState } from "react";
import { MessageSquareQuote, Plus, Search, Loader2, User } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type CommunityPost = {
  id: string;
  title: string;
  content: string;
  authorName: string;
  createdAt: string;
};

export default function CommunityPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["community-posts"],
    queryFn: async () => {
      const response = await fetch("/api/community/posts");
      if (!response.ok) {
        throw new Error("获取帖子失败");
      }
      const payload = await response.json();
      return (payload.data?.posts ?? []) as CommunityPost[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const title = formData.get("title") as string;
      const content = formData.get("content") as string;
      const authorName = formData.get("authorName") as string;

      const response = await fetch("/api/community/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          content,
          authorName: authorName || "匿名用户",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "发布帖子失败");
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

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createMutation.mutate(formData);
  };

  const filteredPosts = posts.filter((post) => {
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
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="shrink-0 gap-2">
                <Plus className="h-4 w-4" />
                发布动态
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>发布新动态</DialogTitle>
                <DialogDescription>
                  在社区分享你的问题、经验或学习心得。
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="title">标题 <span className="text-destructive">*</span></Label>
                  <Input 
                    id="title" 
                    name="title" 
                    placeholder="例如: Next.js 14 的新特性体验..." 
                    required 
                    autoComplete="off"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="content">内容 <span className="text-destructive">*</span></Label>
                  <Textarea 
                    id="content" 
                    name="content" 
                    placeholder="详细描述你的问题或分享..." 
                    rows={5}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="authorName">昵称 (可选)</Label>
                  <Input 
                    id="authorName" 
                    name="authorName" 
                    placeholder="匿名用户" 
                    autoComplete="off"
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
                    发布
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
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
          ) : filteredPosts.length === 0 ? (
            <Card className="p-12 text-center border-dashed">
              <div className="mx-auto w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                <MessageSquareQuote className="h-6 w-6 text-muted-foreground/50" />
              </div>
              <h3 className="text-lg font-medium">没有找到帖子</h3>
              <p className="text-muted-foreground mt-1">
                {searchQuery ? "尝试换个搜索词试试" : "目前还没有人发布动态，成为第一个发布者吧！"}
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredPosts.map((post) => (
                <Card key={post.id} className="p-5 flex flex-col transition-shadow hover:shadow-md border-border/50">
                  <div className="flex justify-between items-start gap-4 mb-3">
                    <h2 className="text-xl font-semibold leading-tight group-hover:text-orange-600 transition-colors">
                      {post.title}
                    </h2>
                    <span className="shrink-0 text-xs text-muted-foreground tabular-nums bg-muted px-2 py-1 rounded-md">
                      {new Date(post.createdAt).toLocaleDateString("zh-CN", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </span>
                  </div>
                  
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap mb-4">
                    {post.content}
                  </p>
                  
                  <div className="flex items-center mt-auto pt-4 border-t border-border/50 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5 bg-secondary/50 px-2 py-1 rounded-full">
                      <User className="h-3 w-3" />
                      <span className="font-medium text-foreground">{post.authorName || "匿名用户"}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
