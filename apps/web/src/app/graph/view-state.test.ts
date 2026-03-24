import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

import { getGraphViewState, loadPrivateGraphView } from "./view-state";

describe("graph view state", () => {
  it("loads the authenticated graph from the private graph API", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        data: {
          nodes: [],
          edges: [],
        },
      }),
    });

    await expect(loadPrivateGraphView(undefined, fetcher)).resolves.toEqual({
      nodes: [],
      edges: [],
      packId: undefined,
      packMissing: undefined,
    });
    expect(fetcher).toHaveBeenCalledWith("/api/graph/view", {
      credentials: "include",
    });
  });

  it("reads pack metadata when api nests it under data", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        data: {
          nodes: [],
          edges: [],
          packId: "lp_123",
          packMissing: true,
        },
      }),
    });

    await expect(loadPrivateGraphView("lp_123", fetcher)).resolves.toEqual({
      nodes: [],
      edges: [],
      packId: "lp_123",
      packMissing: true,
    });
  });

  it("returns the graph empty state when the user has no KB-backed graph nodes", () => {
    expect(
      getGraphViewState({
        isLoading: false,
        nodes: [],
      })
    ).toEqual({
      kind: "empty",
      title: "你的知识星图还是空的",
      description: "先在知识库中创建或导入文档，系统才会为你生成图谱关系。",
    });
  });

  it("normalizes graph api nodes with KB identity and path memberships", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        data: {
          nodes: [
            {
              id: "n-1",
              label: "HTML 基础",
              domain: "frontend",
              pathMemberships: [{ pathId: "p1", pathName: "前端基础打底", stage: "foundation" }],
              kbDocumentId: "kb-1",
            },
            {
              id: "n-2",
              label: "CSS 基础",
              domain: "frontend",
            },
          ],
          edges: [{ source: "n-1", target: "n-2", weight: 0.8 }],
        },
      }),
    });

    const graph = await loadPrivateGraphView(undefined, fetcher);

    expect(graph.nodes).toHaveLength(2);
    expect(graph.nodes[0]).toMatchObject({
      id: "n-1",
      kbDocumentId: "kb-1",
      documentIds: ["kb-1"],
      pathMemberships: [{ pathId: "p1", pathName: "前端基础打底", stage: "foundation" }],
    });
    expect(graph.nodes[1]).toMatchObject({
      id: "n-2",
      kbDocumentId: "n-2",
      documentIds: ["n-2"],
      pathMemberships: [],
    });
  });

  it("keeps graph path mode discoverable from shell and selected planet CTAs", async () => {
    const file = path.resolve(process.cwd(), "src/app/graph/enhanced-page.tsx");
    const content = await fs.readFile(file, "utf8");

    expect(content).toContain('data-testid="graph-mode-switcher"');
    expect(content).toContain("学习路径工作流");
    expect(content).toContain("在学习路径中规划");
    expect(content.match(/router\.push\("\/graph\?view=path"\)/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
    expect(content).toContain("知识星图 · 学习路径模式");
    expect(content).toContain("返回探索");
  });
});
