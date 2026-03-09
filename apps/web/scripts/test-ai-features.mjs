#!/usr/bin/env node

/**
 * AI 功能测试脚本
 * 测试文档分析、学习计划生成等 AI 功能
 */

const testDocumentAnalyzer = async () => {
  console.log("🧪 测试文档分析功能...\n");

  const testContent = `# React 入门教程

## 什么是 React

React 是一个用于构建用户界面的 JavaScript 库。它由 Facebook 开发和维护。

## 核心概念

### 组件
组件是 React 的基本构建块。

### Props
Props 用于在组件之间传递数据。

### State
State 用于管理组件内部的数据。

## 示例代码

\`\`\`jsx
function Welcome(props) {
  return <h1>Hello, {props.name}</h1>;
}
\`\`\`
`;

  try {
    // 测试摘要生成
    console.log("📝 测试摘要生成...");
    const summaryResponse = await fetch("http://localhost:3000/api/kb/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "summary",
        content: testContent,
        title: "React 入门教程",
      }),
    });

    if (summaryResponse.ok) {
      const summaryData = await summaryResponse.json();
      console.log("✅ 摘要生成成功");
      console.log("摘要:", summaryData.data.summary.slice(0, 100) + "...");
      console.log("关键要点数量:", summaryData.data.keyPoints.length);
    } else {
      console.log("❌ 摘要生成失败:", summaryResponse.status);
    }

    // 测试关键词提取
    console.log("\n🏷️  测试关键词提取...");
    const keywordsResponse = await fetch("http://localhost:3000/api/kb/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "keywords",
        content: testContent,
        title: "React 入门教程",
      }),
    });

    if (keywordsResponse.ok) {
      const keywordsData = await keywordsResponse.json();
      console.log("✅ 关键词提取成功");
      console.log("关键词数量:", keywordsData.data.keywords.length);
      console.log("建议标签:", keywordsData.data.suggestedTags.join(", "));
    } else {
      console.log("❌ 关键词提取失败:", keywordsResponse.status);
    }

    // 测试思维导图生成
    console.log("\n🗺️  测试思维导图生成...");
    const mindmapResponse = await fetch("http://localhost:3000/api/kb/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "mindmap",
        content: testContent,
        title: "React 入门教程",
      }),
    });

    if (mindmapResponse.ok) {
      const mindmapData = await mindmapResponse.json();
      console.log("✅ 思维导图生成成功");
      console.log("节点数量:", mindmapData.data.nodes.length);
      console.log("边数量:", mindmapData.data.edges.length);
    } else {
      console.log("❌ 思维导图生成失败:", mindmapResponse.status);
    }

    console.log("\n✨ 所有测试完成！");
  } catch (error) {
    console.error("❌ 测试失败:", error.message);
  }
};

// 运行测试
console.log("🚀 开始测试 AI 功能\n");
console.log("⚠️  请确保：");
console.log("1. 开发服务器正在运行 (npm run dev)");
console.log("2. 已配置 MODELSCOPE_API_KEY 环境变量\n");

testDocumentAnalyzer();
