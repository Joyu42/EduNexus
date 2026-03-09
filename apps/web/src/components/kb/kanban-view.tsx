"use client";

import { useState, useMemo } from "react";
import { FileText, Plus, GripVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { KBDocument } from "@/lib/client/kb-storage";

interface KanbanViewProps {
  documents: KBDocument[];
  onSelectDocument: (doc: KBDocument) => void;
  selectedDocId?: string;
  onUpdateDocumentStatus?: (docId: string, status: string) => void;
}

type KanbanColumn = {
  id: string;
  title: string;
  color: string;
  documents: KBDocument[];
};

const DEFAULT_COLUMNS = [
  { id: "todo", title: "待学习", color: "bg-gray-100 border-gray-300" },
  { id: "in-progress", title: "学习中", color: "bg-blue-100 border-blue-300" },
  { id: "done", title: "已完成", color: "bg-green-100 border-green-300" },
];

export function KanbanView({
  documents,
  onSelectDocument,
  selectedDocId,
  onUpdateDocumentStatus,
}: KanbanViewProps) {
  const [columns, setColumns] = useState(DEFAULT_COLUMNS);
  const [draggedDoc, setDraggedDoc] = useState<KBDocument | null>(null);
  const [newColumnName, setNewColumnName] = useState("");
  const [showAddColumn, setShowAddColumn] = useState(false);

  // 根据文档标签分配到列
  const kanbanColumns = useMemo(() => {
    return columns.map((col) => {
      const colDocs = documents.filter((doc) => {
        // 检查文档标签中是否包含状态标签
        const statusTag = doc.tags.find((tag) =>
          tag.toLowerCase().includes(col.id) ||
          tag === col.title ||
          (col.id === "todo" && tag.includes("待")) ||
          (col.id === "in-progress" && tag.includes("进行")) ||
          (col.id === "done" && tag.includes("完成"))
        );
        return statusTag !== undefined;
      });

      // 如果没有状态标签，默认放到"待学习"
      if (col.id === "todo") {
        const untaggedDocs = documents.filter((doc) => {
          return !columns.some((c) =>
            doc.tags.some((tag) =>
              tag.toLowerCase().includes(c.id) ||
              tag === c.title ||
              (c.id === "in-progress" && tag.includes("进行")) ||
              (c.id === "done" && tag.includes("完成"))
            )
          );
        });
        return { ...col, documents: [...colDocs, ...untaggedDocs] };
      }

      return { ...col, documents: colDocs };
    });
  }, [documents, columns]);

  const handleDragStart = (doc: KBDocument) => {
    setDraggedDoc(doc);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (columnId: string) => {
    if (!draggedDoc) return;

    // 更新文档状态
    if (onUpdateDocumentStatus) {
      onUpdateDocumentStatus(draggedDoc.id, columnId);
    }

    setDraggedDoc(null);
  };

  const addCustomColumn = () => {
    if (!newColumnName.trim()) return;

    const newColumn = {
      id: `custom-${Date.now()}`,
      title: newColumnName,
      color: "bg-purple-100 border-purple-300",
    };

    setColumns([...columns, newColumn]);
    setNewColumnName("");
    setShowAddColumn(false);
  };

  const getExcerpt = (content: string) => {
    const text = content.replace(/[#*`\[\]]/g, "").trim();
    return text.length > 60 ? text.substring(0, 60) + "..." : text;
  };

  return (
    <div className="space-y-4">
      {/* 看板容器 */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {kanbanColumns.map((column) => (
          <div
            key={column.id}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(column.id)}
            className="flex-shrink-0 w-80"
          >
            {/* 列标题 */}
            <div
              className={`p-3 rounded-t-lg border-2 ${column.color} flex items-center justify-between`}
            >
              <h3 className="font-semibold text-gray-900">{column.title}</h3>
              <Badge variant="secondary" className="bg-white/50">
                {column.documents.length}
              </Badge>
            </div>

            {/* 卡片列表 */}
            <div
              className={`min-h-[400px] p-3 rounded-b-lg border-2 border-t-0 ${column.color} space-y-3`}
            >
              <AnimatePresence>
                {column.documents.map((doc) => (
                  <motion.div
                    key={doc.id}
                    layout
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    draggable
                    onDragStart={() => handleDragStart(doc)}
                    onClick={() => onSelectDocument(doc)}
                    className={`p-3 rounded-lg border-2 cursor-move transition-all ${
                      selectedDocId === doc.id
                        ? "bg-amber-100 border-amber-400 shadow-lg"
                        : "bg-white border-gray-200 hover:border-amber-300 hover:shadow-md"
                    }`}
                  >
                    {/* 拖拽手柄 */}
                    <div className="flex items-start gap-2 mb-2">
                      <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-start gap-2">
                          <FileText className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                          <h4 className="font-medium text-amber-950 text-sm line-clamp-2">
                            {doc.title}
                          </h4>
                        </div>
                      </div>
                    </div>

                    {/* 摘要 */}
                    <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                      {getExcerpt(doc.content)}
                    </p>

                    {/* 标签 */}
                    <div className="flex flex-wrap gap-1">
                      {doc.tags
                        .filter(
                          (tag) =>
                            !tag.includes("待") &&
                            !tag.includes("进行") &&
                            !tag.includes("完成") &&
                            !columns.some((c) => tag === c.title)
                        )
                        .slice(0, 2)
                        .map((tag) => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className="text-xs bg-blue-50 text-blue-700 border-blue-200"
                          >
                            {tag}
                          </Badge>
                        ))}
                    </div>

                    {/* 更新时间 */}
                    <div className="text-xs text-gray-500 mt-2">
                      {doc.updatedAt.toLocaleDateString("zh-CN")}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        ))}

        {/* 添加自定义列 */}
        <div className="flex-shrink-0 w-80">
          {showAddColumn ? (
            <div className="p-3 rounded-lg border-2 border-dashed border-amber-300 bg-amber-50">
              <Input
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                placeholder="列名称"
                className="mb-2"
                onKeyDown={(e) => {
                  if (e.key === "Enter") addCustomColumn();
                  if (e.key === "Escape") setShowAddColumn(false);
                }}
                autoFocus
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={addCustomColumn} className="flex-1">
                  添加
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowAddColumn(false)}
                  className="flex-1"
                >
                  取消
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              onClick={() => setShowAddColumn(true)}
              className="w-full h-full min-h-[100px] border-2 border-dashed border-amber-300 hover:border-amber-400 hover:bg-amber-50"
            >
              <Plus className="w-5 h-5 mr-2" />
              添加列
            </Button>
          )}
        </div>
      </div>

      {/* 提示 */}
      <div className="text-xs text-amber-600 text-center">
        拖拽卡片到不同列来改变状态
      </div>
    </div>
  );
}
