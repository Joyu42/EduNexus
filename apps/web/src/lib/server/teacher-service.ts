import { chatWithModelscope } from "./modelscope";

type LessonPlanInput = {
  subject: string;
  topic: string;
  grade: string;
  difficulty: "基础" | "中等" | "提升";
  classWeakness?: string;
};

type WeaknessTemplate = {
  id: string;
  label: string;
  content: string;
  description: string;
  scope: "通用" | "数学" | "编程" | "语言" | "职业技能";
  keywords: string[];
};

const WEAKNESS_TEMPLATES: WeaknessTemplate[] = [
  {
    id: "math-condition",
    label: "条件识别偏弱",
    content: "条件识别能力弱，易直接套公式",
    description: "常出现“看见题型就套方法”，忽略约束条件。",
    scope: "数学",
    keywords: ["数学", "代数", "几何", "函数", "数列"]
  },
  {
    id: "math-step",
    label: "书写跳步",
    content: "步骤书写不完整，跳步严重",
    description: "答案可能正确，但过程不可复盘，难以定位错误。",
    scope: "数学",
    keywords: ["数学", "证明", "解题"]
  },
  {
    id: "coding-debug",
    label: "调试路径混乱",
    content: "报错后排查路径混乱，缺少日志与最小复现",
    description: "常见于编程学习，建议建立“假设-验证”调试流程。",
    scope: "编程",
    keywords: ["编程", "代码", "算法", "AI", "开发"]
  },
  {
    id: "coding-review",
    label: "需求拆解不足",
    content: "需求拆解粒度粗，任务优先级判断不稳定",
    description: "项目式学习中容易出现“做了很多却偏题”。",
    scope: "编程",
    keywords: ["项目", "工程", "开发", "职业"]
  },
  {
    id: "language-expression",
    label: "表达结构松散",
    content: "表达结构松散，论证链条不完整",
    description: "语言学科学习中，观点与证据连接不稳定。",
    scope: "语言",
    keywords: ["语文", "英语", "写作", "表达", "阅读"]
  },
  {
    id: "language-vocabulary",
    label: "词汇迁移不足",
    content: "词汇与语法迁移弱，跨情境表达困难",
    description: "同一知识点在陌生语境下无法灵活使用。",
    scope: "语言",
    keywords: ["英语", "词汇", "语法", "口语"]
  },
  {
    id: "career-priority",
    label: "任务管理失衡",
    content: "任务管理失衡，复习计划执行波动较大",
    description: "成人/职考场景下，容易被碎片时间打断学习节奏。",
    scope: "职业技能",
    keywords: ["职考", "考研", "公考", "职业", "证书"]
  },
  {
    id: "career-review",
    label: "复盘机制缺失",
    content: "复盘机制缺失，重复犯错率较高",
    description: "缺少“错因标签 + 闭环纠偏”的复习机制。",
    scope: "职业技能",
    keywords: ["复盘", "职业", "学习", "考试"]
  },
  {
    id: "general-calculation",
    label: "准确率波动",
    content: "计算正确率偏低，粗心错误频发",
    description: "常见基础能力问题，建议引入检验清单。",
    scope: "通用",
    keywords: ["学习", "基础", "训练"]
  },
  {
    id: "general-transfer",
    label: "迁移能力不足",
    content: "知识点迁移弱，跨题型应用困难",
    description: "会做原题，但面对变式题缺乏策略。",
    scope: "通用",
    keywords: ["学习", "迁移", "复习"]
  }
];

function normalizeSubject(subject?: string) {
  return subject?.trim().toLowerCase() ?? "";
}

export function listWeaknessTemplates(subject?: string) {
  const normalized = normalizeSubject(subject);
  const ranked = WEAKNESS_TEMPLATES.map((item) => {
    let score = item.scope === "通用" ? 1 : 0;
    for (const keyword of item.keywords) {
      if (normalized.includes(keyword.toLowerCase())) {
        score += 3;
      }
    }
    if (item.scope !== "通用" && normalized.length === 0) {
      score = 0;
    }
    return { item, score };
  })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.item.label.localeCompare(b.item.label))
    .slice(0, 8)
    .map((entry) => entry.item);

  const resolved =
    ranked.length > 0 ? ranked : WEAKNESS_TEMPLATES.filter((item) => item.scope === "通用");

  return {
    subject: subject?.trim() || "通用",
    templates: resolved.map((item) => ({
      id: item.id,
      label: item.label,
      content: item.content,
      description: item.description,
      scope: item.scope
    }))
  };
}

function buildRuleBasedPlan(input: LessonPlanInput) {
  const weakness = input.classWeakness?.trim() || "暂无明确薄弱点";

  return {
    title: `${input.grade} · ${input.subject} · ${input.topic} 教学设计`,
    objectives: [
      `理解 ${input.topic} 的核心概念与适用条件`,
      "完成 2 道基础题 + 1 道迁移题，确保过程可解释",
      "通过课堂提问识别班级共性误区并及时纠偏"
    ],
    outline: [
      "导入：用真实场景或上一节知识回顾引入主题（5 分钟）",
      "讲解：拆解概念定义、关键公式和使用边界（15 分钟）",
      "训练：分层练习（基础/中等/提升）并即时反馈（15 分钟）",
      "复盘：总结常见错因并布置针对性作业（5 分钟）"
    ],
    classAdjustment: `班级薄弱点：${weakness}。建议在讲解阶段增加“条件识别”提示，并在训练阶段优先安排相关题型。`,
    homework: [
      "必做：基础巩固题 3 道（要求写出步骤）",
      "选做：提升题 1 道（要求写出反思）"
    ],
    reviewChecklist: [
      "是否先写出已知条件与目标量",
      "是否解释了公式或方法的适用条件",
      "是否完成了结果检验与反思"
    ]
  };
}

export async function generateLessonPlan(input: LessonPlanInput) {
  const base = buildRuleBasedPlan(input);

  if (!process.env.MODELSCOPE_API_KEY) {
    return {
      ...base,
      source: "rule"
    };
  }

  try {
    const prompt = [
      "请输出结构化中文教案，遵循以下 JSON 结构：",
      "{title, objectives[], outline[], classAdjustment, homework[], reviewChecklist[]}",
      `学段：${input.grade}`,
      `学科：${input.subject}`,
      `主题：${input.topic}`,
      `难度：${input.difficulty}`,
      `班级薄弱点：${input.classWeakness ?? "暂无"}`,
      "要求：强调引导学习，不直接给答案。"
    ].join("\n");

    const answer = await chatWithModelscope(prompt);
    return {
      ...base,
      modelHint: answer,
      source: "model+rule"
    };
  } catch {
    return {
      ...base,
      source: "rule_fallback"
    };
  }
}
