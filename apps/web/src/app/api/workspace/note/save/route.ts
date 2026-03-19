import { fail, ok } from "@/lib/server/response";
import { saveNoteSchema } from "@/lib/server/schema";
import { saveNoteFromSession } from "@/lib/server/kb-lite";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const json = await request.json().catch(() => ({}));
    const parsed = saveNoteSchema.safeParse(json);
    if (!parsed.success) {
      return fail({
        code: "INVALID_REQUEST",
        message: "请求参数不合法。",
        details: parsed.error.flatten()
      });
    }

    const saved = await saveNoteFromSession({
      sessionId: parsed.data.sessionId,
      title: parsed.data.title,
      content: parsed.data.content,
      tags: parsed.data.tags,
      links: parsed.data.links
    });

    return ok(saved);
  } catch (error) {
    return fail(
      {
        code: "NOTE_SAVE_FAILED",
        message: "保存笔记失败。",
        details: error instanceof Error ? error.message : error
      },
      500
    );
  }
}
