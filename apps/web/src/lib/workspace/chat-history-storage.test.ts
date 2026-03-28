import { describe, expect, it } from "vitest";

import { resolveChatDatabaseName } from "@/lib/workspace/chat-history-storage";

describe("chat history storage scope", () => {
  it("builds user-scoped dexie database names", () => {
    expect(resolveChatDatabaseName("user-a")).toBe("EduNexusChatHistory_user-a");
    expect(resolveChatDatabaseName("user-b")).toBe("EduNexusChatHistory_user-b");
  });

  it("does not create a shared fallback database name", () => {
    expect(resolveChatDatabaseName(null)).toBeNull();
  });
});
