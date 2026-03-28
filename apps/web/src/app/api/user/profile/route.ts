import { NextResponse } from "next/server";

import { fail } from "@/lib/server/response";
import { getCurrentUserId } from "@/lib/server/auth-utils";
import { getUserById, updateUserName } from "@/lib/server/user-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return fail({ code: "UNAUTHORIZED", message: "请先登录" }, 401);
    }

    const user = await getUserById(userId);
    if (!user) {
      return fail({ code: "NOT_FOUND", message: "用户不存在" }, 404);
    }

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    return fail(
      {
        code: "PROFILE_GET_FAILED",
        message: "获取个人信息失败",
        details: error instanceof Error ? error.message : error,
      },
      500
    );
  }
}

export async function PUT(request: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return fail({ code: "UNAUTHORIZED", message: "请先登录" }, 401);
    }

    const json = await request.json().catch(() => ({}));
    const name = typeof json.name === "string" ? json.name : "";

    try {
      const updated = await updateUserName(userId, name);
      return NextResponse.json({
        success: true,
        data: {
          id: updated.id,
          email: updated.email,
          name: updated.name,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.includes("用户名已被占用")) {
        return fail({ code: "USERNAME_ALREADY_EXISTS", message: "用户名已被占用" }, 409);
      }
      if (message.includes("用户名不能为空")) {
        return fail({ code: "VALIDATION_ERROR", message: "用户名不能为空" }, 400);
      }
      throw error;
    }
  } catch (error) {
    return fail(
      {
        code: "PROFILE_UPDATE_FAILED",
        message: "更新个人信息失败",
        details: error instanceof Error ? error.message : error,
      },
      500
    );
  }
}
