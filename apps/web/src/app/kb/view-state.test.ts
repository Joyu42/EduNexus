import fs from "node:fs/promises";
import path from "node:path";
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

  it("keeps first-document CTA discoverable in KB empty state", async () => {
    const file = path.resolve(process.cwd(), "src/app/kb/page.tsx");
    const content = await fs.readFile(file, "utf8");

    expect(content).toContain('data-testid="kb-empty-create-first-document"');
    expect(content).toContain("创建第一篇文档");
    expect(content).toContain('handleCreateDocument("我的第一篇文档")');
  });
});
