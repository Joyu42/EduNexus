import { describe, expect, it, vi } from "vitest";

import { createWordsStorage } from "./storage";
import { ensureWordsBootstrap } from "./bootstrap";

const bootstrap = ensureWordsBootstrap as unknown as (
  options: {
    storage: ReturnType<typeof createWordsStorage>;
    readVersion: () => string | null;
    writeVersion: (value: string) => void;
  }
) => Promise<void>;

describe("words bootstrap", () => {
  it("re-seeds local words data when the version key exists but the store is empty", async () => {
    const storage = createWordsStorage({ mode: "memory" });

    await bootstrap({
      storage,
      readVersion: () => "kylebing-cet4-cet6-v1",
      writeVersion: vi.fn(),
    });

    expect(await storage.getWordBooks()).not.toHaveLength(0);
  });

  it("re-seeds local words data when books exist but stored words are missing", async () => {
    const storage = createWordsStorage({ mode: "memory" });
    await storage.saveWordBook({
      id: "test-book",
      name: "Test Book",
      description: "",
      wordCount: 0,
      category: "general",
    });

    await bootstrap({
      storage,
      readVersion: () => "kylebing-cet4-cet6-v1",
      writeVersion: vi.fn(),
    });

    expect(await storage.getAllWords()).not.toHaveLength(0);
  });
});
