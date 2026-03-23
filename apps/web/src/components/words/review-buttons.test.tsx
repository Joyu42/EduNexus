// @vitest-environment jsdom
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ReviewButtons } from "./review-buttons";

describe("ReviewButtons", () => {
  it("emits each answer grade", () => {
    const onGrade = vi.fn();

    render(React.createElement(ReviewButtons, { onGrade } as any));

    fireEvent.click(screen.getByRole("button", { name: /再想想/i }));
    fireEvent.click(screen.getByRole("button", { name: /较难/i }));
    fireEvent.click(screen.getByRole("button", { name: /认识/i }));
    fireEvent.click(screen.getByRole("button", { name: /很熟/i }));

    expect(onGrade.mock.calls.map(([grade]) => grade)).toEqual([
      "again",
      "hard",
      "good",
      "easy",
    ]);
  });

  it("ignores arrow shortcuts while an input is focused", () => {
    const onGrade = vi.fn();

    render(
      React.createElement(
        React.Fragment,
        null,
        React.createElement("input", { "aria-label": "draft" }),
        React.createElement(ReviewButtons, { onGrade } as any)
      )
    );

    const input = screen.getByLabelText("draft");
    input.focus();
    fireEvent.keyDown(input, { key: "ArrowRight" });

    expect(onGrade).not.toHaveBeenCalled();
  });

  it("ignores composing and repeated key events", () => {
    const onGrade = vi.fn();

    render(React.createElement(ReviewButtons, { onGrade } as any));

    fireEvent.keyDown(window, { key: "ArrowRight", isComposing: true });
    fireEvent.keyDown(window, { key: "ArrowRight", repeat: true });

    expect(onGrade).not.toHaveBeenCalled();
  });
});
