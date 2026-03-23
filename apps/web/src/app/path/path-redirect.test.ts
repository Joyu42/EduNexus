import { describe, expect, it } from "vitest";

describe("Path redirect", () => {
  it("path page module compiles and has redirect", async () => {
    const mod = await import("./page");
    expect(mod.default).toBeDefined();
  });
});
