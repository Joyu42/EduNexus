"use client";

import { useEffect, useState } from "react";
import EnhancedPathEditor from "@/components/path/enhanced-path-editor";
import { pathStorage, type LearningPath, type Task } from "@/lib/client/path-storage";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, FileText } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Edge, Node } from "reactflow";
import type { PathNodeData } from "@/lib/path/path-types";
import { PathCreateDialog } from "./path-create-dialog";

function createEmptyTask(id: string, title: string): Task {
  return {
    id,
    title,
    description: "",
    estimatedTime: "30m",
    progress: 0,
    status: "not_started",
    dependencies: [],
    resources: [],
    notes: "",
    createdAt: new Date(),
  };
}

function toEditorNodes(path: LearningPath): Node<PathNodeData>[] {
  return (path.tasks ?? []).map((task, index) => ({
    id: task.id,
    type: "default",
    position: { x: 100 + index * 220, y: 160 },
    data: {
      label: task.title,
      type: "document",
      description: task.description,
      estimatedTime: Number.parseInt(task.estimatedTime, 10) || 30,
      difficulty: "beginner",
      status: task.status,
      metadata: {
        documentBinding: task.documentBinding,
      },
    },
  }));
}

function toEditorEdges(path: LearningPath): Edge[] {
  const edges: Edge[] = [];
  (path.tasks ?? []).forEach((task) => {
    task.dependencies.forEach((sourceId) => {
      edges.push({
        id: `${sourceId}->${task.id}`,
        source: sourceId,
        target: task.id,
        animated: true,
        type: "smoothstep",
      });
    });
  });
  return edges;
}

type PathWorkspaceProps = {
  packId?: string;
};

export function PathWorkspace({ packId }: PathWorkspaceProps) {
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [selectedPathId, setSelectedPathId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  useEffect(() => {
    async function loadPaths() {
      try {
        setIsLoading(true);
        const allPaths = await pathStorage.getAllPaths(packId);
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
  }, [packId, selectedPathId]);

  const selectedPath = paths.find((path) => path.id === selectedPathId) ?? null;

  const handleSave = async (nodes: Node<PathNodeData>[], edges: Edge[]) => {
    if (!selectedPath) {
      return;
    }

    const removedTasks = (selectedPath.tasks ?? []).filter((task) => !nodes.some((node) => node.id === task.id));
    const orderedTasks = nodes.map((node, index) => {
      const existingTask = (selectedPath.tasks ?? []).find((task) => task.id === node.id);
      const binding = node.data.metadata?.documentBinding as Task["documentBinding"] | undefined;
      return {
        ...(existingTask ?? createEmptyTask(node.id, node.data.label?.trim() || `学习节点 ${index + 1}`)),
        id: node.id,
        title: node.data.label?.trim() || `学习节点 ${index + 1}`,
        description: node.data.description?.trim() || "",
        estimatedTime: `${Number(node.data.estimatedTime ?? 30)}分钟`,
        progress: node.data.status === "completed" ? 100 : node.data.status === "in_progress" ? 50 : 0,
        status: node.data.status ?? "not_started",
        dependencies: edges.filter((edge) => edge.target === node.id).map((edge) => edge.source),
        documentBinding: binding && binding.documentId ? binding : undefined,
      };
    });

    const nextPath = await pathStorage.updatePath(selectedPath.id, {
      title: selectedPath.title,
      description: selectedPath.description,
      tags: selectedPath.tags,
      tasks: orderedTasks,
      milestones: selectedPath.milestones,
      deletedDocumentDrafts: [
        ...(selectedPath.deletedDocumentDrafts ?? []),
        ...removedTasks
          .map((task) => task.documentBinding?.draft)
          .filter((draft): draft is NonNullable<typeof draft> => Boolean(draft)),
      ],
    });

    setPaths((current) => current.map((path) => (path.id === nextPath.id ? nextPath : path)));
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-background text-muted-foreground" data-testid="path-workspace-loading">
        <Loader2 className="h-8 w-8 animate-spin mr-2" />
        加载工作区...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center bg-background text-destructive" data-testid="path-workspace-error">
        错误: {error.message}
      </div>
    );
  }

  return (
    <div className="flex h-full w-full bg-background" data-testid="path-workspace-loaded">
      {/* Left Sidebar */}
      <div className="w-64 border-r flex flex-col bg-muted/20">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-lg">我的学习路径</h2>
          <Button variant="ghost" size="icon" title="新建路径" onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <ScrollArea className="flex-1">
          {paths.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground text-center" data-testid="path-workspace-empty">
              暂无学习路径。请新建一个学习路径开始！
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
                  <span className="truncate">{path.title || "未命名路径"}</span>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 min-w-0 h-full relative" data-testid="path-workspace-editor">
        {selectedPath ? (
          <EnhancedPathEditor 
            key={selectedPathId}
            initialNodes={toEditorNodes(selectedPath)}
            initialEdges={toEditorEdges(selectedPath)}
            onSave={handleSave}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            选择或新建一个学习路径开始编辑。
          </div>
        )}
      </div>

      <PathCreateDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={async ({ title, description, tags, goalId }) => {
          const newPath = await pathStorage.createPath({
            title,
            description,
            tags,
            goalId,
            status: "not_started",
            progress: 0,
            tasks: [],
            milestones: []
          });
          setPaths((current) => [...current, newPath]);
          setSelectedPathId(newPath.id);
          setIsCreateDialogOpen(false);
        }}
      />
    </div>
  );
}
