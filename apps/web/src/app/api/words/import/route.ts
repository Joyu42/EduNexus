import { getCurrentUserId } from "@/lib/server/auth-utils";
import { fail, ok } from "@/lib/server/response";
import {
  buildParsedBookFromContent,
  createCustomWordBook,
  validateFileSize,
  WordImportError,
  type CustomBookImportFormat,
} from "@/lib/server/custom-wordbook-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function detectFormat(raw: unknown, filename: string | null, content: string): CustomBookImportFormat {
  const format = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (format === "csv" || format === "json") {
    return format;
  }

  const safeName = filename?.toLowerCase() ?? "";
  if (safeName.endsWith(".json")) {
    return "json";
  }
  if (safeName.endsWith(".csv")) {
    return "csv";
  }

  const trimmed = content.trimStart();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return "json";
  }
  return "csv";
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return fail({ code: "UNAUTHORIZED", message: "用户未登录。" }, 401);
  }

  try {
    const formData = await request.formData();
    const fileValue = formData.get("file");
    const name = formData.get("name");
    const description = formData.get("description");
    const formatValue = formData.get("format");

    if (!(fileValue instanceof Blob)) {
      return fail({ code: "MISSING_FILE", message: "缺少上传文件。" }, 400);
    }

    validateFileSize(fileValue.size);
    const originalFilename = "name" in fileValue && typeof fileValue.name === "string" ? fileValue.name : null;
    const content = await fileValue.text();
    const format = detectFormat(formatValue, originalFilename, content);

    const parsed = buildParsedBookFromContent(content, format, {
      name: typeof name === "string" ? name : undefined,
      description: typeof description === "string" ? description : undefined,
    });

    const book = await createCustomWordBook({
      userId,
      parsed,
      format,
      originalFilename: originalFilename ?? undefined,
    });

    return ok({ book });
  } catch (error) {
    if (error instanceof WordImportError) {
      return fail(
        {
          code: "INVALID_WORDBOOK_IMPORT",
          message: error.message,
        },
        400
      );
    }

    return fail(
      {
        code: "IMPORT_FAILED",
        message: "导入失败。",
        details: error instanceof Error ? error.message : error,
      },
      500
    );
  }
}
