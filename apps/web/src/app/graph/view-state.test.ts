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

    await expect(loadPrivateGraphView(fetcher)).resolves.toEqual({
      nodes: [],
      edges: [],
    });
    expect(fetcher).toHaveBeenCalledWith("/api/graph/view", {
      credentials: "include",
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
});
