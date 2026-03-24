"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Clock, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type ActivePackSummary = {
  packId: string;
  title: string;
  topic: string;
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

const STAGE_LABELS = {
  seen: "未开始",
  understood: "理解中",
  applied: "应用中",
  mastered: "已掌握",
};

const STAGE_COLORS = {
  seen: "bg-gray-400",
  understood: "bg-blue-500",
  applied: "bg-yellow-500",
  mastered: "bg-green-500",
};

export function JourneyShell({ className }: JourneyShellProps) {
  const router = useRouter();
  const [pack, setPack] = useState<ActivePackSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch("/api/graph/learning-pack/active", { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load");
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setPack(data.pack ?? null);
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
        <CardContent className="p-4">
          <div className="h-4 bg-muted rounded w-3/4 mb-2" />
          <div className="h-3 bg-muted rounded w-1/2" />
        </CardContent>
      </Card>
    );
  }

  if (error || !pack) {
    return null;
  }

  const masteredCount = 0;
  const progress = pack.moduleCount > 0 ? Math.round(((masteredCount + 1) / pack.moduleCount) * 100) : 0;

  return (
    <Card className={cn("", className)}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium truncate">{pack.title}</span>
          </div>
          <Badge variant="secondary" className="text-xs">
            {STAGE_LABELS[pack.stage] ?? pack.stage}
          </Badge>
        </div>

        {pack.currentModule && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>当前: {pack.currentModule.title}</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {pack.currentModule.studyMinutes}m
              </span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 text-xs h-8"
            onClick={() => {
              if (pack.currentModule?.kbDocumentId) {
                router.push(`/kb?doc=${encodeURIComponent(pack.currentModule.kbDocumentId)}`);
              } else {
                router.push("/graph?view=path");
              }
            }}
          >
            进入知识库
            <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-xs h-8"
            onClick={() => router.push(`/graph?view=path&packId=${encodeURIComponent(pack.packId)}`)}
          >
            查看图谱
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
