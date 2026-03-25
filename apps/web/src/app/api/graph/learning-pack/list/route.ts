import { NextResponse } from "next/server";
import {
  getActivePack,
  getPacksByUser,
  pruneStaleLearningPacks,
} from "@/lib/server/learning-pack-store";
import { getCurrentUserId } from "@/lib/server/auth-utils";
import { listDocuments } from "@/lib/server/document-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
      const documents = await listDocuments(userId);
      const validDocIds = new Set(documents.map((doc) => doc.id));
      await pruneStaleLearningPacks(userId, validDocIds);
    } catch (error) {
      console.warn("Pack list pruning skipped:", error);
    }

    const packs = await getPacksByUser(userId);

    let activePackId: string | null = null;
    try {
      const activePack = await getActivePack(userId);
      activePackId = activePack?.packId ?? null;
    } catch (error) {
      console.warn("Pack list active-pack lookup failed:", error);
    }

    const packSummaries = packs.map((pack) => {
      const currentModule = pack.activeModuleId
        ? pack.modules.find((m) => m.moduleId === pack.activeModuleId) ?? null
        : pack.modules[0] ?? null;

      return {
        packId: pack.packId,
        title: pack.title,
        topic: pack.topic,
        active: activePackId === pack.packId,
        stage: pack.stage,
        totalStudyMinutes: pack.totalStudyMinutes,
        createdAt: pack.createdAt,
        updatedAt: pack.updatedAt,
        moduleCount: pack.modules.length,
        currentModule: currentModule
          ? {
              moduleId: currentModule.moduleId,
              title: currentModule.title,
              kbDocumentId: currentModule.kbDocumentId,
              stage: currentModule.stage,
              studyMinutes: currentModule.studyMinutes,
              order: currentModule.order,
            }
          : null,
      };
    });

    packSummaries.sort((a, b) => {
      if (a.active !== b.active) {
        return a.active ? -1 : 1;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return NextResponse.json({ packs: packSummaries });
  } catch (error) {
    console.error("Pack list error:", error);
    return NextResponse.json({ error: "Failed to load pack list" }, { status: 500 });
  }
}
