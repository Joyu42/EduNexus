import type { LearningRecord, Word } from "./types";

type SessionOptions = {
  size?: number;
  reviewFirst?: boolean;
  dailyNewLimit?: number;
};

type ResolvedSessionOptions = {
  size?: number;
  reviewFirst: boolean;
  dailyNewLimit: number;
};

function resolveOptions(options?: number | SessionOptions): ResolvedSessionOptions {
  if (typeof options === "number") {
    return { size: options, reviewFirst: true, dailyNewLimit: options };
  }
  return {
    size: options?.size,
    reviewFirst: options?.reviewFirst ?? true,
    dailyNewLimit: options?.dailyNewLimit ?? 20,
  };
}

export function selectSessionWordIds(
  words: Word[],
  records: LearningRecord[],
  today: string,
  options?: number | SessionOptions
): string[] {
  const config = resolveOptions(options);
  const { reviewFirst, dailyNewLimit } = config;
  const recordByWord = new Map(records.map((record) => [record.wordId, record]));

  const dueWordIds = words
    .filter((word) => {
      const record = recordByWord.get(word.id);
      return Boolean(record && record.nextReviewDate <= today);
    })
    .map((word) => word.id);

  const newWordIds = words
    .filter((word) => !recordByWord.has(word.id))
    .map((word) => word.id);

  const limitedNewIds = newWordIds.slice(0, Math.max(0, dailyNewLimit));
  const ordered = reviewFirst ? [...dueWordIds, ...limitedNewIds] : [...limitedNewIds, ...dueWordIds];
  const targetSize = config.size ?? ordered.length;
  return ordered.slice(0, targetSize);
}

export function selectNewWordIds(
  words: Word[],
  records: LearningRecord[],
  size = 20
): string[] {
  const recordByWord = new Set(records.map((record) => record.wordId));

  return words
    .filter((word) => !recordByWord.has(word.id))
    .slice(0, size)
    .map((word) => word.id);
}

export function selectReviewWordIds(
  words: Word[],
  records: LearningRecord[],
  today: string,
  size = 20
): string[] {
  const recordByWord = new Map(records.map((record) => [record.wordId, record]));

  return words
    .filter((word) => {
      const record = recordByWord.get(word.id);
      return Boolean(record && record.nextReviewDate <= today);
    })
    .slice(0, size)
    .map((word) => word.id);
}
