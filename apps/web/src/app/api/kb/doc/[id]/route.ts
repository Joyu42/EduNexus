import { fail, ok } from "@/lib/server/response";
import { getCurrentUserId } from "@/lib/server/auth-utils";
import {
  deleteDocument,
  getDocument,
  updateDocument,
} from "@/lib/server/document-service";
import { detachDocumentFromLearningPacks } from "@/lib/server/learning-pack-store";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
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
    
    const { id } = await context.params;
    const doc = await getDocument(id, userId);

    if (!doc) {
      return fail(
        {
          code: "DOC_NOT_FOUND",
          message: "未找到对应知识文档，或无权访问。"
        },
        404
      );
    }

    return ok({
      id: doc.id,
      title: doc.title,
      content: doc.content,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      type: 'note', 
      domain: 'general',
      tags: [],
      links: [],
      sourceRefs: [],
      owner: doc.authorId,
      backlinks: []
    });
  } catch (error) {
    return fail(
      {
        code: "KB_DOC_FAILED",
        message: "读取知识文档失败。",
        details: error instanceof Error ? error.message : error
      },
      500
    );
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return fail(
        {
          code: "UNAUTHORIZED",
          message: "用户未登录。",
        },
        401
      );
    }

    const { id } = await context.params;
    const json = (await request.json()) as {
      title?: string;
      content?: string;
    };

    const hasTitle = typeof json.title === "string";
    const hasContent = typeof json.content === "string";
    if (!hasTitle && !hasContent) {
      return fail(
        {
          code: "INVALID_REQUEST",
          message: "标题或内容至少提供一个。",
        },
        400
      );
    }

    const existing = await getDocument(id, userId);
    if (!existing) {
      return fail(
        {
          code: "DOC_NOT_FOUND",
          message: "未找到对应知识文档，或无权访问。",
        },
        404
      );
    }

    const updated = await updateDocument(
      id,
      {
        title: hasTitle ? json.title : existing.title,
        content: hasContent ? json.content : existing.content,
      },
      userId
    );

    if (!updated) {
      return fail(
        {
          code: "DOC_NOT_FOUND",
          message: "未找到对应知识文档，或无权访问。",
        },
        404
      );
    }

    return ok({
      id: updated.id,
      title: updated.title,
      content: updated.content,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      type: "note",
      domain: "general",
      tags: [],
      links: [],
      sourceRefs: [],
      owner: updated.authorId,
      backlinks: [],
    });
  } catch (error) {
    return fail(
      {
        code: "KB_DOC_UPDATE_FAILED",
        message: "更新知识文档失败。",
        details: error instanceof Error ? error.message : error,
      },
      500
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return fail(
        {
          code: "UNAUTHORIZED",
          message: "用户未登录。",
        },
        401
      );
    }

    const { id } = await context.params;
    const deleted = await deleteDocument(id, userId);

    if (!deleted) {
      return fail(
        {
          code: "DOC_NOT_FOUND",
          message: "未找到对应知识文档，或无权访问。",
        },
        404
      );
    }

    await detachDocumentFromLearningPacks(userId, id);

    return ok({ deleted: true });
  } catch (error) {
    return fail(
      {
        code: "KB_DOC_DELETE_FAILED",
        message: "删除知识文档失败。",
        details: error instanceof Error ? error.message : error,
      },
      500
    );
  }
}
