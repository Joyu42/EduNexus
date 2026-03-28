import fs from "node:fs/promises";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { redirect } = vi.hoisted(() => ({
  redirect: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect,
}));

describe("Path redirect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects /path to /graph?view=path", async () => {
    const module = await import("./page");

    module.default();

    expect(redirect).toHaveBeenCalledWith("/graph?view=path");
  });

  it("redirects retired /learning-paths surface to /graph?view=path", async () => {
    const module = await import("../learning-paths/page");

    module.default();

    expect(redirect).toHaveBeenCalledWith("/graph?view=path");
  });

  it("keeps primary IA wording consolidated on 知识星图", async () => {
    const iaFiles = [
      "src/app/page.tsx",
      "src/components/layout/AppSidebar.tsx",
      "src/components/mobile/mobile-menu.tsx",
      "src/components/app-shell.tsx",
    ];

    for (const relativePath of iaFiles) {
      const content = await fs.readFile(path.resolve(process.cwd(), relativePath), "utf8");
      expect(content).not.toContain("\u6210\u957f\u5730\u56fe");
    }
  });
});
