import { describe, expect, it } from "vitest";
import {
  buildWorkspacePromptFromFocus,
  buildPathGoalFromFocus,
  normalizePathFocusPayload,
  readPathFocusFromStorage,
  readWorkspaceFocusFromStorage,
  writePathFocusToStorage,
  writeWorkspaceFocusToStorage
} from "@/lib/client/path-focus-bridge";

describe("path-focus-bridge", () => {
  it("normalizes valid payload", () => {
    const normalized = normalizePathFocusPayload({
      nodeId: "math_func",
      nodeLabel: "函数",
      domain: "math",
      mastery: 0.33,
      risk: 0.72,
      relatedNodes: ["数列", "导数"],
      at: "2026-02-28T00:00:00.000Z"
    });
    expect(normalized).not.toBeNull();
    expect(normalized?.nodeLabel).toBe("函数");
    expect(normalized?.relatedNodes).toHaveLength(2);
  });

  it("builds goal from focus payload", () => {
    const goal = buildPathGoalFromFocus({
      nodeId: "math_func",
      nodeLabel: "函数",
      domain: "math",
      mastery: 0.33,
      risk: 0.72,
      relatedNodes: ["数列"],
      at: "2026-02-28T00:00:00.000Z"
    });
    expect(goal).toContain("函数");
    expect(goal).toContain("72%");
  });

  it("uses bridge template as preferred goal for graph bridge source", () => {
    const goal = buildPathGoalFromFocus({
      nodeId: "math_func",
      nodeLabel: "函数",
      domain: "math",
      mastery: 0.33,
      risk: 0.72,
      relatedNodes: ["数列"],
      at: "2026-02-28T00:00:00.000Z",
      focusSource: "graph_bridge",
      bridgePartnerLabel: "数列",
      bridgeTaskTemplate:
        "桥接模板：先对比函数单调性与数列递推，再做迁移例题与反例诊断。"
    });
    expect(goal).toContain("桥接模板");
    expect(goal).toContain("数列");
  });

  it("writes and reads focus payload from storage adapter", () => {
    const storage = new Map<string, string>();
    writePathFocusToStorage(
      {
        nodeId: "math_seq",
        nodeLabel: "数列",
        domain: "math",
        mastery: 0.4,
        risk: 0.6,
        relatedNodes: [],
        at: "2026-02-28T00:00:00.000Z",
        focusSource: "graph_bridge",
        bridgePartnerLabel: "函数",
        bridgeTaskTemplate: "桥接模板"
      },
      (key, value) => storage.set(key, value)
    );

    const read = readPathFocusFromStorage((key) => storage.get(key) ?? null);
    expect(read?.nodeId).toBe("math_seq");
    expect(read?.risk).toBe(0.6);
    expect(read?.focusSource).toBe("graph_bridge");
    expect(read?.bridgePartnerLabel).toBe("函数");
  });

  it("builds workspace prompt and stores workspace focus", () => {
    const storage = new Map<string, string>();
    const focus = {
      nodeId: "math_func",
      nodeLabel: "函数",
      domain: "math",
      mastery: 0.42,
      risk: 0.58,
      relatedNodes: ["数列", "导数"],
      at: "2026-02-28T00:00:00.000Z"
    };
    writeWorkspaceFocusToStorage(focus, (key, value) => storage.set(key, value));
    const prompt = buildWorkspacePromptFromFocus(focus);
    expect(prompt).toContain("函数");
    expect(prompt).toContain("苏格拉底");
    const read = readWorkspaceFocusFromStorage((key) => storage.get(key) ?? null);
    expect(read?.nodeId).toBe("math_func");
  });
});
