import { type LucideIcon, TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StatsCardProps = {
  icon: LucideIcon;
  label: string;
  value: string | number;
  trend?: number;
  accentClassName?: string;
};

export function StatsCard({
  icon: Icon,
  label,
  value,
  trend,
  accentClassName = "from-sky-500/10 to-cyan-500/5 border-sky-200",
}: StatsCardProps) {
  return (
    <Card className={cn("border bg-gradient-to-br", accentClassName)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs text-slate-600">{label}</p>
            <p className="text-2xl font-bold text-slate-900">{value}</p>
          </div>
          <div className="rounded-lg bg-white/80 p-2 shadow-sm">
            <Icon className="h-4 w-4 text-slate-700" />
          </div>
        </div>
        {typeof trend === "number" ? (
          <div className="mt-3 flex items-center gap-1 text-xs">
            {trend >= 0 ? (
              <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5 text-red-600" />
            )}
            <span className={trend >= 0 ? "text-emerald-700" : "text-red-700"}>
              {trend > 0 ? `+${trend}%` : `${trend}%`}
            </span>
            <span className="text-slate-500">vs yesterday</span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
