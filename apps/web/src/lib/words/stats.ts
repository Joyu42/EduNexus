import type {
  LearningRecord,
  StudyEvent,
  WordMasteryInput,
} from "./types";

export function calculateTotalLearned(
  records: Array<Pick<LearningRecord, "status">>
): number {
  return records.filter((record) => record.status === "mastered").length;
}

export function calculateTodayProgress(
  events: StudyEvent[],
  today: string
): { learned: number; reviewed: number; relearned: number; accuracy: number } {
  const todayEvents = events.filter((event) => event.date === today);
  const learned = todayEvents.filter((event) => event.type === "learn").length;
  const reviewed = todayEvents.filter((event) => event.type === "review").length;
  const relearned = todayEvents.filter((event) => event.type === "relearn").length;
  const attempts = reviewed + relearned;
  const successCount = todayEvents.filter(
    (event) => event.type !== "learn" && event.success
  ).length;
  const accuracy = attempts === 0 ? 0 : successCount / attempts;

  return { learned, reviewed, relearned, accuracy };
}

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export function calculateStreakDays(activeDates: string[], today: string): number {
  const sorted = Array.from(new Set(activeDates.filter(Boolean))).sort();
  if (sorted.length === 0) {
    return 0;
  }

  const set = new Set(sorted);
  const latestDate = sorted[sorted.length - 1];
  const latest = new Date(`${latestDate}T00:00:00.000Z`);
  const current = new Date(`${today}T00:00:00.000Z`);
  const diff = Math.floor((current.getTime() - latest.getTime()) / DAY_IN_MS);

  if (diff > 1 || diff < 0) {
    return 0;
  }

  let streak = 0;
  const cursor = latest;

  while (true) {
    const iso = cursor.toISOString().split("T")[0];
    if (!set.has(iso)) {
      break;
    }
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return streak;
}

export function calculateWordMastery(input: WordMasteryInput): number {
  const reviewComponent = Math.min(1, input.reviewCount / 10);
  const easeComponent = Math.min(1, Math.max(0, (input.easeFactor - 1.3) / 1.7));
  const successComponent = Math.min(1, Math.max(0, input.successRate));

  const score = reviewComponent * 0.4 + easeComponent * 0.2 + successComponent * 0.4;
  return Math.min(1, Math.max(0, score));
}
