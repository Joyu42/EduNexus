'use client';

import { Card } from '@/components/ui/card';
import type { LearningCalendar } from '@/lib/profile/profile-types';

type LearningCalendarHeatmapProps = {
  data: LearningCalendar[];
  userId: string;
};

export function LearningCalendarHeatmap({ data, userId }: LearningCalendarHeatmapProps) {
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 364);

  const weeks: LearningCalendar[][] = [];
  let currentWeek: LearningCalendar[] = [];

  for (let i = 0; i < 365; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];

    const dayData = data.find(d => d.date === dateStr) || {
      date: dateStr,
      minutes: 0,
      level: 0 as const
    };

    currentWeek.push(dayData);

    if (date.getDay() === 6 || i === 364) {
      weeks.push([...currentWeek]);
      currentWeek = [];
    }
  }

  const getLevelColor = (level: number) => {
    switch (level) {
      case 0:
        return 'bg-gray-100 dark:bg-gray-800';
      case 1:
        return 'bg-green-200 dark:bg-green-900';
      case 2:
        return 'bg-green-400 dark:bg-green-700';
      case 3:
        return 'bg-green-600 dark:bg-green-500';
      case 4:
        return 'bg-green-800 dark:bg-green-400';
      default:
        return 'bg-gray-100 dark:bg-gray-800';
    }
  };

  const totalMinutes = data.reduce((sum, day) => sum + day.minutes, 0);
  const totalHours = Math.floor(totalMinutes / 60);
  const activeDays = data.filter(d => d.minutes > 0).length;
  const maxStreak = calculateMaxStreak(data);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          学习日历
        </h3>
        <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
          <span>📅 {activeDays} 天</span>
          <span>⏱️ {totalHours}h</span>
          <span>🔥 最长 {maxStreak} 天</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="inline-flex flex-col space-y-1">
          {/* 月份标签 */}
          <div className="flex space-x-1 mb-2">
            {getMonthLabels(weeks).map((month, index) => (
              <div
                key={index}
                className="text-xs text-gray-500 dark:text-gray-400"
                style={{ width: `${month.weeks * 12}px` }}
              >
                {month.label}
              </div>
            ))}
          </div>

          {/* 热力图 */}
          <div className="flex space-x-1">
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="flex flex-col space-y-1">
                {week.map((day, dayIndex) => {
                  const date = new Date(day.date);
                  const isToday = day.date === today.toISOString().split('T')[0];

                  return (
                    <div
                      key={dayIndex}
                      className={`w-3 h-3 rounded-sm ${getLevelColor(day.level)} ${
                        isToday ? 'ring-2 ring-blue-500' : ''
                      } hover:ring-2 hover:ring-gray-400 transition-all cursor-pointer`}
                      title={`${day.date}\n${day.minutes} 分钟`}
                    />
                  );
                })}
              </div>
            ))}
          </div>

          {/* 星期标签 */}
          <div className="flex space-x-1 mt-2">
            <div className="flex flex-col space-y-1 text-xs text-gray-500 dark:text-gray-400">
              <div className="h-3"></div>
              <div className="h-3">一</div>
              <div className="h-3"></div>
              <div className="h-3">三</div>
              <div className="h-3"></div>
              <div className="h-3">五</div>
              <div className="h-3"></div>
            </div>
          </div>
        </div>
      </div>

      {/* 图例 */}
      <div className="flex items-center justify-end space-x-2 mt-4 text-xs text-gray-600 dark:text-gray-400">
        <span>少</span>
        <div className="flex space-x-1">
          {[0, 1, 2, 3, 4].map(level => (
            <div
              key={level}
              className={`w-3 h-3 rounded-sm ${getLevelColor(level)}`}
            />
          ))}
        </div>
        <span>多</span>
      </div>
    </Card>
  );
}

function getMonthLabels(weeks: LearningCalendar[][]) {
  const months: { label: string; weeks: number }[] = [];
  let currentMonth = -1;
  let weekCount = 0;

  weeks.forEach((week) => {
    const firstDay = new Date(week[0].date);
    const month = firstDay.getMonth();

    if (month !== currentMonth) {
      if (weekCount > 0) {
        months.push({
          label: getMonthName(currentMonth),
          weeks: weekCount
        });
      }
      currentMonth = month;
      weekCount = 1;
    } else {
      weekCount++;
    }
  });

  if (weekCount > 0) {
    months.push({
      label: getMonthName(currentMonth),
      weeks: weekCount
    });
  }

  return months;
}

function getMonthName(month: number): string {
  const names = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
  return names[month];
}

function calculateMaxStreak(data: LearningCalendar[]): number {
  const sortedData = [...data]
    .filter(d => d.minutes > 0)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let maxStreak = 0;
  let currentStreak = 0;
  let lastDate: Date | null = null;

  sortedData.forEach(day => {
    const currentDate = new Date(day.date);

    if (lastDate) {
      const diffDays = Math.floor((currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        currentStreak++;
      } else {
        maxStreak = Math.max(maxStreak, currentStreak);
        currentStreak = 1;
      }
    } else {
      currentStreak = 1;
    }

    lastDate = currentDate;
  });

  maxStreak = Math.max(maxStreak, currentStreak);
  return maxStreak;
}
