import { describe, expect, it, vi } from "vitest";

const getCurrentUserId = vi.fn();
const getGraphView = vi.fn();

vi.mock("@/lib/server/auth-utils", () => ({
  getCurrentUserId,
}));

vi.mock("@/lib/server/graph-service", () => ({
  getGraphView,
}));

const { GET: getGraphViewRoute } = await import("./route");

describe("graph view route", () => {
  it("returns 200 with graph data for authenticated user", async () => {
    getCurrentUserId.mockResolvedValue("session-user");
    getGraphView.mockResolvedValue({
      nodes: [
        { id: "node-1", label: "Test Node", mastery: 0.5, risk: 0.5, domain: "math" }
      ],
      edges: [{ source: "node-1", target: "node-2", weight: 0.5 }]
    });

    const request = new Request("http://localhost/api/graph/view");
    const response = await getGraphViewRoute(request);

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.data.nodes).toHaveLength(1);
    expect(json.data.edges).toHaveLength(1);
    expect(getGraphView).toHaveBeenCalledWith("session-user", { domain: undefined });
  });

  it("returns 401 for unauthenticated requests", async () => {
    getCurrentUserId.mockResolvedValue(null);

    const request = new Request("http://localhost/api/graph/view");
    const response = await getGraphViewRoute(request);

    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("UNAUTHORIZED");
    expect(json.error.message).toBe("用户未登录。");
    expect(getGraphView).not.toHaveBeenCalled();
  });

  it("returns 500 with GRAPH_VIEW_FAILED when getGraphView throws", async () => {
    getCurrentUserId.mockResolvedValue("session-user");
    getGraphView.mockRejectedValue(new Error("Database connection failed"));

    const request = new Request("http://localhost/api/graph/view");
    const response = await getGraphViewRoute(request);

    expect(response.status).toBe(500);
    const json = await response.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("GRAPH_VIEW_FAILED");
    expect(json.error.message).toBe("获取图谱视图失败。");
  });

  it("accepts optional domain filter query param", async () => {
    getCurrentUserId.mockResolvedValue("session-user");
    getGraphView.mockResolvedValue({ nodes: [], edges: [] });

    const request = new Request("http://localhost/api/graph/view?domain=math");
    const response = await getGraphViewRoute(request);

    expect(response.status).toBe(200);
    expect(getGraphView).toHaveBeenCalledWith("session-user", { domain: "math" });
  });
});
