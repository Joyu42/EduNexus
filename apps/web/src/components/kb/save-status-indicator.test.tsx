// @vitest-environment jsdom
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SaveStatusIndicator } from "./save-status-indicator";

describe("SaveStatusIndicator", () => {
  it("shows the required status labels", () => {
    render(<SaveStatusIndicator status="idle" lastSaved={null} />);
    expect(screen.getByText("未保存")).toBeDefined();

    render(<SaveStatusIndicator status="saving" lastSaved={null} />);
    expect(screen.getByText("保存中")).toBeDefined();

    render(<SaveStatusIndicator status="saved" lastSaved={new Date("2026-04-03T10:15:00.000Z")} />);
    expect(screen.getByText("已保存")).toBeDefined();

    render(<SaveStatusIndicator status="error" lastSaved={null} error={new Error("boom")} />);
    expect(screen.getByText("保存失败")).toBeDefined();
  });
});
