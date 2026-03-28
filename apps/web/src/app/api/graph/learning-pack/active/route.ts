import { NextResponse } from "next/server";
import { getActivePack } from "@/lib/server/learning-pack-store";
import { getCurrentUserId } from "@/lib/server/auth-utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const pack = await getActivePack(userId);
    if (!pack) {
      return NextResponse.json({ pack: null });
    }

    const currentModule = pack.activeModuleId
      ? pack.modules.find((m) => m.moduleId === pack.activeModuleId) ?? null
      : pack.modules[0] ?? null;

    return NextResponse.json({
      pack: {
        packId: pack.packId,
        title: pack.title,
        topic: pack.topic,
        stage: pack.stage,
        totalStudyMinutes: pack.totalStudyMinutes,
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
      },
    });
  } catch (error) {
    console.error("Active pack summary error:", error);
    return NextResponse.json({ error: "Failed to load active pack" }, { status: 500 });
  }
}
