import { getVaultDocById } from "@/lib/server/kb-lite";
import { fail, ok } from "@/lib/server/response";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const doc = await getVaultDocById(id);
    if (!doc) {
      return fail(
        {
          code: "DOC_NOT_FOUND",
          message: "未找到对应知识文档。"
        },
        404
      );
    }

    return ok({
      id: doc.id,
      title: doc.title,
      type: doc.type,
      domain: doc.domain,
      tags: doc.tags,
      links: doc.links,
      sourceRefs: doc.sourceRefs,
      owner: doc.owner,
      updatedAt: doc.updatedAt,
      backlinks: doc.backlinks,
      content: doc.content
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
