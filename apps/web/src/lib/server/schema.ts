import { z } from "zod";

export const createSessionSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  courseId: z.string().min(1).max(80).optional(),
  initialGoal: z.string().min(1).max(500).optional()
});

export const socraticNextSchema = z.object({
  sessionId: z.string().min(1),
  userInput: z.string().min(1).max(4000),
  currentLevel: z.number().int().min(1).max(4),
  contextIds: z.array(z.string().min(1)).optional()
});

export const unlockFinalSchema = z.object({
  sessionId: z.string().min(1),
  reflection: z.string().min(1).max(2000).optional()
});

export const workspaceAgentRunSchema = z.object({
  sessionId: z.string().min(1).optional(),
  userInput: z.string().min(1).max(4000),
  currentLevel: z.number().int().min(1).max(4).optional()
});

export const updateSessionSchema = z.object({
  title: z.string().min(1).max(120)
});

export const saveNoteSchema = z.object({
  sessionId: z.string().min(1),
  title: z.string().min(1).max(160),
  content: z.string().min(1),
  tags: z.array(z.string().min(1)).optional(),
  links: z.array(z.string().min(1)).optional()
});

export const pathGenerateSchema = z.object({
  goalType: z.enum(["exam", "project", "certificate"]),
  goal: z.string().min(1).max(300),
  days: z.number().int().min(3).max(30).optional(),
  focusNodeId: z.string().min(1).max(80).optional(),
  focusNodeLabel: z.string().min(1).max(120).optional(),
  focusNodeRisk: z.number().min(0).max(1).optional(),
  relatedNodes: z.array(z.string().min(1).max(80)).max(6).optional()
});

export const pathReplanSchema = z.object({
  planId: z.string().min(1),
  reason: z.string().min(1).max(500),
  availableHoursPerDay: z.number().positive().max(24).optional()
});

export const pathFocusFeedbackSchema = z.object({
  planId: z.string().min(1).max(80).optional(),
  nodeId: z.string().min(1).max(120),
  nodeLabel: z.string().min(1).max(120).optional(),
  taskId: z.string().min(1).max(120),
  relatedNodes: z.array(z.string().min(1).max(80)).max(6).optional(),
  quality: z.enum(["light", "solid", "deep"]).default("solid")
});

export const lessonPlanGenerateSchema = z.object({
  subject: z.string().min(1).max(60),
  topic: z.string().min(1).max(120),
  grade: z.string().min(1).max(40),
  difficulty: z.enum(["基础", "中等", "提升"]).default("中等"),
  classWeakness: z.string().max(300).optional()
});

export const kbAIChatSchema = z.object({
  documentId: z.string().optional(),
  documentTitle: z.string().optional(),
  documentContent: z.string().optional(),
  selectedText: z.string().optional(),
  userInput: z.string().min(1).max(4000),
  conversationHistory: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string()
      })
    )
    .optional()
});

// ==================== 练习题库 Schema ====================

export const createQuestionBankSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  tags: z.array(z.string().min(1).max(50)).optional(),
  vaultId: z.string().optional(),
});

export const updateQuestionBankSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  tags: z.array(z.string().min(1).max(50)).optional(),
});

export const createQuestionSchema = z.object({
  bankId: z.string().min(1),
  type: z.enum(["multiple_choice", "fill_in_blank", "short_answer", "coding"]),
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  difficulty: z.enum(["easy", "medium", "hard"]),
  status: z.enum(["active", "archived", "draft"]).default("active"),
  tags: z.array(z.string().min(1).max(50)).optional(),
  points: z.number().int().min(1).max(100).default(10),
  timeLimit: z.number().int().min(10).max(3600).optional(),
  explanation: z.string().optional(),
  hints: z.array(z.string()).optional(),
  // 选择题
  options: z
    .array(
      z.object({
        id: z.string(),
        text: z.string().min(1),
        isCorrect: z.boolean(),
      })
    )
    .optional(),
  // 填空题
  blanks: z.array(z.string().min(1)).optional(),
  // 编程题
  testCases: z
    .array(
      z.object({
        input: z.string(),
        expectedOutput: z.string(),
      })
    )
    .optional(),
  starterCode: z.string().optional(),
});

export const updateQuestionSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  status: z.enum(["active", "archived", "draft"]).optional(),
  tags: z.array(z.string().min(1).max(50)).optional(),
  points: z.number().int().min(1).max(100).optional(),
  timeLimit: z.number().int().min(10).max(3600).optional(),
  explanation: z.string().optional(),
  hints: z.array(z.string()).optional(),
  options: z
    .array(
      z.object({
        id: z.string(),
        text: z.string().min(1),
        isCorrect: z.boolean(),
      })
    )
    .optional(),
  blanks: z.array(z.string().min(1)).optional(),
  testCases: z
    .array(
      z.object({
        input: z.string(),
        expectedOutput: z.string(),
      })
    )
    .optional(),
  starterCode: z.string().optional(),
});

export const submitAnswerSchema = z.object({
  questionId: z.string().min(1),
  bankId: z.string().min(1),
  answer: z.string().min(1),
  timeSpent: z.number().int().min(0),
  attemptCount: z.number().int().min(1).default(1),
});

export const randomQuestionsSchema = z.object({
  bankId: z.string().min(1),
  count: z.number().int().min(1).max(50).default(10),
  type: z.enum(["multiple_choice", "fill_in_blank", "short_answer", "coding"]).optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  tags: z.array(z.string().min(1).max(50)).optional(),
});

export const generateQuestionsSchema = z.object({
  bankId: z.string().min(1),
  documentContent: z.string().min(1),
  count: z.number().int().min(1).max(20).default(5),
  type: z.enum(["multiple_choice", "fill_in_blank", "short_answer", "coding"]).optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
  tags: z.array(z.string().min(1).max(50)).optional(),
});

export const wrongQuestionNoteSchema = z.object({
  questionId: z.string().min(1),
  notes: z.string().max(1000).optional(),
});

