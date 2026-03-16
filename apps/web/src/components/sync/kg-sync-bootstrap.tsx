"use client";

import { useKGSyncCoordinator } from "@/lib/sync/use-data-sync";

export function KGSyncBootstrap() {
  useKGSyncCoordinator();
  return null;
}
