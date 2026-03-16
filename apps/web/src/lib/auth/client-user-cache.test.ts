import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  clearClientUserSnapshot,
  getClientUserIdentity,
  readClientUserSnapshot,
  writeClientUserSnapshot,
} from "@/lib/auth/client-user-cache";

describe("client-user-cache", () => {
  beforeEach(() => {
    const storage = new Map<string, string>();
    const localStorageMock = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
      clear: () => {
        storage.clear();
      },
    };

    Object.defineProperty(globalThis, "window", {
      value: { localStorage: localStorageMock },
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis, "localStorage", {
      value: localStorageMock,
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    clearClientUserSnapshot();
  });

  it("writes and reads the current user snapshot", () => {
    writeClientUserSnapshot({ id: "user_123", email: "user@example.com" });

    expect(readClientUserSnapshot()).toEqual({
      id: "user_123",
      email: "user@example.com",
    });
  });

  it("prefers id when resolving the current user identity", () => {
    writeClientUserSnapshot({ id: "user_123", email: "user@example.com" });

    expect(getClientUserIdentity()).toBe("user_123");
  });

  it("falls back to email and clears invalid snapshots", () => {
    writeClientUserSnapshot({ email: "user@example.com" });
    expect(getClientUserIdentity()).toBe("user@example.com");

    localStorage.setItem("edunexus_current_user", "not-json");
    expect(readClientUserSnapshot()).toBeNull();
    expect(localStorage.getItem("edunexus_current_user")).toBeNull();
  });
});
