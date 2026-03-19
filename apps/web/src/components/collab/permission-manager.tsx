"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { CollabUser, CollabRole } from "@/lib/collab/collab-types";
import { Settings, UserPlus, Trash2, Shield } from "lucide-react";

interface PermissionManagerProps {
  sessionId: string;
  users: CollabUser[];
  currentUserId: string;
  isOwner: boolean;
  onUpdateRole?: (userId: string, role: CollabRole) => void;
  onRemoveUser?: (userId: string) => void;
  onInviteUser?: (email: string, role: CollabRole) => void;
}

export function PermissionManager({
  sessionId,
  users,
  currentUserId,
  isOwner,
  onUpdateRole,
  onRemoveUser,
  onInviteUser,
}: PermissionManagerProps) {
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<CollabRole>("editor");

  const getRoleBadge = (role: CollabRole) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      owner: "default",
      editor: "secondary",
      commenter: "outline",
      viewer: "outline",
    };
    return variants[role] || "outline";
  };

  const getRoleLabel = (role: CollabRole) => {
    const labels: Record<string, string> = {
      owner: "所有者",
      editor: "编辑者",
      commenter: "评论者",
      viewer: "查看者",
    };
    return labels[role] || role;
  };

  const getRoleDescription = (role: CollabRole) => {
    const descriptions: Record<string, string> = {
      owner: "完全控制，可以删除会话",
      editor: "可以编辑和分享",
      commenter: "可以评论，不能编辑",
      viewer: "只能查看",
    };
    return descriptions[role] || "";
  };

  const handleInvite = () => {
    if (!inviteEmail.trim()) return;
    onInviteUser?.(inviteEmail, inviteRole);
    setInviteEmail("");
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="w-4 h-4 mr-2" />
          权限管理
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>权限管理</DialogTitle>
          <DialogDescription>
            管理协作会话的用户权限
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* 邀请用户 */}
          {isOwner && (
            <div className="space-y-3">
              <Label>邀请用户</Label>
              <div className="flex gap-2">
                <Input
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="输入邮箱地址"
                  className="flex-1"
                />
                <Select
                  value={inviteRole}
                  onValueChange={(value: CollabRole) => setInviteRole(value)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="editor">编辑者</SelectItem>
                    <SelectItem value="commenter">评论者</SelectItem>
                    <SelectItem value="viewer">查看者</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleInvite} size="icon">
                  <UserPlus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* 用户列表 */}
          <div className="space-y-3">
            <Label>成员 ({users.length})</Label>
            <ScrollArea className="h-64 rounded-md border">
              <div className="p-4 space-y-3">
                {users.map((user) => {
                  const isCurrentUser = user.id === currentUserId;
                  const canManage = isOwner && !isCurrentUser && user.role !== "owner";

                  return (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-accent"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={user.avatar} />
                          <AvatarFallback>{user.name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">
                              {user.name}
                              {isCurrentUser && " (你)"}
                            </p>
                            {user.role === "owner" && (
                              <Shield className="w-3 h-3 text-yellow-500" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {user.email}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {canManage ? (
                          <>
                            <Select
                              value={user.role}
                              onValueChange={(value: CollabRole) =>
                                onUpdateRole?.(user.id, value)
                              }
                            >
                              <SelectTrigger className="w-28 h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="editor">编辑者</SelectItem>
                                <SelectItem value="commenter">评论者</SelectItem>
                                <SelectItem value="viewer">查看者</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => onRemoveUser?.(user.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </>
                        ) : (
                          <Badge variant={getRoleBadge(user.role)} className="text-xs">
                            {getRoleLabel(user.role)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          {/* 角色说明 */}
          <div className="space-y-2">
            <Label>角色权限说明</Label>
            <div className="space-y-2 text-xs">
              {(["owner", "editor", "commenter", "viewer"] as CollabRole[]).map(
                (role) => (
                  <div key={role} className="flex items-start gap-2">
                    <Badge variant={getRoleBadge(role)} className="text-xs mt-0.5">
                      {getRoleLabel(role)}
                    </Badge>
                    <span className="text-muted-foreground">
                      {getRoleDescription(role)}
                    </span>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
