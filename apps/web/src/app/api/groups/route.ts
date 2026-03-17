import { NextResponse } from "next/server";
import { fail, ok } from "@/lib/server/response";
import { createGroup } from "@/lib/server/groups-service";
import { loadDb } from "@/lib/server/store";
import { getCurrentUserId } from "@/lib/server/auth-utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = await loadDb();
    return ok({ groups: db.publicGroups });
  } catch (error) {
    return fail(
      {
        code: "GROUPS_LIST_FAILED",
        message: "获取学习小组失败。",
        details: error instanceof Error ? error.message : error
      },
      500
    );
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return fail(
        {
          code: "UNAUTHORIZED",
          message: "请先登录后再创建小组。"
        },
        401
      );
    }

    const json = await request.json().catch(() => ({}));
    const name = typeof json.name === "string" ? json.name.trim() : "";
    const description = typeof json.description === "string" ? json.description.trim() : "";
    const category = typeof json.category === "string" ? json.category.trim() : "";

    if (!name) {
      return fail(
        {
          code: "INVALID_REQUEST",
          message: "小组名称不能为空。"
        },
        400
      );
    }

    void category;
    const group = await createGroup({
      name,
      description,
      createdBy: userId
    });

    return NextResponse.json(
      {
        success: true,
        data: { group }
      },
      { status: 201 }
    );
  } catch (error) {
    return fail(
      {
        code: "GROUP_CREATE_FAILED",
        message: "创建学习小组失败。",
        details: error instanceof Error ? error.message : error
      },
      500
    );
  }
}
