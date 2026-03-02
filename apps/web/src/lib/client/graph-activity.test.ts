import { describe, expect, it } from "vitest";
import {
  appendGraphActivityEvent,
  clearGraphActivityFocusIdFromStorage,
  normalizeGraphActivityPayload,
  pushGraphActivityEventToStorage,
  readGraphActivityFocusIdFromStorage,
  resolveGraphActivityRiskScore,
  writeGraphActivityFocusIdToStorage
} from "@/lib/client/graph-activity";

describe("graph-activity", () => {
  it("normalizes activity payload", () => {
    const events = normalizeGraphActivityPayload(
      [
        {
          id: "evt_1",
          at: "2026-02-28T00:00:00.000Z",
          source: "path_feedback",
          nodeId: "math_func",
          nodeLabel: "函数",
          title: "焦点任务完成",
          detail: "掌握度提升到 56%"
        },
        { bad: true }
      ],
      10
    );
    expect(events).toHaveLength(1);
    expect(events[0]?.nodeLabel).toBe("函数");
  });

  it("appends and truncates events", () => {
    const next = appendGraphActivityEvent(
      [
        {
          id: "evt_0",
          at: "2026-02-27T00:00:00.000Z",
          source: "workspace",
          nodeId: "math_seq",
          nodeLabel: "数列",
          title: "工作区复盘",
          detail: "完成一次引导会话"
        }
      ],
      {
        source: "path_feedback",
        nodeId: "math_func",
        nodeLabel: "函数",
        title: "焦点任务完成",
        detail: "掌握度提升"
      },
      1
    );
    expect(next).toHaveLength(1);
    expect(next[0]?.nodeId).toBe("math_func");
  });

  it("pushes event into storage adapters", () => {
    const storage = new Map<string, string>();
    const events = pushGraphActivityEventToStorage(
      {
        source: "path_feedback",
        nodeId: "math_func",
        nodeLabel: "函数",
        title: "焦点任务完成",
        detail: "掌握度提升"
      },
      {
        readItem: (key) => storage.get(key) ?? null,
        writeItem: (key, value) => storage.set(key, value)
      },
      12
    );
    expect(events).toHaveLength(1);
    expect(events[0]?.source).toBe("path_feedback");
  });

  it("resolves risk score and supports activity focus storage", () => {
    const risk = resolveGraphActivityRiskScore({
      id: "evt_1",
      at: "2026-02-28T00:00:00.000Z",
      source: "path_feedback",
      nodeId: "math_func",
      nodeLabel: "函数",
      title: "焦点任务完成",
      detail: "掌握度提升到 62%"
    });
    expect(risk).toBe(0.38);

    const storage = new Map<string, string>();
    writeGraphActivityFocusIdToStorage("evt_focus", (key, value) =>
      storage.set(key, value)
    );
    expect(readGraphActivityFocusIdFromStorage((key) => storage.get(key) ?? null)).toBe(
      "evt_focus"
    );
    clearGraphActivityFocusIdFromStorage((key) => storage.delete(key));
    expect(readGraphActivityFocusIdFromStorage((key) => storage.get(key) ?? null)).toBe(
      ""
    );
  });
});
