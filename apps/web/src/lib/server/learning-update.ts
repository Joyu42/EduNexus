import { loadDb, saveDb } from "./store";

export async function increaseMasteryByKeywords(text: string) {
  const db = await loadDb();
  const lower = text.toLowerCase();
  const candidates = [
    { key: "seq", keywords: ["数列", "等差", "求和"] },
    { key: "func", keywords: ["函数", "单调", "导数"] },
    { key: "logic", keywords: ["证明", "推理", "条件"] }
  ];

  for (const candidate of candidates) {
    if (candidate.keywords.some((word) => lower.includes(word))) {
      const current = db.masteryByNode[candidate.key] ?? 0.35;
      db.masteryByNode[candidate.key] = Number(Math.min(current + 0.04, 0.95).toFixed(2));
    }
  }

  await saveDb(db);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function stageToMastery(stage: "seen" | "understood" | "applied" | "mastered"): number {
  switch (stage) {
    case "seen":
      return 0.12;
    case "understood":
      return 0.37;
    case "applied":
      return 0.65;
    case "mastered":
      return 0.9;
  }
}

export async function setMasteryStage(
  nodeId: string,
  stage: "seen" | "understood" | "applied" | "mastered"
): Promise<void> {
  const db = await loadDb();
  db.masteryByNode[nodeId] = stageToMastery(stage);
  await saveDb(db);
}

export async function setNeedsReview(nodeId: string, value: boolean): Promise<void> {
  const db = await loadDb();
  if (value) {
    if (!db.needsReviewNodes.includes(nodeId)) {
      db.needsReviewNodes.push(nodeId);
    }
  } else {
    db.needsReviewNodes = db.needsReviewNodes.filter((id) => id !== nodeId);
  }
  await saveDb(db);
}

export async function applyPathFocusFeedback(input: {
  nodeId: string;
  nodeLabel?: string;
  relatedNodes?: string[];
  quality: "light" | "solid" | "deep";
}) {
  const db = await loadDb();
  const deltaByQuality: Record<"light" | "solid" | "deep", number> = {
    light: 0.02,
    solid: 0.05,
    deep: 0.08
  };
  const delta = deltaByQuality[input.quality] ?? 0.05;

  const current = db.masteryByNode[input.nodeId] ?? 0.35;
  const next = Number(clamp(current + delta, 0.05, 0.98).toFixed(2));
  db.masteryByNode[input.nodeId] = next;

  const related = (input.relatedNodes ?? []).slice(0, 4);
  let updatedRelatedCount = 0;
  for (const relatedNode of related) {
    const key = relatedNode.trim();
    if (!key) {
      continue;
    }
    const relatedCurrent = db.masteryByNode[key] ?? 0.35;
    db.masteryByNode[key] = Number(
      clamp(relatedCurrent + delta * 0.4, 0.05, 0.98).toFixed(2)
    );
    updatedRelatedCount += 1;
  }

  if (input.nodeLabel && input.nodeLabel.trim()) {
    const lower = input.nodeLabel.toLowerCase();
    if (lower.includes("数列")) {
      db.masteryByNode.seq = Number(clamp((db.masteryByNode.seq ?? 0.35) + delta * 0.5, 0.05, 0.98).toFixed(2));
    }
    if (lower.includes("函数")) {
      db.masteryByNode.func = Number(clamp((db.masteryByNode.func ?? 0.35) + delta * 0.5, 0.05, 0.98).toFixed(2));
    }
  }

  await saveDb(db);

  return {
    nodeId: input.nodeId,
    mastery: next,
    risk: Number((1 - next).toFixed(2)),
    updatedRelatedCount
  };
}
