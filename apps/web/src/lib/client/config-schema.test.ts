import { describe, expect, it } from "vitest";
import {
  CONFIG_SCHEMA_VERSION,
  DEFAULT_CONFIG_META,
  normalizeAestheticMode,
  runBundleMigrations
} from "@/lib/client/config-schema";

describe("config-schema migrations", () => {
  it("migrates v1 payload to v3 with full path", () => {
    const legacyV1 = {
      version: 1,
      dashboard: { riskPreset: "balanced" },
      workspace: { replayPreset: "balanced" },
      kb: { chapterPreset: "balanced" }
    };

    const result = runBundleMigrations(legacyV1);
    const meta = result.payload.meta as Record<string, unknown>;

    expect(result.fromVersion).toBe(1);
    expect(result.migrationPath).toEqual(["v1->v2", "v2->v3"]);
    expect(result.payload.version).toBe(CONFIG_SCHEMA_VERSION);
    expect(meta.profileId).toBe(DEFAULT_CONFIG_META.profileId);
    expect(meta.profileLabel).toBe(DEFAULT_CONFIG_META.profileLabel);
    expect(meta.storageEngine).toBe("localStorage");
    expect(meta.aestheticMode).toBe(DEFAULT_CONFIG_META.aestheticMode);
  });

  it("migrates v2 payload to v3 and preserves existing profile metadata", () => {
    const legacyV2 = {
      version: 2,
      meta: {
        profileId: "exam_month",
        profileLabel: "月考冲刺",
        storageEngine: "localStorage"
      }
    };

    const result = runBundleMigrations(legacyV2);
    const meta = result.payload.meta as Record<string, unknown>;

    expect(result.fromVersion).toBe(2);
    expect(result.migrationPath).toEqual(["v2->v3"]);
    expect(result.payload.version).toBe(CONFIG_SCHEMA_VERSION);
    expect(meta.profileId).toBe("exam_month");
    expect(meta.profileLabel).toBe("月考冲刺");
    expect(meta.aestheticMode).toBe(DEFAULT_CONFIG_META.aestheticMode);
  });

  it("keeps v3 payload unchanged when no migration needed", () => {
    const current = {
      version: CONFIG_SCHEMA_VERSION,
      meta: {
        profileId: "default",
        profileLabel: "默认",
        storageEngine: "localStorage",
        aestheticMode: "nebula"
      }
    };

    const result = runBundleMigrations(current);
    expect(result.fromVersion).toBe(CONFIG_SCHEMA_VERSION);
    expect(result.migrationPath).toEqual([]);
    expect(result.payload.version).toBe(CONFIG_SCHEMA_VERSION);
    expect((result.payload.meta as Record<string, unknown>).aestheticMode).toBe("nebula");
  });

  it("marks higher future version as normalize path", () => {
    const future = { version: 99, meta: { profileId: "future" } };
    const result = runBundleMigrations(future);
    expect(result.fromVersion).toBe(99);
    expect(result.migrationPath).toEqual([`v99->v${CONFIG_SCHEMA_VERSION}(normalize)`]);
    expect(result.payload.version).toBe(99);
  });
});

describe("normalizeAestheticMode", () => {
  it("falls back for unsupported value", () => {
    expect(normalizeAestheticMode("unknown")).toBe("obsidian_notebooklm");
    expect(normalizeAestheticMode(undefined)).toBe("obsidian_notebooklm");
  });

  it("accepts supported value", () => {
    expect(normalizeAestheticMode("nebula")).toBe("nebula");
    expect(normalizeAestheticMode("aurora")).toBe("aurora");
    expect(normalizeAestheticMode("obsidian_notebooklm")).toBe(
      "obsidian_notebooklm"
    );
  });
});
