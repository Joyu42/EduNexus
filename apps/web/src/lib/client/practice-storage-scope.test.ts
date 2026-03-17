import { describe, expect, it } from "vitest";

import { resolvePracticeDatabaseName } from "@/lib/client/practice-storage";

describe("practice storage scope", () => {
  it("builds user-scoped indexeddb names", () => {
    expect(resolvePracticeDatabaseName("user-a")).toBe("EduNexusPractice_user-a");
    expect(resolvePracticeDatabaseName("user-b")).toBe("EduNexusPractice_user-b");
  });

  it("does not create an anonymous fallback database name", () => {
    expect(resolvePracticeDatabaseName(null)).toBeNull();
  });
});
