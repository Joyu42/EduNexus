import { describe, expect, it } from "vitest";
import {
  buildProfileImportPlan,
  createUniqueProfileId,
  normalizeProfileId,
  normalizeProfileImportPayload,
  normalizeProfileStoreImportPayload
} from "@/lib/client/profile-import";

describe("profile-import", () => {
  it("parses direct profile payload", () => {
    const result = normalizeProfileImportPayload({
      id: "exam_month",
      label: "月考备战",
      bundle: { version: 3, meta: { profileId: "exam_month" } }
    });
    expect(result).not.toBeNull();
    expect(result?.id).toBe("exam_month");
    expect(result?.label).toBe("月考备战");
  });

  it("parses wrapped profile payload", () => {
    const result = normalizeProfileImportPayload({
      profile: {
        id: "sprint",
        label: "冲刺周",
        bundle: { version: 3 }
      }
    });
    expect(result).not.toBeNull();
    expect(result?.id).toBe("sprint");
    expect(result?.label).toBe("冲刺周");
  });

  it("returns null for invalid profile payload", () => {
    expect(normalizeProfileImportPayload({ id: "bad" })).toBeNull();
    expect(normalizeProfileImportPayload("bad")).toBeNull();
  });

  it("parses profile store payload", () => {
    const result = normalizeProfileStoreImportPayload({
      store: {
        profiles: [
          { id: "a", label: "A", bundle: { version: 3 } },
          { id: "b", label: "B", bundle: { version: 2 } }
        ]
      }
    });
    expect(result).toHaveLength(2);
    expect(result[0]?.id).toBe("a");
    expect(result[1]?.id).toBe("b");
  });

  it("ignores invalid entries in profile store payload", () => {
    const result = normalizeProfileStoreImportPayload({
      profiles: [
        { id: "ok", label: "OK", bundle: { version: 3 } },
        { id: "bad", label: "BAD" }
      ]
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("ok");
  });

  it("normalizes profile id with lowercase and underscore", () => {
    expect(normalizeProfileId("  Exam Month#1 ")).toBe("exam_month_1");
  });

  it("creates unique profile id when seed already exists", () => {
    const existingIds = new Set(["exam_month", "exam_month_2"]);
    expect(createUniqueProfileId(existingIds, "exam_month")).toBe("exam_month_3");
  });

  it("builds append-mode import plan with duplicate ids renamed", () => {
    const plan = buildProfileImportPlan({
      drafts: [
        { id: "exam", label: "A", createdAt: "", updatedAt: "", bundle: {} },
        { id: "exam", label: "B", createdAt: "", updatedAt: "", bundle: {} },
        { id: "exam", label: "C", createdAt: "", updatedAt: "", bundle: {} }
      ],
      existingProfiles: [{ id: "seed", label: "Seed" }],
      importMode: "append",
      profileLimit: 12
    });
    expect(plan.appendCount).toBe(3);
    expect(plan.overwriteCount).toBe(0);
    expect(plan.uniqueTargetCount).toBe(3);
    expect(plan.overwriteShadowCount).toBe(0);
    expect(plan.duplicateEntryCount).toBe(2);
    expect(plan.duplicateGroups[0]?.strategy).toBe("append_renamed");
    expect(new Set(plan.operations.map((item) => item.targetId)).size).toBe(3);
  });

  it("builds overwrite-mode import plan with last-wins duplicates", () => {
    const plan = buildProfileImportPlan({
      drafts: [
        { id: "exam", label: "A", createdAt: "", updatedAt: "", bundle: {} },
        { id: "exam", label: "B", createdAt: "", updatedAt: "", bundle: {} },
        { id: "sprint", label: "C", createdAt: "", updatedAt: "", bundle: {} }
      ],
      existingProfiles: [
        { id: "exam", label: "Existing Exam" },
        { id: "seed", label: "Seed" }
      ],
      importMode: "overwrite",
      profileLimit: 2
    });
    expect(plan.appendCount).toBe(1);
    expect(plan.overwriteCount).toBe(2);
    expect(plan.overwriteTargets).toHaveLength(1);
    expect(plan.overwriteTargets[0]?.id).toBe("exam");
    expect(plan.overwriteShadowCount).toBe(1);
    expect(plan.duplicateGroups[0]?.strategy).toBe("overwrite_last_wins");
    expect(plan.truncatedCount).toBe(0);
  });
});
