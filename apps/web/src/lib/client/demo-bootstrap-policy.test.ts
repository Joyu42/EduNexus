import { describe, expect, it } from "vitest";
import { shouldSyncDemoDataInGoalsPage } from "./demo-bootstrap-policy";

describe("shouldSyncDemoDataInGoalsPage", () => {
  it("returns true only for demo user in bootstrap_demo state", () => {
    expect(
      shouldSyncDemoDataInGoalsPage({ isDemoUser: true, goalsPageStateKind: "bootstrap_demo" })
    ).toBe(true);
  });

  it("returns false for demo user when content already exists", () => {
    expect(
      shouldSyncDemoDataInGoalsPage({ isDemoUser: true, goalsPageStateKind: "content" })
    ).toBe(false);
  });

  it("returns false for non-demo users", () => {
    expect(
      shouldSyncDemoDataInGoalsPage({ isDemoUser: false, goalsPageStateKind: "bootstrap_demo" })
    ).toBe(false);
  });
});
