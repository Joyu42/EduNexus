"use client";

import { Edit, Trash2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Question, QuestionType, QuestionDifficulty } from "@/lib/practice";

interface QuestionListProps {
  questions: Question[];
  onEdit: (question: Question) => void;
  onDelete: (questionId: string) => void;
}

export function QuestionList({ questions, onEdit, onDelete }: QuestionListProps) {
  const getTypeLabel = (type: QuestionType) => {
    const labels = {
      [QuestionType.MULTIPLE_CHOICE]: "选择题",
      [QuestionType.FILL_IN_BLANK]: "填空题",
      [QuestionType.SHORT_ANSWER]: "简答题",
      [QuestionType.CODING]: "编程题",
    };
    return labels[type];
  };

  const getDifficultyColor = (difficulty: QuestionDifficulty) => {
    const colors = {
      [QuestionDifficulty.EASY]: "bg-green-100 text-green-800",
      [QuestionDifficulty.MEDIUM]: "bg-yellow-100 text-yellow-800",
      [QuestionDifficulty.HARD]: "bg-red-100 text-red-800",
    };
    return colors[difficulty];
  };

  if (questions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">还没有题目</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>标题</TableHead>
          <TableHead>类型</TableHead>
          <TableHead>难度</TableHead>
          <TableHead>分值</TableHead>
          <TableHead>标签</TableHead>
          <TableHead className="text-right">操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {questions.map((question) => (
          <TableRow key={question.id}>
            <TableCell className="font-medium">{question.title}</TableCell>
            <TableCell>{getTypeLabel(question.type)}</TableCell>
            <TableCell>
              <Badge className={getDifficultyColor(question.difficulty)}>
                {question.difficulty}
              </Badge>
            </TableCell>
            <TableCell>{question.points}</TableCell>
            <TableCell>
              <div className="flex gap-1 flex-wrap">
                {question.tags.slice(0, 2).map((tag, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {question.tags.length > 2 && (
                  <Badge variant="outline" className="text-xs">
                    +{question.tags.length - 2}
                  </Badge>
                )}
              </div>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(question)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (confirm("确定要删除这道题吗？")) {
                      onDelete(question.id);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
