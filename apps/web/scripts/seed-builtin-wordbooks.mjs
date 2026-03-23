// apps/web/scripts/seed-builtin-wordbooks.mjs
// README: Run with DATABASE_URL set. Example: DATABASE_URL="postgresql://..." node ./scripts/seed-builtin-wordbooks.mjs --book medical

import { PrismaClient } from '@prisma/client';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const BOOKS = {
  medical: {
    id: 'medical',
    name: '医学词汇 500',
    description: '来自 vocabulary_source/medical_words_500.csv',
  },
  computer: {
    id: 'computer',
    name: '计算机词汇 500',
    description: '来自 vocabulary_source/computer_words_500.csv',
  },
  economics: {
    id: 'economics',
    name: '经济学词汇 500',
    description: '来自 vocabulary_source/economics_words_500.csv',
  },
  electrical: {
    id: 'electrical',
    name: '电气工程词汇 500',
    description: '来自 vocabulary_source/electrical_words_500.csv',
  },
};

function findVocabularySource(startDir) {
  let dir = startDir;
  for (let i = 0; i < 10; i++) {
    const candidate = resolve(dir, 'vocabulary_source');
    try {
      if (existsSync(candidate) && statSync(candidate).isDirectory()) return candidate;
    } catch {
      // ignore
    }
    const parent = resolve(dir, '..');
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function parseSimpleCsv(content) {
  const lines = content.split(/\r\n|\n|\r/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',');
    if (parts.length < 2) continue;

    const word = (parts[0] ?? '').trim();
    if (!word) continue;

    let definition = '';
    let phonetic = null;
    if (parts.length === 2) {
      definition = (parts[1] ?? '').trim();
    } else if (parts.length === 3) {
      definition = (parts[1] ?? '').trim();
      phonetic = (parts[2] ?? '').trim() || null;
    } else {
      phonetic = (parts[parts.length - 1] ?? '').trim() || null;
      definition = parts.slice(1, parts.length - 1).join(',').trim();
    }
    if (!definition) continue;

    const normalizedWord = word.replace(/_(\d+)$/, '');
    rows.push({
      word: normalizedWord,
      definition,
      phonetic,
      sortOrder: i - 1,
    });
  }

  return rows;
}

function dedupeRows(rows) {
  const seen = new Map();
  for (const row of rows) {
    const key = row.word.toLowerCase().trim();
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, row);
      continue;
    }
    const existingScore = (existing.phonetic ? 1 : 0) * 1000 + existing.definition.length;
    const newScore = (row.phonetic ? 1 : 0) * 1000 + row.definition.length;
    if (newScore > existingScore) seen.set(key, row);
  }
  return Array.from(seen.values());
}

function sha1hex(input) {
  return createHash('sha1').update(input).digest('hex');
}

function makeEntryId(bookId, word, definition) {
  const normWord = word.toLowerCase().trim();
  const normDef = definition.toLowerCase().trim();
  return `${bookId}_${sha1hex(`${normWord}|${normDef}`).slice(0, 12)}`;
}

async function seedBook(prisma, vocabDir, bookKey, force) {
  const bookDef = BOOKS[bookKey];
  if (!bookDef) throw new Error(`Unknown book: ${bookKey}`);

  const existing = await prisma.builtinWordBook.findUnique({ where: { id: bookDef.id } });
  if (existing && !force) {
    console.log(`[seed] ${bookDef.name} already exists, skipping (use --force to reseed)`);
    return;
  }

  const csvPath = resolve(vocabDir, `${bookKey}_words_500.csv`);
  const content = readFileSync(csvPath, 'utf8');
  const rows = parseSimpleCsv(content);
  const deduped = dedupeRows(rows);

  const totalInput = rows.length;
  const droppedDupes = totalInput - deduped.length;
  const missingPhonetics = deduped.filter((r) => !r.phonetic).length;

  if (force && existing) {
    await prisma.$transaction([
      prisma.builtinWordEntry.deleteMany({ where: { bookId: bookDef.id } }),
      prisma.builtinWordBook.delete({ where: { id: bookDef.id } }),
    ]);
  }

  await prisma.builtinWordBook.create({
    data: {
      id: bookDef.id,
      name: bookDef.name,
      description: bookDef.description,
      category: 'general',
      sourceType: 'builtin',
      wordCount: deduped.length,
      metadata: {
        totalInput,
        droppedDupes,
        missingPhonetics,
        seededAt: new Date().toISOString(),
      },
      entries: {
        create: deduped.map((row) => ({
          id: makeEntryId(bookDef.id, row.word, row.definition),
          word: row.word,
          phonetic: row.phonetic,
          definition: row.definition,
          difficulty: null,
          example: null,
          exampleZh: null,
          sortOrder: row.sortOrder,
        })),
      },
    },
  });

  console.log(
    `[seed] ${bookDef.name}: ${deduped.length} entries (input=${totalInput}, dupes_dropped=${droppedDupes}, missing_phonetics=${missingPhonetics})`
  );
}

const args = process.argv.slice(2);
const flags = {};
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--book') flags.book = args[++i];
  else if (args[i] === '--force') flags.force = true;
}
const bookKey = flags.book ?? 'all';
const force = flags.force ?? false;

const scriptDir = dirname(fileURLToPath(import.meta.url));
const vocabDir = findVocabularySource(scriptDir);
if (!vocabDir) {
  console.error('[seed] vocabulary_source/ not found — run from repo root or apps/web');
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error('[seed] DATABASE_URL not set');
  process.exit(1);
}

const prisma = new PrismaClient();

try {
  if (bookKey === 'all') {
    for (const key of ['medical', 'computer', 'economics', 'electrical']) {
      await seedBook(prisma, vocabDir, key, force);
    }
  } else {
    await seedBook(prisma, vocabDir, bookKey, force);
  }
  process.exitCode = 0;
} catch (err) {
  console.error('[seed] failed:', err);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
