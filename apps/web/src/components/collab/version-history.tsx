"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import type { CollabVersion } from "@/lib/collab/collab-types";
import { History, Clock, User, FileText, RotateCcw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

interface VersionHistoryProps {
  versions: CollabVersion[];
  currentVersion?: string;
  onRestore?: (version: CollabVersion) => void;
  onCompare?: (v1: CollabVersion, v2: CollabVersion) => void;
}

export function VersionHistory({
  versions,
  currentVersion,
  onRestore,
  onCompare,
}: VersionHistoryProps) {
  const [selectedVersion, setSelectedVersion] = useState<CollabVersion | null>(null);

  const handleCompare = (version: CollabVersion) => {
    if (selectedVersion && onCompare) {
      onCompare(selectedVersion, version);
      setSelectedVersion(null);
    } else {
      setSelectedVersion(version);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5" />
          <h3 className="font-semibold">版本历史</h3>
          <Badge variant="secondary">{versions.length}</Badge>
        </div>
        {selectedVersion && (
          <p className="text-sm text-muted-foreground mt-2">
            选择另一个版本进行对比
          </p>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {versions.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <History className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>暂无版本历史</p>
            </div>
          ) : (
            versions.map((version, index) => {
              const isSelected = selectedVersion?.id === version.id;
              const isCurrent = currentVersion === version.id;

              return (
                <div
                  key={version.id}
                  className={`p-3 rounded-lg border transition-colors ${
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-accent"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          版本 {versions.length - index}
                        </span>
                        {isCurrent && (
                          <Badge variant="default" className="text-xs">
                            当前
                          </Badge>
                        )}
                      </div>

                      {version.description && (
                        <p className="text-sm text-muted-foreground">
                          {version.description}
                        </p>
                      )}

                      {version.changesSummary && (
                        <p className="text-xs text-muted-foreground">
                          {version.changesSummary}
                        </p>
                      )}

                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          <span>{version.createdByName}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>
                            {formatDistanceToNow(new Date(version.createdAt), {
                              addSuffix: true,
                              locale: zhCN,
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      {onRestore && !isCurrent && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onRestore(version)}
                        >
                          <RotateCcw className="w-3 h-3" />
                        </Button>
                      )}
                      {onCompare && (
                        <Button
                          size="sm"
                          variant={isSelected ? "default" : "ghost"}
                          onClick={() => handleCompare(version)}
                        >
                          对比
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
