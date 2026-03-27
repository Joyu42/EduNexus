/**
 * Workspace Agent KB Autosave — Adapter
 * Turns a saved assistant reply into a KBDocument in the current vault.
 */

import { getKBStorage } from "./kb-storage";
import { extractKeywords } from "@/lib/ai/document-analyzer";

export type SavedReply = {
  userQuestion: string;
  assistantAnswer: string;
  sessionId: string;
  timestamp: string; // ISO date string
  teacherName?: string;
};

export type SaveResult =
  | { ok: true; documentId: string }
  | { ok: false; error: string };

/**
 * Builds the document content with a minimal source metadata block.
 */
function buildContent(reply: SavedReply): string {
  const meta = [
    "---",
    `source: workspace-saved`,
    `sessionId: ${reply.sessionId}`,
    `timestamp: ${reply.timestamp}`,
    reply.teacherName ? `teacher: ${reply.teacherName}` : null,
    "mode: normal",
    `sourcePage: /workspace`,
    "---",
    "",
  ]
    .filter((line) => line !== null)
    .join("\n");

  return `${reply.assistantAnswer}\n\n${meta}`;
}

/**
 * Builds hybrid tags for a saved workspace reply.
 * Deterministic tags always include: workspace-saved, source:workspace, mode:normal
 * If teacherName is present, adds: teacher:{teacherName}
 * If AI extraction succeeds, appends up to 8 AI-suggested tags (deduplicated, max 12 total).
 * AI extraction is non-blocking — failure degrades gracefully to deterministic tags only.
 */
async function buildWorkspaceSaveTags(reply: SavedReply): Promise<string[]> {
  // Deterministic base tags
  const baseTags: string[] = ["workspace-saved", "source:workspace", "mode:normal"];
  if (reply.teacherName) {
    baseTags.push(`teacher:${reply.teacherName}`);
  }

  // Attempt AI topic extraction with 5s timeout
  try {
    const aiTags = await Promise.race([
      extractKeywords(reply.assistantAnswer, reply.userQuestion),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("AI tag extraction timed out")), 5000)
      ),
    ]).then((result) => result.suggestedTags ?? []);

    // Merge and dedupe: AI tags appended after base tags, max 12 total, max 8 AI
    const seen = new Set(baseTags);
    const merged: string[] = [...baseTags];
    let aiAdded = 0;
    for (const tag of aiTags) {
      const trimmed = tag.trim();
      if (!trimmed || seen.has(trimmed)) continue;
      if (merged.length >= 12) break;
      if (aiAdded >= 8) break;
      merged.push(trimmed);
      seen.add(trimmed);
      aiAdded++;
    }
    return merged;
  } catch {
    // AI extraction failed — degrade gracefully to deterministic tags only
    return baseTags;
  }
}

/** Module-level promise cache to prevent concurrent vault creation. */
let pendingWorkspaceVaultPromise: Promise<string> | null = null;

/**
 * Ensures a workspace vault exists and is set as current.
 * Creates one with name="工作区保存" path="workspace://saved-replies" if missing.
 * Safe for concurrent calls: returns the same pending promise if vault creation is already in-flight.
 */
async function ensureWorkspaceVault(): Promise<string> {
  const storage = getKBStorage();
  const existing = storage.getCurrentVaultId();
  if (existing) return existing;

  if (pendingWorkspaceVaultPromise) return pendingWorkspaceVaultPromise;

  pendingWorkspaceVaultPromise = (async () => {
    const vault = await storage.createVault("工作区保存", "workspace://saved-replies");
    storage.setCurrentVault(vault.id);
    return vault.id;
  })();

  try {
    return await pendingWorkspaceVaultPromise;
  } finally {
    pendingWorkspaceVaultPromise = null;
  }
}

/**
 * Creates a KBDocument from a saved assistant reply in the current vault.
 * Returns an explicit success/error payload — no silent failures.
 */
export async function saveReplyAsKBDocument(reply: SavedReply): Promise<SaveResult> {
  const storage = getKBStorage();

  let vaultId: string;
  try {
    vaultId = await ensureWorkspaceVault();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `无法创建知识库: ${message}` };
  }

  try {
    const tags = await buildWorkspaceSaveTags(reply);
    const doc = await storage.createDocument(
      vaultId,
      reply.userQuestion, // title = verbatim user question
      buildContent(reply),
      tags
    );

    return { ok: true, documentId: doc.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Failed to create KB document: ${message}` };
  }
}
