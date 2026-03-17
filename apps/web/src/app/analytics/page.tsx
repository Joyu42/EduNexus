"use client";

import { BarChart3 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { LoginPrompt } from "@/components/ui/login-prompt";

interface AnalyticsStats {
  totalSessions: number;
  totalPlans: number;
  totalSyncedPaths: number;
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: number | undefined;
}) {
  return (
    <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 shadow-sm border border-violet-100">
      <div className="text-3xl font-bold text-violet-600">
        {value !== undefined ? value : "—"}
      </div>
      <div className="text-sm text-slate-500 mt-1">{label}</div>
    </div>
  );
}

export default function AnalyticsPage() {
  const { status } = useSession();

  if (status === "unauthenticated") {
    return <LoginPrompt title="学习分析" />;
  }

  const { data, isLoading } = useQuery<AnalyticsStats>({
    queryKey: ["analytics-stats"],
    queryFn: async () => {
      const res = await fetch("/api/analytics/stats");
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50/40 via-violet-50/20 to-fuchsia-50/40 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <BarChart3 className="w-8 h-8 text-violet-600" />
          <h1 className="text-2xl font-bold text-slate-800">学习分析</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard label="总学习次数" value={data?.totalSessions} />
          <StatCard label="总学习计划" value={data?.totalPlans} />
          <StatCard label="已同步路径" value={data?.totalSyncedPaths} />
        </div>

        {isLoading && (
          <div className="text-center text-slate-400 mt-8">加载中...</div>
        )}
      </div>
    </div>
  );
}
