import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFindMany = vi.fn();

vi.mock("./prisma", () => ({
  prisma: {
    builtinWordBook: {
      findMany: mockFindMany,
    },
    builtinWordEntry: {
      findMany: mockFindMany,
    },
  },
}));

const {
  BUILTIN_BOOK_ID_PREFIX,
  BUILTIN_WORD_ID_PREFIX,
  toBuiltinBookId,
  parseBuiltinBookId,
  toBuiltinWordId,
  listBuiltinWordBooks,
  listBuiltinWords,
} = await import("./builtin-wordbook-service");

describe("builtin-wordbook-service ID helpers", () => {
  it("toBuiltinBookId prefixes raw id", () => {
    expect(toBuiltinBookId("medical")).toBe("builtin_book_medical");
  });

  it("parseBuiltinBookId extracts raw id and validates prefix", () => {
    expect(parseBuiltinBookId("builtin_book_medical")).toBe("medical");
  });

  it("parseBuiltinBookId throws on invalid prefix", () => {
    expect(() => parseBuiltinBookId("custom_book_abc")).toThrow();
  });

  it("toBuiltinWordId prefixes raw entry id", () => {
    expect(toBuiltinWordId("medical_abc123")).toBe("builtin_word_medical_abc123");
  });
});

describe("listBuiltinWordBooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps to WordBook shape with category=general", async () => {
    mockFindMany.mockResolvedValueOnce([
      {
        id: "medical",
        name: "医学词汇",
        description: "医学词汇",
        wordCount: 200,
        category: "general",
      },
    ]);

    const books = await listBuiltinWordBooks();

    expect(books).toHaveLength(1);
    expect(books[0]).toMatchObject({
      id: "builtin_book_medical",
      name: "医学词汇",
      description: "医学词汇",
      wordCount: 200,
      category: "general",
    });
  });

  it("orders books by id asc", async () => {
    mockFindMany.mockResolvedValueOnce([]);
    await listBuiltinWordBooks();
    expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({ orderBy: { id: "asc" } }));
  });
});

describe("listBuiltinWords", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns words with prefixed IDs and defaults", async () => {
    mockFindMany.mockResolvedValueOnce([
      {
        id: "medical_abc123",
        bookId: "medical",
        word: "artery",
        phonetic: "/ɑːrtəri/",
        definition: "动脉",
        example: null,
        exampleZh: null,
        difficulty: "hard",
        sortOrder: 0,
      },
    ]);

    const words = await listBuiltinWords({ bookId: "builtin_book_medical" });

    expect(words).toHaveLength(1);
    expect(words[0]).toMatchObject({
      id: "builtin_word_medical_abc123",
      word: "artery",
      phonetic: "/ɑːrtəri/",
      definition: "动脉",
      example: "",
      bookId: "builtin_book_medical",
      difficulty: "hard",
    });
  });

  it("normalizes invalid difficulty to medium", async () => {
    mockFindMany.mockResolvedValueOnce([
      {
        id: "medical_xyz",
        bookId: "medical",
        word: "vein",
        phonetic: null,
        definition: "静脉",
        example: null,
        exampleZh: null,
        difficulty: "invalid_val",
        sortOrder: 1,
      },
    ]);

    const words = await listBuiltinWords({ bookId: "builtin_book_medical" });
    expect(words[0].difficulty).toBe("medium");
  });

  it("filters by bookId when provided", async () => {
    mockFindMany.mockResolvedValueOnce([]);
    await listBuiltinWords({ bookId: "builtin_book_medical" });
    expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { bookId: "medical" } }));
  });

  it("orders by sortOrder asc when bookId provided", async () => {
    mockFindMany.mockResolvedValueOnce([]);
    await listBuiltinWords({ bookId: "builtin_book_medical" });
    expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({ orderBy: { sortOrder: "asc" } }));
  });

  it("returns empty array when no books exist", async () => {
    mockFindMany.mockResolvedValueOnce([]);
    const words = await listBuiltinWords();
    expect(words).toHaveLength(0);
  });
});

it("exports builtin ID prefixes", () => {
  expect(BUILTIN_BOOK_ID_PREFIX).toBe("builtin_book_");
  expect(BUILTIN_WORD_ID_PREFIX).toBe("builtin_word_");
});
