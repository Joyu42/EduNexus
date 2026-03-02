import { describe, expect, it } from "vitest";
import {
  buildImportRollbackChangesCsv,
  buildImportRollbackPreview,
  buildImportRollbackProfileChanges,
  filterImportRollbackChanges
} from "@/lib/client/settings-import-rollback";

describe("settings-import-rollback", () => {
  it("builds add/remove/update changes", () => {
    const currentStore = {
      activeProfileId: "p1",
      profiles: [
        { id: "p1", label: "当前画像", bundle: { mode: "a", value: 1 } },
        { id: "p2", label: "待删除画像", bundle: { mode: "b", value: 2 } }
      ]
    };
    const targetStore = {
      activeProfileId: "p3",
      profiles: [
        { id: "p1", label: "当前画像", bundle: { mode: "c", value: 1 } },
        { id: "p3", label: "新画像", bundle: { mode: "d", value: 3 } }
      ]
    };

    const changes = buildImportRollbackProfileChanges(currentStore, targetStore);
    expect(changes).toHaveLength(3);
    expect(changes[0]).toMatchObject({ id: "p1", change: "update" });
    expect(changes[1]).toMatchObject({ id: "p3", change: "add" });
    expect(changes[2]).toMatchObject({ id: "p2", change: "remove" });
  });

  it("builds rollback preview with impact summary", () => {
    const currentStore = {
      activeProfileId: "p1",
      profiles: [{ id: "p1", label: "画像A", bundle: { score: 1 } }]
    };
    const targetStore = {
      activeProfileId: "p2",
      profiles: [{ id: "p2", label: "画像B", bundle: { score: 2 } }]
    };

    const preview = buildImportRollbackPreview({
      currentStore,
      targetStore,
      bundleDiffCount: 4
    });

    expect(preview.impact.addProfileCount).toBe(1);
    expect(preview.impact.removeProfileCount).toBe(1);
    expect(preview.impact.updateProfileCount).toBe(0);
    expect(preview.impact.bundleDiffCount).toBe(4);
    expect(preview.impact.activeProfileChanged).toBe(true);
    expect(preview.impact.activeProfileFrom).toBe("画像A");
    expect(preview.impact.activeProfileTo).toBe("画像B");
  });

  it("treats label-only changes as update", () => {
    const currentStore = {
      activeProfileId: "p1",
      profiles: [{ id: "p1", label: "画像A", bundle: { score: 1 } }]
    };
    const targetStore = {
      activeProfileId: "p1",
      profiles: [{ id: "p1", label: "画像A（旧）", bundle: { score: 1 } }]
    };

    const preview = buildImportRollbackPreview({
      currentStore,
      targetStore,
      bundleDiffCount: 0
    });

    expect(preview.impact.updateProfileCount).toBe(1);
    expect(preview.impact.activeProfileChanged).toBe(false);
    expect(preview.changes[0]).toMatchObject({
      id: "p1",
      change: "update",
      labelChanged: true,
      bundleChanged: false
    });
  });

  it("filters rollback changes by type and keyword", () => {
    const changes = [
      {
        id: "p_add",
        change: "add" as const,
        currentLabel: "(不存在)",
        targetLabel: "新画像",
        labelChanged: true,
        bundleChanged: true
      },
      {
        id: "p_update",
        change: "update" as const,
        currentLabel: "画像A",
        targetLabel: "画像A-新",
        labelChanged: true,
        bundleChanged: false
      },
      {
        id: "p_remove",
        change: "remove" as const,
        currentLabel: "旧画像",
        targetLabel: "(将移除)",
        labelChanged: true,
        bundleChanged: true
      }
    ];

    const onlyUpdate = filterImportRollbackChanges(changes, {
      changeType: "update",
      keyword: ""
    });
    expect(onlyUpdate).toHaveLength(1);
    expect(onlyUpdate[0]?.id).toBe("p_update");

    const keywordMatched = filterImportRollbackChanges(changes, {
      changeType: "all",
      keyword: "旧画像"
    });
    expect(keywordMatched).toHaveLength(1);
    expect(keywordMatched[0]?.id).toBe("p_remove");
  });

  it("builds rollback change csv", () => {
    const csv = buildImportRollbackChangesCsv([
      {
        id: "p_update",
        change: "update",
        currentLabel: "画像A",
        targetLabel: "画像A-新",
        labelChanged: true,
        bundleChanged: true
      }
    ]);
    expect(csv).toContain("\"画像ID\"");
    expect(csv).toContain("\"p_update\"");
    expect(csv).toContain("\"画像更新\"");
  });
});
