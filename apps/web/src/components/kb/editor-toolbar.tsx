"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { SaveStatusIndicator } from "./save-status-indicator";

interface EditorToolbarProps {
  mode: "source" | "render";
  onModeChange: (mode: "source" | "render") => void;
  isSaving: boolean;
  lastSaved: Date | null;
  wordCount: number;
}

export function EditorToolbar({ mode, onModeChange, isSaving, lastSaved, wordCount }: EditorToolbarProps) {
  return (
    <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
      <div className="flex items-center gap-2 px-4 py-2">
        <div className="inline-flex items-center rounded-md border bg-muted/30 p-1">
          <Button
            type="button"
            variant={mode === "source" ? "default" : "ghost"}
            size="sm"
            onClick={() => onModeChange("source")}
            aria-pressed={mode === "source"}
            className={cn("h-8 rounded-sm px-3", mode === "source" && "shadow-sm")}
          >
            源码
          </Button>
          <Button
            type="button"
            variant={mode === "render" ? "default" : "ghost"}
            size="sm"
            onClick={() => onModeChange("render")}
            aria-pressed={mode === "render"}
            className={cn("h-8 rounded-sm px-3", mode === "render" && "shadow-sm")}
          >
            渲染
          </Button>
        </div>

        <div className="ml-auto flex items-center gap-3 text-sm text-muted-foreground">
          <span>{wordCount.toLocaleString()} 字</span>
          <Separator orientation="vertical" className="h-4" />
          <SaveStatusIndicator
            status={isSaving ? "saving" : lastSaved ? "saved" : "idle"}
            lastSaved={lastSaved}
            showDetails={false}
          />
        </div>
      </div>
    </div>
  );
}
