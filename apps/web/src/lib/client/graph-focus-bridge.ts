export const GRAPH_FOCUS_NODE_STORAGE_KEY = "edunexus_graph_focus_node";

export function writeGraphFocusNodeToStorage(
  nodeId: string,
  writeItem: (key: string, value: string) => void
) {
  writeItem(GRAPH_FOCUS_NODE_STORAGE_KEY, nodeId);
}

export function readGraphFocusNodeFromStorage(
  readItem: (key: string) => string | null
) {
  const raw = readItem(GRAPH_FOCUS_NODE_STORAGE_KEY);
  if (!raw || typeof raw !== "string") {
    return "";
  }
  return raw.trim();
}

export function clearGraphFocusNodeFromStorage(
  removeItem: (key: string) => void
) {
  removeItem(GRAPH_FOCUS_NODE_STORAGE_KEY);
}
