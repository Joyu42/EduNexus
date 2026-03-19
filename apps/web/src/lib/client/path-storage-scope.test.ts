import { describe, expect, it } from "vitest";

import { resolvePathDatabaseName } from "@/lib/client/path-storage";
import { resolvePathLocalStorageKey } from "@/lib/client/path-storage-fallback";

describe("path storage scope", () => {
  it("builds user-scoped keys for known identities", () => {
    expect(resolvePathDatabaseName("user_1")).toBe("EduNexusPath_user_1");
    expect(resolvePathLocalStorageKey("user_1")).toBe("edunexus_learning_paths_user_1");
  });

  it("does not create anonymous fallback keys", () => {
    expect(resolvePathDatabaseName(null)).toBeNull();
    expect(resolvePathLocalStorageKey(null)).toBeNull();
  });
});
