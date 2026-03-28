import type { AnalyticsReport } from "./report-builder";

export type AnalyticsInsightCard = {
  id: "activity-volume" | "study-consistency" | "snapshot-coverage";
  title: string;
  description: string;
  severity: "positive" | "neutral" | "warning";
};

function buildActivityInsight(report: AnalyticsReport): AnalyticsInsightCard {
  if (report.totals.eventCount === 0) {
    return {
      id: "activity-volume",
      title: "暂无学习行为数据",
      description: "当前窗口内还没有可统计的行为事件，完成一次学习操作后将显示趋势。",
      severity: "warning"
    };
  }

  const avgPerDay = (report.totals.eventCount / report.window.days).toFixed(1);
  const topEvent = report.topEvents[0]?.name;
  const topEventDescription = topEvent ? `，高频行为是 ${topEvent}` : "";

  return {
    id: "activity-volume",
    title: "学习行为活跃",
    description: `窗口内记录 ${report.totals.eventCount} 次行为，日均 ${avgPerDay} 次${topEventDescription}。`,
    severity: "positive"
  };
}

function buildConsistencyInsight(report: AnalyticsReport): AnalyticsInsightCard {
  const activeDays = report.timeline.filter((day) => day.events > 0 || day.snapshots > 0).length;
  const consistency = report.window.days === 0
    ? 0
    : Math.round((activeDays / report.window.days) * 100);

  if (consistency >= 60) {
    return {
      id: "study-consistency",
      title: "学习节奏稳定",
      description: `${report.window.days} 天内活跃 ${activeDays} 天，连续性 ${consistency}%。`,
      severity: "positive"
    };
  }

  if (consistency >= 30) {
    return {
      id: "study-consistency",
      title: "学习节奏一般",
      description: `${report.window.days} 天内活跃 ${activeDays} 天，建议增加固定学习时段。`,
      severity: "neutral"
    };
  }

  return {
    id: "study-consistency",
    title: "学习连续性偏低",
    description: `${report.window.days} 天内仅活跃 ${activeDays} 天，建议从每日短时学习开始恢复节奏。`,
    severity: "warning"
  };
}

function buildSnapshotInsight(report: AnalyticsReport): AnalyticsInsightCard {
  if (report.totals.snapshotCount === 0) {
    return {
      id: "snapshot-coverage",
      title: "暂无快照指标",
      description: "当前窗口内没有快照记录，系统将以事件趋势为主。",
      severity: "neutral"
    };
  }

  const metricKeys = Object.keys(report.totals.latestSnapshotMetrics).sort((left, right) =>
    left.localeCompare(right)
  );
  const metricKey = metricKeys[0];
  const metricDetail = metricKey
    ? `${metricKey}=${report.totals.latestSnapshotMetrics[metricKey]}`
    : "已同步最新快照";

  return {
    id: "snapshot-coverage",
    title: "快照数据已同步",
    description: `窗口内累计 ${report.totals.snapshotCount} 条快照，最近指标 ${metricDetail}。`,
    severity: "positive"
  };
}

export function generateAnalyticsInsights(report: AnalyticsReport): AnalyticsInsightCard[] {
  return [buildActivityInsight(report), buildConsistencyInsight(report), buildSnapshotInsight(report)];
}
