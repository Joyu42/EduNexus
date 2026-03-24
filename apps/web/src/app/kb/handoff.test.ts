import { describe, expect, it } from "vitest";

import {
  normalizeGraphToKbHandoff,
  resolveRequestedKbDocument,
} from "./handoff";

describe("normalizeGraphToKbHandoff", () => {
  it("prioritizes the document-centric doc param", () => {
    expect(normalizeGraphToKbHandoff({ doc: "doc-1", node: "node-1" })).toEqual({
      requestedDocumentId: "doc-1",
      source: "doc",
    });
  });

  it("translates legacy node param to canonical document identity", () => {
    expect(normalizeGraphToKbHandoff({ node: "kg_doc-2" })).toEqual({
      requestedDocumentId: "doc-2",
      source: "node",
    });
  });
});

describe("resolveRequestedKbDocument", () => {
  const docs = [
    { id: "doc-1", title: "Doc 1" },
    { id: "doc-2", title: "Doc 2" },
  ];

  it("resolves an existing requested document", () => {
    expect(resolveRequestedKbDocument(docs, "doc-2")?.id).toBe("doc-2");
  });

  it("returns null for missing requested document", () => {
    expect(resolveRequestedKbDocument(docs, "doc-missing")).toBeNull();
  });
});
