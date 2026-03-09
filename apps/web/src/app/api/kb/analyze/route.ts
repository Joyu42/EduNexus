/**
 * 文档分析 API
 * POST /api/kb/analyze
 */

import { NextRequest, NextResponse } from "next/server";
import {
  generateDocumentSummary,
  extractKeywords,
  generateMindMap,
} from "@/lib/ai/document-analyzer";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, content, title } = body;

    if (!content || !title) {
      return NextResponse.json(
        { success: false, error: "缺少必要参数" },
        { status: 400 }
      );
    }

    let result;

    switch (action) {
      case "summary":
        result = await generateDocumentSummary(content, title);
        break;

      case "keywords":
        result = await extractKeywords(content, title);
        break;

      case "mindmap":
        result = await generateMindMap(content, title);
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
    console.error("文档分析失败:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "分析失败",
      },
      { status: 500 }
    );
  }
}
