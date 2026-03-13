import { NextRequest, NextResponse } from "next/server";
import { updateQuestionSchema } from "@/lib/server/schema";

/**
 * GET /api/practice/questions/[id]
 * 获取单个题目
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return NextResponse.json({
    success: true,
    message: "请使用客户端 IndexedDB 获取题目",
    questionId: id,
  });
}

/**
 * PUT /api/practice/questions/[id]
 * 更新题目
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validated = updateQuestionSchema.parse(body);

    return NextResponse.json({
      success: true,
      message: "请使用客户端 IndexedDB 更新题目",
      questionId: id,
      data: validated,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Invalid request",
      },
      { status: 400 }
    );
  }
}

/**
 * DELETE /api/practice/questions/[id]
 * 删除题目
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return NextResponse.json({
    success: true,
    message: "请使用客户端 IndexedDB 删除题目",
    questionId: id,
  });
}
