import { describe, expect, it } from "vitest";
import { normalizeApiKey } from "./model-api-key";

describe("normalizeApiKey", () => {
  it("returns trimmed key when value is valid ascii token", () => {
    expect(normalizeApiKey("  sk-test_ABC123  ")).toBe("sk-test_ABC123");
  });

  it("returns empty string for non-string values", () => {
    expect(normalizeApiKey(undefined)).toBe("");
    expect(normalizeApiKey(null)).toBe("");
    expect(normalizeApiKey(123)).toBe("");
  });

  it("returns empty string for keys with whitespace or non-ascii content", () => {
    expect(normalizeApiKey("hello world")).toBe("");
    expect(normalizeApiKey("您好")).toBe("");
    expect(normalizeApiKey("abc\n123")).toBe("");
  });
});
