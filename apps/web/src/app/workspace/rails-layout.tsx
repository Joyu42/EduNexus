"use client";

import type { ReactNode } from "react";
import { PanelLeftClose, PanelRightClose } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type WorkspaceRailsLayoutProps = {
  leftCollapsed: boolean;
  rightCollapsed: boolean;
  onExpandLeft: () => void;
  onExpandRight: () => void;
  left: ReactNode;
  center: ReactNode;
  right: ReactNode;
};

export function WorkspaceRailsLayout({
  leftCollapsed,
  rightCollapsed,
  onExpandLeft,
  onExpandRight,
  left,
  center,
  right,
}: WorkspaceRailsLayoutProps) {
  return (
    <div className="relative flex h-screen overflow-hidden bg-gradient-to-br from-orange-50/30 via-amber-50/20 to-rose-50/30">
      {leftCollapsed ? (
        <div className="absolute top-4 left-4 z-10">
          <Button
            data-testid="workspace-left-rail-expand"
            variant="ghost"
            size="icon"
            onClick={onExpandLeft}
            className={cn("h-8 w-8 bg-white/70 hover:bg-white shadow-sm rounded-lg transition-all duration-300 text-slate-700")}
            aria-label="展开左侧边栏"
            aria-expanded={false}
          >
            <PanelLeftClose className="h-4 w-4 rotate-180 transition-transform duration-300" />
          </Button>
        </div>
      ) : (
        left
      )}

      <div data-testid="workspace-center-pane" className="flex-1 flex flex-col min-w-0 h-full">
        {center}
      </div>

      {rightCollapsed ? (
        <div className="absolute top-4 right-4 z-10">
          <Button
            data-testid="workspace-right-rail-expand"
            variant="ghost"
            size="icon"
            onClick={onExpandRight}
            className={cn("h-8 w-8 bg-white/70 hover:bg-white shadow-sm rounded-lg transition-all duration-300 text-slate-700")}
            aria-label="展开右侧边栏"
            aria-expanded={false}
          >
            <PanelRightClose className="h-4 w-4 rotate-180 transition-transform duration-300" />
          </Button>
        </div>
      ) : (
        right
      )}
    </div>
  );
}
