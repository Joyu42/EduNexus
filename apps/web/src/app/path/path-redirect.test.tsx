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

  it("redirects /path to the graph path view", async () => {
    const module = await import("./page");

    module.default();

    expect(redirect).toHaveBeenCalledWith("/graph?view=path");
  });

  it("redirects retired /learning-paths surface to the graph path view", async () => {
    const module = await import("../learning-paths/page");

    module.default();

    expect(redirect).toHaveBeenCalledWith("/graph?view=path");
  });

  it("redirects retired /path/editor to the graph path view (removes deprecation banner from visible flow)", async () => {
    const editorPageSource = await fs.readFile(
      path.resolve(process.cwd(), "src/app/path/editor/page.tsx"),
      "utf8"
    );

    expect(editorPageSource).not.toMatch(/deprecated|deprecation|弃用|旧版/i);

    const module = await import("./editor/page");

    module.default();

    expect(redirect).toHaveBeenCalledWith("/graph?view=path");
  });

  it("negative: /path/new-editor is not the learning-path entry point", async () => {
    const pathModule = await import("./page");
    pathModule.default();
    expect(redirect).not.toHaveBeenCalledWith("/path/new-editor");

    vi.clearAllMocks();

    const learningPathsModule = await import("../learning-paths/page");
    learningPathsModule.default();
    expect(redirect).not.toHaveBeenCalledWith("/path/new-editor");

    vi.clearAllMocks();

    const editorModule = await import("./editor/page");
    editorModule.default();
    expect(redirect).not.toHaveBeenCalledWith("/path/new-editor");
  });

  it("graph CTA points to graph path mode", async () => {
    const enhancedPageContent = await fs.readFile(
      path.resolve(process.cwd(), "src/app/graph/enhanced-page.tsx"),
      "utf8"
    );

    const pathPlanningCtaIndex = enhancedPageContent.indexOf('className="w-full mb-2"');

    expect(pathPlanningCtaIndex).toBeGreaterThan(-1);

    const pathPlanningCtaBlock = enhancedPageContent.slice(pathPlanningCtaIndex, pathPlanningCtaIndex + 350);

    expect(pathPlanningCtaBlock).toContain('router.push("/graph?view=path")');
    expect(pathPlanningCtaBlock).not.toContain('router.push("/path/new-editor")');
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
