import { describe, expect, it } from "vitest";

import {
  mapLegacyNodeIdToDocumentId,
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

  it("trims direct doc params before resolving", () => {
    expect(normalizeGraphToKbHandoff({ doc: "  doc-1  " })).toEqual({
      requestedDocumentId: "doc-1",
      source: "doc",
    });
  });

  it("falls back to translated legacy node when doc param is blank", () => {
    expect(normalizeGraphToKbHandoff({ doc: "   ", node: "kg_doc-2" })).toEqual({
      requestedDocumentId: "doc-2",
      source: "node",
    });
  });

  it("returns null handoff when both doc and node params are empty", () => {
    expect(normalizeGraphToKbHandoff({ doc: "", node: "   " })).toEqual({
      requestedDocumentId: null,
      source: null,
    });
  });
});

describe("mapLegacyNodeIdToDocumentId", () => {
  it("returns null for empty legacy prefixes", () => {
    expect(mapLegacyNodeIdToDocumentId("kg_   ")).toBeNull();
  });

  it("passes through non-prefixed node ids for backward compatibility", () => {
    expect(mapLegacyNodeIdToDocumentId("doc-raw")).toBe("doc-raw");
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

  it("matches by exact id and does not resolve partial aliases", () => {
    const scopedDocs = [
      { id: "doc-1", title: "Doc 1" },
      { id: "doc-10", title: "Doc 10" },
    ];

    expect(resolveRequestedKbDocument(scopedDocs, "doc-1")?.id).toBe("doc-1");
    expect(resolveRequestedKbDocument(scopedDocs, "doc")).toBeNull();
  });
});
