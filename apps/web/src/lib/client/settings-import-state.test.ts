import { describe, expect, it } from "vitest";
import {
  buildJsonImportActionState,
  buildJsonImportPreview
} from "@/lib/client/settings-import-state";

describe("settings-import-state", () => {
  it("returns null preview for empty draft", () => {
    const preview = buildJsonImportPreview({
      jsonDraft: "   ",
      profileImportMode: "append",
      existingProfiles: [],
      profileLimit: 12
    });
    expect(preview).toBeNull();
  });

  it("detects invalid json", () => {
    const preview = buildJsonImportPreview({
      jsonDraft: "{bad json}",
      profileImportMode: "append",
      existingProfiles: [],
      profileLimit: 12
    });
    expect(preview?.kind).toBe("invalid");
  });

  it("detects config bundle json", () => {
    const preview = buildJsonImportPreview({
      jsonDraft: JSON.stringify({
        dashboard: { alertPolicy: "balanced" },
        workspace: { replayPreset: "balanced" },
        kb: { chapterPreset: "balanced" }
      }),
      profileImportMode: "append",
      existingProfiles: [],
      profileLimit: 12
    });
    expect(preview?.kind).toBe("bundle");
  });

  it("detects duplicate ids in append mode and auto-rename strategy", () => {
    const preview = buildJsonImportPreview({
      jsonDraft: JSON.stringify({
        store: {
          profiles: [
            { id: "exam", label: "A", bundle: { version: 3 } },
            { id: "exam", label: "B", bundle: { version: 3 } }
          ]
        }
      }),
      profileImportMode: "append",
      existingProfiles: [{ id: "seed", label: "Seed" }],
      profileLimit: 12
    });

    expect(preview?.kind).toBe("profile_store");
    expect(preview?.appendCount).toBe(2);
    expect(preview?.overwriteCount).toBe(0);
    expect(preview?.duplicateEntryCount).toBe(1);
    expect(preview?.duplicateGroups[0]?.strategy).toBe("append_renamed");
    expect(preview?.conflictRows).toHaveLength(2);
    expect(preview?.conflictRows[0]?.sourceIndex).toBe(1);
    expect(preview?.conflictRows[1]?.targetId).toBe("exam_2");
  });

  it("detects overwrite shadow in overwrite mode", () => {
    const preview = buildJsonImportPreview({
      jsonDraft: JSON.stringify({
        store: {
          profiles: [
            { id: "exam", label: "A", bundle: { version: 3 } },
            { id: "exam", label: "B", bundle: { version: 3 } }
          ]
        }
      }),
      profileImportMode: "overwrite",
      existingProfiles: [{ id: "exam", label: "已存在画像" }],
      profileLimit: 12
    });

    expect(preview?.overwriteCount).toBe(2);
    expect(preview?.overwriteTargets).toHaveLength(1);
    expect(preview?.overwriteShadowCount).toBe(1);
    expect(preview?.duplicateGroups[0]?.strategy).toBe("overwrite_last_wins");
    expect(preview?.conflictRows[0]?.action).toBe("overwrite");
    expect(preview?.conflictRows[1]?.targetId).toBe("exam");
  });

  it("blocks overwrite import before confirmation", () => {
    const preview = buildJsonImportPreview({
      jsonDraft: JSON.stringify({
        profile: {
          id: "exam",
          label: "A",
          bundle: { version: 3 }
        }
      }),
      profileImportMode: "overwrite",
      existingProfiles: [{ id: "exam", label: "已存在画像" }],
      profileLimit: 12
    });

    const state = buildJsonImportActionState({
      preview,
      profileImportMode: "overwrite",
      confirmOverwriteImport: false
    });

    expect(state.shouldBlockOverwriteImport).toBe(true);
    expect(state.canImportProfileFromJson).toBe(false);
    expect(state.hint.tone).toBe("warning");
  });

  it("allows overwrite import after confirmation", () => {
    const preview = buildJsonImportPreview({
      jsonDraft: JSON.stringify({
        profile: {
          id: "exam",
          label: "A",
          bundle: { version: 3 }
        }
      }),
      profileImportMode: "overwrite",
      existingProfiles: [{ id: "exam", label: "已存在画像" }],
      profileLimit: 12
    });

    const state = buildJsonImportActionState({
      preview,
      profileImportMode: "overwrite",
      confirmOverwriteImport: true
    });

    expect(state.shouldBlockOverwriteImport).toBe(false);
    expect(state.canImportProfileFromJson).toBe(true);
  });

  it("limits conflict row preview to avoid oversized UI payload", () => {
    const profiles = Array.from({ length: 30 }, (_, index) => ({
      id: "dup",
      label: `P${index + 1}`,
      bundle: { version: 3 }
    }));
    const preview = buildJsonImportPreview({
      jsonDraft: JSON.stringify({
        store: { profiles }
      }),
      profileImportMode: "append",
      existingProfiles: [],
      profileLimit: 50
    });

    expect(preview?.conflictRows.length).toBe(18);
    expect(preview?.hiddenConflictRowCount).toBe(12);
  });
});
