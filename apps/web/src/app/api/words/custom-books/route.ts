import { getCurrentUserId } from "@/lib/server/auth-utils";
import { fail, ok } from "@/lib/server/response";
import { listCustomWordBooks } from "@/lib/server/custom-wordbook-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return fail({ code: "UNAUTHORIZED", message: "用户未登录。" }, 401);
  }

  const books = await listCustomWordBooks(userId);
  return ok({ books });
}
