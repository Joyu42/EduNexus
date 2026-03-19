import { describe, expect, it } from "vitest";

import { getKnowledgeBaseViewState } from "./view-state";

describe("getKnowledgeBaseViewState", () => {
  it("returns the KB empty state for authenticated users without documents", () => {
    expect(
      getKnowledgeBaseViewState({
        status: "authenticated",
        isLoading: false,
        documents: [],
      })
    ).toEqual({
      kind: "empty",
      title: "知识库还是空的",
      description: "创建第一篇文档，开始沉淀你的专属知识库。",
    });
  });

  it("keeps the KB content view when documents exist", () => {
    expect(
      getKnowledgeBaseViewState({
        status: "authenticated",
        isLoading: false,
        documents: [{ id: "doc-1" }],
      })
    ).toEqual({ kind: "content" });
  });
});
