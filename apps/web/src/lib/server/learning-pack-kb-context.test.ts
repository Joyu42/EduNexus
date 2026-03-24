import { describe, expect, it, vi } from "vitest";
import { buildLearningPackKbContext } from "./learning-pack-kb-context";

const searchDocumentsForLearningPackMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/server/document-service", () => ({
  searchDocumentsForLearningPack: searchDocumentsForLearningPackMock,
}));

describe("buildLearningPackKbContext", () => {
  it("returns empty context when userId is empty", async () => {
    const result = await buildLearningPackKbContext("", "java");
    expect(result).toEqual({ existingDocs: [], topicMatches: 0 });
  });

  it("returns empty context when topic is empty", async () => {
    const result = await buildLearningPackKbContext("u1", "");
    expect(result).toEqual({ existingDocs: [], topicMatches: 0 });
  });

  it("returns empty context when no relevant KB docs exist", async () => {
    searchDocumentsForLearningPackMock.mockResolvedValueOnce([]);
    const result = await buildLearningPackKbContext("u1", "rust");
    expect(result).toEqual({ existingDocs: [], topicMatches: 0 });
    expect(searchDocumentsForLearningPackMock).toHaveBeenCalledWith("rust", "u1");
  });

  it("returns matching docs with title and snippet", async () => {
    searchDocumentsForLearningPackMock.mockResolvedValueOnce([
      { docId: "doc1", title: "Java 基础", snippet: "Java 入门知识..." },
      { docId: "doc2", title: "Java 进阶", snippet: "Java 高级特性..." },
    ]);
    const result = await buildLearningPackKbContext("u1", "java");
    expect(result.existingDocs).toHaveLength(2);
    expect(result.topicMatches).toBe(2);
    expect(result.existingDocs[0]).toMatchObject({
      docId: "doc1",
      title: "Java 基础",
    });
    expect(searchDocumentsForLearningPackMock).toHaveBeenCalledWith("java", "u1");
  });
});
