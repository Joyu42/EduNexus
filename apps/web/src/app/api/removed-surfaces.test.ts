import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("removed api surfaces", () => {
  it("does not expose deleted collab and user api directories", async () => {
    const apiRoot = path.resolve(process.cwd(), "src/app/api");

    await expect(fs.access(path.join(apiRoot, "collab"))).rejects.toThrow();
    await expect(fs.access(path.join(apiRoot, "user"))).rejects.toThrow();
  });
});
