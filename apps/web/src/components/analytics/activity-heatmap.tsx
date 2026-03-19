"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip } from "@/components/ui/tooltip";
import type { DailyActivity } from "@/lib/analytics/stats";
import { cn } from "@/lib/utils";

interface ActivityHeatmapProps {
  data: DailyActivity[];
}

export function ActivityHeatmap({ data }: ActivityHeatmapProps) {
  // 获取最近12周的数据（84天）
  const weeks = 12;
  const daysToShow = weeks * 7;
  const recentData = data.slice(-daysToShow);

  // 计算最大学习时长用于颜色映射
  const maxStudyTime = Math.max(...recentData.map((d) => d.studyTime), 1);

  // 获取颜色强度
  const getColorIntensity = (studyTime: number): string => {
    if (studyTime === 0) return "bg-gray-100 dark:bg-gray-800";
    const intensity = studyTime / maxStudyTime;
    if (intensity < 0.25) return "bg-orange-200 dark:bg-orange-900/40";
    if (intensity < 0.5) return "bg-orange-300 dark:bg-orange-800/60";
    if (intensity < 0.75) return "bg-orange-400 dark:bg-orange-700/80";
    return "bg-orange-500 dark:bg-orange-600";
  };

  // 格式化日期显示
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("zh-CN", {
      month: "numeric",
      day: "numeric",
    });
  };

  // 格式化时长
  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}小时${mins > 0 ? mins + "分钟" : ""}`;
    }
    return `${mins}分钟`;
  };

  // 按周分组数据
  const weekGroups: DailyActivity[][] = [];
  for (let i = 0; i < recentData.length; i += 7) {
    weekGroups.push(recentData.slice(i, i + 7));
  }

  // 获取月份标签
  const getMonthLabels = () => {
    const labels: { month: string; offset: number }[] = [];
    let currentMonth = "";

    recentData.forEach((day, index) => {
      const date = new Date(day.date);
      const month = date.toLocaleDateString("zh-CN", { month: "short" });
      if (month !== currentMonth) {
        currentMonth = month;
        labels.push({ month, offset: Math.floor(index / 7) });
      }
    });

    return labels;
  };

  const monthLabels = getMonthLabels();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span>学习活跃度</span>
          <div className="flex items-center gap-2 text-xs font-normal text-muted-foreground">
            <span>少</span>
            <div className="flex gap-1">
              <div className="w-3 h-3 rounded-sm bg-gray-100 dark:bg-gray-800" />
              <div className="w-3 h-3 rounded-sm bg-orange-200 dark:bg-orange-900/40" />
              <div className="w-3 h-3 rounded-sm bg-orange-300 dark:bg-orange-800/60" />
              <div className="w-3 h-3 rounded-sm bg-orange-400 dark:bg-orange-700/80" />
              <div className="w-3 h-3 rounded-sm bg-orange-500 dark:bg-orange-600" />
            </div>
            <span>多</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* 月份标签 */}
        <div className="relative mb-2">
          <div className="flex gap-1 text-xs text-muted-foreground">
            {monthLabels.map((label, index) => (
              <div
                key={index}
                className="absolute"
                style={{ left: `${label.offset * 16}px` }}
              >
                {label.month}
              </div>
            ))}
          </div>
        </div>

        {/* 热力图网格 */}
        <div className="mt-6 overflow-x-auto">
          <div className="inline-flex gap-1">
            {weekGroups.map((week, weekIndex) => (
              <div key={weekIndex} className="flex flex-col gap-1">
                {week.map((day, dayIndex) => (
                  <div
                    key={dayIndex}
                    className={cn(
                      "w-3 h-3 rounded-sm cursor-pointer transition-all hover:ring-2 hover:ring-primary hover:scale-110",
                      getColorIntensity(day.studyTime)
                    )}
                    title={`${formatDate(day.date)}: ${formatTime(day.studyTime)}`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* 统计信息 */}
        <div className="mt-6 grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">总天数</div>
            <div className="text-lg font-semibold">{recentData.length}</div>
          </div>
          <div>
            <div className="text-muted-foreground">活跃天数</div>
            <div className="text-lg font-semibold">
              {recentData.filter((d) => d.studyTime > 0).length}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">最长连续</div>
            <div className="text-lg font-semibold">
              {calculateLongestStreak(recentData)}天
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * 计算最长连续学习天数
 */
function calculateLongestStreak(data: DailyActivity[]): number {
  let maxStreak = 0;
  let currentStreak = 0;

  data.forEach((day) => {
    if (day.studyTime > 0) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  });

  return maxStreak;
}