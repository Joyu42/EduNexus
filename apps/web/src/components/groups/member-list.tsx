import React from "react";
import { Badge } from "@/components/ui/badge";

export type GroupMemberProps = {
  id: string;
  userId: string;
  role: string;
  status: string;
};

export function MemberList({ members }: { members: GroupMemberProps[] }) {
  if (members.length === 0) {
    return <div className="text-sm text-muted-foreground p-3 text-center">暂无成员</div>;
  }

  return (
    <div className="space-y-2">
      {members.map((member) => (
        <div key={member.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
          <span className="truncate max-w-[150px]" title={member.userId}>
            {member.userId.slice(0, 8)}...
          </span>
          <Badge variant="secondary">{member.role}</Badge>
        </div>
      ))}
    </div>
  );
}
