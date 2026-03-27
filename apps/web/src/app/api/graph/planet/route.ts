import { fail, ok } from "@/lib/server/response";
import { getCurrentUserId } from "@/lib/server/auth-utils";
import { createDocument, getDocument } from "@/lib/server/document-service";
 

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return fail({ code: "UNAUTHORIZED", message: "请先登录。" }, 401);
    }

    const body = (await request.json().catch(() => ({}))) as {
      title?: string;
      kbDocumentId?: string;
      content?: string;
    };

    const title = (body.title ?? "").trim();
    if (!title) {
      return fail({ code: "INVALID_REQUEST", message: "星球名称不能为空。" }, 400);
    }

    let docId = typeof body.kbDocumentId === "string" ? body.kbDocumentId.trim() : "";
    if (docId) {
      const existing = await getDocument(docId, userId);
      if (!existing) {
        return fail({ code: "DOC_NOT_FOUND", message: "未找到指定知识文档。" }, 404);
      }
    } else {
      const doc = await createDocument({
        title,
        content: (body.content ?? `# ${title}\n\n在这里记录该星球的核心知识点。`).trim(),
        authorId: userId,
      });
      docId = doc.id;
    }

    return ok({
      node: {
        nodeId: docId,
        label: title,
        kbDocumentId: docId,
        mode: "document",
      },
    });
  } catch (error) {
    return fail(
      {
        code: "GRAPH_PLANET_CREATE_FAILED",
        message: "创建星球失败。",
        details: error instanceof Error ? error.message : error,
      },
      500
    );
  }
}
