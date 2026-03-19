/**
 * 自动保存功能测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAutoSave } from '../use-auto-save';

describe('useAutoSave', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('应该在延迟后触发保存', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const testData = { id: '1', content: 'test' };

    const { result, rerender } = renderHook(
      ({ data }) => useAutoSave(data, { onSave, delay: 1000 }),
      { initialProps: { data: testData } }
    );

    expect(result.current.status).toBe('idle');

    // 更新数据
    rerender({ data: { ...testData, content: 'updated' } });

    // 快进时间
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledTimes(1);
    });
  });

  it('应该防抖多次快速更新', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    let testData = { id: '1', content: 'test' };

    const { result, rerender } = renderHook(
      ({ data }) => useAutoSave(data, { onSave, delay: 1000 }),
      { initialProps: { data: testData } }
    );

    // 快速更新多次
    for (let i = 0; i < 5; i++) {
      testData = { ...testData, content: `test${i}` };
      rerender({ data: testData });
      act(() => {
        vi.advanceTimersByTime(500);
      });
    }

    // 等待防抖完成
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      // 应该只调用一次
      expect(onSave).toHaveBeenCalledTimes(1);
    });
  });

  it('应该处理保存错误', async () => {
    const onError = vi.fn();
    const onSave = vi.fn().mockRejectedValue(new Error('Save failed'));
    const testData = { id: '1', content: 'test' };

    const { result, rerender } = renderHook(
      ({ data }) => useAutoSave(data, { onSave, onError, delay: 1000 }),
      { initialProps: { data: testData } }
    );

    rerender({ data: { ...testData, content: 'updated' } });

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(result.current.status).toBe('error');
      expect(onError).toHaveBeenCalled();
      expect(result.current.error).toBeInstanceOf(Error);
    });
  });

  it('应该在禁用时不触发保存', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const testData = { id: '1', content: 'test' };

    const { result, rerender } = renderHook(
      ({ data }) => useAutoSave(data, { onSave, delay: 1000, enabled: false }),
      { initialProps: { data: testData } }
    );

    rerender({ data: { ...testData, content: 'updated' } });

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(onSave).not.toHaveBeenCalled();
    });
  });

  it('应该在保存成功后更新状态', async () => {
    const onSuccess = vi.fn();
    const onSave = vi.fn().mockResolvedValue(undefined);
    const testData = { id: '1', content: 'test' };

    const { result, rerender } = renderHook(
      ({ data }) => useAutoSave(data, { onSave, onSuccess, delay: 1000 }),
      { initialProps: { data: testData } }
    );

    rerender({ data: { ...testData, content: 'updated' } });

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(result.current.status).toBe('saved');
      expect(result.current.lastSaved).toBeInstanceOf(Date);
      expect(onSuccess).toHaveBeenCalled();
    });

    // 2秒后应该重置为 idle
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    await waitFor(() => {
      expect(result.current.status).toBe('idle');
    });
  });

  it('应该支持手动触发保存', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const testData = { id: '1', content: 'test' };

    const { result } = renderHook(() =>
      useAutoSave(testData, { onSave, delay: 1000 })
    );

    await act(async () => {
      await result.current.triggerSave();
    });

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe('saved');
  });

  it('应该支持重置状态', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('Save failed'));
    const testData = { id: '1', content: 'test' };

    const { result, rerender } = renderHook(
      ({ data }) => useAutoSave(data, { onSave, delay: 1000 }),
      { initialProps: { data: testData } }
    );

    rerender({ data: { ...testData, content: 'updated' } });

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(result.current.status).toBe('error');
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.status).toBe('idle');
    expect(result.current.error).toBeNull();
  });
});
