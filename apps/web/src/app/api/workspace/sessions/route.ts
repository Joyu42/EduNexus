import { fail, ok } from "@/lib/server/response";
import { listSessions } from "@/lib/server/session-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim();
    const sessions = await listSessions(q);
    return ok({ sessions });
  } catch (error) {
    return fail(
      {
        code: "SESSION_LIST_FAILED",
        message: "获取会话列表失败。",
        details: error instanceof Error ? error.message : error
      },
      500
    );
  }
}
