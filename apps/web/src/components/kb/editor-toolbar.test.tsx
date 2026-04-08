// @vitest-environment jsdom
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { EditorToolbar } from "./editor-toolbar";

vi.mock("./save-status-indicator", () => ({
  SaveStatusIndicator: (props: any) => (
    <div
      data-testid="save-status-indicator"
      data-status={props.status}
      data-last-saved={props.lastSaved ? "yes" : "no"}
    />
  ),
}));

describe("EditorToolbar", () => {
  it("forwards the editor save status to the badge", () => {
    render(
      <EditorToolbar
        mode="source"
        onModeChange={vi.fn()}
        status="saving"
        lastSaved={new Date("2026-04-03T10:15:00.000Z")}
        error={null}
        wordCount={120}
      />
    );

    expect(screen.getByTestId("save-status-indicator").getAttribute("data-status")).toBe("saving");
    expect(screen.getByText("120 字符")).toBeDefined();
  });
});
