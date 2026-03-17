"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpenText, Plus, Search, ExternalLink, Loader2 } from "lucide-react";
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

type PublicResource = {
  id: string;
  title: string;
  description?: string;
  url?: string;
  createdBy: string;
};

export default function ResourcesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: resources = [], isLoading } = useQuery({
    queryKey: ["resources"],
    queryFn: async () => {
      const response = await fetch("/api/resources");
      if (!response.ok) {
        throw new Error("获取资源失败");
      }
      const payload = await response.json();
      return (payload.data?.resources ?? []) as PublicResource[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const title = formData.get("title") as string;
      const description = formData.get("description") as string;
      const url = formData.get("url") as string;
      const createdBy = formData.get("createdBy") as string;

      const response = await fetch("/api/resources", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          description: description || undefined,
          url: url || undefined,
          createdBy,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "创建资源失败");
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success("资源创建成功");
      setIsDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["resources"] });
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

  const filteredResources = resources.filter((r) => {
    if (!searchQuery) return true;
    const lowerQuery = searchQuery.toLowerCase();
    return (
      r.title.toLowerCase().includes(lowerQuery) ||
      r.description?.toLowerCase().includes(lowerQuery) ||
      r.createdBy?.toLowerCase().includes(lowerQuery)
    );
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50/40 via-lime-50/20 to-teal-50/30">
      <div className="container mx-auto px-4 py-8 max-w-5xl space-y-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500 text-white shadow-sm">
              <BookOpenText className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">资源中心</h1>
              <p className="text-muted-foreground mt-1">公共资源可直接浏览，持续由社区补充。</p>
            </div>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="shrink-0 gap-2">
                <Plus className="h-4 w-4" />
                分享资源
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>分享公共资源</DialogTitle>
                <DialogDescription>
                  添加一个对社区有用的学习资源，所有用户均可查看。
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="title">资源名称 <span className="text-destructive">*</span></Label>
                  <Input 
                    id="title" 
                    name="title" 
                    placeholder="例如: Next.js 官方文档" 
                    required 
                    autoComplete="off"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="url">链接地址</Label>
                  <Input 
                    id="url" 
                    name="url" 
                    type="url" 
                    placeholder="https://" 
                    autoComplete="off"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">资源描述</Label>
                  <Textarea 
                    id="description" 
                    name="description" 
                    placeholder="简单介绍一下这个资源的作用..." 
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="createdBy">分享者 <span className="text-destructive">*</span></Label>
                  <Input 
                    id="createdBy" 
                    name="createdBy" 
                    placeholder="你的名字或昵称" 
                    required 
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
                    发布资源
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters and Stats */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card p-4 rounded-xl border shadow-sm">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索资源名称、描述或分享者..."
              className="pl-9 w-full bg-background"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground whitespace-nowrap shrink-0">
            <span>公共资源总数</span>
            <Badge variant="secondary" className="px-2 py-0.5">{resources.length}</Badge>
          </div>
        </div>

        {/* Resources List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-muted-foreground space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-500/50" />
              <p>加载资源中...</p>
            </div>
          ) : filteredResources.length === 0 ? (
            <Card className="p-12 text-center border-dashed">
              <div className="mx-auto w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                <BookOpenText className="h-6 w-6 text-muted-foreground/50" />
              </div>
              <h3 className="text-lg font-medium">没有找到资源</h3>
              <p className="text-muted-foreground mt-1">
                {searchQuery ? "尝试换个搜索词试试" : "目前还没有公开资源，成为第一个分享者吧！"}
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredResources.map((resource) => (
                <Card key={resource.id} className="p-5 flex flex-col transition-shadow hover:shadow-md border-border/50">
                  <div className="flex justify-between items-start gap-4 mb-3">
                    <h2 className="text-lg font-semibold leading-tight group-hover:text-emerald-600 transition-colors line-clamp-2">
                      {resource.title}
                    </h2>
                    {resource.url && (
                      <Link 
                        href={resource.url} 
                        target="_blank" 
                        rel="noreferrer noopener"
                        className="shrink-0 text-muted-foreground hover:text-emerald-500 transition-colors p-1"
                        title="在新标签页中打开"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    )}
                  </div>
                  
                  <p className="text-sm text-muted-foreground leading-relaxed flex-grow line-clamp-3 mb-4">
                    {resource.description || <span className="italic opacity-50">该资源暂未提供描述。</span>}
                  </p>
                  
                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/50 text-xs">
                    <div className="flex items-center text-muted-foreground">
                      分享者: <span className="font-medium text-foreground ml-1">{resource.createdBy}</span>
                    </div>
                    {resource.url && (
                      <Link 
                        href={resource.url}
                        target="_blank" 
                        rel="noreferrer noopener"
                        className="text-emerald-600 font-medium hover:underline"
                      >
                        访问资源
                      </Link>
                    )}
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
