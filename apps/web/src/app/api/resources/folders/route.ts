import { fail, ok } from "@/lib/server/response";
import { getCurrentUserId } from "@/lib/server/auth-utils";
import {
  createResourceFolder,
  deleteResourceFolder,
  listResourceFolders,
  updateResourceFolder
} from "@/lib/server/resources-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeId(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  const normalized = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
  return normalized;
}

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return fail(
        {
          code: "UNAUTHORIZED",
          message: "请先登录后再查看文件夹。"
        },
        401
      );
    }

    const folders = await listResourceFolders(userId);
    return ok({ folders });
  } catch (error) {
    return fail(
      {
        code: "RESOURCE_FOLDERS_LIST_FAILED",
        message: "获取文件夹列表失败。",
        details: error instanceof Error ? error.message : error
      },
      500
    );
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return fail(
        {
          code: "UNAUTHORIZED",
          message: "请先登录后再创建文件夹。"
        },
        401
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return fail(
        {
          code: "RESOURCE_FOLDER_CREATE_INVALID_JSON",
          message: "请求体必须是 JSON。"
        },
        400
      );
    }

    const payload = (body ?? {}) as Record<string, unknown>;
    const name = typeof payload.name === "string" ? payload.name.trim() : "";
    if (!name) {
      return fail(
        {
          code: "RESOURCE_FOLDER_CREATE_VALIDATION_FAILED",
          message: "name 为必填字段。"
        },
        400
      );
    }

    const description = typeof payload.description === "string" ? payload.description : undefined;
    const resourceIds = normalizeStringArray(payload.resourceIds);

    const folder = await createResourceFolder({
      userId,
      name,
      description,
      resourceIds
    });

    return ok({ folder });
  } catch (error) {
    return fail(
      {
        code: "RESOURCE_FOLDER_CREATE_FAILED",
        message: "创建文件夹失败。",
        details: error instanceof Error ? error.message : error
      },
      500
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return fail(
        {
          code: "UNAUTHORIZED",
          message: "请先登录后再更新文件夹。"
        },
        401
      );
    }

    const { searchParams } = new URL(request.url);
    const folderId = normalizeId(searchParams.get("folderId"));
    if (!folderId) {
      return fail(
        {
          code: "INVALID_REQUEST",
          message: "folderId 不能为空。"
        },
        400
      );
    }

    const all = await listResourceFolders();
    const existing = all.find((folder: { id: string }) => folder.id === folderId);
    if (!existing) {
      return fail(
        {
          code: "RESOURCE_FOLDER_NOT_FOUND",
          message: "未找到对应文件夹。"
        },
        404
      );
    }

    if (existing.userId !== userId) {
      return fail(
        {
          code: "FORBIDDEN",
          message: "无权限更新该文件夹。"
        },
        403
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return fail(
        {
          code: "RESOURCE_FOLDER_UPDATE_INVALID_JSON",
          message: "请求体必须是 JSON。"
        },
        400
      );
    }

    const payload = (body ?? {}) as Record<string, unknown>;
    const input: { name?: string; description?: string; resourceIds?: string[] } = {};

    if (typeof payload.name === "string") {
      const nextName = payload.name.trim();
      if (!nextName) {
        return fail(
          {
            code: "RESOURCE_FOLDER_UPDATE_VALIDATION_FAILED",
            message: "name 不能为空。"
          },
          400
        );
      }
      input.name = nextName;
    }

    if (typeof payload.description === "string") {
      input.description = payload.description;
    }

    const normalizedResourceIds = normalizeStringArray(payload.resourceIds);
    if (normalizedResourceIds) {
      input.resourceIds = normalizedResourceIds;
    }

    if (!input.name && input.description === undefined && input.resourceIds === undefined) {
      return fail(
        {
          code: "RESOURCE_FOLDER_UPDATE_VALIDATION_FAILED",
          message: "至少提供一个可更新字段：name/description/resourceIds。"
        },
        400
      );
    }

    const folder = await updateResourceFolder(folderId, input);
    if (!folder) {
      return fail(
        {
          code: "RESOURCE_FOLDER_NOT_FOUND",
          message: "未找到对应文件夹。"
        },
        404
      );
    }

    return ok({ folder });
  } catch (error) {
    return fail(
      {
        code: "RESOURCE_FOLDER_UPDATE_FAILED",
        message: "更新文件夹失败。",
        details: error instanceof Error ? error.message : error
      },
      500
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return fail(
        {
          code: "UNAUTHORIZED",
          message: "请先登录后再删除文件夹。"
        },
        401
      );
    }

    const { searchParams } = new URL(request.url);
    const folderId = normalizeId(searchParams.get("folderId"));
    if (!folderId) {
      return fail(
        {
          code: "INVALID_REQUEST",
          message: "folderId 不能为空。"
        },
        400
      );
    }

    const all = await listResourceFolders();
    const existing = all.find((folder: { id: string }) => folder.id === folderId);
    if (!existing) {
      return fail(
        {
          code: "RESOURCE_FOLDER_NOT_FOUND",
          message: "未找到对应文件夹。"
        },
        404
      );
    }

    if (existing.userId !== userId) {
      return fail(
        {
          code: "FORBIDDEN",
          message: "无权限删除该文件夹。"
        },
        403
      );
    }

    const deleted = await deleteResourceFolder(folderId);
    if (!deleted) {
      return fail(
        {
          code: "RESOURCE_FOLDER_NOT_FOUND",
          message: "未找到对应文件夹。"
        },
        404
      );
    }

    return ok({ deleted: true });
  } catch (error) {
    return fail(
      {
        code: "RESOURCE_FOLDER_DELETE_FAILED",
        message: "删除文件夹失败。",
        details: error instanceof Error ? error.message : error
      },
      500
    );
  }
}
