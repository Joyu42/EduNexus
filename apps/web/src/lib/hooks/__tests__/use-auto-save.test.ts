// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAutoSave } from "../use-auto-save";

async function flushEffects() {
  await act(async () => {
    await Promise.resolve();
  });
}

async function advance(ms: number) {
  await act(async () => {
    vi.advanceTimersByTime(ms);
    await Promise.resolve();
  });
}

describe("useAutoSave", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("auto-saves on mount and after a debounced update", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const testData = { id: "1", content: "test" };

    const { result, rerender } = renderHook(
      ({ data }) => useAutoSave(data, { onSave, delay: 1000 }),
      { initialProps: { data: testData } }
    );

    await flushEffects();
    expect(result.current.status).toBe("saved");
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenLastCalledWith(testData);

    rerender({ data: { ...testData, content: "updated" } });
    await advance(1000);

    expect(onSave).toHaveBeenCalledTimes(2);
    expect(onSave).toHaveBeenLastCalledWith({ id: "1", content: "updated" });
  });

  it("debounces rapid updates into one trailing save", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    let testData = { id: "1", content: "test" };

    const { rerender } = renderHook(
      ({ data }) => useAutoSave(data, { onSave, delay: 1000 }),
      { initialProps: { data: testData } }
    );

    await flushEffects();
    expect(onSave).toHaveBeenCalledTimes(1);

    for (let i = 0; i < 5; i += 1) {
      testData = { ...testData, content: `test${i}` };
      rerender({ data: testData });
      await advance(500);
    }

    expect(onSave).toHaveBeenCalledTimes(1);

    await advance(1000);

    expect(onSave).toHaveBeenCalledTimes(2);
    expect(onSave).toHaveBeenLastCalledWith({ id: "1", content: "test4" });
  });

  it("surfaces save errors", async () => {
    const onError = vi.fn();
    const error = new Error("Save failed");
    const onSave = vi.fn().mockRejectedValue(error);
    const testData = { id: "1", content: "test" };

    const { result } = renderHook(() =>
      useAutoSave(testData, { onSave, onError, delay: 1000 })
    );

    await flushEffects();

    expect(result.current.status).toBe("error");
    expect(result.current.error).toBe(error);
    expect(onError).toHaveBeenCalledWith(error);
  });

  it("does not auto-save while disabled", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const testData = { id: "1", content: "test" };

    const { result, rerender } = renderHook(
      ({ data, enabled }) => useAutoSave(data, { onSave, delay: 1000, enabled }),
      { initialProps: { data: testData, enabled: false } }
    );

    await flushEffects();
    rerender({ data: { ...testData, content: "updated" }, enabled: false });
    await advance(1000);

    expect(onSave).not.toHaveBeenCalled();
    expect(result.current.status).toBe("idle");
  });

  it("marks save success and resets to idle after two seconds", async () => {
    const onSuccess = vi.fn();
    const onSave = vi.fn().mockResolvedValue(undefined);
    const testData = { id: "1", content: "test" };

    const { result } = renderHook(() =>
      useAutoSave(testData, { onSave, onSuccess, delay: 1000 })
    );

    await flushEffects();

    expect(result.current.status).toBe("saved");
    expect(result.current.lastSaved).toBeInstanceOf(Date);
    expect(onSuccess).toHaveBeenCalledTimes(1);

    await advance(2000);

    expect(result.current.status).toBe("idle");
  });

  it("supports manual save", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const testData = { id: "1", content: "test" };

    const { result } = renderHook(() =>
      useAutoSave(testData, { onSave, delay: 1000 })
    );

    await flushEffects();
    expect(onSave).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.triggerSave();
    });

    expect(onSave).toHaveBeenCalledTimes(2);
    expect(result.current.status).toBe("saved");
  });

  it("supports reset after an error", async () => {
    const error = new Error("Save failed");
    const onSave = vi.fn().mockRejectedValue(error);
    const testData = { id: "1", content: "test" };

    const { result } = renderHook(() =>
      useAutoSave(testData, { onSave, delay: 1000 })
    );

    await flushEffects();
    expect(result.current.status).toBe("error");

    act(() => {
      result.current.reset();
    });

    expect(result.current.status).toBe("idle");
    expect(result.current.error).toBeNull();
  });
});
