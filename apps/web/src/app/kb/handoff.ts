type HandoffQueryInput = {
  doc?: string | null;
  node?: string | null;
};

type NormalizedHandoff = {
  requestedDocumentId: string | null;
  source: "doc" | "node" | null;
};

function normalizeIdentity(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") {
    return null;
  }

  const normalized = raw.trim();
  return normalized.length > 0 ? normalized : null;
}

export function mapLegacyNodeIdToDocumentId(nodeId: string | null | undefined): string | null {
  const normalizedNodeId = normalizeIdentity(nodeId);
  if (!normalizedNodeId) {
    return null;
  }

  if (normalizedNodeId.startsWith("kg_")) {
    const derived = normalizedNodeId.slice(3).trim();
    return derived.length > 0 ? derived : null;
  }

  return normalizedNodeId;
}

export function normalizeGraphToKbHandoff(input: HandoffQueryInput): NormalizedHandoff {
  const directDocumentId = normalizeIdentity(input.doc);
  if (directDocumentId) {
    return {
      requestedDocumentId: directDocumentId,
      source: "doc",
    };
  }

  const translatedDocumentId = mapLegacyNodeIdToDocumentId(input.node);
  if (translatedDocumentId) {
    return {
      requestedDocumentId: translatedDocumentId,
      source: "node",
    };
  }

  return {
    requestedDocumentId: null,
    source: null,
  };
}

export function resolveRequestedKbDocument<T extends { id: string }>(
  documents: T[],
  requestedDocumentId: string | null
): T | null {
  if (!requestedDocumentId) {
    return null;
  }

  return documents.find((doc) => doc.id === requestedDocumentId) ?? null;
}
