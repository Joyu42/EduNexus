import { generatePlan, replanTasks } from "./planner";
import { loadDb, saveDb } from "./store";

export async function createLearningPlan(input: {
  goalType: "exam" | "project" | "certificate";
  goal: string;
  days: number;
  focusNodeId?: string;
  focusNodeLabel?: string;
  focusNodeRisk?: number;
  relatedNodes?: string[];
}) {
  const db = await loadDb();
  const planId = `plan_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  const now = new Date().toISOString();
  const tasks = generatePlan(input);

  const record = {
    planId,
    goalType: input.goalType,
    goal: input.goal,
    focusNodeId: input.focusNodeId ?? null,
    focusNodeLabel: input.focusNodeLabel ?? null,
    focusNodeRisk: typeof input.focusNodeRisk === "number" ? input.focusNodeRisk : null,
    relatedNodes: input.relatedNodes ?? [],
    tasks,
    createdAt: now,
    updatedAt: now
  };

  db.plans.unshift(record);
  await saveDb(db);

  return {
    planId,
    tasks
  };
}

export async function replanLearningPlan(input: {
  planId: string;
  reason: string;
  availableHoursPerDay?: number;
}) {
  const db = await loadDb();
  const plan = db.plans.find((item) => item.planId === input.planId);
  if (!plan) {
    return null;
  }

  plan.tasks = replanTasks({
    tasks: plan.tasks,
    reason: input.reason,
    availableHoursPerDay: input.availableHoursPerDay
  });
  plan.updatedAt = new Date().toISOString();
  await saveDb(db);

  return {
    planId: plan.planId,
    tasks: plan.tasks
  };
}
