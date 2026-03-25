"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Clock, ChevronRight, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type PackSummary = {
  packId: string;
  title: string;
  topic: string;
  active?: boolean;
  stage: "seen" | "understood" | "applied" | "mastered";
  totalStudyMinutes: number;
  updatedAt: string;
  moduleCount: number;
  currentModule: {
    moduleId: string;
    title: string;
    kbDocumentId: string;
    stage: "seen" | "understood" | "applied" | "mastered";
    studyMinutes: number;
    order: number;
  } | null;
};

type JourneyShellProps = {
  className?: string;
};

const STAGE_LABELS: Record<string, string> = {
  seen: "未开始",
  understood: "理解中",
  applied: "应用中",
  mastered: "已掌握",
};

function PackCard({
  pack,
  isActive,
  onSelect,
  onOpenDoc,
}: {
  pack: PackSummary;
  isActive: boolean;
  onSelect: () => void;
  onOpenDoc: () => void;
}) {
  const masteredCount = 0;
  const progress =
    pack.moduleCount > 0
      ? Math.round(((masteredCount + 1) / pack.moduleCount) * 100)
      : 0;

  return (
    <div
      className={cn(
        "rounded-lg border p-3 space-y-2 transition-colors",
        isActive
          ? "border-primary/40 bg-primary/5"
          : "border-transparent bg-muted/30 hover:border-muted"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <BookOpen className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="text-xs font-medium truncate">{pack.title}</span>
        </div>
        <Badge variant="secondary" className="text-xs shrink-0">
          {STAGE_LABELS[pack.stage] ?? pack.stage}
        </Badge>
      </div>

      {pack.currentModule && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="truncate">当前: {pack.currentModule.title}</span>
            <span className="flex items-center gap-0.5 shrink-0">
              <Clock className="h-3 w-3" />
              {pack.currentModule.studyMinutes}m
            </span>
          </div>
          <Progress value={progress} className="h-1" />
        </div>
      )}

      <div className="flex items-center gap-1.5">
        <Button
          size="sm"
          variant="outline"
          className="flex-1 text-xs h-7"
          onClick={onOpenDoc}
        >
          {pack.currentModule?.kbDocumentId ? "进入知识库" : "查看"}
          <ChevronRight className="h-3 w-3 ml-0.5" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-xs h-7 px-2"
          onClick={onSelect}
        >
          图谱
        </Button>
      </div>
    </div>
  );
}

export function JourneyShell({ className }: JourneyShellProps) {
  const router = useRouter();
  const [packs, setPacks] = useState<PackSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch("/api/graph/learning-pack/list", { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load");
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setPacks(data.packs ?? []);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Unknown error");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <Card className={cn("animate-pulse", className)}>
        <CardContent className="p-4 space-y-3">
          <div className="h-4 bg-muted rounded w-3/4" />
          <div className="h-3 bg-muted rounded w-1/2" />
          <div className="h-8 bg-muted rounded w-full" />
        </CardContent>
      </Card>
    );
  }

  if (packs.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <BookOpen className="h-4 w-4" />
            <span>{error ? `暂无学习包（${error}）` : "暂无学习包"}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const activePack = packs.find((pack) => pack.active === true) ?? packs[0];
  const historyPacks = packs.filter((pack) => pack.packId !== activePack.packId);

  return (
    <Card className={cn("h-full", className)}>
      <CardContent className="p-4 h-full min-h-0 flex flex-col gap-3">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <List className="h-3.5 w-3.5" />
          <span>当前学习包</span>
        </div>

        <PackCard
          pack={activePack}
          isActive={true}
          onSelect={() =>
            router.push(
              `/graph?view=path&packId=${encodeURIComponent(activePack.packId)}`
            )
          }
          onOpenDoc={() => {
            if (activePack.currentModule?.kbDocumentId) {
              router.push(
                `/kb?doc=${encodeURIComponent(activePack.currentModule.kbDocumentId)}`
              );
            } else {
              router.push(`/graph?view=path&packId=${encodeURIComponent(activePack.packId)}`);
            }
          }}
        />

        {historyPacks.length > 0 && (
          <>
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground pt-1">
              <BookOpen className="h-3.5 w-3.5" />
              <span>历史 ({historyPacks.length})</span>
            </div>
            <div className="space-y-2 flex-1 min-h-0 overflow-y-auto pr-1">
              {historyPacks.map((pack) => (
                <PackCard
                  key={pack.packId}
                  pack={pack}
                  isActive={false}
                  onSelect={() =>
                    router.push(
                      `/graph?view=path&packId=${encodeURIComponent(pack.packId)}`
                    )
                  }
                  onOpenDoc={() => {
                    if (pack.currentModule?.kbDocumentId) {
                      router.push(
                        `/kb?doc=${encodeURIComponent(pack.currentModule.kbDocumentId)}`
                      );
                    } else {
                      router.push(
                        `/graph?view=path&packId=${encodeURIComponent(pack.packId)}`
                      );
                    }
                  }}
                />
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
