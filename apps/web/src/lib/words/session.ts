import type { LearningRecord, Word } from "./types";

export function selectSessionWordIds(
  words: Word[],
  records: LearningRecord[],
  today: string,
  size = 20
): string[] {
  const recordByWord = new Map(records.map((record) => [record.wordId, record]));

  const newCapacity = Math.max(0, size);
  const newWordIds = words
    .filter((word) => !recordByWord.has(word.id))
    .slice(0, newCapacity)
    .map((word) => word.id);

  return newWordIds.slice(0, size);
}
