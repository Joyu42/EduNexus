type GoalType = "exam" | "project" | "certificate";

type Task = {
  taskId: string;
  title: string;
  priority: number;
  reason: string;
  dueDate: string;
};

function formatDate(offsetDays: number) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

export function generatePlan(input: {
  goalType: GoalType;
  goal: string;
  days: number;
  focusNodeId?: string;
  focusNodeLabel?: string;
  focusNodeRisk?: number;
  relatedNodes?: string[];
}): Task[] {
  const { goalType, goal, days } = input;
  const focus =
    goalType === "exam" ? "薄弱知识点巩固" : goalType === "project" ? "项目里程碑推进" : "证书考纲覆盖";
  const hasFocusNode = !!input.focusNodeLabel;
  const focusRisk =
    typeof input.focusNodeRisk === "number"
      ? `${Math.round(input.focusNodeRisk * 100)}%`
      : "未知";
  const relatedNodes = (input.relatedNodes ?? []).slice(0, 4);
  const relatedHint =
    relatedNodes.length > 0 ? `，并覆盖关联节点：${relatedNodes.join("、")}` : "";

  const baseTasks = [
    {
      title: "梳理关键概念与前置条件",
      reason: hasFocusNode
        ? `围绕目标「${goal}」与图谱焦点「${input.focusNodeLabel}」先建立概念框架，避免盲目刷题。`
        : `围绕目标「${goal}」先建立概念框架，避免盲目刷题。`
    },
    {
      title: hasFocusNode
        ? `${input.focusNodeLabel} 定向攻坚（图谱高风险）`
        : `${focus}（高优先级）`,
      reason: hasFocusNode
        ? `图谱显示「${input.focusNodeLabel}」风险为 ${focusRisk}，优先安排在前半段${relatedHint}。`
        : "把高风险节点放到前半段，确保学习收益最大化。"
    },
    {
      title: "进行一次限时训练并记录错因",
      reason: "通过限时情境暴露思维断点，沉淀复盘证据。"
    },
    {
      title: "完成一次知识讲解输出（费曼法）",
      reason: "输出倒逼输入，验证是否真正理解。"
    },
    {
      title: "复盘 + 重排下阶段计划",
      reason: "依据完成情况动态调整后续节奏。"
    }
  ];

  return baseTasks.slice(0, Math.min(baseTasks.length, days)).map((task, index) => ({
    taskId: `task_${Date.now().toString(36)}_${index + 1}`,
    title: task.title,
    priority: index < 2 ? 5 - index : 3,
    reason: task.reason,
    dueDate: formatDate(index + 1)
  }));
}

export function replanTasks(input: {
  tasks: Task[];
  reason: string;
  availableHoursPerDay?: number;
}): Task[] {
  const reduced = (input.availableHoursPerDay ?? 2) < 1.5;
  return input.tasks.map((task, index) => ({
    ...task,
    priority: Math.max(1, reduced ? task.priority - 1 : task.priority),
    reason: `${task.reason}（重排原因：${input.reason}）`,
    dueDate: formatDate(index + 1)
  }));
}

export type { Task };
