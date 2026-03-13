import { NextRequest, NextResponse } from "next/server";
import { wrongQuestionNoteSchema } from "@/lib/server/schema";

/**
 * POST /api/practice/mistakes/[id]/master
 * 标记为已掌握
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  return NextResponse.json({
    success: true,
    message: "请使用客户端 IndexedDB 标记为已掌握",
    questionId: resolvedParams.id,
  });
}

/**
 * PUT /api/practice/mistakes/[id]
 * 更新错题笔记
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  try {
    const body = await request.json();
    const validated = wrongQuestionNoteSchema.parse(body);

    return NextResponse.json({
      success: true,
      message: "请使用客户端 IndexedDB 更新错题笔记",
      questionId: resolvedParams.id,
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
 * DELETE /api/practice/mistakes/[id]
 * 删除错题记录
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  return NextResponse.json({
    success: true,
    message: "请使用客户端 IndexedDB 删除错题记录",
    questionId: resolvedParams.id,
  });
}
