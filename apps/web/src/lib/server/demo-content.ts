type DemoDocumentSeed = {
  title: string;
  content: string;
};

type DemoGraphNodeSeed = {
  id: string;
  label: string;
  domain: string;
  mastery: number;
  risk: number;
};

type DemoGraphEdgeSeed = {
  id: string;
  source: string;
  target: string;
  weight: number;
};

type DemoGraphBootstrap = {
  nodes: DemoGraphNodeSeed[];
  edges: DemoGraphEdgeSeed[];
};

type DemoSessionMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

type DemoSessionSeed = {
  id: string;
  title: string;
  lastLevel: number;
  messages: DemoSessionMessage[];
};

type DemoPathBootstrap = {
  goalType: "exam" | "project" | "certificate";
  goal: string;
  tasks: Array<{
    taskId: string;
    title: string;
    reason: string;
    dueDate: string;
    priority: number;
  }>;
  };

type DemoPathTaskResourceSeed = {
  id: string;
  title: string;
  type: "article" | "video" | "document";
  url: string;
};

type DemoPathTaskSeed = {
  id: string;
  title: string;
  description: string;
  estimatedTime: string;
  progress: number;
  status: "not_started" | "in_progress" | "completed";
  dependencies: string[];
  resources: DemoPathTaskResourceSeed[];
  notes: string;
};

type DemoPathMilestoneSeed = {
  id: string;
  title: string;
  taskIds: string[];
};

type DemoPathSeed = {
  id: string;
  title: string;
  description: string;
  status: "not_started" | "in_progress" | "completed";
  progress: number;
  tags: string[];
  goalId: string;
  tasks: DemoPathTaskSeed[];
  milestones: DemoPathMilestoneSeed[];
};

type DemoGoalSeed = {
  id: string;
  title: string;
  description: string;
  goalType: DemoPathBootstrap["goalType"];
  category: "exam" | "skill" | "project" | "habit" | "other";
  linkedPathIds: string[];
  smart: {
    specific: string;
    measurable: string;
    achievable: string;
    relevant: string;
    timeBound: string;
  };
  startDate: string;
  endDate: string;
  progress: number;
  status: "active" | "completed" | "paused" | "cancelled";
};

type DemoPracticeQuestionSeed = {
  type: "multiple_choice" | "fill_in_blank" | "short_answer" | "coding";
  title: string;
  content: string;
  difficulty: "easy" | "medium" | "hard";
  status: "active" | "archived" | "draft";
  tags: string[];
  points: number;
  explanation?: string;
  options?: Array<{
    id: string;
    text: string;
    isCorrect: boolean;
  }>;
};

type DemoPracticeBankSeed = {
  name: string;
  description: string;
  tags: string[];
  questions: DemoPracticeQuestionSeed[];
};

export const DEMO_KB_DOCUMENTS: DemoDocumentSeed[] = [
  {
    title: "HTML 基础",
    content: `# HTML 基础：构建 Web 的骨架

HTML（超文本标记语言）是所有 Web 开发的基础。它定义了网页的内容和结构。

## 核心要点
1. **语义化标签**：使用 \`<header>\`, \`<nav>\`, \`<main>\`, \`<article>\`, \`<footer>\` 等标签，不仅对 SEO 友好，还能提升可访问性。
2. **文档结构**：了解 \`<!DOCTYPE html>\`, \`<html>\`, \`<head>\`, \`<body>\` 的层级关系。
3. **常用元素**：掌握标题（h1-h6）、段落（p）、链接（a）、图片（img）以及列表（ul/ol/li）。

## 练习建议
尝试在不使用任何 CSS 的情况下，仅用 HTML 构建一个结构清晰的新闻文章页面。`
  },
  {
    title: "CSS 基础",
    content: `# CSS 基础：美化你的网页

CSS（层叠样式表）负责网页的视觉表现，包括布局、颜色、字体等。

## 核心概念
1. **选择器**：学习如何通过类（.class）、ID（#id）和标签名来选中元素。
2. **盒模型**：这是 CSS 的基石。每个元素都是一个盒子，由 content, padding, border, margin 组成。
3. **层叠与继承**：理解样式冲突时如何通过优先级（权重）来决定最终表现。

## 关键属性
- \`color\`, \`font-size\`, \`background-color\`
- \`width\`, \`height\`, \`display\`
- \`position\` (static, relative, absolute, fixed)`
  },
  {
    title: "JavaScript 基础",
    content: `# JavaScript 基础：让页面动起来

JavaScript 是赋予网页交互能力的脚本语言。

## 核心语法
1. **变量与数据类型**：使用 \`let\`, \`const\` 声明变量；了解 string, number, boolean, array, object。
2. **控制流**：掌握 \`if/else\` 条件判断，以及 \`for\`, \`while\` 循环。
3. **函数**：学习声明式函数与箭头函数的区别。

## DOM 操作
了解如何通过 JavaScript 选中页面元素（如 \`querySelector\`）并修改它们的内容或样式，这是前端交互的核心。

## 异步编程基础
初步认识 \`Promise\` 和 \`async/await\`，这对于后续请求数据至关重要。`
  },
  {
    title: "Flexbox 布局",
    content: `# Flexbox 布局：一维布局利器

Flexbox（弹性盒子）是目前最常用的 CSS 布局模式，非常适合处理一行或一列的排版。

## 核心容器属性
- \`display: flex\`: 开启弹性布局。
- \`flex-direction\`: 决定主轴方向（row 或 column）。
- \`justify-content\`: 主轴对齐方式（center, space-between 等）。
- \`align-items\`: 交叉轴对齐方式。

## 项目属性
- \`flex-grow\`: 剩余空间分配。
- \`flex-shrink\`: 空间不足时的收缩比例。
- \`flex-basis\`: 元素的初始大小。

掌握 Flexbox 能解决 90% 的日常排版问题。`
  },
  {
    title: "Grid 布局",
    content: `# Grid 布局：二维布局终极方案

CSS Grid 允许你同时在行和列上进行布局，适合构建复杂的整体页面架构。

## 基本用法
1. \`display: grid\`
2. \`grid-template-columns\`: 定义列（如 \`repeat(3, 1fr)\`）。
3. \`grid-template-rows\`: 定义行。
4. \`gap\`: 控制网格间距。

## 优势
Grid 特别适合“大框架”布局，而 Flexbox 适合“小组件”内部排版。两者结合使用是现代前端的最佳实践。`
  },
  {
    title: "React 入门",
    content: `# React 入门：组件化开发思维

React 是目前最流行的前端库，它将 UI 拆分为独立的、可复用的组件。

## 核心概念
1. **JSX**：在 JavaScript 中写类似 HTML 的语法。
2. **Props**：父组件向子组件传递数据的方式。
3. **State**：组件内部的状态，驱动 UI 更新的核心。

## 常用 Hooks
- \`useState\`: 管理状态。
- \`useEffect\`: 处理副作用（如数据请求、DOM 修改）。

React 的核心是“声明式编程”，你只需描述 UI 应该是什么样子，React 负责高效更新。`
  },
  {
    title: "响应式设计",
    content: `# 响应式设计：适配所有屏幕

响应式设计确保你的网页在手机、平板和电脑上都能完美显示。

## 实现手段
1. **媒体查询 (Media Queries)**：使用 \`@media\` 根据屏幕宽度应用不同样式。
2. **流式布局**：使用百分比或 \`vw/vh\` 代替固定像素。
3. **响应式图片**：确保图片不会溢出容器。

## 移动优先 (Mobile First)
现代开发的标准做法：先写移动端样式，再通过媒体查询为大屏幕增加增强效果。`
  },
  {
    title: "Web 无障碍",
    content: `# Web 无障碍 (Accessibility)：人人享有 Web

无障碍（A11y）确保残障人士也能顺畅使用你的网站。

## 实践准则
1. **语义化 HTML**：这是最基础也最重要的无障碍手段。
2. **ARIA 属性**：在语义化标签不足时，使用 \`aria-label\`, \`aria-expanded\` 等属性辅助屏幕阅读器。
3. **颜色对比度**：确保文字与背景有足够的对比，方便视障用户。
4. **键盘导航**：确保所有交互元素（按钮、链接）都能通过 Tab 键选中并操作。

这不仅是道德责任，也是专业前端开发者的必备技能。`
  }
];

export const DEMO_WORKSPACE_SESSIONS: DemoSessionSeed[] = [
  {
    id: "ws_demo_frontend_foundations",
    title: "前端基础打底：从 HTML 到 Grid",
    lastLevel: 2,
    messages: [
      {
        role: "system",
        content: "你正在进行“前端基础打底”路径的学习。该路径涵盖了 HTML、CSS 及其高级布局。"
      },
      {
        role: "assistant",
        content: "建议先深入理解 HTML 语义化，这是后续 CSS 布局和无障碍设计的基础。完成 HTML 后，我们将依次攻克 Flexbox 和 Grid。"
      }
    ]
  },
  {
    id: "ws_demo_react_interface",
    title: "React 界面进阶：框架与体验",
    lastLevel: 1,
    messages: [
      {
        role: "system",
        content: "欢迎进入 React 界面进阶。我们将探讨如何利用 React 构建组件化应用，并兼顾响应式与无障碍。"
      },
      {
        role: "assistant",
        content: "准备好开始了吗？我们将从 React 的基础 Hooks 开始，逐步构建出一个符合无障碍标准的响应式界面。"
      }
    ]
  }
];

export const DEMO_GRAPH_BOOTSTRAP: DemoGraphBootstrap = {
  nodes: [
    { id: "demo_node_html_basics", label: "HTML 基础", domain: "frontend", mastery: 0.92, risk: 0.12 },
    { id: "demo_node_css_basics", label: "CSS 基础", domain: "frontend", mastery: 0.68, risk: 0.35 },
    { id: "demo_node_js_fundamentals", label: "JavaScript 基础", domain: "frontend", mastery: 0.42, risk: 0.58 },
    { id: "demo_node_flexbox", label: "Flexbox 布局", domain: "frontend", mastery: 0.55, risk: 0.44 },
    { id: "demo_node_grid", label: "Grid 布局", domain: "frontend", mastery: 0.22, risk: 0.66 },
    { id: "demo_node_react_intro", label: "React 入门", domain: "frontend", mastery: 0.2, risk: 0.72 },
    { id: "demo_node_responsive", label: "响应式设计", domain: "frontend", mastery: 0.18, risk: 0.7 },
    { id: "demo_node_accessibility", label: "Web 无障碍", domain: "frontend", mastery: 0.1, risk: 0.83 }
  ],
  edges: [
    { id: "demo_edge_html_css", source: "demo_node_html_basics", target: "demo_node_css_basics", weight: 0.92 },
    {
      id: "demo_edge_css_flex",
      source: "demo_node_css_basics",
      target: "demo_node_flexbox",
      weight: 0.82
    },
    { id: "demo_edge_css_grid", source: "demo_node_css_basics", target: "demo_node_grid", weight: 0.79 },
    {
      id: "demo_edge_js_react",
      source: "demo_node_js_fundamentals",
      target: "demo_node_react_intro",
      weight: 0.86
    },
    {
      id: "demo_edge_flex_responsive",
      source: "demo_node_flexbox",
      target: "demo_node_responsive",
      weight: 0.84
    },
    {
      id: "demo_edge_grid_responsive",
      source: "demo_node_grid",
      target: "demo_node_responsive",
      weight: 0.82
    },
    {
      id: "demo_edge_html_accessibility",
      source: "demo_node_html_basics",
      target: "demo_node_accessibility",
      weight: 0.74
    },
    {
      id: "demo_edge_react_accessibility",
      source: "demo_node_react_intro",
      target: "demo_node_accessibility",
      weight: 0.63
    }
  ]
};

export const DEMO_PATH_SEEDS: DemoPathSeed[] = [
  {
    id: "demo_path_frontend_foundations",
    title: "前端基础打底",
    description: "从 HTML/CSS 核心到 Flexbox 与 Grid 高级布局，夯实前端开发根基。",
    status: "in_progress",
    progress: 40,
    tags: ["演示", "前端", "核心"],
    goalId: "demo_goal_1",
    tasks: [
      {
        id: "demo_task_html",
        title: "HTML 核心与语义化",
        description: "理解标签背后的含义，构建高可访问性的文档结构。",
        estimatedTime: "2小时",
        progress: 100,
        status: "completed",
        dependencies: [],
        resources: [
          {
            id: "res_html_mdn",
            title: "MDN HTML 入门",
            type: "article",
            url: "https://developer.mozilla.org/zh-CN/docs/Learn/HTML"
          }
        ],
        notes: "已掌握常用语义化标签。"
      },
      {
        id: "demo_task_css",
        title: "CSS 盒模型与选择器",
        description: "深入理解 CSS 渲染机制，解决样式覆盖难题。",
        estimatedTime: "3小时",
        progress: 60,
        status: "in_progress",
        dependencies: ["demo_task_html"],
        resources: [
          {
            id: "res_css_mdn",
            title: "MDN CSS 基础",
            type: "article",
            url: "https://developer.mozilla.org/zh-CN/docs/Learn/CSS"
          }
        ],
        notes: "正在练习复杂选择器的权重计算。"
      },
      {
        id: "demo_task_js",
        title: "JS 基础语法与 DOM",
        description: "编写脚本驱动页面交互，掌握核心数据类型。",
        estimatedTime: "5小时",
        progress: 20,
        status: "in_progress",
        dependencies: ["demo_task_css"],
        resources: [
          {
            id: "res_js_info",
            title: "JavaScript.info",
            type: "article",
            url: "https://zh.javascript.info/"
          }
        ],
        notes: "初步理解了闭包的概念。"
      },
      {
        id: "demo_task_flex",
        title: "Flexbox 实战布局",
        description: "快速实现响应式导航栏与卡片排列。",
        estimatedTime: "2小时",
        progress: 0,
        status: "not_started",
        dependencies: ["demo_task_css"],
        resources: [],
        notes: ""
      },
      {
        id: "demo_task_grid",
        title: "Grid 复杂页面架构",
        description: "利用网格系统构建多栏式复杂后台布局。",
        estimatedTime: "3小时",
        progress: 0,
        status: "not_started",
        dependencies: ["demo_task_css"],
        resources: [],
        notes: ""
      }
    ],
    milestones: [
      { id: "ms_foundation_basic", title: "三剑客基础达成", taskIds: ["demo_task_html", "demo_task_css", "demo_task_js"] },
      { id: "ms_foundation_layout", title: "现代布局专家", taskIds: ["demo_task_flex", "demo_task_grid"] }
    ]
  },
  {
    id: "demo_path_react_interface",
    title: "React 界面进阶",
    description: "利用 React 框架提升开发效率，并专注于响应式与无障碍的最佳实践。",
    status: "not_started",
    progress: 0,
    tags: ["演示", "React", "进阶"],
    goalId: "demo_goal_2",
    tasks: [
      {
        id: "demo_task_react",
        title: "React 组件与状态管理",
        description: "从 JSX 到 Hooks，构建可复用的 UI 逻辑。",
        estimatedTime: "6小时",
        progress: 0,
        status: "not_started",
        dependencies: [],
        resources: [],
        notes: ""
      },
      {
        id: "demo_task_responsive",
        title: "全端响应式适配",
        description: "使用断点与流式设计适配从手机到 4K 屏的所有设备。",
        estimatedTime: "4小时",
        progress: 0,
        status: "not_started",
        dependencies: [],
        resources: [],
        notes: ""
      },
      {
        id: "demo_task_a11y",
        title: "Web 无障碍深度审计",
        description: "使用辅助工具修复页面中的可访问性问题。",
        estimatedTime: "3小时",
        progress: 0,
        status: "not_started",
        dependencies: [],
        resources: [],
        notes: ""
      }
    ],
    milestones: [
      { id: "ms_react_dev", title: "React 开发就绪", taskIds: ["demo_task_react"] },
      { id: "ms_experience_opt", title: "极致用户体验", taskIds: ["demo_task_responsive", "demo_task_a11y"] }
    ]
  }
];

export const DEMO_GOAL_SEEDS: DemoGoalSeed[] = [
  {
    id: "demo_goal_1",
    title: "精通前端基础布局",
    description: "在月底前彻底掌握从语义化到 Grid 的所有现代布局手段。",
    goalType: "project",
    category: "skill",
    linkedPathIds: ["demo_path_frontend_foundations"],
    smart: {
      specific: "独立完成 5 个基于 Grid 和 Flexbox 的练习页面",
      measurable: "所有练习均通过语义化验证和无障碍测试",
      achievable: "每日固定投入 2 小时进行实战练习",
      relevant: "为后续学习 React 和参与公司项目打下基础",
      timeBound: "2026-03-31"
    },
    startDate: "2026-03-01",
    endDate: "2026-03-31",
    progress: 40,
    status: "active"
  },
  {
    id: "demo_goal_2",
    title: "构建高可用 React 组件库",
    description: "利用 React 开发出一套既美观又符合无障碍标准的组件库。",
    goalType: "project",
    category: "project",
    linkedPathIds: ["demo_path_react_interface"],
    smart: {
      specific: "包含 Button, Modal, Tabs 等 8 个常用组件",
      measurable: "Jest 测试覆盖率达到 80%，并通过 Lighthouse 无障碍评分",
      achievable: "基于已有的 HTML/CSS 基础进行组件化封装",
      relevant: "提升个人作品集质量，展现专业开发标准",
      timeBound: "2026-04-15"
    },
    startDate: "2026-03-24",
    endDate: "2026-04-15",
    progress: 0,
    status: "active"
  }
];

export const DEMO_PUBLIC_RESOURCE_SEEDS: Array<{
  id: string;
  title: string;
  description: string;
  url: string;
  createdBy: string;
}> = [
  {
    id: "demo_public_res_react_docs",
    title: "React 官方文档",
    description: "React 组件、Hooks 与最佳实践文档。",
    url: "https://react.dev/",
    createdBy: "demo_user"
  },
  {
    id: "demo_public_res_js_info",
    title: "JavaScript.info 现代教程",
    description: "从基础到进阶的 JavaScript 体系化教程。",
    url: "https://zh.javascript.info/",
    createdBy: "demo_user"
  },
  {
    id: "demo_public_res_mdn_css",
    title: "MDN CSS 文档",
    description: "CSS 参考与布局实践手册。",
    url: "https://developer.mozilla.org/zh-CN/docs/Web/CSS",
    createdBy: "demo_user"
  },
  {
    id: "demo_public_res_algo",
    title: "LeetCode 算法训练",
    description: "数据结构与算法练习平台，适合刷题与复盘。",
    url: "https://leetcode.cn/",
    createdBy: "demo_user"
  }
];

export const DEMO_PUBLIC_GROUP_SEEDS: Array<{
  id: string;
  name: string;
  description: string;
  memberCount: number;
  createdBy: string;
}> = [
  {
    id: "demo_group_frontend",
    name: "前端冲刺小组",
    description: "每周共学 HTML/CSS/React，产出可演示页面。",
    memberCount: 18,
    createdBy: "demo_user"
  },
  {
    id: "demo_group_algo",
    name: "算法刷题打卡营",
    description: "每日一题，周末复盘，沉淀题解与模板。",
    memberCount: 27,
    createdBy: "demo_user"
  },
  {
    id: "demo_group_project",
    name: "项目作品集互评",
    description: "围绕作品集项目进行 Code Review 与改进建议。",
    memberCount: 12,
    createdBy: "demo_user"
  }
];

export const DEMO_PUBLIC_TOPIC_SEEDS: Array<{ id: string; name: string }> = [
  { id: "demo_topic_react", name: "React" },
  { id: "demo_topic_frontend", name: "前端学习" },
  { id: "demo_topic_algo", name: "算法刷题" },
  { id: "demo_topic_project", name: "项目实战" }
] ;

export const DEMO_PUBLIC_POST_SEEDS: Array<{
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
}> = [
  {
    id: "demo_post_react_plan",
    title: "React 路径怎么安排更稳？",
    content:
      "我把学习拆成 JS 复盘、组件化练习、项目交付三段，大家有更高效的节奏建议吗？",
    authorId: "demo_user",
    authorName: "Demo Learner"
  },
  {
    id: "demo_post_css_review",
    title: "本周 CSS 响应式改造复盘",
    content:
      "断点和间距体系统一后，页面稳定了很多。下周准备补无障碍标签。",
    authorId: "demo_user",
    authorName: "Demo Learner"
  },
  {
    id: "demo_post_algo_habit",
    title: "算法打卡 7 天小结",
    content:
      "从数组双指针到栈队列，关键是每天固定时间 + 及时写题解复盘。",
    authorId: "demo_user",
    authorName: "Demo Learner"
  }
];

export const DEMO_PATH_BOOTSTRAP: DemoPathBootstrap = {
  goalType: DEMO_GOAL_SEEDS[0].goalType,
  goal: DEMO_PATH_SEEDS[0].title,
  tasks: DEMO_PATH_SEEDS[0].tasks.map((task, index) => ({
    taskId: task.id,
    title: task.title,
    reason: task.description,
    dueDate: DEMO_GOAL_SEEDS[0].endDate,
    priority: index + 1
  }))
};

export const DEMO_PRACTICE_BANKS: DemoPracticeBankSeed[] = [
  {
    name: "前端基础演示题库",
    description: "演示账号预置题库，用于体验前端基础知识点的练习流程。",
    tags: ["演示", "前端", "基础"],
    questions: [
      {
        type: "multiple_choice",
        title: "语义化标签选择",
        content: "在构建网页时，用于表示页面主导航区域的最合适标签是？",
        difficulty: "easy",
        status: "active",
        tags: ["HTML", "语义化"],
        points: 5,
        explanation: "<nav> 标签专门用于定义页面的导航链接区域。",
        options: [
          { id: "a", text: "nav", isCorrect: true },
          { id: "b", text: "aside", isCorrect: false },
          { id: "c", text: "menu", isCorrect: false }
        ]
      },
      {
        type: "multiple_choice",
        title: "Flexbox 主轴对齐",
        content: "在 Flexbox 中，哪项属性用于控制子元素在主轴（Main Axis）上的对齐方式？",
        difficulty: "easy",
        status: "active",
        tags: ["CSS", "Flexbox"],
        points: 5,
        explanation: "justify-content 负责主轴对齐，align-items 负责交叉轴对齐。",
        options: [
          { id: "a", text: "justify-content", isCorrect: true },
          { id: "b", text: "align-items", isCorrect: false },
          { id: "c", text: "flex-direction", isCorrect: false }
        ]
      }
    ]
  }
];

export const DEMO_RESOURCE_BOOKMARK_SEEDS: Array<{
  id: string;
  userId: string;
  resourceId: string;
  createdAt: string;
}> = [
  {
    id: "demo_res_bookmark_1",
    userId: "demo_user",
    resourceId: "demo_public_res_react_docs",
    createdAt: "2026-03-18T09:10:00Z"
  },
  {
    id: "demo_res_bookmark_2",
    userId: "demo_user",
    resourceId: "demo_public_res_mdn_css",
    createdAt: "2026-03-18T09:14:00Z"
  },
  {
    id: "demo_res_bookmark_3",
    userId: "demo_user",
    resourceId: "demo_public_res_js_info",
    createdAt: "2026-03-18T09:25:00Z"
  }
];

export const DEMO_RESOURCE_NOTE_SEEDS: Array<{
  id: string;
  userId: string;
  resourceId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}> = [
  {
    id: "demo_res_note_1",
    userId: "demo_user",
    resourceId: "demo_public_res_react_docs",
    content: "Hooks 部分先通读 useState/useEffect，再做一个表单 + 列表的最小项目巩固。",
    createdAt: "2026-03-18T10:05:00Z",
    updatedAt: "2026-03-18T10:05:00Z"
  },
  {
    id: "demo_res_note_2",
    userId: "demo_user",
    resourceId: "demo_public_res_mdn_css",
    content: "复盘 Flex/Grid 常用布局套路：容器、间距体系、断点策略，统一命名避免样式发散。",
    createdAt: "2026-03-18T10:20:00Z",
    updatedAt: "2026-03-18T10:34:00Z"
  }
];

export const DEMO_RESOURCE_RATING_SEEDS: Array<{
  id: string;
  userId: string;
  resourceId: string;
  rating: number;
  createdAt: string;
  updatedAt: string;
}> = [
  {
    id: "demo_res_rating_1",
    userId: "demo_user",
    resourceId: "demo_public_res_react_docs",
    rating: 5,
    createdAt: "2026-03-18T11:00:00Z",
    updatedAt: "2026-03-18T11:00:00Z"
  },
  {
    id: "demo_res_rating_2",
    userId: "demo_user",
    resourceId: "demo_public_res_js_info",
    rating: 4,
    createdAt: "2026-03-18T11:02:00Z",
    updatedAt: "2026-03-18T11:15:00Z"
  },
  {
    id: "demo_res_rating_3",
    userId: "demo_user",
    resourceId: "demo_public_res_algo",
    rating: 4,
    createdAt: "2026-03-18T11:06:00Z",
    updatedAt: "2026-03-18T11:06:00Z"
  }
];

export const DEMO_GROUP_MEMBER_SEEDS: Array<{
  id: string;
  groupId: string;
  userId: string;
  role: "owner" | "admin" | "member";
  status: "active" | "invited" | "removed";
  joinedAt: string;
}> = [
  {
    id: "demo_group_member_frontend_owner",
    groupId: "demo_group_frontend",
    userId: "demo_user",
    role: "owner",
    status: "active",
    joinedAt: "2026-03-16T09:00:00Z"
  },
  {
    id: "demo_group_member_frontend_1",
    groupId: "demo_group_frontend",
    userId: "demo_user_alice",
    role: "admin",
    status: "active",
    joinedAt: "2026-03-16T10:30:00Z"
  },
  {
    id: "demo_group_member_algo_1",
    groupId: "demo_group_algo",
    userId: "demo_user",
    role: "member",
    status: "active",
    joinedAt: "2026-03-17T08:40:00Z"
  },
  {
    id: "demo_group_member_project_1",
    groupId: "demo_group_project",
    userId: "demo_user_bob",
    role: "owner",
    status: "active",
    joinedAt: "2026-03-14T12:00:00Z"
  },
  {
    id: "demo_group_member_project_2",
    groupId: "demo_group_project",
    userId: "demo_user",
    role: "member",
    status: "active",
    joinedAt: "2026-03-17T12:25:00Z"
  }
];

export const DEMO_GROUP_POST_SEEDS: Array<{
  id: string;
  groupId: string;
  authorId: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}> = [
  {
    id: "demo_group_post_1",
    groupId: "demo_group_frontend",
    authorId: "demo_user",
    title: "本周目标：完成响应式断点与间距体系",
    content: "我打算先固定断点（mobile/tablet/desktop），再统一 spacing scale，最后补无障碍标签。",
    createdAt: "2026-03-18T09:40:00Z",
    updatedAt: "2026-03-18T09:40:00Z"
  },
  {
    id: "demo_group_post_2",
    groupId: "demo_group_algo",
    authorId: "demo_user_alice",
    title: "栈/队列题型怎么快速识别？",
    content: "看到“最近更大/更小”优先考虑单调栈；看到“层级/最短路径”优先考虑 BFS。欢迎补充。",
    createdAt: "2026-03-18T10:10:00Z",
    updatedAt: "2026-03-18T10:18:00Z"
  },
  {
    id: "demo_group_post_3",
    groupId: "demo_group_project",
    authorId: "demo_user_bob",
    title: "作品集互评规则（简版）",
    content: "每次互评聚焦 1) 目标是否清晰 2) 交互是否可用 3) 代码是否可维护。评论尽量给可执行建议。",
    createdAt: "2026-03-17T13:00:00Z",
    updatedAt: "2026-03-17T13:00:00Z"
  }
];

export const DEMO_GROUP_TASK_SEEDS: Array<{
  id: string;
  groupId: string;
  title: string;
  description: string;
  status: "todo" | "in_progress" | "done";
  assigneeId: string | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}> = [
  {
    id: "demo_group_task_frontend_1",
    groupId: "demo_group_frontend",
    title: "完成响应式页面交付",
    description: "补齐断点策略、间距体系与关键页面适配，并输出可演示链接。",
    status: "in_progress",
    assigneeId: "demo_user",
    dueDate: "2026-03-24",
    createdAt: "2026-03-18T09:50:00Z",
    updatedAt: "2026-03-18T11:20:00Z"
  },
  {
    id: "demo_group_task_algo_1",
    groupId: "demo_group_algo",
    title: "每日一题：栈与队列",
    description: "完成 3 道典型题并写出题解模板（入栈/出栈条件、边界处理）。",
    status: "todo",
    assigneeId: null,
    dueDate: "2026-03-20",
    createdAt: "2026-03-18T10:22:00Z",
    updatedAt: "2026-03-18T10:22:00Z"
  },
  {
    id: "demo_group_task_project_1",
    groupId: "demo_group_project",
    title: "互评：完善 README 与截图",
    description: "补齐项目目标、技术选型、运行方式，并提供至少 2 张关键页面截图。",
    status: "done",
    assigneeId: "demo_user_bob",
    dueDate: "2026-03-18",
    createdAt: "2026-03-15T08:00:00Z",
    updatedAt: "2026-03-17T16:30:00Z"
  }
];

export const DEMO_POST_COMMENT_SEEDS: Array<{
  id: string;
  postId: string;
  authorId: string;
  content: string;
  parentCommentId: string | null;
  createdAt: string;
  updatedAt: string;
}> = [
  {
    id: "demo_post_comment_1",
    postId: "demo_post_react_plan",
    authorId: "demo_user_alice",
    content: "这个节奏很稳。我会建议在每一段都加一个小交付（可运行的小 demo），避免只看文档。",
    parentCommentId: null,
    createdAt: "2026-03-18T12:05:00Z",
    updatedAt: "2026-03-18T12:05:00Z"
  },
  {
    id: "demo_post_comment_2",
    postId: "demo_post_react_plan",
    authorId: "demo_user",
    content: "同意！我准备每周做一个小页面：表单/列表/路由各一个。",
    parentCommentId: "demo_post_comment_1",
    createdAt: "2026-03-18T12:20:00Z",
    updatedAt: "2026-03-18T12:20:00Z"
  },
  {
    id: "demo_post_comment_3",
    postId: "demo_post_css_review",
    authorId: "demo_user_bob",
    content: "间距体系统一真的很救命。你是用 4/8 的 scale 还是 2/4/8？",
    parentCommentId: null,
    createdAt: "2026-03-18T12:35:00Z",
    updatedAt: "2026-03-18T12:35:00Z"
  }
];

export const DEMO_POST_REACTION_SEEDS: Array<{
  id: string;
  targetType: "post" | "comment";
  targetId: string;
  actorId: string;
  reactionType: string;
  createdAt: string;
}> = [
  {
    id: "demo_post_reaction_1",
    targetType: "post",
    targetId: "demo_post_react_plan",
    actorId: "demo_user",
    reactionType: "like",
    createdAt: "2026-03-18T12:01:00Z"
  },
  {
    id: "demo_post_reaction_2",
    targetType: "post",
    targetId: "demo_post_css_review",
    actorId: "demo_user_alice",
    reactionType: "clap",
    createdAt: "2026-03-18T12:33:00Z"
  },
  {
    id: "demo_post_reaction_3",
    targetType: "post",
    targetId: "demo_post_algo_habit",
    actorId: "demo_user_bob",
    reactionType: "insightful",
    createdAt: "2026-03-18T12:40:00Z"
  }
];
