'use client';

import { useState, useCallback } from 'react';

interface UseUserLevelReturn {
  addExp: (eventType: string, metadata?: any) => Promise<{
    expGained: number;
    levelUp: boolean;
    newLevel?: number;
    unlockedBadges?: string[];
  }>;
  loading: boolean;
  error: string | null;
}

export function useUserLevel(userId: string = 'demo_user'): UseUserLevelReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addExp = useCallback(async (eventType: string, metadata?: any) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/user/experience/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          eventType,
          metadata
        })
      });

      const json = await res.json();

      if (!json.success) {
        throw new Error(json.error || '添加经验值失败');
      }

      return json.data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '添加经验值失败';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  return {
    addExp,
    loading,
    error
  };
}
