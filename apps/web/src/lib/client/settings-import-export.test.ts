import { describe, expect, it } from "vitest";
import { buildImportConflictCsv } from "@/lib/client/settings-import-export";

describe("settings-import-export", () => {
  it("exports import conflict rows as csv", () => {
    const csv = buildImportConflictCsv([
      {
        sourceIndex: 1,
        baseId: "exam",
        targetId: "exam_2",
        action: "append",
        strategy: "append_renamed"
      },
      {
        sourceIndex: 2,
        baseId: "exam",
        targetId: "exam",
        action: "overwrite",
        strategy: "overwrite_last_wins"
      }
    ]);
    const lines = csv.split("\n");
    expect(lines).toHaveLength(3);
    expect(lines[0]).toContain("\"序号\"");
    expect(lines[1]).toContain("\"#1\"");
    expect(lines[1]).toContain("\"新增\"");
    expect(lines[2]).toContain("\"覆盖\"");
    expect(lines[2]).toContain("\"覆盖后者生效\"");
  });

  it("escapes double quotes in csv cells", () => {
    const csv = buildImportConflictCsv([
      {
        sourceIndex: 3,
        baseId: "exam\"x",
        targetId: "exam",
        action: "append",
        strategy: "append_renamed"
      }
    ]);
    expect(csv).toContain("\"exam\"\"x\"");
  });
});
