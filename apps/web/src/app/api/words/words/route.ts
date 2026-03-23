import { getCurrentUserId } from "@/lib/server/auth-utils";
import { fail, ok } from "@/lib/server/response";
import { listWords } from "@/lib/server/words-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return fail({ code: "UNAUTHORIZED", message: "用户未登录。" }, 401);
  }

  const { searchParams } = new URL(request.url);
  const bookId = searchParams.get("bookId") ?? undefined;
  const words = await listWords(userId, bookId);
  return ok({ words });
}
