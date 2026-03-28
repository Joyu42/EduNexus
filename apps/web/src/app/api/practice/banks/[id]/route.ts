import { NextRequest, NextResponse } from "next/server";
import { updateQuestionBankSchema } from "@/lib/server/schema";

/**
 * GET /api/practice/banks/[id]
 * 获取单个题库
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  return NextResponse.json({
    success: true,
    message: "请使用客户端 IndexedDB 获取题库",
    bankId: resolvedParams.id,
  });
}

/**
 * PUT /api/practice/banks/[id]
 * 更新题库
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  try {
    const body = await request.json();
    const validated = updateQuestionBankSchema.parse(body);

    return NextResponse.json({
      success: true,
      message: "请使用客户端 IndexedDB 更新题库",
      bankId: resolvedParams.id,
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
 * DELETE /api/practice/banks/[id]
 * 删除题库
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  return NextResponse.json({
    success: true,
    message: "请使用客户端 IndexedDB 删除题库",
    bankId: resolvedParams.id,
  });
}
