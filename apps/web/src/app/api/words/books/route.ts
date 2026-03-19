import { getCurrentUserId } from "@/lib/server/auth-utils";
import { fail, ok } from "@/lib/server/response";
import { listWordBooks } from "@/lib/server/words-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return fail({ code: "UNAUTHORIZED", message: "用户未登录。" }, 401);
  }

  return ok({ books: listWordBooks() });
}
