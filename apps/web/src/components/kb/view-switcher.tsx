"use client";

import { useState, useEffect } from "react";
import { LayoutGrid, List, Clock, Columns } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { motion } from "framer-motion";

export type ViewMode = "list" | "card" | "timeline" | "kanban";

interface ViewSwitcherProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
}

const STORAGE_KEY = "edunexus_kb_view_mode";

export function ViewSwitcher({ currentView, onViewChange }: ViewSwitcherProps) {
  const views: { mode: ViewMode; icon: React.ReactNode; label: string }[] = [
    { mode: "list", icon: <List className="w-4 h-4" />, label: "列表视图" },
    { mode: "card", icon: <LayoutGrid className="w-4 h-4" />, label: "卡片视图" },
    { mode: "timeline", icon: <Clock className="w-4 h-4" />, label: "时间轴视图" },
    { mode: "kanban", icon: <Columns className="w-4 h-4" />, label: "看板视图" },
  ];

  const handleViewChange = (view: ViewMode) => {
    onViewChange(view);
    localStorage.setItem(STORAGE_KEY, view);
  };

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1 p-1 rounded-lg bg-amber-100/50 border border-amber-200">
        {views.map((view) => (
          <Tooltip key={view.mode}>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant={currentView === view.mode ? "default" : "ghost"}
                onClick={() => handleViewChange(view.mode)}
                className={`relative ${
                  currentView === view.mode
                    ? "bg-amber-500 hover:bg-amber-600 text-white"
                    : "hover:bg-amber-50"
                }`}
              >
                {view.icon}
                {currentView === view.mode && (
                  <motion.div
                    layoutId="activeView"
                    className="absolute inset-0 bg-amber-500 rounded-md -z-10"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{view.label}</TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}

export function getSavedViewMode(): ViewMode {
  if (typeof window === "undefined") return "list";
  return (localStorage.getItem(STORAGE_KEY) as ViewMode) || "list";
}
