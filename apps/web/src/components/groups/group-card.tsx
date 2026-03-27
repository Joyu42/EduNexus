import React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export type GroupProps = {
  id: string;
  name: string;
  description?: string;
  memberCount: number;
};

export function GroupCard({ group }: { group: GroupProps }) {
  return (
    <Link href={`/groups/${group.id}`} className="group block">
      <Card className="p-5 flex flex-col h-full transition-all hover:shadow-md hover:border-blue-200 border-border/50 cursor-pointer">
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
    </Link>
  );
}
