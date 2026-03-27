import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";

const QA_GROUP_ID = "1774468684818";

const SEEDED_ID_PREFIXES = {
  publicTopics: ["demo_topic_"],
  publicResources: ["demo_public_res_"],
  publicGroups: ["demo_group_", QA_GROUP_ID],
  publicPosts: ["demo_post_"],
  resourceBookmarks: ["demo_res_bookmark_"],
  resourceNotes: ["demo_res_note_"],
  resourceRatings: ["demo_res_rating_"],
  groupMembers: ["demo_group_member_"],
  groupPosts: ["demo_group_post_"],
  groupTasks: ["demo_group_task_"],
  communityComments: ["demo_post_comment_"],
  communityReactions: ["demo_post_reaction_"],
  sessions: ["ws_demo_"],
  syncedPaths: ["demo_path_"],
  plans: ["demo_goal_", "demo_graph_node::", "demo_graph_edge::"],
};

const SEEDED_NODE_PREFIX = "demo_node_";
const SEEDED_PATH_PREFIX = "demo_path_";
const SEEDED_POST_PREFIX = "demo_post_";
const SEEDED_RESOURCE_PREFIX = "demo_public_res_";
const SEEDED_GROUP_PREFIX = "demo_group_";

const SEEDED_KB_DOC_TITLES = [
  "HTML 基础",
  "CSS 基础",
  "JavaScript 基础",
  "Flexbox 布局",
  "Grid 布局",
  "React 入门",
  "响应式设计",
  "Web 无障碍",
];

function parseArgs(argv) {
  const args = {
    dryRun: false,
    apply: false,
    includeSeededArtifacts: false,
    groupId: undefined,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--") {
      continue;
    }
    if (token === "--dry-run") {
      args.dryRun = true;
      continue;
    }
    if (token === "--apply") {
      args.apply = true;
      continue;
    }
    if (token === "--include-seeded-artifacts") {
      args.includeSeededArtifacts = true;
      continue;
    }
    if (token === "--group-id") {
      const value = argv[i + 1];
      if (!value) {
        throw new Error("Missing value for --group-id");
      }
      args.groupId = String(value);
      i += 1;
      continue;
    }
    if (token === "--help" || token === "-h") {
      return { ...args, help: true };
    }
    throw new Error(`Unknown argument: ${token}`);
  }

  if (args.apply && args.dryRun) {
    throw new Error("Choose either --dry-run or --apply");
  }

  if (!args.apply && !args.dryRun) {
    args.dryRun = true;
  }

  return args;
}

function getRootCandidates() {
  return [
    process.cwd(),
    path.resolve(process.cwd(), ".."),
    path.resolve(process.cwd(), "../.."),
    path.resolve(process.cwd(), "../../.."),
  ];
}

function findProjectRootSync() {
  for (const base of getRootCandidates()) {
    const marker = path.join(base, "vault");
    try {
      const stat = fsSync.statSync(marker);
      if (stat.isDirectory()) {
        return base;
      }
    } catch {
      continue;
    }
  }
  return process.cwd();
}

function getDbFilePath() {
  if (process.env.EDUNEXUS_DATA_DIR) {
    return path.join(process.env.EDUNEXUS_DATA_DIR, "db.json");
  }
  const root = findProjectRootSync();
  return path.join(root, ".edunexus", "data", "db.json");
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item) => typeof item === "string");
}

function normalizeDb(raw) {
  const input = isRecord(raw) ? raw : {};
  const masteryByNode = isRecord(input.masteryByNode) ? input.masteryByNode : {};
  const normalizedMasteryByNode = Object.fromEntries(
    Object.entries(masteryByNode).filter(([, v]) => typeof v === "number")
  );
  return {
    sessions: normalizeArray(input.sessions),
    plans: normalizeArray(input.plans),
    syncedPaths: normalizeArray(input.syncedPaths),
    masteryByNode: normalizedMasteryByNode,
    needsReviewNodes: normalizeStringArray(input.needsReviewNodes),
    publicPosts: normalizeArray(input.publicPosts),
    publicTopics: normalizeArray(input.publicTopics),
    publicGroups: normalizeArray(input.publicGroups),
    publicResources: normalizeArray(input.publicResources),
    resourceBookmarks: normalizeArray(input.resourceBookmarks),
    resourceFolders: normalizeArray(input.resourceFolders),
    resourceNotes: normalizeArray(input.resourceNotes),
    resourceRatings: normalizeArray(input.resourceRatings),
    groupMembers: normalizeArray(input.groupMembers),
    groupPosts: normalizeArray(input.groupPosts),
    groupTasks: normalizeArray(input.groupTasks),
    groupSharedResources: normalizeArray(input.groupSharedResources),
    communityComments: normalizeArray(input.communityComments),
    communityReactions: normalizeArray(input.communityReactions),
    communityFollows: normalizeArray(input.communityFollows),
    communityTopics: normalizeArray(input.communityTopics),
    analyticsEvents: normalizeArray(input.analyticsEvents),
    analyticsSnapshots: normalizeArray(input.analyticsSnapshots),
    learningPacks: normalizeArray(input.learningPacks),
  };
}

async function loadDb(filePath) {
  await ensureDir(path.dirname(filePath));
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return normalizeDb(JSON.parse(raw));
  } catch {
    const empty = normalizeDb({});
    await fs.writeFile(filePath, JSON.stringify(empty, null, 2), "utf8");
    return empty;
  }
}

async function saveDb(filePath, db) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, JSON.stringify(db, null, 2), "utf8");
}

function startsWithAny(value, prefixes) {
  return prefixes.some((prefix) => value.startsWith(prefix));
}

function getId(value) {
  return isRecord(value) && typeof value.id === "string" ? value.id : "";
}

function filterByGroupId(items, groupId) {
  return items.filter((item) => !(isRecord(item) && item.groupId === groupId));
}

function computeArrayRemoval(items, predicate) {
  const removed = [];
  const kept = [];
  for (const item of items) {
    if (predicate(item)) {
      removed.push(item);
    } else {
      kept.push(item);
    }
  }
  return { kept, removed };
}

function buildAudit(beforeDb, afterDb) {
  const keys = Object.keys(beforeDb);
  const collections = {};
  for (const key of keys) {
    if (key === "masteryByNode") {
      collections[key] = {
        before: Object.keys(beforeDb.masteryByNode).length,
        after: Object.keys(afterDb.masteryByNode).length,
      };
      continue;
    }
    const beforeVal = beforeDb[key];
    const afterVal = afterDb[key];
    collections[key] = {
      before: Array.isArray(beforeVal) ? beforeVal.length : 0,
      after: Array.isArray(afterVal) ? afterVal.length : 0,
    };
  }
  return collections;
}

function applyJsonCleanup(inputDb, opts) {
  const groupId = typeof opts.groupId === "string" ? opts.groupId : undefined;
  const includeSeeded = opts.includeSeededArtifacts === true;

  const db = structuredClone(inputDb);

  if (groupId) {
    db.publicGroups = db.publicGroups.filter((g) => getId(g) !== groupId);
    db.groupMembers = filterByGroupId(db.groupMembers, groupId);
    db.groupPosts = filterByGroupId(db.groupPosts, groupId);
    db.groupTasks = filterByGroupId(db.groupTasks, groupId);
    db.groupSharedResources = filterByGroupId(db.groupSharedResources, groupId);
  }

  if (includeSeeded) {
    // Cascade deletion: collect removed group IDs BEFORE modifying any collections
    const removedGroupIds = new Set(
      db.publicGroups
        .filter((g) => startsWithAny(getId(g), SEEDED_ID_PREFIXES.publicGroups || []))
        .map((g) => getId(g))
    );

    for (const [collection, prefixes] of Object.entries(SEEDED_ID_PREFIXES)) {
      if (collection === "plans") {
        const { kept } = computeArrayRemoval(db.plans, (item) => startsWithAny(getId(item) || (isRecord(item) && typeof item.planId === "string" ? item.planId : ""), prefixes));
        db.plans = kept;
        continue;
      }
      if (collection === "syncedPaths") {
        const { kept } = computeArrayRemoval(db.syncedPaths, (item) => {
          const pathId = isRecord(item) && typeof item.pathId === "string" ? item.pathId : "";
          return startsWithAny(pathId, prefixes);
        });
        db.syncedPaths = kept;
        continue;
      }
      if (collection === "sessions") {
        const { kept } = computeArrayRemoval(db.sessions, (item) => startsWithAny(getId(item), prefixes));
        db.sessions = kept;
        continue;
      }

      if (!Array.isArray(db[collection])) {
        continue;
      }
      const { kept } = computeArrayRemoval(db[collection], (item) => startsWithAny(getId(item), prefixes));
      db[collection] = kept;
    }

    db.groupMembers = db.groupMembers.filter(
      (m) => {
        if (isRecord(m) && typeof m.groupId === "string" && removedGroupIds.has(m.groupId)) return false;
        if (startsWithAny(getId(m), SEEDED_ID_PREFIXES.groupMembers || [])) return false;
        return true;
      }
    );
    db.groupPosts = db.groupPosts.filter(
      (p) => {
        if (isRecord(p) && typeof p.groupId === "string" && removedGroupIds.has(p.groupId)) return false;
        if (startsWithAny(getId(p), SEEDED_ID_PREFIXES.groupPosts || [])) return false;
        return true;
      }
    );
    db.groupTasks = db.groupTasks.filter(
      (t) => {
        if (isRecord(t) && typeof t.groupId === "string" && removedGroupIds.has(t.groupId)) return false;
        if (startsWithAny(getId(t), SEEDED_ID_PREFIXES.groupTasks || [])) return false;
        return true;
      }
    );
    db.groupSharedResources = db.groupSharedResources.filter(
      (r) => !(isRecord(r) && typeof r.groupId === "string" && removedGroupIds.has(r.groupId))
    );

    db.resourceBookmarks = db.resourceBookmarks.filter(
      (b) => !(isRecord(b) && typeof b.resourceId === "string" && b.resourceId.startsWith(SEEDED_RESOURCE_PREFIX))
    );
    db.resourceNotes = db.resourceNotes.filter(
      (n) => !(isRecord(n) && typeof n.resourceId === "string" && n.resourceId.startsWith(SEEDED_RESOURCE_PREFIX))
    );
    db.resourceRatings = db.resourceRatings.filter(
      (r) => !(isRecord(r) && typeof r.resourceId === "string" && r.resourceId.startsWith(SEEDED_RESOURCE_PREFIX))
    );

    db.communityComments = db.communityComments.filter(
      (c) => !(isRecord(c) && typeof c.postId === "string" && c.postId.startsWith(SEEDED_POST_PREFIX))
    );
    db.communityReactions = db.communityReactions.filter(
      (r) => !(isRecord(r) && typeof r.targetId === "string" && r.targetId.startsWith(SEEDED_POST_PREFIX))
    );

    const masteryKeys = Object.keys(db.masteryByNode);
    for (const key of masteryKeys) {
      if (key.startsWith(SEEDED_NODE_PREFIX)) {
        delete db.masteryByNode[key];
      }
    }
    db.needsReviewNodes = db.needsReviewNodes.filter((id) => !id.startsWith(SEEDED_NODE_PREFIX));
  }

  return db;
}

async function auditPrismaDemoDocs({ apply }) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return { status: "skipped_missing_DATABASE_URL" };
  }

  let PrismaClient;
  try {
    ({ PrismaClient } = await import("@prisma/client"));
  } catch {
    return { status: "skipped_missing_prisma_client" };
  }

  const prisma = new PrismaClient();
  try {
    const demoUsers = await prisma.user.findMany({
      where: { isDemo: true },
      select: { id: true },
    });
    const demoUserIds = demoUsers.map((u) => u.id).filter(Boolean);
    if (demoUserIds.length === 0) {
      return { status: "ok", demoUsers: 0, documentsMatched: 0, documentsDeleted: 0 };
    }

    const matched = await prisma.document.findMany({
      where: {
        authorId: { in: demoUserIds },
        title: { in: SEEDED_KB_DOC_TITLES },
      },
      select: { id: true, authorId: true, title: true },
    });

    if (!apply) {
      return {
        status: "ok",
        demoUsers: demoUserIds.length,
        documentsMatched: matched.length,
        sample: matched.slice(0, 10),
        documentsDeleted: 0,
      };
    }

    const deleted = await prisma.document.deleteMany({
      where: {
        authorId: { in: demoUserIds },
        title: { in: SEEDED_KB_DOC_TITLES },
      },
    });

    return {
      status: "ok",
      demoUsers: demoUserIds.length,
      documentsMatched: matched.length,
      documentsDeleted: deleted.count,
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : String(error),
    };
  } finally {
    await prisma.$disconnect().catch(() => undefined);
  }
}

function printHelp() {
  const lines = [
    "cleanup-demo",
    "",
    "Usage:",
    "  pnpm --filter web cleanup:demo -- --dry-run [--group-id <id>] [--include-seeded-artifacts]",
    "  pnpm --filter web cleanup:demo -- --apply [--group-id <id>] [--include-seeded-artifacts]",
    "",
    "Defaults: --dry-run",
  ];
  process.stdout.write(lines.join("\n") + "\n");
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    return;
  }

  const dbFilePath = getDbFilePath();
  const beforeDb = await loadDb(dbFilePath);
  const effectiveGroupId = typeof args.groupId === "string" ? args.groupId : undefined;

  const afterDb = applyJsonCleanup(beforeDb, {
    groupId: effectiveGroupId,
    includeSeededArtifacts: args.includeSeededArtifacts,
  });

  const prismaAudit = args.includeSeededArtifacts
    ? await auditPrismaDemoDocs({ apply: args.apply })
    : { status: "skipped_not_requested" };

  const audit = buildAudit(beforeDb, afterDb);
  const mode = args.apply ? "apply" : "dry-run";

  const report = {
    ok: true,
    mode,
    dbFilePath,
    args: {
      groupId: effectiveGroupId,
      includeSeededArtifacts: args.includeSeededArtifacts,
    },
    audit,
    prisma: prismaAudit,
  };

  if (args.apply) {
    await saveDb(dbFilePath, afterDb);
  }

  process.stdout.write(JSON.stringify(report, null, 2) + "\n");
}

main().catch((error) => {
  process.stderr.write(`cleanup-demo failed: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
