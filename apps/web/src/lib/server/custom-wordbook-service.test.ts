import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ParsedCustomWord, ParsedCustomWordBook } from "./custom-wordbook-service";

const prismaMock = {
  customWordBook: {
    create: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
    updateMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  customWordEntry: {
    findMany: vi.fn(),
    deleteMany: vi.fn(),
    create: vi.fn(),
  },
  wordsLearningRecord: {
    deleteMany: vi.fn(),
  },
  wordsReviewSchedule: {
    findMany: vi.fn(),
    update: vi.fn(),
  },
  $transaction: vi.fn(),
};

vi.mock("./prisma", () => ({
  prisma: prismaMock,
}));

const service = await import("./custom-wordbook-service");

describe("custom wordbook service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("dedupes by sense (word + definition) and normalizes whitespace", () => {
    const words: ParsedCustomWord[] = [
      { sortOrder: 0, word: "Hello", definition: "hi  there" },
      { sortOrder: 1, word: "hello", definition: "hi there" },
      { sortOrder: 2, word: "hello", definition: "hey there" },
    ];

    const output = service.dedupeWords(words);

    expect(output).toHaveLength(2);
    expect(output.map((item) => `${item.word}|${item.definition}`)).toEqual([
      "Hello|hi  there",
      "hello|hey there",
    ]);
  });

  it("preserves parsed sortOrder when creating a custom book", async () => {
    prismaMock.customWordBook.create.mockResolvedValueOnce({
      id: "raw_1",
      name: "My Book",
      description: null,
      wordCount: 2,
      category: "custom",
    });

    const parsed: ParsedCustomWordBook = {
      name: "My Book",
      words: [
        { sortOrder: 0, word: "hello", definition: "hi" },
        { sortOrder: 2, word: "hello", definition: "hey" },
      ],
    };

    const book = await service.createCustomWordBook({
      userId: "user_a",
      parsed,
      format: "csv",
      originalFilename: "words.csv",
    });

    expect(book).toMatchObject({
      id: "custom_book_raw_1",
      name: "My Book",
      wordCount: 2,
      category: "custom",
    });

    expect(prismaMock.customWordBook.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user_a",
          format: "csv",
          originalFilename: "words.csv",
          entries: {
            createMany: {
              data: expect.arrayContaining([
                expect.objectContaining({ sortOrder: 0, word: "hello", definition: "hi" }),
                expect.objectContaining({ sortOrder: 2, word: "hello", definition: "hey" }),
              ]),
            },
          },
        }),
      })
    );
  });

  it("orders custom words by sortOrder within a book", async () => {
    prismaMock.customWordEntry.findMany.mockResolvedValueOnce([]);

    await service.listCustomWords("user_a", { bookId: "custom_book_raw_1" });

    expect(prismaMock.customWordEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ sortOrder: "asc" }],
      })
    );
  });

  it("returns empty list when custom book table is missing", async () => {
    prismaMock.customWordBook.findMany.mockRejectedValueOnce({ code: "P2021" });
    await expect(service.listCustomWordBooks("user_a")).resolves.toEqual([]);
  });

  it("returns empty list when custom entry table is missing", async () => {
    prismaMock.customWordEntry.findMany.mockRejectedValueOnce({ code: "P2021" });
    await expect(service.listCustomWords("user_a")).resolves.toEqual([]);
  });

  it("updates book metadata with normalized strings", async () => {
    prismaMock.customWordBook.updateMany.mockResolvedValueOnce({ count: 1 });
    prismaMock.customWordBook.findFirst.mockResolvedValueOnce({
      id: "raw_1",
      name: "New Name",
      description: "New Desc",
      wordCount: 1,
      category: "custom",
    });

    const updated = await service.updateCustomWordBook("user_a", "custom_book_raw_1", {
      name: "  New Name  ",
      description: "  New Desc  ",
    });

    expect(updated).toMatchObject({
      id: "custom_book_raw_1",
      name: "New Name",
      description: "New Desc",
    });
    expect(prismaMock.customWordBook.updateMany).toHaveBeenCalledWith({
      where: { id: "raw_1", userId: "user_a" },
      data: { name: "New Name", description: "New Desc" },
    });
  });

  it("cleans up old entries and learning records on replace", async () => {
    const tx = {
      customWordBook: {
        findFirst: vi.fn().mockResolvedValueOnce({ id: "raw_1" }),
        update: vi.fn().mockResolvedValueOnce({
          id: "raw_1",
          name: "Book",
          description: null,
          wordCount: 2,
          category: "custom",
        }),
      },
      customWordEntry: {
        findMany: vi.fn().mockResolvedValueOnce([{ id: "old_1" }, { id: "old_2" }]),
        deleteMany: vi.fn().mockResolvedValueOnce({ count: 2 }),
        create: vi.fn().mockResolvedValue({}),
      },
      wordsLearningRecord: {
        deleteMany: vi.fn().mockResolvedValueOnce({ count: 5 }),
      },
      wordsReviewSchedule: {
        findMany: vi.fn().mockResolvedValueOnce([
          { id: "sch_1", wordIds: ["custom_word_old_1", "custom_word_keep_1"] },
          { id: "sch_2", wordIds: ["custom_word_keep_2"] },
        ]),
        update: vi.fn().mockResolvedValue({}),
      },
    };

    prismaMock.$transaction.mockImplementationOnce(async (fn: (tx: unknown) => unknown) => fn(tx));

    const parsed: ParsedCustomWordBook = {
      name: "Book",
      words: [
        { sortOrder: 0, word: "a", definition: "def a" },
        { sortOrder: 1, word: "b", definition: "def b" },
      ],
    };

    const result = await service.replaceCustomWordBook(
      "user_a",
      "custom_book_raw_1",
      parsed,
      "csv",
      "new.csv"
    );

    expect(result).toMatchObject({ id: "custom_book_raw_1", wordCount: 2 });
    expect(tx.wordsLearningRecord.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user_a", bookId: "raw_1" },
    });
    expect(tx.customWordEntry.deleteMany).toHaveBeenCalledWith({ where: { bookId: "raw_1" } });
    expect(tx.wordsReviewSchedule.update).toHaveBeenCalledWith({
      where: { id: "sch_1" },
      data: { wordIds: ["custom_word_keep_1"] },
    });
    expect(tx.wordsReviewSchedule.update).toHaveBeenCalledTimes(1);
    expect(tx.customWordEntry.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ data: expect.objectContaining({ sortOrder: 0, word: "a" }) })
    );
    expect(tx.customWordEntry.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ data: expect.objectContaining({ sortOrder: 1, word: "b" }) })
    );
    expect(tx.customWordBook.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "raw_1" },
        data: expect.objectContaining({
          wordCount: 2,
          format: "csv",
          originalFilename: "new.csv",
        }),
      })
    );
  });

  it("removes entries, records, and schedules on delete", async () => {
    const tx = {
      customWordBook: {
        findFirst: vi.fn().mockResolvedValueOnce({
          id: "raw_1",
          entries: [{ id: "old_1" }],
        }),
        delete: vi.fn().mockResolvedValueOnce({ id: "raw_1" }),
      },
      customWordEntry: {
        deleteMany: vi.fn().mockResolvedValueOnce({ count: 1 }),
      },
      wordsLearningRecord: {
        deleteMany: vi.fn().mockResolvedValueOnce({ count: 2 }),
      },
      wordsReviewSchedule: {
        findMany: vi.fn().mockResolvedValueOnce([{ id: "sch_1", wordIds: ["custom_word_old_1"] }]),
        update: vi.fn().mockResolvedValue({}),
      },
    };

    prismaMock.$transaction.mockImplementationOnce(async (fn: (tx: unknown) => unknown) => fn(tx));

    const deleted = await service.deleteCustomWordBook("user_a", "custom_book_raw_1");

    expect(deleted).toBe(true);
    expect(tx.wordsLearningRecord.deleteMany).toHaveBeenCalledWith({ where: { userId: "user_a", bookId: "raw_1" } });
    expect(tx.wordsReviewSchedule.update).toHaveBeenCalledWith({
      where: { id: "sch_1" },
      data: { wordIds: [] },
    });
    expect(tx.customWordEntry.deleteMany).toHaveBeenCalledWith({ where: { bookId: "raw_1" } });
    expect(tx.customWordBook.delete).toHaveBeenCalledWith({ where: { id: "raw_1" } });
  });
});
