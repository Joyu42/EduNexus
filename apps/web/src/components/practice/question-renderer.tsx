"use client";

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Question, QuestionType } from "@/lib/practice";

interface QuestionRendererProps {
  question: Question;
  answer?: string;
  onAnswer: (answer: string) => void;
  showCorrectAnswer?: boolean;
}

export function QuestionRenderer({
  question,
  answer,
  onAnswer,
  showCorrectAnswer = false,
}: QuestionRendererProps) {
  return (
    <div className="space-y-4">
      <div className="prose prose-sm max-w-none">
        <p className="whitespace-pre-wrap">{question.content}</p>
      </div>

      {question.type === QuestionType.MULTIPLE_CHOICE && question.options && (
        <RadioGroup value={answer} onValueChange={onAnswer}>
          <div className="space-y-2">
            {question.options.map((option) => (
              <div
                key={option.id}
                className={`flex items-center space-x-2 p-3 rounded-lg border ${
                  showCorrectAnswer && option.isCorrect
                    ? "bg-green-50 border-green-300"
                    : ""
                }`}
              >
                <RadioGroupItem value={option.id} id={option.id} />
                <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                  {option.text}
                </Label>
              </div>
            ))}
          </div>
        </RadioGroup>
      )}

      {question.type === QuestionType.FILL_IN_BLANK && (
        <div className="space-y-2">
          <Label>请填写答案（多个空格用 | 分隔）</Label>
          <Input
            value={answer || ""}
            onChange={(e) => onAnswer(e.target.value)}
            placeholder="答案1 | 答案2 | ..."
          />
          {showCorrectAnswer && question.blanks && (
            <p className="text-sm text-green-600">
              正确答案：{question.blanks.join(" | ")}
            </p>
          )}
        </div>
      )}

      {question.type === QuestionType.SHORT_ANSWER && (
        <div className="space-y-2">
          <Label>请输入你的答案</Label>
          <Textarea
            value={answer || ""}
            onChange={(e) => onAnswer(e.target.value)}
            placeholder="请详细作答..."
            rows={6}
          />
        </div>
      )}

      {question.type === QuestionType.CODING && (
        <div className="space-y-2">
          <Label>请输入你的代码</Label>
          {question.starterCode && (
            <p className="text-sm text-muted-foreground">
              起始代码：
              <code className="block mt-1 p-2 bg-gray-100 rounded text-xs">
                {question.starterCode}
              </code>
            </p>
          )}
          <Textarea
            value={answer || ""}
            onChange={(e) => onAnswer(e.target.value)}
            placeholder="// 在这里编写代码"
            rows={12}
            className="font-mono text-sm"
          />
        </div>
      )}

      {question.hints && question.hints.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
            💡 查看提示
          </summary>
          <ul className="mt-2 space-y-1 pl-4">
            {question.hints.map((hint, idx) => (
              <li key={idx} className="text-muted-foreground">
                {hint}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
