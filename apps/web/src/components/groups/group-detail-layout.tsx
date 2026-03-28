import React from "react";
import { ArrowLeft, Calendar, Info, User, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function formatDate(dateString?: string | null) {
  if (!dateString) return "未知时间";
  try {
    return new Intl.DateTimeFormat("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateString));
  } catch {
    return dateString;
  }
}

export type DetailGroupProps = {
  name: string;
  description?: string;
  memberCount: number;
  createdBy: string;
  createdAt: string;
};

export function GroupDetailLayout({
  group,
  onBack,
  headerAction,
  children,
}: {
  group: DetailGroupProps;
  onBack: () => void;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/40 via-indigo-50/20 to-violet-50/30">
      <div className="container mx-auto px-4 py-8 max-w-5xl space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">{group.name}</h1>
              <div className="text-sm text-muted-foreground flex items-center gap-4 mt-1">
                <span className="inline-flex items-center gap-1">
                  <User className="h-3.5 w-3.5" />
                  创建者 {group.createdBy}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {group.memberCount} 位成员
                </span>
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDate(group.createdAt)}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">{headerAction}</div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              小组描述
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-7 text-muted-foreground whitespace-pre-wrap">
            {group.description || "创建者未提供描述。"}
          </CardContent>
        </Card>

        {children}
      </div>
    </div>
  );
}
