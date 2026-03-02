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
