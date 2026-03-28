import { getCurrentUserId } from "@/lib/server/auth-utils";
import { fail, ok } from "@/lib/server/response";
import {
  deleteCustomWordBook,
  getCustomWordBook,
  listCustomWords,
  updateCustomWordBook,
} from "@/lib/server/custom-wordbook-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ bookId: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return fail({ code: "UNAUTHORIZED", message: "用户未登录。" }, 401);
  }

  const { bookId } = await context.params;
  const book = await getCustomWordBook(userId, bookId);
  if (!book) {
    return fail({ code: "BOOK_NOT_FOUND", message: "未找到对应词书，或无权访问。" }, 404);
  }

  const words = await listCustomWords(userId, { bookId });
  return ok({ book, words });
}

export async function PUT(request: Request, context: { params: Promise<{ bookId: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) return fail({ code: "UNAUTHORIZED", message: "用户未登录。" }, 401);

  const { bookId } = await context.params;
  const body = (await request.json()) as { name?: string; description?: string };

  if (typeof body.name !== "string" && typeof body.description !== "string") {
    return fail({ code: "INVALID_PAYLOAD", message: "至少需要提供 name 或 description。" }, 400);
  }

  if (typeof body.name === "string" && !body.name.trim()) {
    return fail({ code: "INVALID_PAYLOAD", message: "名称不能为空。" }, 400);
  }

  const result = await updateCustomWordBook(userId, bookId, {
    name: typeof body.name === "string" ? body.name.trim() : undefined,
    description: typeof body.description === "string" ? body.description.trim() : undefined,
  });

  if (!result) {
    return fail({ code: "BOOK_NOT_FOUND", message: "词书不存在或无权访问。" }, 404);
  }

  return ok({ book: result });
}

export async function DELETE(_request: Request, context: { params: Promise<{ bookId: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) return fail({ code: "UNAUTHORIZED", message: "用户未登录。" }, 401);

  const { bookId } = await context.params;
  const deleted = await deleteCustomWordBook(userId, bookId);

  if (!deleted) {
    return fail({ code: "BOOK_NOT_FOUND", message: "词书不存在或无权访问。" }, 404);
  }

  return ok({ deleted: true });
}
