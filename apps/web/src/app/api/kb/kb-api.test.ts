import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { GET as searchKb } from "./search/route";
import { GET as getDoc } from "./doc/[id]/route";
import { GET as getTags } from "./tags/route";
import { GET as getBacklinkGraph } from "./backlinks/graph/route";
import { POST as rebuildIndex } from "./index/rebuild/route";
import {
  cleanupSandbox,
  createSandbox,
  writeMarkdown
} from "@/tests/test-helpers";

type Sandbox = Awaited<ReturnType<typeof createSandbox>>;

describe("kb api", () => {
  let sandbox: Sandbox;

  beforeAll(async () => {
    sandbox = await createSandbox("kb");
    process.env.EDUNEXUS_VAULT_DIR = sandbox.vaultDir;

    await writeMarkdown(
      sandbox.vaultDir,
      "notes/note_seq.md",
      [
        "---",
        "id: note_seq",
        "title: 数列复盘",
        "type: note",
        "domain: math",
        "tags: [数列, 复盘]",
        "links: [source_ch5]",
        "source_refs: [book_ch5]",
        "owner: test",
        "---",
        "",
        "先判断是等差还是等比，再代入对应公式。"
      ].join("\n")
    );

    await writeMarkdown(
      sandbox.vaultDir,
      "sources/source_ch5.md",
      [
        "---",
        "id: source_ch5",
        "title: 教材第五章",
        "type: source",
        "domain: math",
        "tags: [教材]",
        "links: []",
        "source_refs: [textbook]",
        "owner: test",
        "---",
        "",
        "本章重点在于数列求和与函数联动。"
      ].join("\n")
    );
  });

  afterAll(async () => {
    delete process.env.EDUNEXUS_VAULT_DIR;
    await cleanupSandbox(sandbox.rootDir);
  });

  it("supports search, doc detail, tags and backlink graph", async () => {
    const searchRes = await searchKb(
      new Request("http://localhost/api/kb/search?q=数列")
    );
    expect(searchRes.status).toBe(200);
    const searchJson = (await searchRes.json()) as {
      data: { candidates: Array<{ docId: string }> };
    };
    expect(searchJson.data.candidates.length).toBeGreaterThan(0);
    expect(
      searchJson.data.candidates.some((item) => item.docId === "note_seq")
    ).toBe(true);

    const docRes = await getDoc(new Request("http://localhost"), {
      params: { id: "source_ch5" }
    });
    expect(docRes.status).toBe(200);
    const docJson = (await docRes.json()) as {
      data: { id: string; backlinks: string[] };
    };
    expect(docJson.data.id).toBe("source_ch5");
    expect(docJson.data.backlinks).toContain("note_seq");

    const tagsRes = await getTags();
    expect(tagsRes.status).toBe(200);
    const tagsJson = (await tagsRes.json()) as {
      data: { tags: Array<{ tag: string; count: number }> };
    };
    expect(tagsJson.data.tags.some((item) => item.tag === "数列")).toBe(true);

    const graphRes = await getBacklinkGraph(
      new Request("http://localhost/api/kb/backlinks/graph?focusDocId=source_ch5")
    );
    expect(graphRes.status).toBe(200);
    const graphJson = (await graphRes.json()) as {
      data: { edges: Array<{ source: string; target: string }> };
    };
    expect(
      graphJson.data.edges.some(
        (edge) => edge.source === "note_seq" && edge.target === "source_ch5"
      )
    ).toBe(true);
  });

  it("can rebuild index summary", async () => {
    const rebuildRes = await rebuildIndex();
    expect(rebuildRes.status).toBe(200);
    const rebuildJson = (await rebuildRes.json()) as {
      data: { docCount: number; byType: Record<string, number> };
    };
    expect(rebuildJson.data.docCount).toBeGreaterThanOrEqual(2);
    expect(rebuildJson.data.byType.note).toBeGreaterThanOrEqual(1);
  });
});
