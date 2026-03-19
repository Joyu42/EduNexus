"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Code, Users, Clock, Search } from "lucide-react";
import type { CollabSession } from "@/lib/collab/collab-types";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function CollabPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<CollabSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newSession, setNewSession] = useState({
    title: "",
    description: "",
    documentType: "markdown" as "markdown" | "code" | "text",
    language: "javascript",
  });

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const res = await fetch("/api/collab/session?userId=demo_user");
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
      }
    } catch (error) {
      console.error("加载会话失败:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async () => {
    if (!newSession.title.trim()) return;

    try {
      const res = await fetch("/api/collab/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newSession,
          userId: "demo_user",
          userName: "演示用户",
        }),
      });

      if (res.ok) {
        const session = await res.json();
        router.push(`/collab/${session.id}`);
      }
    } catch (error) {
      console.error("创建会话失败:", error);
    }
  };

  const filteredSessions = sessions.filter(
    (s) =>
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getDocumentIcon = (type: string) => {
    switch (type) {
      case "code":
        return <Code className="w-5 h-5" />;
      case "markdown":
        return <FileText className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50/30 via-amber-50/20 to-rose-50/30">
      <div className="page-container">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-rose-500">
                  <Users className="h-6 w-6 text-white" />
                </div>
                协作编辑
              </h1>
              <p className="text-muted-foreground">
                实时协作编辑文档和代码，与团队成员高效协同
              </p>
            </div>

            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-br from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600">
                  <Plus className="w-4 h-4 mr-2" />
                  新建会话
                </Button>
              </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>创建协作会话</DialogTitle>
              <DialogDescription>
                创建一个新的协作编辑会话
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>标题</Label>
                <Input
                  value={newSession.title}
                  onChange={(e) =>
                    setNewSession({ ...newSession, title: e.target.value })
                  }
                  placeholder="输入会话标题"
                />
              </div>
              <div className="space-y-2">
                <Label>描述</Label>
                <Input
                  value={newSession.description}
                  onChange={(e) =>
                    setNewSession({ ...newSession, description: e.target.value })
                  }
                  placeholder="输入会话描述（可选）"
                />
              </div>
              <div className="space-y-2">
                <Label>文档类型</Label>
                <Select
                  value={newSession.documentType}
                  onValueChange={(value: any) =>
                    setNewSession({ ...newSession, documentType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="markdown">Markdown</SelectItem>
                    <SelectItem value="code">代码</SelectItem>
                    <SelectItem value="text">纯文本</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {newSession.documentType === "code" && (
                <div className="space-y-2">
                  <Label>编程语言</Label>
                  <Select
                    value={newSession.language}
                    onValueChange={(value) =>
                      setNewSession({ ...newSession, language: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="javascript">JavaScript</SelectItem>
                      <SelectItem value="typescript">TypeScript</SelectItem>
                      <SelectItem value="python">Python</SelectItem>
                      <SelectItem value="java">Java</SelectItem>
                      <SelectItem value="cpp">C++</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Button onClick={handleCreateSession} className="w-full">
                创建
              </Button>
            </div>
          </DialogContent>
        </Dialog>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="card-hover">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">全部会话</p>
                  <p className="text-3xl font-bold">{sessions.length}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-orange-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">活跃会话</p>
                  <p className="text-3xl font-bold">
                    {sessions.filter(s => s.users.length > 1).length}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">公开会话</p>
                  <p className="text-3xl font-bold">
                    {sessions.filter(s => s.isPublic).length}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                  <Code className="w-6 h-6 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 搜索栏 */}
          {/* 搜索栏 */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索会话标题、描述或标签..."
              className="pl-10 input-enhanced"
            />
          </div>
        </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4" />
          <p className="text-muted-foreground">加载中...</p>
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-orange-500/10 flex items-center justify-center">
            <FileText className="w-8 h-8 text-orange-500 opacity-50" />
          </div>
          <p className="text-muted-foreground mb-4">
            {searchQuery ? "未找到匹配的会话" : "还没有协作会话"}
          </p>
          {!searchQuery && (
            <Button
              onClick={() => setCreateDialogOpen(true)}
              className="bg-gradient-to-br from-orange-500 to-rose-500"
            >
              <Plus className="w-4 h-4 mr-2" />
              创建第一个会话
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSessions.map((session) => (
            <Card
              key={session.id}
              className="card-hover group"
              onClick={() => router.push(`/collab/${session.id}`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500/10 to-rose-500/10 group-hover:from-orange-500/20 group-hover:to-rose-500/20 transition-colors">
                      {getDocumentIcon(session.documentType)}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{session.title}</CardTitle>
                      {session.isPublic && (
                        <Badge variant="secondary" className="mt-1">
                          公开
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                {session.description && (
                  <CardDescription className="line-clamp-2">
                    {session.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span>{session.users.length} 位用户</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>
                        {formatDistanceToNow(new Date(session.updatedAt), {
                          addSuffix: true,
                          locale: zhCN,
                        })}
                      </span>
                    </div>
                  </div>

                  {session.tags && session.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-2 border-t">
                      {session.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
