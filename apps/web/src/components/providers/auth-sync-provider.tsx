"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  clearClientUserSnapshot,
  writeClientUserSnapshot,
} from "@/lib/auth/client-user-cache";

export function AuthSyncProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      const user = {
        id: session.user.id,
        email: session.user.email || undefined,
        isDemo: session.user.isDemo,
      };
      writeClientUserSnapshot(user);
    } else if (status === "unauthenticated") {
      clearClientUserSnapshot();
    }
  }, [session, status]);

  return <>{children}</>;
}
