import { fail, ok } from "@/lib/server/response";
import { getCurrentUserId } from "@/lib/server/auth-utils";
import { listDocuments, createDocument } from "@/lib/server/document-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return fail(
        {
          code: "UNAUTHORIZED",
          message: "用户未登录。"
        },
        401
      );
    }

    const documents = await listDocuments(userId);

    return ok({ documents });
  } catch (error) {
    return fail(
      {
        code: "KB_LIST_FAILED",
        message: "获取文档列表失败。",
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
          message: "用户未登录。"
        },
        401
      );
    }

    const json = await request.json();
    const { title, content, tags } = json as {
      title?: unknown;
      content?: unknown;
      tags?: unknown;
    };

    if (typeof title !== "string" || typeof content !== "string" || !title || !content) {
      return fail(
        {
          code: "INVALID_REQUEST",
          message: "标题和内容不能为空。"
        },
        400
      );
    }

    if (
      typeof tags !== "undefined" &&
      (!Array.isArray(tags) || tags.some(tag => typeof tag !== "string"))
    ) {
      return fail(
        {
          code: "INVALID_REQUEST",
          message: "标签必须为字符串数组。"
        },
        400
      );
    }

    const doc = await createDocument({
      title,
      content,
      tags: tags as string[] | undefined,
      authorId: userId
    });

    return ok({ document: doc });
  } catch (error) {
    return fail(
      {
        code: "KB_CREATE_FAILED",
        message: "创建文档失败。",
        details: error instanceof Error ? error.message : error
      },
      500
    );
  }
}
