import { fail, ok } from "@/lib/server/response";
import { getCurrentUserId } from "@/lib/server/auth-utils";
import { createDocument, getDocument } from "@/lib/server/document-service";
import { loadDb, saveDb } from "@/lib/server/store";

export const runtime = "nodejs";

function createCustomDemoNodeId(): string {
  return `demo_node_custom_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function upsertDemoNodeBinding(input: {
  db: Awaited<ReturnType<typeof loadDb>>;
  nodeId: string;
  label: string;
  kbDocumentId: string;
  now: string;
}) {
  input.db.masteryByNode[input.nodeId] = input.db.masteryByNode[input.nodeId] ?? 0;
  const planId = `demo_graph_node::${input.nodeId}`;
  const existing = input.db.plans.find((plan) => plan.planId === planId);

  const next = {
    planId,
    goalType: "project" as const,
    goal: input.label,
    focusNodeId: input.nodeId,
    focusNodeLabel: input.kbDocumentId,
    focusNodeRisk: 0,
    relatedNodes: [],
    tasks: [],
    createdAt: existing?.createdAt ?? input.now,
    updatedAt: input.now,
  };

  if (existing) {
    Object.assign(existing, next);
  } else {
    input.db.plans.push(next);
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return fail({ code: "UNAUTHORIZED", message: "请先登录。" }, 401);
    }

    const body = (await request.json().catch(() => ({}))) as {
      title?: string;
      kbDocumentId?: string;
      content?: string;
    };

    const title = (body.title ?? "").trim();
    if (!title) {
      return fail({ code: "INVALID_REQUEST", message: "星球名称不能为空。" }, 400);
    }

    let docId = typeof body.kbDocumentId === "string" ? body.kbDocumentId.trim() : "";
    if (docId) {
      const existing = await getDocument(docId, userId);
      if (!existing) {
        return fail({ code: "DOC_NOT_FOUND", message: "未找到指定知识文档。" }, 404);
      }
    } else {
      const doc = await createDocument({
        title,
        content: (body.content ?? `# ${title}\n\n在这里记录该星球的核心知识点。`).trim(),
        authorId: userId,
      });
      docId = doc.id;
    }

    const db = await loadDb();
    const hasDemoPaths = db.syncedPaths.some(
      (path) => path.userId === userId && path.pathId.startsWith("demo_path_")
    );

    if (!hasDemoPaths) {
      return ok({
        node: {
          nodeId: docId,
          label: title,
          kbDocumentId: docId,
          mode: "document",
        },
      });
    }

    const now = new Date().toISOString();
    const nodeId = createCustomDemoNodeId();
    upsertDemoNodeBinding({ db, nodeId, label: title, kbDocumentId: docId, now });
    await saveDb(db);

    return ok({
      node: {
        nodeId,
        label: title,
        kbDocumentId: docId,
        mode: "demo",
      },
    });
  } catch (error) {
    return fail(
      {
        code: "GRAPH_PLANET_CREATE_FAILED",
        message: "创建星球失败。",
        details: error instanceof Error ? error.message : error,
      },
      500
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return fail({ code: "UNAUTHORIZED", message: "请先登录。" }, 401);
    }

    const body = (await request.json().catch(() => ({}))) as {
      nodeId?: string;
      kbDocumentId?: string;
      label?: string;
    };

    const nodeId = (body.nodeId ?? "").trim();
    const kbDocumentId = (body.kbDocumentId ?? "").trim();
    const label = (body.label ?? "").trim();

    if (!nodeId || !kbDocumentId) {
      return fail({ code: "INVALID_REQUEST", message: "nodeId 与 kbDocumentId 必填。" }, 400);
    }

    if (!nodeId.startsWith("demo_node_")) {
      return fail({ code: "UNSUPPORTED_NODE", message: "当前仅支持为演示星球绑定文档。" }, 400);
    }

    const doc = await getDocument(kbDocumentId, userId);
    if (!doc) {
      return fail({ code: "DOC_NOT_FOUND", message: "未找到指定知识文档。" }, 404);
    }

    const db = await loadDb();
    const now = new Date().toISOString();
    upsertDemoNodeBinding({ db, nodeId, label: label || doc.title, kbDocumentId, now });
    await saveDb(db);

    return ok({
      node: {
        nodeId,
        label: label || doc.title,
        kbDocumentId,
      },
    });
  } catch (error) {
    return fail(
      {
        code: "GRAPH_PLANET_BIND_FAILED",
        message: "绑定知识文档失败。",
        details: error instanceof Error ? error.message : error,
      },
      500
    );
  }
}
