// 资源中心示例数据生成器

import { createResource, createFolder, createBookmark, incrementViewCount } from "./resource-storage";

export function generateSampleResources() {
  // 检查是否已有数据
  if (typeof window === "undefined") return;

  const existingData = localStorage.getItem("edunexus_resources");
  if (existingData && JSON.parse(existingData).length > 0) {
    console.log("Sample resources already exist");
    return;
  }

  console.log("Generating sample resources...");

  // 创建示例资源
  const resources = [
    // Python 相关
    {
      title: "Python 官方文档",
      description: "Python 编程语言的官方文档，包含完整的语言参考和标准库说明。适合所有级别的 Python 开发者。",
      type: "document" as const,
      url: "https://docs.python.org/zh-cn/3/",
      tags: ["Python", "编程", "文档", "官方"],
      author: "Python Software Foundation",
      source: "python.org",
    },
    {
      title: "Python 数据科学手册",
      description: "全面介绍 Python 在数据科学领域的应用，包括 NumPy、Pandas、Matplotlib 等核心库的使用。",
      type: "book" as const,
      url: "https://jakevdp.github.io/PythonDataScienceHandbook/",
      tags: ["Python", "数据科学", "NumPy", "Pandas", "机器学习"],
      author: "Jake VanderPlas",
    },
    {
      title: "Corey Schafer Python 教程",
      description: "YouTube 上最受欢迎的 Python 教程系列之一，从基础到高级，讲解清晰易懂。",
      type: "video" as const,
      url: "https://www.youtube.com/c/Coreyms",
      tags: ["Python", "视频教程", "编程入门"],
      author: "Corey Schafer",
      source: "YouTube",
    },
    {
      title: "Real Python 教程网站",
      description: "提供高质量的 Python 教程、文章和视频课程，涵盖从基础到高级的各个主题。",
      type: "website" as const,
      url: "https://realpython.com/",
      tags: ["Python", "教程", "Web开发", "数据科学"],
      source: "Real Python",
    },

    // JavaScript 相关
    {
      title: "MDN Web 文档",
      description: "Mozilla 开发者网络提供的 Web 技术文档，包含 HTML、CSS、JavaScript 的完整参考。",
      type: "document" as const,
      url: "https://developer.mozilla.org/zh-CN/",
      tags: ["JavaScript", "Web开发", "HTML", "CSS", "文档"],
      author: "Mozilla",
      source: "MDN",
    },
    {
      title: "JavaScript.info 现代教程",
      description: "从基础到高级的现代 JavaScript 教程，涵盖 ES6+ 新特性和最佳实践。",
      type: "website" as const,
      url: "https://zh.javascript.info/",
      tags: ["JavaScript", "ES6", "教程", "Web开发"],
    },
    {
      title: "React 官方文档",
      description: "React 框架的官方文档，包含完整的 API 参考和最佳实践指南。",
      type: "document" as const,
      url: "https://react.dev/",
      tags: ["React", "JavaScript", "前端", "框架"],
      author: "Meta",
      source: "react.dev",
    },
    {
      title: "Vue.js 3 完全指南",
      description: "Vue.js 3 的完整学习指南，包括组合式 API、响应式系统等核心概念。",
      type: "document" as const,
      url: "https://cn.vuejs.org/",
      tags: ["Vue", "JavaScript", "前端", "框架"],
      author: "Evan You",
      source: "vuejs.org",
    },

    // 机器学习相关
    {
      title: "吴恩达机器学习课程",
      description: "斯坦福大学的经典机器学习课程，适合初学者系统学习机器学习基础。",
      type: "video" as const,
      url: "https://www.coursera.org/learn/machine-learning",
      tags: ["机器学习", "深度学习", "AI", "课程"],
      author: "Andrew Ng",
      source: "Coursera",
    },
    {
      title: "TensorFlow 官方教程",
      description: "Google 开源的机器学习框架 TensorFlow 的官方教程和文档。",
      type: "document" as const,
      url: "https://www.tensorflow.org/tutorials",
      tags: ["TensorFlow", "机器学习", "深度学习", "Python"],
      author: "Google",
      source: "tensorflow.org",
    },
    {
      title: "PyTorch 深度学习实战",
      description: "使用 PyTorch 框架进行深度学习的实战教程，包含大量代码示例。",
      type: "book" as const,
      url: "https://pytorch.org/tutorials/",
      tags: ["PyTorch", "深度学习", "神经网络", "Python"],
      author: "PyTorch Team",
      source: "pytorch.org",
    },
    {
      title: "Kaggle 数据科学竞赛平台",
      description: "全球最大的数据科学竞赛平台，提供真实数据集和学习资源。",
      type: "website" as const,
      url: "https://www.kaggle.com/",
      tags: ["数据科学", "机器学习", "竞赛", "实战"],
      source: "Kaggle",
    },

    // 工具类
    {
      title: "VS Code",
      description: "微软开发的免费开源代码编辑器，支持多种编程语言和丰富的插件生态。",
      type: "tool" as const,
      url: "https://code.visualstudio.com/",
      tags: ["编辑器", "开发工具", "IDE"],
      author: "Microsoft",
    },
    {
      title: "GitHub",
      description: "全球最大的代码托管平台，支持版本控制和协作开发。",
      type: "tool" as const,
      url: "https://github.com/",
      tags: ["Git", "版本控制", "协作", "开源"],
      author: "GitHub",
    },
    {
      title: "Jupyter Notebook",
      description: "交互式计算环境，特别适合数据分析和机器学习实验。",
      type: "tool" as const,
      url: "https://jupyter.org/",
      tags: ["Python", "数据科学", "笔记本", "交互式"],
    },
    {
      title: "Postman API 测试工具",
      description: "强大的 API 开发和测试工具，支持 REST、GraphQL 等多种协议。",
      type: "tool" as const,
      url: "https://www.postman.com/",
      tags: ["API", "测试", "开发工具", "后端"],
      author: "Postman",
    },

    // 算法和数据结构
    {
      title: "LeetCode",
      description: "在线编程练习平台，提供大量算法和数据结构题目，适合面试准备。",
      type: "website" as const,
      url: "https://leetcode.cn/",
      tags: ["算法", "数据结构", "编程练习", "面试"],
    },
    {
      title: "算法导论",
      description: "计算机科学领域的经典教材，全面介绍算法设计和分析。",
      type: "book" as const,
      tags: ["算法", "数据结构", "计算机科学", "教材"],
      author: "Thomas H. Cormen",
    },
    {
      title: "代码随想录",
      description: "系统的算法学习路线和题解，适合算法初学者和面试准备。",
      type: "website" as const,
      url: "https://programmercarl.com/",
      tags: ["算法", "数据结构", "面试", "刷题"],
      author: "代码随想录",
    },

    // 设计相关
    {
      title: "Figma",
      description: "基于浏览器的协作式界面设计工具，支持实时协作和原型设计。",
      type: "tool" as const,
      url: "https://www.figma.com/",
      tags: ["设计", "UI", "UX", "原型"],
    },
    {
      title: "Refactoring UI",
      description: "实用的 UI 设计指南，教你如何设计出美观实用的用户界面。",
      type: "book" as const,
      url: "https://www.refactoringui.com/",
      tags: ["UI设计", "前端", "设计系统"],
      author: "Adam Wathan & Steve Schoger",
    },
    {
      title: "Dribbble 设计灵感",
      description: "全球设计师社区，展示最新的设计作品和创意灵感。",
      type: "website" as const,
      url: "https://dribbble.com/",
      tags: ["设计", "UI", "灵感", "作品集"],
      source: "Dribbble",
    },
  ];

  const userId = "demo_user";
  const createdResources: string[] = [];

  // 创建资源并添加一些初始统计数据
  resources.forEach((resource, index) => {
    const created = createResource({
      ...resource,
      status: "active",
      userId,
    });
    createdResources.push(created.id);

    // 为资源添加一些初始浏览量（模拟真实使用）
    const viewCount = Math.floor(Math.random() * 500) + 50;
    for (let i = 0; i < viewCount; i++) {
      incrementViewCount(created.id);
    }
  });

  // 创建示例收藏夹
  const folders = [
    {
      name: "Python 学习",
      description: "Python 编程相关的学习资源",
      color: "#3b82f6",
      icon: "🐍",
    },
    {
      name: "前端开发",
      description: "Web 前端开发技术栈",
      color: "#10b981",
      icon: "🌐",
    },
    {
      name: "机器学习",
      description: "AI 和机器学习相关资源",
      color: "#8b5cf6",
      icon: "🤖",
    },
  ];

  const createdFolders: string[] = [];
  folders.forEach((folder) => {
    const created = createFolder({
      ...folder,
      userId,
      isPublic: false,
    });
    createdFolders.push(created.id);
  });

  // 创建一些示例收藏
  // Python 收藏夹
  [0, 1, 2].forEach((index) => {
    if (createdResources[index]) {
      createBookmark({
        userId,
        resourceId: createdResources[index],
        folderId: createdFolders[0],
        rating: 5,
        notes: "非常有用的资源！",
      });
    }
  });

  // 前端开发收藏夹
  [3, 4, 5].forEach((index) => {
    if (createdResources[index]) {
      createBookmark({
        userId,
        resourceId: createdResources[index],
        folderId: createdFolders[1],
        rating: 4,
      });
    }
  });

  // 机器学习收藏夹
  [6, 7].forEach((index) => {
    if (createdResources[index]) {
      createBookmark({
        userId,
        resourceId: createdResources[index],
        folderId: createdFolders[2],
        rating: 5,
      });
    }
  });

  console.log("Sample resources generated successfully!");
  console.log(`Created ${createdResources.length} resources`);
  console.log(`Created ${createdFolders.length} folders`);
}
