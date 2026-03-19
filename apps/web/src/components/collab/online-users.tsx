"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { CollabUser } from "@/lib/collab/collab-types";
import { Users, Circle } from "lucide-react";

interface OnlineUsersProps {
  users: CollabUser[];
  currentUserId: string;
}

export function OnlineUsers({ users, currentUserId }: OnlineUsersProps) {
  const onlineUsers = users.filter((u) => u.isOnline);
  const offlineUsers = users.filter((u) => !u.isOnline);

  const getRoleBadge = (role: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      owner: "default",
      editor: "secondary",
      commenter: "outline",
      viewer: "outline",
    };
    return variants[role] || "outline";
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      owner: "所有者",
      editor: "编辑者",
      commenter: "评论者",
      viewer: "查看者",
    };
    return labels[role] || role;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          <h3 className="font-semibold">在线用户</h3>
          <Badge variant="secondary">{onlineUsers.length}</Badge>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* 在线用户 */}
          {onlineUsers.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">在线</p>
              {onlineUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent"
                >
                  <div className="relative">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={user.avatar} />
                      <AvatarFallback>{user.name[0]}</AvatarFallback>
                    </Avatar>
                    <Circle
                      className="absolute -bottom-0.5 -right-0.5 w-3 h-3 fill-green-500 text-green-500"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">
                        {user.name}
                        {user.id === currentUserId && " (你)"}
                      </p>
                    </div>
                    <Badge variant={getRoleBadge(user.role)} className="text-xs">
                      {getRoleLabel(user.role)}
                    </Badge>
                  </div>
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: user.color }}
                  />
                </div>
              ))}
            </div>
          )}

          {/* 离线用户 */}
          {offlineUsers.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">离线</p>
              {offlineUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 p-2 rounded-lg opacity-60"
                >
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback>{user.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user.name}</p>
                    <Badge variant={getRoleBadge(user.role)} className="text-xs">
                      {getRoleLabel(user.role)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
