"use client";

import { useState, useEffect, useMemo } from "react";
import { FileText, ChevronDown, ChevronRight, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { KBDocument } from "@/lib/client/kb-storage";

interface TimelineViewProps {
  documents: KBDocument[];
  onSelectDocument: (doc: KBDocument) => void;
  selectedDocId?: string;
}

type TimeGroup = {
  label: string;
  documents: KBDocument[];
};

export function TimelineView({ documents, onSelectDocument, selectedDocId }: TimelineViewProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(["今天", "昨天", "本周"]));
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const timeGroups = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(today);
    monthStart.setDate(monthStart.getDate() - 30);

    const groups: TimeGroup[] = [
      { label: "今天", documents: [] },
      { label: "昨天", documents: [] },
      { label: "本周", documents: [] },
      { label: "本月", documents: [] },
      { label: "更早", documents: [] },
    ];

    documents.forEach((doc) => {
      const docDate = new Date(doc.updatedAt);
      const docDay = new Date(docDate.getFullYear(), docDate.getMonth(), docDate.getDate());

      if (docDay.getTime() === today.getTime()) {
        groups[0].documents.push(doc);
      } else if (docDay.getTime() === yesterday.getTime()) {
        groups[1].documents.push(doc);
      } else if (docDate >= weekStart) {
        groups[2].documents.push(doc);
      } else if (docDate >= monthStart) {
        groups[3].documents.push(doc);
      } else {
        groups[4].documents.push(doc);
      }
    });

    return groups.filter((group) => group.documents.length > 0);
  }, [documents]);

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  };

  const getExcerpt = (content: string) => {
    const text = content.replace(/[#*`\[\]]/g, "").trim();
    return text.length > 80 ? text.substring(0, 80) + "..." : text;
  };

  return (
    <div className="space-y-6">
      {timeGroups.map((group) => (
        <div key={group.label} className="relative">
          {/* 时间线 */}
          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-amber-200" />

          {/* 分组标题 */}
          <div className="flex items-center gap-3 mb-4">
            <div className="relative z-10 flex items-center justify-center w-8 h-8 rounded-full bg-amber-500 text-white">
              <Clock className="w-4 h-4" />
            </div>
            <Button
              variant="ghost"
              onClick={() => toggleGroup(group.label)}
              className="flex items-center gap-2 text-lg font-semibold text-amber-950 hover:bg-amber-50"
            >
              {expandedGroups.has(group.label) ? (
                <ChevronDown className="w-5 h-5" />
              ) : (
                <ChevronRight className="w-5 h-5" />
              )}
              {group.label}
              <span className="text-sm font-normal text-amber-600">
                ({group.documents.length})
              </span>
            </Button>
          </div>

          {/* 文档列表 */}
          <AnimatePresence>
            {expandedGroups.has(group.label) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="ml-12 space-y-3"
              >
                {group.documents.map((doc, index) => (
                  <motion.div
                    key={doc.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => onSelectDocument(doc)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedDocId === doc.id
                        ? "bg-amber-100 border-amber-400 shadow-md"
                        : "bg-white border-amber-200 hover:border-amber-300 hover:shadow-sm"
                    }`}
                  >
                    {/* 标题和时间 */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-start gap-2 flex-1">
                        <FileText className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <h3 className="font-semibold text-amber-950">{doc.title}</h3>
                      </div>
                      <span className="text-xs text-amber-600 whitespace-nowrap" suppressHydrationWarning>
                        {isMounted ? doc.updatedAt.toLocaleTimeString("zh-CN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        }) : ""}
                      </span>
                    </div>

                    {/* 摘要 */}
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {getExcerpt(doc.content)}
                    </p>

                    {/* 标签 */}
                    <div className="flex flex-wrap gap-1">
                      {doc.tags.slice(0, 4).map((tag) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className="text-xs bg-blue-50 text-blue-700 border-blue-200"
                        >
                          {tag}
                        </Badge>
                      ))}
                      {doc.tags.length > 4 && (
                        <Badge variant="outline" className="text-xs bg-gray-50 text-gray-600">
                          +{doc.tags.length - 4}
                        </Badge>
                      )}
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}

      {timeGroups.length === 0 && (
        <div className="text-center py-12 text-amber-600">
          <Clock className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>暂无文档</p>
        </div>
      )}
    </div>
  );
}
