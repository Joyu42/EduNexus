import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { loadDb, saveDb } from "@/lib/server/store";
import type { CollabSession, CollabUser } from "@/lib/collab/collab-types";

const createSessionSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  documentType: z.enum(["markdown", "code", "text"]),
  language: z.string().optional(),
  content: z.string().default(""),
  isPublic: z.boolean().default(false),
  tags: z.array(z.string()).optional(),
});

const updateSessionSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  content: z.string().optional(),
  isPublic: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
});

const inviteUserSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["owner", "editor", "viewer", "commenter"]),
});

// GET /api/collab/session - 获取会话列表
// GET /api/collab/session?id=xxx - 获取单个会话
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("id");
    const userId = searchParams.get("userId") || "demo_user";

    const db = await loadDb();

    if (sessionId) {
      // 获取单个会话
      const session = db.collabSessions?.find((s: CollabSession) => s.id === sessionId);
      if (!session) {
        return NextResponse.json({ error: "会话不存在" }, { status: 404 });
      }

      // 检查权限
      if (!session.isPublic && !session.permissions[userId]) {
        return NextResponse.json({ error: "无权访问" }, { status: 403 });
      }

      return NextResponse.json(session);
    } else {
      // 获取用户的会话列表
      const sessions = (db.collabSessions || []).filter(
        (s: CollabSession) => s.ownerId === userId || s.permissions[userId]
      );
      return NextResponse.json(sessions);
    }
  } catch (error) {
    console.error("获取会话失败:", error);
    return NextResponse.json(
      { error: "获取会话失败" },
      { status: 500 }
    );
  }
}

// POST /api/collab/session - 创建会话
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = createSessionSchema.parse(body);
    const userId = body.userId || "demo_user";
    const userName = body.userName || "演示用户";

    const db = await loadDb();
    if (!db.collabSessions) {
      db.collabSessions = [];
    }

    const sessionId = `collab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    const session: CollabSession = {
      id: sessionId,
      title: data.title,
      description: data.description,
      documentType: data.documentType,
      language: data.language,
      content: data.content,
      ownerId: userId,
      createdAt: now,
      updatedAt: now,
      lastEditedBy: userId,
      users: [],
      permissions: {
        [userId]: "owner",
      },
      isPublic: data.isPublic,
      inviteCode: Math.random().toString(36).substr(2, 10).toUpperCase(),
      tags: data.tags,
    };

    db.collabSessions.push(session);
    await saveDb(db);

    return NextResponse.json(session);
  } catch (error) {
    console.error("创建会话失败:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "参数验证失败", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "创建会话失败" },
      { status: 500 }
    );
  }
}

// PATCH /api/collab/session?id=xxx - 更新会话
export async function PATCH(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("id");
    if (!sessionId) {
      return NextResponse.json({ error: "缺少会话ID" }, { status: 400 });
    }

    const body = await req.json();
    const data = updateSessionSchema.parse(body);
    const userId = body.userId || "demo_user";

    const db = await loadDb();
    const sessionIndex = db.collabSessions?.findIndex(
      (s: CollabSession) => s.id === sessionId
    );

    if (sessionIndex === undefined || sessionIndex === -1) {
      return NextResponse.json({ error: "会话不存在" }, { status: 404 });
    }

    const session = db.collabSessions[sessionIndex];

    // 检查权限
    if (session.ownerId !== userId && session.permissions[userId] !== "editor") {
      return NextResponse.json({ error: "无权编辑" }, { status: 403 });
    }

    // 更新会话
    const updatedSession = {
      ...session,
      ...data,
      updatedAt: new Date().toISOString(),
      lastEditedBy: userId,
    };

    db.collabSessions[sessionIndex] = updatedSession;
    await saveDb(db);

    return NextResponse.json(updatedSession);
  } catch (error) {
    console.error("更新会话失败:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "参数验证失败", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "更新会话失败" },
      { status: 500 }
    );
  }
}

// DELETE /api/collab/session?id=xxx - 删除会话
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("id");
    const userId = searchParams.get("userId") || "demo_user";

    if (!sessionId) {
      return NextResponse.json({ error: "缺少会话ID" }, { status: 400 });
    }

    const db = await loadDb();
    const session = db.collabSessions?.find((s: CollabSession) => s.id === sessionId);

    if (!session) {
      return NextResponse.json({ error: "会话不存在" }, { status: 404 });
    }

    // 检查权限
    if (session.ownerId !== userId) {
      return NextResponse.json({ error: "无权删除" }, { status: 403 });
    }

    // 删除会话
    db.collabSessions = db.collabSessions.filter((s: CollabSession) => s.id !== sessionId);
    await saveDb(db);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("删除会话失败:", error);
    return NextResponse.json(
      { error: "删除会话失败" },
      { status: 500 }
    );
  }
}
