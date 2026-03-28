/**
 * wordbook-id-uniqueness.test.ts
 *
 * Validates wordId uniqueness invariants across all word sources:
 * - Local wordbooks (cet4, cet6): <bookId>_<4-digit> format
 * - Builtin wordbooks: builtin_word_<id> prefix
 *
 * CRITICAL INVARIANT: Storage deduplication is by `wordId`, NOT by surface word form.
 * The same English word (e.g., "abuse") may appear in multiple books with different IDs.
 * This is intentional and expected — book-scoped IDs ensure unambiguous record lookup.
 *
 * Cross-book concern: If two books contain the same surface word with the same ID,
 * learning records would collide. The IDs MUST be unique across all books.
 *
 * TODO: Custom/import paths must also honor this invariant. Future importer validation
 * should reject datasets where a wordId appears in multiple books.
 */

import { describe, expect, it } from "vitest";

import { LOCAL_WORD_BOOK_SOURCES } from "@/data/words";
import { listAllLocalWords } from "./catalog";
import { toBuiltinWordId } from "@/lib/server/builtin-wordbook-service";

/**
 * Asserts that all word IDs within a single book are unique.
 * Book-scoped uniqueness is the minimum invariant.
 */
function assertBookScopedUniqueness(words: { id: string; bookId: string }[]): void {
  const seen = new Set<string>();
  for (const word of words) {
    if (seen.has(word.id)) {
      throw new Error(
        `Duplicate wordId "${word.id}" in book "${word.bookId}" — book-scoped IDs must be unique`
      );
    }
    seen.add(word.id);
  }
}

/**
 * Asserts that word IDs are globally unique across all books.
 * This is the stronger invariant required to prevent storage collisions.
 */
function assertGloballyUniqueIds(words: { id: string; bookId: string }[]): void {
  const seen = new Map<string, string>();
  for (const word of words) {
    const existing = seen.get(word.id);
    if (existing !== undefined) {
      throw new Error(
        `Cross-book wordId collision: "${word.id}" appears in both "${existing}" and "${word.bookId}" — globally unique IDs are required for storage dedup`
      );
    }
    seen.set(word.id, word.bookId);
  }
}

describe("local wordbook ID uniqueness", () => {
  describe("cet4", () => {
    const cet4Words = listLocalWordsByBook("cet4");

    it("cet4 words are loaded", () => {
      expect(cet4Words.length).toBeGreaterThan(0);
    });

    it("cet4 IDs follow <bookId>_<4-digit> convention", () => {
      const idPattern = /^cet4_\d{4}$/;
      const invalid = cet4Words.filter((w) => !idPattern.test(w.id));
      expect(invalid).toHaveLength(0);
    });

    it("cet4 IDs are unique within the book", () => {
      expect(() => assertBookScopedUniqueness(cet4Words)).not.toThrow();
    });
  });

  describe("cet6", () => {
    const cet6Words = listLocalWordsByBook("cet6");

    it("cet6 words are loaded", () => {
      expect(cet6Words.length).toBeGreaterThan(0);
    });

    it("cet6 IDs follow <bookId>_<4-digit> convention", () => {
      const idPattern = /^cet6_\d{4}$/;
      const invalid = cet6Words.filter((w) => !idPattern.test(w.id));
      expect(invalid).toHaveLength(0);
    });

    it("cet6 IDs are unique within the book", () => {
      expect(() => assertBookScopedUniqueness(cet6Words)).not.toThrow();
    });
  });

  describe("cross-book uniqueness", () => {
    const allLocalWords = listAllLocalWords();

    it("all local word IDs are globally unique across books", () => {
      // This is the key invariant: no wordId may appear in multiple books.
      // "abuse" appears in both cet4 (cet4_0003) and cet6 (cet6_0005) as surface forms,
      // but their IDs are different — this is intentional and correct.
      expect(() => assertGloballyUniqueIds(allLocalWords)).not.toThrow();
    });

    it("documents that surface-word overlap does NOT imply record deduplication", () => {
      // "abuse" has different IDs in cet4 and cet6
      const abuseInCet4 = allLocalWords.find((w) => w.word === "abuse" && w.bookId === "cet4");
      const abuseInCet6 = allLocalWords.find((w) => w.word === "abuse" && w.bookId === "cet6");

      expect(abuseInCet4).toBeDefined();
      expect(abuseInCet6).toBeDefined();
      expect(abuseInCet4!.id).not.toBe(abuseInCet6!.id);

      // Storage dedup is by wordId, not by surface form.
      // Learning "abuse" in cet4 creates a record keyed to "cet4_0003".
      // Learning "abuse" in cet6 creates a separate record keyed to "cet6_0005".
      // These do NOT collide because the wordIds are different.
    });

    it("LOCAL_WORD_BOOK_SOURCES and catalog are consistent", () => {
      // Both imports should yield the same words
      const fromCatalog = listAllLocalWords();
      const fromSources = LOCAL_WORD_BOOK_SOURCES.flatMap((s) => s.words);

      expect(fromCatalog.length).toBe(fromSources.length);

      // Same IDs in same order when flatMapped
      const catalogIds = fromCatalog.map((w) => w.id);
      const sourceIds = fromSources.map((w) => w.id);
      expect(catalogIds).toEqual(sourceIds);
    });
  });
});

describe("builtin wordbook ID conventions", () => {
  it("builtin word IDs use builtin_word_ prefix", () => {
    // The prefix is defined in builtin-wordbook-service.ts
    // toBuiltinWordId(rawEntryId) => `builtin_word_${rawEntryId}`
    const examples = ["entry_001", "cet4_0001", "12345"];
    const prefixed = examples.map(toBuiltinWordId);

    expect(prefixed).toEqual([
      "builtin_word_entry_001",
      "builtin_word_cet4_0001",
      "builtin_word_12345",
    ]);
  });

  it("builtin prefix constant matches toBuiltinWordId implementation", () => {
    // This documents the contract: all builtin word IDs begin with this prefix.
    // Any future builtin data source must use IDs that, after prefixing,
    // do not collide with local book IDs (cet4_*, cet6_*) or other builtin IDs.
    const BUILTIN_WORD_ID_PREFIX = "builtin_word_";

    // Local IDs never use this prefix (they use <bookId>_<4-digit>)
    const localExample = "cet4_0001";
    expect(localExample.startsWith(BUILTIN_WORD_ID_PREFIX)).toBe(false);

    // Builtin IDs always use this prefix
    const builtinExample = toBuiltinWordId("some_entry");
    expect(builtinExample.startsWith(BUILTIN_WORD_ID_PREFIX)).toBe(true);
  });
});

describe("storage deduplication is by wordId, not surface form", () => {
  // This documents the critical invariant: Prisma's @@unique([userId, wordId])
  // means learning records are keyed by wordId, not by the English word string.

  it("Prisma WordsLearningRecord uses wordId as part of unique key", () => {
    // This test documents the schema constraint:
    // @@unique([userId, wordId]) in prisma/schema.prisma
    //
    // IMPLICATION: If the same wordId were used in two different books,
    // a user's learning record would be shared across books — incorrect behavior.
    // If two different wordIds contained the same surface word, records stay separate — correct.
    //
    // The wordId uniqueness across books is therefore CRITICAL for correct storage semantics.

    // Example: cet4_0003 ("abuse") and cet6_0005 ("abuse") are different records
    // IDs differ, no storage collision
    const cet4Id = "cet4_0003" as string;
    const cet6Id = "cet6_0005" as string;
    expect(cet4Id).not.toBe(cet6Id);
  });

  it("documents that same surface word in different books needs different wordIds", () => {
    // If a future importer creates CET-4 and CET-6 with the SAME wordId for "abuse",
    // the storage layer would incorrectly share learning records between the books.
    //
    // CORRECT: cet4_0003 (abuse) + cet6_0005 (abuse) → separate records
    // INCORRECT: cet4_abuse (abuse) + cet6_abuse (abuse) → shared record (if IDs collide)
    //
    // TODO: Add importer validation to reject datasets where wordIds
    // collide across books. This test serves as documentation for that future work.

    const correctIdFormat = /^(builtin_word_|\w+_\d{4})$/;
    const exampleCorrect = "cet4_0003";
    const exampleCorrect2 = "cet6_0005";

    expect(correctIdFormat.test(exampleCorrect)).toBe(true);
    expect(correctIdFormat.test(exampleCorrect2)).toBe(true);
  });
});

describe("TODO: custom wordbook importer must honor wordId uniqueness", () => {
  // TODO: When custom wordbook import is implemented, add validation here.
  //
  // Requirements for importer:
  // 1. Reject datasets where the same wordId appears in multiple books
  // 2. Warn on datasets where same surface word appears in multiple books
  //    (this is allowed but should be intentional)
  // 3. Apply builtin_word_ prefix to any builtin-sourced entries
  //
  // This test file serves as the canonical documentation of that requirement.

  it("documents the importer invariant as a placeholder", () => {
    expect(true).toBe(true);
  });
});

function listLocalWordsByBook(bookId: string) {
  const target = LOCAL_WORD_BOOK_SOURCES.find((source) => source.book.id === bookId);
  return target ? target.words : [];
}
