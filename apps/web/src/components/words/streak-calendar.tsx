"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StreakCalendarProps = {
  activeDates: string[];
  today: string;
  days?: number;
};

function getRecentDates(days: number, today: string): string[] {
  const dateList: string[] = [];
  const cursor = new Date(`${today}T00:00:00.000Z`);
  cursor.setUTCHours(0, 0, 0, 0);

  for (let index = days - 1; index >= 0; index -= 1) {
    const date = new Date(cursor);
    date.setUTCDate(cursor.getUTCDate() - index);
    dateList.push(date.toISOString().slice(0, 10));
  }
  return dateList;
}

function formatWeekday(date: string): string {
  return new Date(`${date}T00:00:00.000Z`).toLocaleDateString("en-US", {
    weekday: "short",
    timeZone: "UTC",
  });
}

function formatDayOfMonth(date: string): string {
  return new Date(`${date}T00:00:00.000Z`).toLocaleDateString("en-US", {
    day: "numeric",
    timeZone: "UTC",
  });
}

export function StreakCalendar({ activeDates, today, days = 28 }: StreakCalendarProps) {
  // NOTE: This component renders date-derived attributes (title).
  // If users change local clock (or use our debug today override), server and client
  // can disagree on the "current" day during hydration. Render a stable placeholder
  // until the client mounts to avoid hydration mismatches.
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const recentDates = mounted ? getRecentDates(days, today) : [];
  const activeSet = new Set(activeDates);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">学习日历</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-2">
          {mounted
            ? recentDates.map((date) => {
                const isActive = activeSet.has(date);
                const isToday = date === today;
                return (
                  <div
                    key={date}
                    title={date}
                    className={cn(
                      "flex h-12 flex-col items-center justify-center rounded-md border px-1 text-center",
                      isActive
                        ? "border-emerald-400 bg-emerald-100 text-emerald-900"
                        : "border-slate-200 bg-slate-100 text-slate-600",
                      isToday && "ring-2 ring-cyan-400 ring-offset-1"
                    )}
                  >
                    <span className="text-[10px] font-medium leading-none opacity-85">{formatWeekday(date)}</span>
                    <span className="mt-1 text-sm font-semibold leading-none">{formatDayOfMonth(date)}</span>
                  </div>
                );
              })
            : Array.from({ length: days }, (_, index) => `placeholder-${index}`).map((key) => (
                <div key={key} className="h-12 rounded-md border border-slate-200 bg-slate-100" />
              ))}
        </div>
      </CardContent>
    </Card>
  );
}
