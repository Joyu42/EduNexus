"use client";

import { useState } from "react";
import { FileText, Tag, Clock, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { KBDocument } from "@/lib/client/kb-storage";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CardViewProps {
  documents: KBDocument[];
  onSelectDocument: (doc: KBDocument) => void;
  selectedDocId?: string;
}

type CardSize = "small" | "medium" | "large";

export function CardView({ documents, onSelectDocument, selectedDocId }: CardViewProps) {
  const [cardSize, setCardSize] = useState<CardSize>("medium");

  const getSizeClasses = () => {
    switch (cardSize) {
      case "small":
        return "w-64 h-40";
      case "medium":
        return "w-80 h-48";
      case "large":
        return "w-96 h-56";
    }
  };

  const getExcerpt = (content: string, maxLength: number) => {
    const text = content.replace(/[#*`\[\]]/g, "").trim();
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
  };

  const getExcerptLength = () => {
    switch (cardSize) {
      case "small":
        return 60;
      case "medium":
        return 100;
      case "large":
        return 150;
    }
  };

  return (
    <div className="space-y-4">
      {/* 控制栏 */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-amber-600">
          共 {documents.length} 个文档
        </span>
        <Select value={cardSize} onValueChange={(value: CardSize) => setCardSize(value)}>
          <SelectTrigger className="w-32 h-8 text-xs border-amber-200">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="small">小卡片</SelectItem>
            <SelectItem value="medium">中卡片</SelectItem>
            <SelectItem value="large">大卡片</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 卡片网格 */}
      <motion.div
        layout
        className="grid gap-4"
        style={{
          gridTemplateColumns: `repeat(auto-fill, minmax(${
            cardSize === "small" ? "16rem" : cardSize === "medium" ? "20rem" : "24rem"
          }, 1fr))`,
        }}
      >
        <AnimatePresence mode="popLayout">
          {documents.map((doc) => (
            <motion.div
              key={doc.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              whileHover={{ scale: 1.02, y: -4 }}
              className={`${getSizeClasses()} cursor-pointer`}
              onClick={() => onSelectDocument(doc)}
            >
              <div
                className={`h-full p-4 rounded-lg border-2 transition-all ${
                  selectedDocId === doc.id
                    ? "bg-amber-100 border-amber-400 shadow-lg"
                    : "bg-white border-amber-200 hover:border-amber-300 hover:shadow-md"
                }`}
              >
                {/* 标题 */}
                <div className="flex items-start gap-2 mb-3">
                  <FileText className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <h3 className="font-semibold text-amber-950 line-clamp-2 flex-1">
                    {doc.title}
                  </h3>
                </div>

                {/* 摘要 */}
                <p className="text-sm text-gray-600 line-clamp-3 mb-3">
                  {getExcerpt(doc.content, getExcerptLength())}
                </p>

                {/* 标签 */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {doc.tags.slice(0, 3).map((tag) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="text-xs bg-blue-50 text-blue-700 border-blue-200"
                    >
                      <Tag className="w-3 h-3 mr-1" />
                      {tag}
                    </Badge>
                  ))}
                  {doc.tags.length > 3 && (
                    <Badge variant="outline" className="text-xs bg-gray-50 text-gray-600">
                      +{doc.tags.length - 3}
                    </Badge>
                  )}
                </div>

                {/* 底部信息 */}
                <div className="flex items-center justify-between text-xs text-amber-600 mt-auto">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{doc.updatedAt.toLocaleDateString("zh-CN")}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-xs hover:bg-amber-200"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectDocument(doc);
                    }}
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    查看
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {documents.length === 0 && (
        <div className="text-center py-12 text-amber-600">
          <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>暂无文档</p>
        </div>
      )}
    </div>
  );
}
