import { describe, expect, it } from "vitest";
import {
  clearGraphFocusNodeFromStorage,
  readGraphFocusNodeFromStorage,
  writeGraphFocusNodeToStorage
} from "@/lib/client/graph-focus-bridge";

describe("graph-focus-bridge", () => {
  it("writes, reads and clears focus node id", () => {
    const storage = new Map<string, string>();
    writeGraphFocusNodeToStorage("math_func", (key, value) => storage.set(key, value));
    expect(readGraphFocusNodeFromStorage((key) => storage.get(key) ?? null)).toBe(
      "math_func"
    );
    clearGraphFocusNodeFromStorage((key) => {
      storage.delete(key);
    });
    expect(readGraphFocusNodeFromStorage((key) => storage.get(key) ?? null)).toBe("");
  });
});
