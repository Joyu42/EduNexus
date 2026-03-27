"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { GroupDetailLayout } from "@/components/groups/group-detail-layout";
import { JoinButton } from "@/components/groups/join-button";
import { MemberList } from "@/components/groups/member-list";

type PublicGroup = {
  id: string;
  name: string;
  description?: string;
  memberCount: number;
  createdBy: string;
  createdAt: string;
};

type GroupMember = {
  id: string;
  groupId: string;
  userId: string;
  role: "owner" | "admin" | "member";
  status: "active" | "invited" | "removed";
  joinedAt: string;
};

type GroupPost = {
  id: string;
  groupId: string;
  authorId: string;
  title: string;
  content: string;
  createdAt: string;
};

type GroupTask = {
  id: string;
  title: string;
  description: string;
  dueDate: string | null;
  status: "todo" | "in_progress" | "done";
};

type GroupSharedResource = {
  id: string;
  resourceId: string;
  sharedBy: string;
  createdAt: string;
};

function formatDate(dateString?: string | null) {
  if (!dateString) return "未知时间";
  try {
    return new Intl.DateTimeFormat("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(dateString));
  } catch {
    return dateString;
  }
}

export default function GroupDetailsPage({
  params
}: {
  params: Promise<{ groupId: string }>;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const { groupId } = use(params);
  const currentUserId = session?.user?.id ?? null;

  const groupQuery = useQuery({
    queryKey: ["group", groupId],
    queryFn: async () => {
      const response = await fetch(`/api/groups/${groupId}`);
      if (!response.ok) throw new Error("获取小组详情失败");
      const payload = await response.json();
      return payload.data?.group as PublicGroup;
    }
  });

  const membersQuery = useQuery({
    queryKey: ["group-members", groupId],
    queryFn: async () => {
      const response = await fetch(`/api/groups/${groupId}/members`);
      if (!response.ok) throw new Error("获取小组成员失败");
      const payload = await response.json();
      return (payload.data?.members ?? []) as GroupMember[];
    }
  });

  const postsQuery = useQuery({
    queryKey: ["group-posts", groupId],
    queryFn: async () => {
      const response = await fetch(`/api/groups/${groupId}/posts`);
      if (!response.ok) throw new Error("获取小组帖子失败");
      const payload = await response.json();
      return (payload.data?.posts ?? []) as GroupPost[];
    }
  });

  const tasksQuery = useQuery({
    queryKey: ["group-tasks", groupId],
    queryFn: async () => {
      const response = await fetch(`/api/groups/${groupId}/tasks`);
      if (!response.ok) throw new Error("获取小组任务失败");
      const payload = await response.json();
      return (payload.data?.tasks ?? []) as GroupTask[];
    }
  });

  const resourcesQuery = useQuery({
    queryKey: ["group-shared-resources", groupId],
    queryFn: async () => {
      const response = await fetch(`/api/groups/${groupId}/resources`);
      if (!response.ok) throw new Error("获取共享资源失败");
      const payload = await response.json();
      return (payload.data?.sharedResources ?? []) as GroupSharedResource[];
    }
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["group", groupId] });
    queryClient.invalidateQueries({ queryKey: ["group-members", groupId] });
    queryClient.invalidateQueries({ queryKey: ["group-posts", groupId] });
    queryClient.invalidateQueries({ queryKey: ["group-tasks", groupId] });
    queryClient.invalidateQueries({ queryKey: ["group-shared-resources", groupId] });
  };

  const joinMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/groups/${groupId}/join`, { method: "POST" });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error?.message ?? "加入小组失败");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("已加入小组");
      invalidateAll();
    },
    onError: (error: Error) => toast.error(error.message)
  });

  const leaveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/groups/${groupId}/leave`, { method: "POST" });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error?.message ?? "离开小组失败");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("已离开小组");
      invalidateAll();
    },
    onError: (error: Error) => toast.error(error.message)
  });

  const createPostMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const title = String(formData.get("title") ?? "").trim();
      const content = String(formData.get("content") ?? "").trim();
      const res = await fetch(`/api/groups/${groupId}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content })
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error?.message ?? "发布帖子失败");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("小组帖子已发布");
      queryClient.invalidateQueries({ queryKey: ["group-posts", groupId] });
    },
    onError: (error: Error) => toast.error(error.message)
  });

  const createTaskMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const title = String(formData.get("title") ?? "").trim();
      const description = String(formData.get("description") ?? "").trim();
      const dueDate = String(formData.get("dueDate") ?? "").trim();
      const res = await fetch(`/api/groups/${groupId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, dueDate: dueDate || undefined })
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error?.message ?? "创建任务失败");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("任务已创建");
      queryClient.invalidateQueries({ queryKey: ["group-tasks", groupId] });
    },
    onError: (error: Error) => toast.error(error.message)
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: "todo" | "in_progress" | "done" }) => {
      const res = await fetch(`/api/groups/${groupId}/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error?.message ?? "更新任务状态失败");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("任务状态已更新");
      queryClient.invalidateQueries({ queryKey: ["group-tasks", groupId] });
    },
    onError: (error: Error) => toast.error(error.message)
  });

  const createResourceMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const resourceId = String(formData.get("resourceId") ?? "").trim();
      const res = await fetch(`/api/groups/${groupId}/resources`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resourceId })
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error?.message ?? "分享资源失败");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("资源已分享到小组");
      queryClient.invalidateQueries({ queryKey: ["group-shared-resources", groupId] });
    },
    onError: (error: Error) => toast.error(error.message)
  });

  const members = membersQuery.data ?? [];
  const isJoined = Boolean(currentUserId && members.some((item) => item.userId === currentUserId && item.status === "active"));
  const isOwner = Boolean(
    currentUserId &&
    members.some((item) => item.userId === currentUserId && item.status === "active" && item.role === "owner")
  );

  if (groupQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (groupQuery.isError || !groupQuery.data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50/40 via-indigo-50/20 to-violet-50/30 p-8">
        <Card className="max-w-2xl mx-auto p-8 text-center border-dashed">
          <h2 className="text-xl font-semibold">未找到该小组</h2>
          <p className="text-sm text-muted-foreground mt-2">小组可能已被删除或链接无效。</p>
          <Button className="mt-6" variant="outline" onClick={() => router.push("/groups")}>返回小组中心</Button>
        </Card>
      </div>
    );
  }

  const group = groupQuery.data;

  return (
    <GroupDetailLayout
      group={group}
      onBack={() => router.back()}
      headerAction={
        <JoinButton
          isJoined={isJoined}
          isLoading={joinMutation.isPending || leaveMutation.isPending}
          onJoin={() => joinMutation.mutate()}
          onLeave={() => leaveMutation.mutate()}
        />
      }
    >
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>成员列表</CardTitle></CardHeader>
          <CardContent>
            <MemberList members={members} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>共享资源</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {isJoined && (
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  createResourceMutation.mutate(new FormData(e.currentTarget));
                  e.currentTarget.reset();
                }}
              >
                <Input name="resourceId" placeholder="输入资源 ID" required />
                <Button type="submit" size="sm">分享</Button>
              </form>
            )}
            <div className="space-y-2">
              {(resourcesQuery.data ?? []).map((item) => (
                <Link key={item.id} href={`/resources/${item.resourceId}`} className="block rounded-md border px-3 py-2 text-sm hover:bg-muted/50">
                  资源 {item.resourceId}
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>小组帖子</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <form
              className="space-y-2"
              onSubmit={(e) => {
                e.preventDefault();
                createPostMutation.mutate(new FormData(e.currentTarget));
                e.currentTarget.reset();
              }}
            >
              <Input name="title" placeholder="帖子标题" required />
              <Textarea name="content" placeholder="帖子内容" required />
              <Button type="submit" size="sm">发布帖子</Button>
            </form>
            <div className="space-y-2">
              {(postsQuery.data ?? []).map((post) => (
                <div key={post.id} className="rounded-md border px-3 py-2">
                  <div className="font-medium text-sm">{post.title}</div>
                  <div className="text-xs text-muted-foreground mt-1">{post.content}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>小组任务</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {isOwner ? (
              <form
                className="space-y-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  createTaskMutation.mutate(new FormData(e.currentTarget));
                  e.currentTarget.reset();
                }}
              >
                <Input name="title" placeholder="任务标题" required />
                <Textarea name="description" placeholder="任务描述（可选）" />
                <Input name="dueDate" placeholder="截止日期（可选）" />
                <Button type="submit" size="sm">创建任务</Button>
              </form>
            ) : (
              <div className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground text-center">
                仅小组所有者可以发布任务
              </div>
            )}
            <div className="space-y-2">
              {(tasksQuery.data ?? []).map((task) => (
                <div key={task.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                  <div>
                    <div className="font-medium text-sm">{task.title}</div>
                    <div className="text-xs text-muted-foreground">状态: {task.status} · 截止: {formatDate(task.dueDate)}</div>
                  </div>
                  {isJoined && (
                    <Button
                      variant={task.status === "done" ? "outline" : "default"}
                      size="sm"
                      className="ml-2 h-8 text-xs"
                      onClick={() => updateTaskMutation.mutate({ 
                        taskId: task.id, 
                        status: task.status === "done" ? "todo" : "done" 
                      })}
                      disabled={updateTaskMutation.isPending}
                    >
                      {task.status === "done" ? "标记未完成" : "标记完成"}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </GroupDetailLayout>
  );
}
