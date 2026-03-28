import { getCurrentUserId } from "@/lib/server/auth-utils";
import { fail, ok } from "@/lib/server/response";
import {
  buildParsedBookFromContent,
  replaceCustomWordBook,
  validateFileSize,
  WordImportError,
} from "@/lib/server/custom-wordbook-service";
import type { CustomBookImportFormat } from "@/lib/server/custom-wordbook-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function detectFormat(raw: unknown, filename: string | null, content: string): CustomBookImportFormat {
  const format = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (format === "csv" || format === "json") return format;
  const safeName = filename?.toLowerCase() ?? "";
  if (safeName.endsWith(".json")) return "json";
  if (safeName.endsWith(".csv")) return "csv";
  const trimmed = content.trimStart();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return "json";
  return "csv";
}

export async function POST(request: Request, context: { params: Promise<{ bookId: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) return fail({ code: "UNAUTHORIZED", message: "用户未登录。" }, 401);

  const { bookId } = await context.params;

  try {
    const formData = await request.formData();
    const fileValue = formData.get("file");
    const formatValue = formData.get("format");

    if (!(fileValue instanceof Blob)) {
      return fail({ code: "MISSING_FILE", message: "缺少上传文件。" }, 400);
    }

    const originalFilename = "name" in fileValue && typeof fileValue.name === "string" ? fileValue.name : null;
    const content = await fileValue.text();
    const format = detectFormat(formatValue, originalFilename, content);

    validateFileSize(fileValue.size);
    const parsed = buildParsedBookFromContent(content, format, {});
    const book = await replaceCustomWordBook(userId, bookId, parsed, format, originalFilename ?? undefined);
    return ok({ book });
  } catch (error) {
    if (error instanceof WordImportError) {
      if (error.message === "BOOK_NOT_FOUND") {
        return fail({ code: "BOOK_NOT_FOUND", message: "词书不存在或无权访问。" }, 404);
      }
      return fail({ code: "INVALID_WORDBOOK_IMPORT", message: error.message }, 400);
    }
    return fail({ code: "REPLACE_FAILED", message: "替换词书内容失败。" }, 500);
  }
}
