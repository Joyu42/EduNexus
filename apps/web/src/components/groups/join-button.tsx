import React from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export function JoinButton({
  isJoined,
  isLoading,
  onJoin,
  onLeave,
}: {
  isJoined: boolean;
  isLoading: boolean;
  onJoin: () => void;
  onLeave: () => void;
}) {
  if (isJoined) {
    return (
      <Button variant="outline" onClick={onLeave} disabled={isLoading}>
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "离开小组"}
      </Button>
    );
  }

  return (
    <Button onClick={onJoin} disabled={isLoading}>
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "加入小组"}
    </Button>
  );
}
