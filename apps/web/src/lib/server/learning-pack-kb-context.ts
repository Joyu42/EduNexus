import { searchDocumentsForLearningPack } from "@/lib/server/document-service";

export interface LearningPackKbDoc {
  docId: string;
  title: string;
  snippet: string;
}

export interface LearningPackKbContext {
  existingDocs: LearningPackKbDoc[];
  topicMatches: number;
}

export async function buildLearningPackKbContext(
  userId: string,
  topic: string
): Promise<LearningPackKbContext> {
  if (!userId?.trim() || !topic?.trim()) {
    return { existingDocs: [], topicMatches: 0 };
  }

  const docs = await searchDocumentsForLearningPack(topic.trim(), userId);

  return {
    existingDocs: docs,
    topicMatches: docs.length,
  };
}
