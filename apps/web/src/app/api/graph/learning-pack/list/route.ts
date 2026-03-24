import { NextResponse } from "next/server";
import { getPacksByUser } from "@/lib/server/learning-pack-store";
import { getCurrentUserId } from "@/lib/server/auth-utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const packs = await getPacksByUser(userId);

    const packSummaries = packs.map((pack) => {
      const currentModule = pack.activeModuleId
        ? pack.modules.find((m) => m.moduleId === pack.activeModuleId) ?? null
        : pack.modules[0] ?? null;

      return {
        packId: pack.packId,
        title: pack.title,
        topic: pack.topic,
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

    return NextResponse.json({ packs: packSummaries });
  } catch (error) {
    console.error("Pack list error:", error);
    return NextResponse.json({ error: "Failed to load pack list" }, { status: 500 });
  }
}
