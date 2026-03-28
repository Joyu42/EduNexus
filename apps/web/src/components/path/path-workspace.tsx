"use client";

import React, { useEffect, useState } from "react";
import EnhancedPathEditor from "@/components/path/enhanced-path-editor";
import { pathStorage, LearningPath } from "@/lib/client/path-storage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, FileText } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export function PathWorkspace() {
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [selectedPathId, setSelectedPathId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function loadPaths() {
      try {
        setIsLoading(true);
        const allPaths = await pathStorage.getAllPaths();
        setPaths(allPaths);
        if (allPaths.length > 0 && !selectedPathId) {
          setSelectedPathId(allPaths[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to load paths"));
      } finally {
        setIsLoading(false);
      }
    }
    loadPaths();
  }, [selectedPathId]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-background text-muted-foreground" data-testid="path-workspace-loading">
        <Loader2 className="h-8 w-8 animate-spin mr-2" />
        Loading workspace...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center bg-background text-destructive" data-testid="path-workspace-error">
        Error: {error.message}
      </div>
    );
  }

  return (
    <div className="flex h-full w-full bg-background" data-testid="path-workspace-loaded">
      {/* Left Sidebar */}
      <div className="w-64 border-r flex flex-col bg-muted/20">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-lg">My Paths</h2>
          <Button variant="ghost" size="icon" title="New Path">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <ScrollArea className="flex-1">
          {paths.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground text-center" data-testid="path-workspace-empty">
              No learning paths yet. Create one to get started!
            </div>
          ) : (
            <div className="p-2 space-y-1" data-testid="path-workspace-list">
              {paths.map(path => (
                <button
                  key={path.id}
                  data-testid={`path-item-${path.id}`}
                  onClick={() => setSelectedPathId(path.id)}
                  className={`w-full text-left px-3 py-2 text-sm rounded-md flex items-center gap-2 transition-colors ${
                    selectedPathId === path.id 
                      ? "bg-primary/10 text-primary font-medium" 
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <FileText className="h-4 w-4 shrink-0" />
                  <span className="truncate">{path.title || "Untitled Path"}</span>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 min-w-0 h-full relative" data-testid="path-workspace-editor">
        {selectedPathId ? (
          <EnhancedPathEditor 
            key={selectedPathId} // Force remount on path change for now to reset state
            // In a real integration, we might want to pass initialNodes/initialEdges here based on the selected path.
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            Select a learning path or create a new one to start editing.
          </div>
        )}
      </div>
    </div>
  );
}
