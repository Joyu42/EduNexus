'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ExpProgressBar } from './exp-progress-bar';

interface CompactLevelDisplayProps {
  userId?: string;
  showProgress?: boolean;
  className?: string;
}

export function CompactLevelDisplay({
  userId = 'demo_user',
  showProgress = true,
  className = ''
}: CompactLevelDisplayProps) {
  const [levelData, setLevelData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLevel() {
      try {
        const res = await fetch(`/api/user/level?userId=${userId}`);
        const json = await res.json();
        if (json.success) {
          setLevelData(json.data);
        }
      } catch (error) {
        console.error('加载等级数据失败:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchLevel();
  }, [userId]);

  if (loading || !levelData) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-10 bg-muted rounded"></div>
      </div>
    );
  }

  const { level, nextLevel } = levelData;

  return (
    <Link href="/user-level" className={`block ${className}`}>
      <div className="rounded-lg border bg-card p-3 hover:shadow-md transition-shadow cursor-pointer">
        <div className="flex items-center gap-3">
          <div className="text-3xl">{level.titleEmoji}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Lv {level.level}</span>
              <span className="text-sm font-semibold truncate">{level.title}</span>
            </div>
            {showProgress && nextLevel && (
              <div className="mt-1">
                <ExpProgressBar
                  currentExp={level.currentExp}
                  maxExp={nextLevel.expNeeded + level.currentExp}
                  size="sm"
                  showNumbers={false}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
