/**
 * 导出管理器
 * 处理数据导出和报告分享
 */

import type {
  ExportOptions,
  ExportResult,
  ShareOptions,
  ShareResult,
  DailyReport,
  WeeklyReport,
  MonthlyReport,
  YearlyReport,
} from './analytics-types';

/**
 * 导出为 JSON
 */
export function exportToJSON(data: any, filename: string): ExportResult {
  try {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    return {
      success: true,
      format: 'json',
      filename: `${filename}.json`,
      data: jsonString,
      url,
    };
  } catch (error) {
    return {
      success: false,
      format: 'json',
      filename: '',
      error: error instanceof Error ? error.message : '导出失败',
    };
  }
}

/**
 * 导出为 CSV
 */
export function exportToCSV(data: any[], filename: string): ExportResult {
  try {
    if (data.length === 0) {
      throw new Error('没有数据可导出');
    }

    // 获取所有键作为表头
    const headers = Object.keys(data[0]);
    const csvRows = [];

    // 添加表头
    csvRows.push(headers.join(','));

    // 添加数据行
    data.forEach(row => {
      const values = headers.map(header => {
        const value = row[header];
        // 处理包含逗号的值
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value}"`;
        }
        return value;
      });
      csvRows.push(values.join(','));
    });

    const csvString = csvRows.join('\n');
    const blob = new Blob(['\ufeff' + csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    return {
      success: true,
      format: 'csv',
      filename: `${filename}.csv`,
      data: csvString,
      url,
    };
  } catch (error) {
    return {
      success: false,
      format: 'csv',
      filename: '',
      error: error instanceof Error ? error.message : '导出失败',
    };
  }
}

/**
 * 导出报告为文本
 */
export function exportReportAsText(
  report: DailyReport | WeeklyReport | MonthlyReport | YearlyReport,
  type: 'daily' | 'weekly' | 'monthly' | 'yearly'
): ExportResult {
  try {
    let content = '';

    if (type === 'daily' && 'date' in report) {
      content = formatDailyReportText(report as DailyReport);
    } else if (type === 'weekly' && 'weekNumber' in report) {
      content = formatWeeklyReportText(report as WeeklyReport);
    } else if (type === 'monthly' && 'month' in report) {
      content = formatMonthlyReportText(report as MonthlyReport);
    } else if (type === 'yearly' && 'year' in report) {
      content = formatYearlyReportText(report as YearlyReport);
    }

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    return {
      success: true,
      format: 'text',
      filename: `学习${type === 'daily' ? '日' : type === 'weekly' ? '周' : type === 'monthly' ? '月' : '年'}报_${new Date().toISOString().slice(0, 10)}.txt`,
      data: content,
      url,
    };
  } catch (error) {
    return {
      success: false,
      format: 'text',
      filename: '',
      error: error instanceof Error ? error.message : '导出失败',
    };
  }
}

/**
 * 下载导出文件
 */
export function downloadExport(result: ExportResult): void {
  if (!result.success || !result.url) {
    console.error('导出失败:', result.error);
    return;
  }

  const a = document.createElement('a');
  a.href = result.url;
  a.download = result.filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(result.url);
}

/**
 * 生成分享链接
 */
export async function generateShareLink(
  options: ShareOptions
): Promise<ShareResult> {
  try {
    // 实际应用中应该调用后端 API 生成分享链接
    // 这里返回模拟数据
    const shareId = `share_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const shareUrl = `${window.location.origin}/share/${shareId}`;

    const expiresAt = options.expiresIn
      ? new Date(Date.now() + options.expiresIn * 60 * 60 * 1000).toISOString()
      : undefined;

    return {
      success: true,
      shareUrl,
      shareId,
      expiresAt,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '生成分享链接失败',
    };
  }
}

/**
 * 复制到剪贴板
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('复制失败:', error);
    return false;
  }
}

/**
 * 分享到社交平台
 */
export function shareToSocial(
  platform: 'wechat' | 'weibo' | 'twitter',
  content: string,
  url?: string
): void {
  const encodedContent = encodeURIComponent(content);
  const encodedUrl = url ? encodeURIComponent(url) : '';

  let shareUrl = '';

  switch (platform) {
    case 'wechat':
      // 微信分享需要使用微信 SDK
      console.log('微信分享:', content, url);
      break;

    case 'weibo':
      shareUrl = `https://service.weibo.com/share/share.php?title=${encodedContent}&url=${encodedUrl}`;
      window.open(shareUrl, '_blank');
      break;

    case 'twitter':
      shareUrl = `https://twitter.com/intent/tweet?text=${encodedContent}&url=${encodedUrl}`;
      window.open(shareUrl, '_blank');
      break;
  }
}

// ==================== 格式化函数 ====================

function formatDailyReportText(report: DailyReport): string {
  return `
# 学习日报 (${report.date})

## 学习概况
- 学习时长：${formatTime(report.summary.studyTime)}
- 完成活动：${report.summary.activitiesCompleted} 项
- 专注度：${report.summary.focusScore}%
- 主要活动：${report.summary.topActivity}

## 活动详情
${report.activities.map(a => `- ${a.type}: ${formatTime(a.duration)}`).join('\n')}

## 今日成就
${report.achievements.length > 0 ? report.achievements.map(a => `✓ ${a}`).join('\n') : '继续努力！'}

## 洞察
${report.insights.map(i => `• ${i}`).join('\n')}

## 明日计划
### 建议
${report.tomorrow.suggestions.map(s => `• ${s}`).join('\n')}

### 目标
${report.tomorrow.goals.map(g => `• ${g}`).join('\n')}
  `.trim();
}

function formatWeeklyReportText(report: WeeklyReport): string {
  return `
# 学习周报 (${report.period.start} - ${report.period.end})

## 学习统计
- 总学习时长：${formatTime(report.summary.totalStudyTime)}
- 平均每日：${formatTime(report.summary.avgDailyTime)}
- 学习次数：${report.summary.totalSessions} 次
- 专注度：${report.summary.focusScore}%
- 完成率：${report.summary.completionRate}%

## 每日数据
${report.dailyBreakdown.map(d => `${d.date}: ${formatTime(d.studyTime)} (${d.activities}项活动)`).join('\n')}

## 主要活动
${report.topActivities.map(a => `- ${a.type}: ${formatTime(a.duration)} (${a.percentage}%)`).join('\n')}

## 知识进度
${report.knowledgeProgress.map(kp => `- ${kp.name}: ${kp.mastery}% ${kp.change > 0 ? '↑' : kp.change < 0 ? '↓' : '→'} ${Math.abs(kp.change)}%`).join('\n')}

## 本周成就
${report.achievements.length > 0 ? report.achievements.map(a => `✓ ${a}`).join('\n') : '继续努力！'}

## 洞察
${report.insights.map(i => `• ${i}`).join('\n')}

## 改进建议
${report.suggestions.map(s => `• ${s}`).join('\n')}

## 下周计划
### 目标
${report.nextWeek.goals.map(g => `• ${g}`).join('\n')}

### 重点关注
${report.nextWeek.focus.map(f => `• ${f}`).join('\n')}
  `.trim();
}

function formatMonthlyReportText(report: MonthlyReport): string {
  return `
# 学习月报 (${report.month})

## 学习统计
- 总学习时长：${formatTime(report.summary.totalStudyTime)}
- 平均每日：${formatTime(report.summary.avgDailyTime)}
- 学习次数：${report.summary.totalSessions} 次
- 专注度：${report.summary.focusScore}%
- 完成率：${report.summary.completionRate}%
- 知识点掌握：${report.summary.knowledgePointsMastered} 个

## 周趋势
${report.weeklyTrend.map(w => `第${w.week}周: ${formatTime(w.studyTime)} (${w.activities}项活动)`).join('\n')}

## 主要活动
${report.topActivities.map(a => `- ${a.type}: ${formatTime(a.duration)} (${a.percentage}%)`).join('\n')}

## 知识掌握度
${report.knowledgeMastery.map(km => `- ${km.name} (${km.category}): ${km.mastery}%`).join('\n')}

## 里程碑
${report.milestones.length > 0 ? report.milestones.map(m => `🎯 ${m}`).join('\n') : '继续努力！'}

## 本月成就
${report.achievements.length > 0 ? report.achievements.map(a => `✓ ${a}`).join('\n') : '继续努力！'}

## 洞察
${report.insights.map(i => `• ${i}`).join('\n')}

## 建议
${report.recommendations.map(r => `• ${r}`).join('\n')}

## 下月计划
### 目标
${report.nextMonth.goals.map(g => `• ${g}`).join('\n')}

### 重点关注
${report.nextMonth.focus.map(f => `• ${f}`).join('\n')}
  `.trim();
}

function formatYearlyReportText(report: YearlyReport): string {
  return `
# 年度学习报告 (${report.year})

## 年度统计
- 总学习时长：${formatTime(report.summary.totalStudyTime)}
- 平均每日：${formatTime(report.summary.avgDailyTime)}
- 学习次数：${report.summary.totalSessions} 次
- 知识点掌握：${report.summary.knowledgePointsMastered} 个
- 最长连续：${report.summary.longestStreak} 天

## 月度趋势
${report.monthlyTrend.map(m => `${m.month}: ${formatTime(m.studyTime)}`).join('\n')}

## 主要学习领域
${report.topCategories.map(c => `- ${c.category}: ${formatTime(c.duration)} (${c.percentage}%)`).join('\n')}

## 年度亮点
${report.yearHighlights.map(h => `⭐ ${h}`).join('\n')}

## 年度成就
${report.achievements.map(a => `🏆 ${a}`).join('\n')}

## 成长领域
${report.growth.areas.map(a => `• ${a}`).join('\n')}

## 进步方面
${report.growth.improvements.map(i => `• ${i}`).join('\n')}

## 明年展望
### 目标
${report.nextYear.goals.map(g => `• ${g}`).join('\n')}

### 建议
${report.nextYear.recommendations.map(r => `• ${r}`).join('\n')}
  `.trim();
}

function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}小时${mins > 0 ? mins + '分钟' : ''}`;
  }
  return `${mins}分钟`;
}
