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
import { Share2, Copy, Check, Link as LinkIcon } from "lucide-react";

interface ShareDialogProps {
  sessionId: string;
  inviteCode: string;
  isPublic: boolean;
  onTogglePublic?: () => void;
}

export function ShareDialog({
  sessionId,
  inviteCode,
  isPublic,
  onTogglePublic,
}: ShareDialogProps) {
  const [copied, setCopied] = useState(false);
  const shareUrl = `${window.location.origin}/collab/${sessionId}?invite=${inviteCode}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Share2 className="w-4 h-4 mr-2" />
          分享
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>分享协作会话</DialogTitle>
          <DialogDescription>
            通过链接邀请其他人加入协作编辑
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>邀请链接</Label>
            <div className="flex gap-2">
              <Input value={shareUrl} readOnly className="flex-1" />
              <Button size="icon" onClick={handleCopy}>
                {copied ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>邀请码</Label>
            <div className="flex items-center gap-2">
              <Input value={inviteCode} readOnly className="flex-1" />
              <Badge variant="secondary">{inviteCode}</Badge>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div className="flex items-center gap-2">
              <LinkIcon className="w-4 h-4" />
              <div>
                <p className="text-sm font-medium">公开访问</p>
                <p className="text-xs text-muted-foreground">
                  任何人都可以通过链接访问
                </p>
              </div>
            </div>
            <Button
              variant={isPublic ? "default" : "outline"}
              size="sm"
              onClick={onTogglePublic}
            >
              {isPublic ? "已开启" : "已关闭"}
            </Button>
          </div>

          <div className="text-xs text-muted-foreground">
            <p>提示：</p>
            <ul className="list-disc list-inside space-y-1 mt-1">
              <li>邀请链接永久有效</li>
              <li>可以随时修改访问权限</li>
              <li>所有者可以管理用户权限</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
