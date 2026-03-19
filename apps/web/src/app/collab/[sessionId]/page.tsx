"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CollabEditor } from "@/components/collab/collab-editor";
import { OnlineUsers } from "@/components/collab/online-users";
import { SessionChat } from "@/components/collab/session-chat";
import { VersionHistory } from "@/components/collab/version-history";
import { ShareDialog } from "@/components/collab/share-dialog";
import type {
  CollabSession,
  CollabMessage,
  CollabVersion,
  CollabOperation,
} from "@/lib/collab/collab-types";
import {
  ArrowLeft,
  Save,
  Users,
  MessageSquare,
  History,
  Settings,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function CollabSessionPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const [session, setSession] = useState<CollabSession | null>(null);
  const [messages, setMessages] = useState<CollabMessage[]>([]);
  const [versions, setVersions] = useState<CollabVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("editor");

  const currentUserId = "demo_user";
  const currentUserName = "演示用户";

  useEffect(() => {
    loadSession();
    loadMessages();
    loadVersions();
  }, [sessionId]);

  const loadSession = async () => {
    try {
      const res = await fetch(`/api/collab/session?id=${sessionId}&userId=${currentUserId}`);
      if (res.ok) {
        const data = await res.json();
        setSession(data);
      } else {
        router.push("/collab");
      }
    } catch (error) {
      console.error("加载会话失败:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    try {
      const res = await fetch(`/api/collab/chat?sessionId=${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (error) {
      console.error("加载消息失败:", error);
    }
  };

  const loadVersions = async () => {
    try {
      const res = await fetch(`/api/collab/version?sessionId=${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        setVersions(data);
      }
    } catch (error) {
      console.error("加载版本失败:", error);
    }
  };

  const handleEdit = async (operation: CollabOperation) => {
    if (!session) return;

    // 更新本地内容（简化版，实际应该应用操作）
    // 这里只是演示，实际应该使用 ConflictResolver
  };

  const handleSave = async () => {
    if (!session) return;

    setSaving(true);
    try {
      // 保存内容
      await fetch(`/api/collab/session?id=${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: session.content,
          userId: currentUserId,
        }),
      });

      // 创建版本快照
      await fetch("/api/collab/version", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          content: session.content,
          userId: currentUserId,
          userName: currentUserName,
          description: "手动保存",
        }),
      });

      await loadVersions();
    } catch (error) {
      console.error("保存失败:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleSendMessage = async (content: string) => {
    try {
      const res = await fetch("/api/collab/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          content,
          userId: currentUserId,
          userName: currentUserName,
        }),
      });

      if (res.ok) {
        await loadMessages();
      }
    } catch (error) {
      console.error("发送消息失败:", error);
    }
  };

  const handleRestoreVersion = async (version: CollabVersion) => {
    if (!session) return;

    const confirmed = confirm("确定要恢复到此版本吗？");
    if (!confirmed) return;

    try {
      await fetch(`/api/collab/session?id=${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: version.content,
          userId: currentUserId,
        }),
      });

      setSession({ ...session, content: version.content });
    } catch (error) {
      console.error("恢复版本失败:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-orange-50/30 via-amber-50/20 to-rose-50/30">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4" />
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-orange-50/30 via-amber-50/20 to-rose-50/30">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-orange-500/10 flex items-center justify-center">
            <Users className="w-8 h-8 text-orange-500 opacity-50" />
          </div>
          <p className="text-muted-foreground">会话不存在</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-orange-50/30 via-amber-50/20 to-rose-50/30">
      {/* Header */}
      <div className="border-b bg-white/80 backdrop-blur-sm px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/collab")}
              className="hover:bg-orange-500/10"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                {session.title}
                <Badge variant="secondary" className="ml-2">
                  {session.documentType}
                </Badge>
              </h1>
              {session.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {session.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? "保存中..." : "保存"}
            </Button>
            <ShareDialog
              sessionId={sessionId}
              inviteCode={session.inviteCode || ""}
              isPublic={session.isPublic}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor */}
        <div className="flex-1 flex flex-col bg-white/50 backdrop-blur-sm">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="w-full justify-start rounded-none border-b bg-white/80">
              <TabsTrigger value="editor">编辑器</TabsTrigger>
              <TabsTrigger value="preview">预览</TabsTrigger>
            </TabsList>
            <TabsContent value="editor" className="flex-1 m-0">
              <CollabEditor
                sessionId={sessionId}
                initialContent={session.content}
                language={session.language}
                onEdit={handleEdit}
              />
            </TabsContent>
            <TabsContent value="preview" className="flex-1 m-0 p-6 overflow-auto">
              <div className="prose dark:prose-invert max-w-none">
                <pre className="whitespace-pre-wrap bg-white/80 p-4 rounded-lg">
                  {session.content}
                </pre>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="w-80 border-l flex flex-col bg-white/80 backdrop-blur-sm">
          <Tabs defaultValue="users" className="flex-1 flex flex-col">
            <TabsList className="w-full justify-start rounded-none border-b grid grid-cols-3">
              <TabsTrigger value="users" className="gap-2">
                <Users className="w-4 h-4" />
                用户
              </TabsTrigger>
              <TabsTrigger value="chat" className="gap-2">
                <MessageSquare className="w-4 h-4" />
                聊天
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-2">
                <History className="w-4 h-4" />
                历史
              </TabsTrigger>
            </TabsList>
            <TabsContent value="users" className="flex-1 m-0">
              <OnlineUsers users={session.users} currentUserId={currentUserId} />
            </TabsContent>
            <TabsContent value="chat" className="flex-1 m-0">
              <SessionChat
                sessionId={sessionId}
                messages={messages}
                currentUserId={currentUserId}
                currentUserName={currentUserName}
                onSendMessage={handleSendMessage}
              />
            </TabsContent>
            <TabsContent value="history" className="flex-1 m-0">
              <VersionHistory
                versions={versions}
                onRestore={handleRestoreVersion}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
