/**
 * 学习计划生成 API
 * POST /api/kb/learning-plan
 */

import { NextRequest, NextResponse } from "next/server";
import {
  generateLearningPlan,
  analyzeKnowledgeCoverage,
  recommendLearningOrder,
} from "@/lib/ai/learning-planner";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, documents, userGoal, targetDomain } = body;

    if (!documents || !Array.isArray(documents)) {
      return NextResponse.json(
        { success: false, error: "缺少文档数据" },
        { status: 400 }
      );
    }

    let result;

    switch (action) {
      case "generate":
        result = await generateLearningPlan(documents, userGoal);
        break;

      case "coverage":
        if (!targetDomain) {
          return NextResponse.json(
            { success: false, error: "缺少目标领域" },
            { status: 400 }
          );
        }
        result = await analyzeKnowledgeCoverage(documents, targetDomain);
        break;

      case "order":
        result = await recommendLearningOrder(documents);
        break;

      default:
        return NextResponse.json(
          { success: false, error: "未知的操作类型" },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("学习计划生成失败:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "生成失败",
      },
      { status: 500 }
    );
  }
}
