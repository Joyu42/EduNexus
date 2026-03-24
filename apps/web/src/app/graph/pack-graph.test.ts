import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { loadPrivateGraphView } from "../../app/graph/view-state";

describe("packId-aware graph view", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("passes packId as query param when provided", async () => {
    const mockJson = vi.fn().mockResolvedValue({
      data: { nodes: [], edges: [] },
      packId: "lp_java_001",
    });
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: mockJson,
    }) as unknown as typeof fetch;

    const promise = loadPrivateGraphView("lp_java_001", mockFetch);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/graph/view?packId=lp_java_001",
      { credentials: "include" }
    );
    expect(result.packId).toBe("lp_java_001");
  });

  it("does not include packId in URL when not provided", async () => {
    const mockJson = vi.fn().mockResolvedValue({
      data: { nodes: [], edges: [] },
    });
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: mockJson,
    }) as unknown as typeof fetch;

    const promise = loadPrivateGraphView(undefined, mockFetch);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/graph/view",
      { credentials: "include" }
    );
    expect(result.packId).toBeUndefined();
  });

  it("returns packMissing=true when API reports pack missing", async () => {
    const mockJson = vi.fn().mockResolvedValue({
      data: { nodes: [], edges: [] },
      packId: "lp_nonexistent",
      packMissing: true,
    });
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: mockJson,
    }) as unknown as typeof fetch;

    const promise = loadPrivateGraphView("lp_nonexistent", mockFetch);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.packMissing).toBe(true);
    expect(result.packId).toBe("lp_nonexistent");
  });
});
