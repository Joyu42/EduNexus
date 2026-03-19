import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { loadDb, saveDb } from "@/lib/server/store";
import type { CollabVersion } from "@/lib/collab/collab-types";

const createVersionSchema = z.object({
  sessionId: z.string().min(1),
  content: z.string(),
  userId: z.string().min(1),
  userName: z.string().min(1),
  description: z.string().max(500).optional(),
});

// GET /api/collab/version?sessionId=xxx - 获取版本历史
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");
    const versionId = searchParams.get("id");

    if (!sessionId && !versionId) {
      return NextResponse.json({ error: "缺少参数" }, { status: 400 });
    }

    const db = await loadDb();

    if (versionId) {
      // 获取单个版本
      const version = db.collabVersions?.find((v: CollabVersion) => v.id === versionId);
      if (!version) {
        return NextResponse.json({ error: "版本不存在" }, { status: 404 });
      }
      return NextResponse.json(version);
    } else {
      // 获取会话的所有版本
      const versions = (db.collabVersions || [])
        .filter((v: CollabVersion) => v.sessionId === sessionId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return NextResponse.json(versions);
    }
  } catch (error) {
    console.error("获取版本失败:", error);
    return NextResponse.json(
      { error: "获取版本失败" },
      { status: 500 }
    );
  }
}

// POST /api/collab/version - 创建版本快照
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = createVersionSchema.parse(body);

    const db = await loadDb();
    if (!db.collabVersions) {
      db.collabVersions = [];
    }

    const version: CollabVersion = {
      id: `ver_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sessionId: data.sessionId,
      content: data.content,
      createdAt: new Date().toISOString(),
      createdBy: data.userId,
      createdByName: data.userName,
      description: data.description,
    };

    db.collabVersions.push(version);
    await saveDb(db);

    return NextResponse.json(version);
  } catch (error) {
    console.error("创建版本失败:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "参数验证失败", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "创建版本失败" },
      { status: 500 }
    );
  }
}
