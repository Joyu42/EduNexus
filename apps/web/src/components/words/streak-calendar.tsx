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
                return (
                  <div
                    key={date}
                    title={date}
                    className={cn(
                      "h-7 rounded-md border",
                      isActive
                        ? "border-emerald-400 bg-emerald-400/80"
                        : "border-slate-200 bg-slate-100"
                    )}
                  />
                );
              })
            : Array.from({ length: days }, (_, index) => `placeholder-${index}`).map((key) => (
                <div key={key} className="h-7 rounded-md border border-slate-200 bg-slate-100" />
              ))}
        </div>
      </CardContent>
    </Card>
  );
}
