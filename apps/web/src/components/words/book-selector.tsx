import { motion } from "framer-motion";
import { BookOpen, CheckCircle2, Edit, Trash2, UploadCloud, MoreHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { WordBook } from "@/lib/words/types";

type BookSelectorProps = {
  books: WordBook[];
  selectedBookId?: string;
  progressByBook: Record<string, number>;
  dueByBook: Record<string, number>;
  onSelect: (bookId: string) => void;
  onManage?: (bookId: string) => void;
  onReplace?: (bookId: string) => void;
  onDelete?: (bookId: string) => void;
};

export function BookSelector({
  books,
  selectedBookId,
  progressByBook,
  dueByBook,
  onSelect,
  onManage,
  onReplace,
  onDelete,
}: BookSelectorProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {books.map((book, index) => {
        const isSelected = selectedBookId === book.id;
        return (
          <motion.div
            key={book.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
            data-testid={`words-book-card-${book.id}`}
          >
            <Card
              className={
                isSelected
                  ? "border-emerald-400 bg-emerald-50/70"
                  : "border-slate-200 bg-white/90"
              }
            >
              <CardHeader className="space-y-2 pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{book.name}</CardTitle>
                  {isSelected ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : null}
                </div>
                <CardDescription>{book.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge variant="outline">
                    <BookOpen className="mr-1 h-3 w-3" />
                    {book.wordCount} words
                  </Badge>
                  <Badge variant="outline">Progress {progressByBook[book.id] ?? 0}%</Badge>
                  <Badge variant="outline">Due {dueByBook[book.id] ?? 0}</Badge>
                </div>
                <Button
                  className="w-full"
                  variant={isSelected ? "secondary" : "default"}
                  onClick={() => onSelect(book.id)}
                >
                  {isSelected ? "当前词库" : "选择词库"}
                </Button>
                {book.category === "custom" && (
                  <div className="flex justify-end gap-1 pt-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onManage?.(book.id)}
                      data-testid={`words-book-manage-${book.id}`}
                      title="编辑信息"
                    >
                      <Edit className="h-4 w-4 text-slate-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onReplace?.(book.id)}
                      data-testid={`words-book-replace-${book.id}`}
                      title="替换词库"
                    >
                      <UploadCloud className="h-4 w-4 text-slate-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-red-50 hover:text-red-600"
                      onClick={() => onDelete?.(book.id)}
                      data-testid={`words-book-delete-${book.id}`}
                      title="删除词库"
                    >
                      <Trash2 className="h-4 w-4 text-slate-500" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
