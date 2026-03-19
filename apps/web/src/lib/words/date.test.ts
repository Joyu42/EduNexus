// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";

import { getWordsDebugTodayKey, listenForWordsTodayChange } from "./date";

describe("words date helpers", () => {
  it("notifies listeners when the debug today key changes", () => {
    const onChange = vi.fn();
    const cleanup = listenForWordsTodayChange(onChange);

    window.dispatchEvent(new StorageEvent("storage", { key: getWordsDebugTodayKey() }));

    expect(onChange).toHaveBeenCalledTimes(1);
    cleanup();
  });
});
