import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";

type Frontmatter = {
  id?: string;
  title?: string;
  type?: string;
  domain?: string;
  tags?: string[];
  links?: string[];
  source_refs?: string[];
  difficulty?: number;
  owner?: string;
  updated_at?: string;
};

type VaultDoc = {
  id: string;
  title: string;
  type: string;
  domain: string;
  tags: string[];
  links: string[];
  sourceRefs: string[];
  owner: string;
  path: string;
  content: string;
  updatedAt?: string;
};

type SearchCandidate = {
  docId: string;
  score: number;
  snippet: string;
  reason: string[];
};

type IndexSummary = {
  generatedAt: string;
  docCount: number;
  byType: Record<string, number>;
  byDomain: Record<string, number>;
};

const SEARCH_DIRS = ["notes", "sources", "playbooks", "skills", "daily"];

function normalizeArrayValue(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed) {
    return [];
  }
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return trimmed
      .slice(1, -1)
      .split(",")
      .map((item) => item.trim().replace(/^['"]|['"]$/g, ""))
      .filter(Boolean);
  }
  return [trimmed.replace(/^['"]|['"]$/g, "")];
}

function parseFrontmatter(markdown: string): { frontmatter: Frontmatter; content: string } {
  if (!markdown.startsWith("---")) {
    return { frontmatter: {}, content: markdown };
  }

  const endIndex = markdown.indexOf("\n---", 3);
  if (endIndex === -1) {
    return { frontmatter: {}, content: markdown };
  }

  const rawBlock = markdown.slice(3, endIndex).trim();
  const content = markdown.slice(endIndex + 4).trim();
  const frontmatter: Frontmatter = {};

  for (const line of rawBlock.split("\n")) {
    const idx = line.indexOf(":");
    if (idx <= 0) continue;

    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();

    if (key === "tags" || key === "links" || key === "source_refs") {
      frontmatter[key] = normalizeArrayValue(value);
      continue;
    }
    if (key === "difficulty") {
      const num = Number(value);
      frontmatter.difficulty = Number.isFinite(num) ? num : undefined;
      continue;
    }
    (frontmatter as Record<string, unknown>)[key] = value.replace(/^['"]|['"]$/g, "");
  }

  return { frontmatter, content };
}

function createSnippet(content: string, query: string) {
  const normalized = content.replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  const pos = normalized.toLowerCase().indexOf(query.toLowerCase());
  if (pos < 0) return normalized.slice(0, 120);
  const start = Math.max(0, pos - 30);
  const end = Math.min(normalized.length, pos + 90);
  return normalized.slice(start, end);
}

function computeScore(doc: VaultDoc, query: string): { score: number; reason: string[] } {
  const lower = query.toLowerCase();
  let score = 0;
  const reason: string[] = [];

  if (doc.title.toLowerCase().includes(lower)) {
    score += 3;
    reason.push("title_match");
  }

  if (doc.tags.some((tag) => tag.toLowerCase().includes(lower))) {
    score += 2;
    reason.push("tag_match");
  }

  if (doc.content.toLowerCase().includes(lower)) {
    score += 1.5;
    reason.push("content_match");
  }

  if (doc.links.some((link) => link.toLowerCase().includes(lower))) {
    score += 1;
    reason.push("backlink_hint");
  }

  return { score, reason };
}

function getRootCandidates() {
  return [
    process.cwd(),
    path.resolve(process.cwd(), ".."),
    path.resolve(process.cwd(), "../.."),
    path.resolve(process.cwd(), "../../..")
  ];
}

export function resolveVaultDir() {
  if (process.env.EDUNEXUS_VAULT_DIR) {
    return process.env.EDUNEXUS_VAULT_DIR;
  }

  for (const base of getRootCandidates()) {
    const candidate = path.join(base, "vault");
    try {
      const stat = fsSync.statSync(candidate);
      if (stat.isDirectory()) {
        return candidate;
      }
    } catch {
      continue;
    }
  }
  return path.join(process.cwd(), "vault");
}

async function collectDocs(): Promise<VaultDoc[]> {
  const vaultDir = resolveVaultDir();
  const docs: VaultDoc[] = [];

  for (const sub of SEARCH_DIRS) {
    const target = path.join(vaultDir, sub);
    let files: string[] = [];
    try {
      files = (await fs.readdir(target)).filter((name) => name.endsWith(".md"));
    } catch {
      continue;
    }

    for (const fileName of files) {
      const absolutePath = path.join(target, fileName);
      const raw = await fs.readFile(absolutePath, "utf8");
      const { frontmatter, content } = parseFrontmatter(raw);
      const fallbackTitle = fileName.replace(/\.md$/i, "");
      const id = frontmatter.id ?? fallbackTitle;
      docs.push({
        id,
        title: frontmatter.title ?? fallbackTitle,
        type: frontmatter.type ?? sub,
        domain: frontmatter.domain ?? "general",
        tags: frontmatter.tags ?? [],
        links: frontmatter.links ?? [],
        sourceRefs: frontmatter.source_refs ?? [],
        owner: frontmatter.owner ?? "system",
        path: absolutePath,
        content,
        updatedAt: frontmatter.updated_at
      });
    }
  }

  return docs;
}

function createNoteId() {
  return `note_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function createFrontmatterBlock(input: {
  id: string;
  title: string;
  tags: string[];
  links: string[];
  sourceRefs: string[];
  owner: string;
}) {
  const now = new Date().toISOString().slice(0, 10);
  return [
    "---",
    `id: ${input.id}`,
    `title: ${input.title}`,
    "type: note",
    "domain: general",
    `tags: [${input.tags.join(", ")}]`,
    `links: [${input.links.join(", ")}]`,
    `source_refs: [${input.sourceRefs.join(", ")}]`,
    "difficulty: 1",
    `updated_at: ${now}`,
    `owner: ${input.owner}`,
    "---",
    ""
  ].join("\n");
}

export async function searchVault(
  query: string,
  filters?: { type?: string; domain?: string; tag?: string }
) {
  const docs = await collectDocs();
  const filteredDocs = docs.filter((doc) => {
    if (filters?.type && doc.type !== filters.type) return false;
    if (filters?.domain && doc.domain !== filters.domain) return false;
    if (filters?.tag && !doc.tags.includes(filters.tag)) return false;
    return true;
  });

  const candidates: SearchCandidate[] = filteredDocs
    .map((doc) => {
      const scored = computeScore(doc, query);
      return {
        doc,
        score: scored.score,
        reason: scored.reason
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map((item) => ({
      docId: item.doc.id,
      score: Number(item.score.toFixed(2)),
      snippet: createSnippet(item.doc.content, query),
      reason: item.reason
    }));

  return {
    query,
    filters: filters ?? {},
    candidates
  };
}

export async function saveNoteFromSession(input: {
  sessionId: string;
  title: string;
  content: string;
  tags?: string[];
  links?: string[];
  owner?: string;
}) {
  const vaultDir = resolveVaultDir();
  const notesDir = path.join(vaultDir, "notes");
  await fs.mkdir(notesDir, { recursive: true });

  const noteId = createNoteId();
  const fileName = `${noteId}.md`;
  const filePath = path.join(notesDir, fileName);

  const frontmatter = createFrontmatterBlock({
    id: noteId,
    title: input.title,
    tags: input.tags ?? [],
    links: input.links ?? [],
    sourceRefs: [`session:${input.sessionId}`],
    owner: input.owner ?? "workspace"
  });

  const markdown = `${frontmatter}
## 背景

来源会话：${input.sessionId}

## 推理过程

${input.content}

## 证据

- session:${input.sessionId}

## 结论

（待补充）

## 下一步

- [ ] 继续完善本次学习结论
`;

  await fs.writeFile(filePath, markdown, "utf8");

  return {
    noteId,
    path: filePath
  };
}

export async function buildGraphFromVault() {
  const docs = await collectDocs();
  const nodes = docs.map((doc) => ({
    id: doc.id,
    label: doc.title,
    domain: doc.domain,
    mastery: 0.45,
    risk: 0.55
  }));

  const edges: Array<{ source: string; target: string; weight: number }> = [];
  for (const doc of docs) {
    for (const link of doc.links) {
      edges.push({
        source: doc.id,
        target: link,
        weight: 1
      });
    }
  }

  return {
    nodes,
    edges
  };
}

export async function getVaultDocById(docId: string) {
  const docs = await collectDocs();
  const target = docs.find((doc) => doc.id === docId) ?? null;
  if (!target) return null;
  const backlinks = docs.filter((doc) => doc.links.includes(docId)).map((doc) => doc.id);
  return {
    ...target,
    backlinks
  };
}

export async function rebuildVaultIndex() {
  const docs = await collectDocs();
  const vaultDir = resolveVaultDir();
  const indexDir = path.join(vaultDir, "index");
  await fs.mkdir(indexDir, { recursive: true });

  const byType: Record<string, number> = {};
  const byDomain: Record<string, number> = {};
  const tags: Record<string, string[]> = {};
  const backlinks: Record<string, string[]> = {};

  for (const doc of docs) {
    byType[doc.type] = (byType[doc.type] ?? 0) + 1;
    byDomain[doc.domain] = (byDomain[doc.domain] ?? 0) + 1;

    for (const tag of doc.tags) {
      if (!tags[tag]) tags[tag] = [];
      tags[tag].push(doc.id);
    }

    for (const link of doc.links) {
      if (!backlinks[link]) backlinks[link] = [];
      backlinks[link].push(doc.id);
    }
  }

  const summary: IndexSummary = {
    generatedAt: new Date().toISOString(),
    docCount: docs.length,
    byType,
    byDomain
  };

  await Promise.all([
    fs.writeFile(path.join(indexDir, "summary.json"), JSON.stringify(summary, null, 2), "utf8"),
    fs.writeFile(path.join(indexDir, "tags.json"), JSON.stringify(tags, null, 2), "utf8"),
    fs.writeFile(path.join(indexDir, "backlinks.json"), JSON.stringify(backlinks, null, 2), "utf8")
  ]);

  return summary;
}

export async function getVaultTagStats() {
  const docs = await collectDocs();
  const counter = new Map<string, number>();
  for (const doc of docs) {
    for (const tag of doc.tags) {
      counter.set(tag, (counter.get(tag) ?? 0) + 1);
    }
  }

  return Array.from(counter.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

export async function getBacklinkGraph(input?: { focusDocId?: string; limit?: number }) {
  const docs = await collectDocs();
  const byId = new Map(docs.map((doc) => [doc.id, doc]));
  const focus = input?.focusDocId?.trim();
  const limit = Math.max(10, Math.min(input?.limit ?? 120, 300));

  let candidateDocs = docs;
  if (focus && byId.has(focus)) {
    const neighbors = new Set<string>([focus]);
    const target = byId.get(focus)!;
    for (const link of target.links) neighbors.add(link);
    for (const doc of docs) {
      if (doc.links.includes(focus)) neighbors.add(doc.id);
    }
    candidateDocs = docs.filter((doc) => neighbors.has(doc.id));
  }

  const nodeSlice = candidateDocs.slice(0, limit);
  const nodeSet = new Set(nodeSlice.map((doc) => doc.id));

  const nodes = nodeSlice.map((doc) => ({
    id: doc.id,
    label: doc.title,
    type: doc.type,
    domain: doc.domain
  }));

  const edges: Array<{ source: string; target: string; weight: number }> = [];
  for (const doc of nodeSlice) {
    for (const link of doc.links) {
      if (nodeSet.has(link)) {
        edges.push({
          source: doc.id,
          target: link,
          weight: 1
        });
      }
    }
  }

  return {
    focusDocId: focus || null,
    nodes,
    edges
  };
}
