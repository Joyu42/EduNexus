import { fail, ok } from "@/lib/server/response";
import { listWeaknessTemplates } from "@/lib/server/teacher-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const subject = searchParams.get("subject")?.trim();
    const result = listWeaknessTemplates(subject);
    return ok(result);
  } catch (error) {
    return fail(
      {
        code: "TEACHER_TEMPLATE_LIST_FAILED",
        message: "获取薄弱点模板失败。",
        details: error instanceof Error ? error.message : error
      },
      500
    );
  }
}
