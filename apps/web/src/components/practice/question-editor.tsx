"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  getPracticeStorage,
  Question,
  QuestionType,
  QuestionDifficulty,
  QuestionStatus,
} from "@/lib/client/practice-storage";

interface QuestionEditorProps {
  bankId: string;
  question?: Question | null;
  onClose: () => void;
  onSave: () => void;
}

export function QuestionEditor({
  bankId,
  question,
  onClose,
  onSave,
}: QuestionEditorProps) {
  const [formData, setFormData] = useState({
    title: question?.title || "",
    content: question?.content || "",
    type: question?.type || QuestionType.MULTIPLE_CHOICE,
    difficulty: question?.difficulty || QuestionDifficulty.MEDIUM,
    points: question?.points || 10,
    explanation: question?.explanation || "",
    tags: question?.tags.join(", ") || "",
  });

  const handleSave = async () => {
    try {
      const storage = getPracticeStorage();
      const tags = formData.tags
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t);

      if (question) {
        // 更新
        await storage.updateQuestion({
          ...question,
          ...formData,
          tags,
        });
      } else {
        // 创建
        await storage.createQuestion({
          bankId,
          ...formData,
          status: QuestionStatus.ACTIVE,
          tags,
        });
      }

      onSave();
    } catch (error) {
      console.error("Failed to save question:", error);
      alert("保存失败");
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{question ? "编辑题目" : "创建题目"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="title">题目标题</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              placeholder="简短描述题目"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="type">题目类型</Label>
              <Select
                value={formData.type}
                onValueChange={(value) =>
                  setFormData({ ...formData, type: value as QuestionType })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={QuestionType.MULTIPLE_CHOICE}>
                    选择题
                  </SelectItem>
                  <SelectItem value={QuestionType.FILL_IN_BLANK}>
                    填空题
                  </SelectItem>
                  <SelectItem value={QuestionType.SHORT_ANSWER}>
                    简答题
                  </SelectItem>
                  <SelectItem value={QuestionType.CODING}>编程题</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="difficulty">难度</Label>
              <Select
                value={formData.difficulty}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    difficulty: value as QuestionDifficulty,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={QuestionDifficulty.EASY}>简单</SelectItem>
                  <SelectItem value={QuestionDifficulty.MEDIUM}>
                    中等
                  </SelectItem>
                  <SelectItem value={QuestionDifficulty.HARD}>困难</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="content">题目内容</Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) =>
                setFormData({ ...formData, content: e.target.value })
              }
              placeholder="详细的题目描述"
              rows={6}
            />
          </div>

          <div>
            <Label htmlFor="explanation">答案解析</Label>
            <Textarea
              id="explanation"
              value={formData.explanation}
              onChange={(e) =>
                setFormData({ ...formData, explanation: e.target.value })
              }
              placeholder="解释正确答案和解题思路"
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="points">分值</Label>
              <Input
                id="points"
                type="number"
                min="1"
                max="100"
                value={formData.points}
                onChange={(e) =>
                  setFormData({ ...formData, points: parseInt(e.target.value) })
                }
              />
            </div>

            <div>
              <Label htmlFor="tags">标签（逗号分隔）</Label>
              <Input
                id="tags"
                value={formData.tags}
                onChange={(e) =>
                  setFormData({ ...formData, tags: e.target.value })
                }
                placeholder="例如：数学, 代数"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button
            onClick={handleSave}
            disabled={!formData.title.trim() || !formData.content.trim()}
          >
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
