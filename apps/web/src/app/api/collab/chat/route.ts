import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { loadDb, saveDb } from "@/lib/server/store";
import type { CollabMessage } from "@/lib/collab/collab-types";

const sendMessageSchema = z.object({
  sessionId: z.string().min(1),
  content: z.string().min(1).max(2000),
  userId: z.string().min(1),
  userName: z.string().min(1),
  userAvatar: z.string().optional(),
});

// GET /api/collab/chat?sessionId=xxx - 获取聊天记录
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json({ error: "缺少会话ID" }, { status: 400 });
    }

    const db = await loadDb();
    const messages = (db.collabMessages || []).filter(
      (m: CollabMessage) => m.sessionId === sessionId
    );

    return NextResponse.json(messages);
  } catch (error) {
    console.error("获取聊天记录失败:", error);
    return NextResponse.json(
      { error: "获取聊天记录失败" },
      { status: 500 }
    );
  }
}

// POST /api/collab/chat - 发送消息
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = sendMessageSchema.parse(body);

    const db = await loadDb();
    if (!db.collabMessages) {
      db.collabMessages = [];
    }

    const message: CollabMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sessionId: data.sessionId,
      userId: data.userId,
      userName: data.userName,
      userAvatar: data.userAvatar,
      content: data.content,
      type: "text",
      createdAt: new Date().toISOString(),
    };

    db.collabMessages.push(message);
    await saveDb(db);

    return NextResponse.json(message);
  } catch (error) {
    console.error("发送消息失败:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "参数验证失败", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "发送消息失败" },
      { status: 500 }
    );
  }
}
