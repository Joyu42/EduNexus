/**
 * Workspace Agent KB Autosave — Adapter
 * Turns a saved assistant reply into a KBDocument in the current vault.
 */

import { createDocumentOnServer } from "./kb-storage";
import { extractTags } from "@/lib/kb/content-extractor";

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

// ---------------------------------------------------------------------------
// Private helpers for document content formatting
// ---------------------------------------------------------------------------

/**
 * Escapes special HTML characters in a text node.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Splits raw assistant answer into block lines and renders them as HTML.
 * Handles multi-line fenced code blocks, headings, lists, and paragraphs.
 */
function renderBlocksToHtml(raw: string): string {
  const lines = raw.split("\n");
  const blocks: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trimEnd();

    // Fenced code block: consume from opening ``` to closing ```
    if (/^```/.test(line)) {
      const lang = line.replace(/^```/, "").trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !/^```$/.test(lines[i].trimEnd())) {
        codeLines.push(lines[i]);
        i++;
      }
      blocks.push(
        `<pre><code data-language="${escapeHtml(lang)}">${escapeHtml(codeLines.join("\n"))}</code></pre>`
      );
      i++; // skip closing ```
      continue;
    }

    // Heading lines (must be at start of line with no indentation)
    if (/^#{1,3}\s/.test(line) && line.startsWith("#")) {
      const level = line.match(/^(#{1,3})\s/)?.[1].length ?? 2;
      const tag = `h${level}`;
      const inner = line.replace(/^#{1,3}\s/, "");
      blocks.push(`<${tag}>${escapeHtml(inner)}</${tag}>`);
      i++;
      continue;
    }

    // Collect list items first before emitting a <ul> or <ol>
    if (/^[-*]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s/.test(lines[i].trimEnd())) {
        items.push(`<li>${escapeHtml(lines[i].trimEnd().replace(/^[-*]\s/, ""))}</li>`);
        i++;
      }
      blocks.push(`<ul>${items.join("")}</ul>`);
      continue;
    }

    // Ordered list: lines that start with digit. space
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trimEnd())) {
        items.push(`<li>${escapeHtml(lines[i].trimEnd().replace(/^\d+\.\s/, ""))}</li>`);
        i++;
      }
      blocks.push(`<ol>${items.join("")}</ol>`);
      continue;
    }

    // Paragraph: collect consecutive non-empty lines until a blank
    if (line.length > 0) {
      const paraLines: string[] = [];
      while (i < lines.length && lines[i].trimEnd().length > 0) {
        paraLines.push(lines[i]);
        i++;
      }
      if (paraLines.length > 0) {
        blocks.push(`<p>${escapeHtml(paraLines.join(" "))}</p>`);
      }
      continue;
    }

    // Empty line — skip
    i++;
  }

  return blocks.join("\n");
}

/**
 * Builds the appendix section with de-emphasized source metadata.
 */
function buildMetadataAppendix(reply: SavedReply): string {
  const lines: string[] = [
    `<p><strong>来源信息</strong></p>`,
    `<p>来源: workspace-saved</p>`,
    `<p>会话: ${escapeHtml(reply.sessionId)}</p>`,
    `<p>时间: ${escapeHtml(reply.timestamp)}</p>`,
  ];

  if (reply.teacherName) {
    lines.push(`<p>教师: ${escapeHtml(reply.teacherName)}</p>`);
  }

  lines.push(
    `<p>模式: normal</p>`,
    `<p>页面: /workspace</p>`
  );

  return [
    `<hr />`,
    `<section data-workspace-meta="true">`,
    lines.join("\n"),
    `</section>`,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Public adapter
// ---------------------------------------------------------------------------

/**
 * Builds the document content with structured HTML body and a de-emphasized
 * metadata appendix at the end.  The body uses explicit HTML tags so Tiptap
 * renders stable paragraphs instead of collapsing single newlines.
 */
function buildContent(reply: SavedReply): string {
  const body = renderBlocksToHtml(reply.assistantAnswer.trim());
  const appendix = buildMetadataAppendix(reply);
  return `${body}\n${appendix}`;
}

/**
 * Builds hybrid tags for a saved workspace reply.
 * Deterministic tags always include: workspace-saved, source:workspace, mode:normal
 * If teacherName is present, adds: teacher:{teacherName}
 * Rule-based extraction appends up to 8 hashtags from the assistant answer (deduplicated, max 12 total).
 */
function buildWorkspaceSaveTags(reply: SavedReply): string[] {
  const baseTags: string[] = ["workspace-saved", "source:workspace", "mode:normal"];
  if (reply.teacherName) {
    baseTags.push(`teacher:${reply.teacherName}`);
  }

  // Rule-based hashtag extraction from assistant answer
  const aiTags = extractTags(reply.assistantAnswer);

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
}

/**
 * Creates a KBDocument from a saved assistant reply via server API.
 * Returns an explicit success/error payload — no silent failures.
 */
export async function saveReplyAsKBDocument(reply: SavedReply): Promise<SaveResult> {
  try {
    const tags = buildWorkspaceSaveTags(reply);
    const doc = await createDocumentOnServer(
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
