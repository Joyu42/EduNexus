import { prisma } from "./prisma";

import type { Word, WordBook, WordBookCategory, WordDifficulty } from "@/lib/words/types";
import type { Prisma } from "@prisma/client";

export const CUSTOM_BOOK_ID_PREFIX = "custom_book_";
export const CUSTOM_WORD_ID_PREFIX = "custom_word_";

export const MAX_WORDS_PER_IMPORT = 800;
export const MAX_FILE_BYTES = 512 * 1024;

function isMissingTableError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2021"
  );
}

export type CustomBookImportFormat = "csv" | "json";

export class WordImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WordImportError";
  }
}

export type ParsedCustomWord = {
  sortOrder: number;
  word: string;
  phonetic?: string;
  definition: string;
  example?: string;
  exampleZh?: string;
  difficulty?: string;
  metadata?: Prisma.InputJsonValue;
};

export type ParsedCustomWordBook = {
  name: string;
  description?: string;
  words: ParsedCustomWord[];
  metadata?: Prisma.InputJsonValue;
};

type ParseOptions = {
  name?: string;
  description?: string;
};

export function validateFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes < 0) {
    throw new WordImportError("文件大小不合法。");
  }
  if (bytes > MAX_FILE_BYTES) {
    throw new WordImportError(`文件过大，最大允许 ${MAX_FILE_BYTES} 字节。`);
  }
}

export function toCustomBookId(id: string): string {
  return `${CUSTOM_BOOK_ID_PREFIX}${id}`;
}

export function parseCustomBookId(bookId: string): string {
  if (typeof bookId !== "string" || !bookId.startsWith(CUSTOM_BOOK_ID_PREFIX)) {
    throw new WordImportError("自定义词书 ID 不合法。");
  }
  const raw = bookId.slice(CUSTOM_BOOK_ID_PREFIX.length);
  if (!raw) {
    throw new WordImportError("自定义词书 ID 不合法。");
  }
  return raw;
}

function toCustomWordId(id: string): string {
  return `${CUSTOM_WORD_ID_PREFIX}${id}`;
}

function normalizeText(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
}

function normalizeKey(value: string): string {
  return value
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
}

function normalizeDifficulty(value?: string | null): WordDifficulty {
  const raw = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (raw === "easy" || raw === "medium" || raw === "hard") {
    return raw;
  }
  return "medium";
}

function normalizeCategory(value?: string | null): WordBookCategory {
  const raw = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (raw === "cet" || raw === "exam" || raw === "general" || raw === "custom") {
    return raw;
  }
  return "general";
}

function parseDelimitedRows(content: string): string[][] {
  const sampleLine = content.split(/\r\n|\n|\r/)[0] ?? "";
  const comma = (sampleLine.match(/,/g) ?? []).length;
  const tab = (sampleLine.match(/\t/g) ?? []).length;
  const semicolon = (sampleLine.match(/;/g) ?? []).length;
  const delimiter = tab > comma && tab > semicolon ? "\t" : semicolon > comma ? ";" : ",";

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  const flushField = () => {
    row.push(field);
    field = "";
  };

  const flushRow = () => {
    while (row.length > 0 && row[row.length - 1] === "") {
      row.pop();
    }
    const hasData = row.some((cell) => cell.trim().length > 0);
    if (hasData) {
      rows.push(row.map((cell) => cell.trim()));
    }
    row = [];
  };

  for (let i = 0; i < content.length; i += 1) {
    const ch = content[i];

    if (inQuotes) {
      if (ch === '"') {
        const next = content[i + 1];
        if (next === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }

    if (ch === delimiter) {
      flushField();
      continue;
    }

    if (ch === "\n" || ch === "\r") {
      flushField();
      flushRow();
      if (ch === "\r" && content[i + 1] === "\n") {
        i += 1;
      }
      continue;
    }

    field += ch;
  }

  flushField();
  flushRow();
  return rows;
}

function mapHeaderToField(header: string): keyof ParsedCustomWord | null {
  const key = normalizeKey(header);
  if (key === "word" || key === "term" || key === "单词") return "word";
  if (key === "definition" || key === "meaning" || key === "释义") return "definition";
  if (key === "phonetic" || key === "pronunciation" || key === "音标") return "phonetic";
  if (key === "example" || key === "sentence" || key === "例句") return "example";
  if (key === "examplezh" || key === "translation" || key === "例句中文" || key === "例句翻译") {
    return "exampleZh";
  }
  if (key === "difficulty" || key === "level" || key === "难度") return "difficulty";
  return null;
}

function ensureParsedWord(
  raw: Record<string, unknown>,
  sortOrder: number,
  metadata?: Prisma.InputJsonValue
): ParsedCustomWord {
  const word = normalizeText(raw.word);
  const definition = normalizeText(raw.definition);
  if (!word) {
    throw new WordImportError(`第 ${sortOrder + 1} 行缺少单词字段。`);
  }
  if (!definition) {
    throw new WordImportError(`第 ${sortOrder + 1} 行缺少释义字段。`);
  }

  const phonetic = normalizeText(raw.phonetic) || undefined;
  const example = normalizeText(raw.example) || undefined;
  const exampleZh = normalizeText(raw.exampleZh) || undefined;
  const difficulty = normalizeText(raw.difficulty) || undefined;

  return {
    sortOrder,
    word,
    definition,
    phonetic,
    example,
    exampleZh,
    difficulty,
    metadata,
  };
}

export function parseCsvWordBook(content: string, options: ParseOptions = {}): ParsedCustomWordBook {
  const rows = parseDelimitedRows(content);
  if (rows.length === 0) {
    throw new WordImportError("CSV 内容为空。");
  }

  const headers = rows[0];
  const mappedHeaders = headers.map((header) => mapHeaderToField(header));
  const hasKnownHeader = mappedHeaders.some(Boolean);

  const words: ParsedCustomWord[] = [];

  const dataRows = hasKnownHeader ? rows.slice(1) : rows;
  for (let i = 0; i < dataRows.length; i += 1) {
    const row = dataRows[i];
    const sortOrder = hasKnownHeader ? i : i;

    const record: Record<string, unknown> = {};
    const metadata: Record<string, unknown> = {};

    if (hasKnownHeader) {
      for (let col = 0; col < headers.length; col += 1) {
        const header = headers[col] ?? "";
        const field = mappedHeaders[col];
        const value = row[col];
        if (!value) {
          continue;
        }
        if (field) {
          record[field] = value;
        } else if (header.trim()) {
          metadata[header.trim()] = value;
        }
      }
    } else {
      record.word = row[0] ?? "";
      record.definition = row[1] ?? "";
      if (row.length > 2) {
        metadata.extra = row.slice(2);
      }
    }

    words.push(
      ensureParsedWord(
        record,
        sortOrder,
        Object.keys(metadata).length ? (metadata as Prisma.InputJsonValue) : undefined
      )
    );
  }

  const name = normalizeText(options.name) || "Custom Word Book";
  const description = normalizeText(options.description) || undefined;

  return {
    name,
    description,
    words,
  };
}

function toRecord(obj: unknown): Record<string, unknown> {
  if (!obj || typeof obj !== "object") {
    return {};
  }
  return obj as Record<string, unknown>;
}

function pickAlias(obj: Record<string, unknown>, aliases: string[]): unknown {
  for (const alias of aliases) {
    if (Object.prototype.hasOwnProperty.call(obj, alias)) {
      return obj[alias];
    }
  }
  return undefined;
}

export function parseJsonWordBook(content: string): ParsedCustomWordBook {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new WordImportError("JSON 解析失败。");
  }

  const root = toRecord(parsed);
  const name = normalizeText(root.name) || "Custom Word Book";
  const description = normalizeText(root.description) || undefined;
  const wordsRaw = root.words;
  if (!Array.isArray(wordsRaw)) {
    throw new WordImportError("JSON 必须包含 words 数组。");
  }

  const words: ParsedCustomWord[] = wordsRaw.map((item, index) => {
    const record = toRecord(item);

    const word = pickAlias(record, ["word", "term", "单词"]);
    const definition = pickAlias(record, ["definition", "meaning", "释义"]);
    const phonetic = pickAlias(record, ["phonetic", "pronunciation", "音标"]);
    const example = pickAlias(record, ["example", "sentence", "例句"]);
    const exampleZh = pickAlias(record, ["exampleZh", "examplezh", "translation", "例句中文", "例句翻译"]);
    const difficulty = pickAlias(record, ["difficulty", "level", "难度"]);

    const knownKeys = new Set([
      "word",
      "term",
      "单词",
      "definition",
      "meaning",
      "释义",
      "phonetic",
      "pronunciation",
      "音标",
      "example",
      "sentence",
      "例句",
      "exampleZh",
      "examplezh",
      "translation",
      "例句中文",
      "例句翻译",
      "difficulty",
      "level",
      "难度",
    ]);
    const metadata: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(record)) {
      if (!knownKeys.has(key)) {
        metadata[key] = value;
      }
    }

    const metadataValue = Object.keys(metadata).length
      ? (metadata as Prisma.InputJsonValue)
      : undefined;

    return ensureParsedWord(
      {
        word,
        definition,
        phonetic,
        example,
        exampleZh,
        difficulty,
      },
      index,
      metadataValue
    );
  });

  const metadata = root.metadata as Prisma.InputJsonValue | undefined;
  return {
    name,
    description,
    words,
    metadata,
  };
}

export function dedupeWords(words: ParsedCustomWord[]): ParsedCustomWord[] {
  const seen = new Set<string>();
  const output: ParsedCustomWord[] = [];

  for (const item of words) {
    const key = `${item.word.trim().toLowerCase()}|${item.definition.trim().toLowerCase().replace(/\s+/g, " ")}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    output.push(item);
  }

  return output;
}

export function buildParsedBookFromContent(
  content: string,
  format: CustomBookImportFormat,
  options: ParseOptions = {}
): ParsedCustomWordBook {
  const parsed = format === "json" ? parseJsonWordBook(content) : parseCsvWordBook(content, options);
  if (options.name || options.description) {
    const name = normalizeText(options.name) || parsed.name;
    const description = normalizeText(options.description) || parsed.description;
    parsed.name = name;
    parsed.description = description;
  }

  const deduped = dedupeWords(parsed.words);
  if (deduped.length === 0) {
    throw new WordImportError("未解析到任何单词。");
  }
  if (deduped.length > MAX_WORDS_PER_IMPORT) {
    throw new WordImportError(`单词数量超过上限：${MAX_WORDS_PER_IMPORT}。`);
  }

  return {
    ...parsed,
    words: deduped,
  };
}

function toWordBook(book: {
  id: string;
  name: string;
  description: string | null;
  wordCount: number;
  category: string;
}): WordBook {
  return {
    id: toCustomBookId(book.id),
    name: book.name,
    description: book.description ?? "",
    wordCount: book.wordCount,
    category: normalizeCategory(book.category),
  };
}

function toWord(entry: {
  id: string;
  word: string;
  phonetic: string | null;
  definition: string;
  example: string | null;
  exampleZh: string | null;
  difficulty: string | null;
  bookId: string;
}): Word {
  const externalBookId = toCustomBookId(entry.bookId);
  return {
    id: toCustomWordId(entry.id),
    word: entry.word,
    phonetic: entry.phonetic ?? "",
    definition: entry.definition,
    example: entry.example ?? "",
    exampleZh: entry.exampleZh ?? undefined,
    bookId: externalBookId,
    difficulty: normalizeDifficulty(entry.difficulty),
  };
}

function toRawCustomWordId(wordId: string): string {
  if (wordId.startsWith(CUSTOM_WORD_ID_PREFIX)) {
    return wordId.slice(CUSTOM_WORD_ID_PREFIX.length);
  }
  return wordId;
}

function getScheduleWordIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string");
}

async function removeWordIdsFromReviewSchedules(
  tx: Prisma.TransactionClient,
  userId: string,
  deletedEntryIds: string[]
): Promise<void> {
  if (deletedEntryIds.length === 0) {
    return;
  }

  const deletedRawWordIds = new Set(deletedEntryIds);
  const schedules = await tx.wordsReviewSchedule.findMany({
    where: { userId },
    select: {
      id: true,
      wordIds: true,
    },
  });

  for (const schedule of schedules) {
    const wordIds = getScheduleWordIds(schedule.wordIds);
    const filtered = wordIds.filter((wordId) => !deletedRawWordIds.has(toRawCustomWordId(wordId)));
    if (filtered.length === wordIds.length) {
      continue;
    }

    await tx.wordsReviewSchedule.update({
      where: { id: schedule.id },
      data: {
        wordIds: filtered,
      },
    });
  }
}

export async function createCustomWordBook(params: {
  userId: string;
  parsed: ParsedCustomWordBook;
  format: CustomBookImportFormat;
  originalFilename?: string;
}): Promise<WordBook> {
  const name = normalizeText(params.parsed.name) || "Custom Word Book";
  const description = normalizeText(params.parsed.description) || null;
  const words = params.parsed.words;

  const created = await prisma.customWordBook.create({
    data: {
      userId: params.userId,
      name,
      description,
      category: "custom",
      sourceType: "upload",
      originalFilename: params.originalFilename ?? null,
      format: params.format,
      wordCount: words.length,
      metadata: (params.parsed.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      entries: {
        createMany: {
          data: words.map((item) => ({
            sortOrder: item.sortOrder,
            word: item.word,
            phonetic: item.phonetic ?? null,
            definition: item.definition,
            example: item.example ?? null,
            exampleZh: item.exampleZh ?? null,
            difficulty: item.difficulty ?? null,
            metadata: (item.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
          })),
        },
      },
    },
    select: {
      id: true,
      name: true,
      description: true,
      wordCount: true,
      category: true,
    },
  });

  return toWordBook(created);
}

export async function listCustomWordBooks(userId: string): Promise<WordBook[]> {
  const books = await prisma.customWordBook
    .findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        description: true,
        wordCount: true,
        category: true,
      },
    })
    .catch((error) => {
      if (isMissingTableError(error)) {
        return [];
      }
      throw error;
    });
  return books.map(toWordBook);
}

export async function getCustomWordBook(userId: string, bookId: string): Promise<WordBook | null> {
  let rawId: string;
  try {
    rawId = parseCustomBookId(bookId);
  } catch {
    return null;
  }

  const book = await prisma.customWordBook.findFirst({
    where: {
      id: rawId,
      userId,
    },
    select: {
      id: true,
      name: true,
      description: true,
      wordCount: true,
      category: true,
    },
  });

  return book ? toWordBook(book) : null;
}

export async function updateCustomWordBook(
  userId: string,
  bookId: string,
  updates: { name?: string; description?: string }
): Promise<WordBook | null> {
  let rawId: string;
  try {
    rawId = parseCustomBookId(bookId);
  } catch {
    return null;
  }

  const data: Prisma.CustomWordBookUpdateManyMutationInput = {};
  if (typeof updates.name === "string") {
    data.name = normalizeText(updates.name);
  }
  if (typeof updates.description === "string") {
    data.description = normalizeText(updates.description) || null;
  }

  if (Object.keys(data).length > 0) {
    const result = await prisma.customWordBook.updateMany({
      where: {
        id: rawId,
        userId,
      },
      data,
    });
    if (result.count === 0) {
      return null;
    }
  }

  const updated = await prisma.customWordBook.findFirst({
    where: {
      id: rawId,
      userId,
    },
    select: {
      id: true,
      name: true,
      description: true,
      wordCount: true,
      category: true,
    },
  });

  return updated ? toWordBook(updated) : null;
}

export async function deleteCustomWordBook(userId: string, bookId: string): Promise<boolean> {
  let rawId: string;
  try {
    rawId = parseCustomBookId(bookId);
  } catch {
    return false;
  }

  return prisma.$transaction(async (tx) => {
    const book = await tx.customWordBook.findFirst({
      where: {
        id: rawId,
        userId,
      },
      select: {
        id: true,
        entries: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!book) {
      return false;
    }

    const deletedEntryIds = book.entries.map((entry) => entry.id);

    await tx.wordsLearningRecord.deleteMany({
      where: {
        userId,
        bookId: rawId,
      },
    });

    await removeWordIdsFromReviewSchedules(tx, userId, deletedEntryIds);

    await tx.customWordEntry.deleteMany({
      where: {
        bookId: rawId,
      },
    });

    await tx.customWordBook.delete({
      where: {
        id: rawId,
      },
    });

    return true;
  });
}

export async function replaceCustomWordBook(
  userId: string,
  bookId: string,
  parsed: ParsedCustomWordBook,
  format: CustomBookImportFormat,
  originalFilename?: string
): Promise<WordBook> {
  const rawId = parseCustomBookId(bookId);

  return prisma.$transaction(async (tx) => {
    const existingBook = await tx.customWordBook.findFirst({
      where: {
        id: rawId,
        userId,
      },
      select: {
        id: true,
      },
    });

    if (!existingBook) {
      throw new WordImportError("BOOK_NOT_FOUND");
    }

    const existingEntries = await tx.customWordEntry.findMany({
      where: {
        bookId: rawId,
      },
      select: {
        id: true,
      },
    });

    const deletedEntryIds = existingEntries.map((entry) => entry.id);

    await tx.wordsLearningRecord.deleteMany({
      where: {
        userId,
        bookId: rawId,
      },
    });

    await removeWordIdsFromReviewSchedules(tx, userId, deletedEntryIds);

    await tx.customWordEntry.deleteMany({
      where: {
        bookId: rawId,
      },
    });

    for (let index = 0; index < parsed.words.length; index += 1) {
      const item = parsed.words[index];
      await tx.customWordEntry.create({
        data: {
          bookId: rawId,
          sortOrder: index,
          word: item.word,
          phonetic: item.phonetic ?? null,
          definition: item.definition,
          example: item.example ?? null,
          exampleZh: item.exampleZh ?? null,
          difficulty: item.difficulty ?? null,
          metadata: (item.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
        },
      });
    }

    const updated = await tx.customWordBook.update({
      where: {
        id: rawId,
      },
      data: {
        wordCount: parsed.words.length,
        format,
        originalFilename: originalFilename ?? null,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        description: true,
        wordCount: true,
        category: true,
      },
    });

    return toWordBook(updated);
  });
}

export async function listCustomWords(
  userId: string,
  options: {
    bookId?: string;
  } = {}
): Promise<Word[]> {
  let rawBookId: string | undefined;
  if (options.bookId) {
    try {
      rawBookId = parseCustomBookId(options.bookId);
    } catch {
      return [];
    }
  }

  const entries = await prisma.customWordEntry
    .findMany({
      where: {
        ...(rawBookId ? { bookId: rawBookId } : {}),
        book: {
          userId,
        },
      },
      orderBy: rawBookId ? [{ sortOrder: "asc" }] : [{ bookId: "asc" }, { sortOrder: "asc" }],
      select: {
        id: true,
        word: true,
        phonetic: true,
        definition: true,
        example: true,
        exampleZh: true,
        difficulty: true,
        bookId: true,
      },
    })
    .catch((error) => {
      if (isMissingTableError(error)) {
        return [];
      }
      throw error;
    });

  return entries.map(toWord);
}
