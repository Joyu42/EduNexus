// @vitest-environment jsdom
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { JoinButton } from "./join-button";

describe("JoinButton", () => {
  it("renders join state correctly", () => {
    const onJoin = vi.fn();
    const onLeave = vi.fn();

    const { rerender } = render(
      React.createElement(JoinButton, {
        isJoined: false,
        isLoading: false,
        onJoin,
        onLeave,
      })
    );

    const joinBtn = screen.getByRole("button", { name: /加入小组/i });
    expect(joinBtn).toBeDefined();
    fireEvent.click(joinBtn);
    expect(onJoin).toHaveBeenCalled();

    rerender(
      React.createElement(JoinButton, {
        isJoined: true,
        isLoading: false,
        onJoin,
        onLeave,
      })
    );

    const leaveBtn = screen.getByRole("button", { name: /离开小组/i });
    expect(leaveBtn).toBeDefined();
    fireEvent.click(leaveBtn);
    expect(onLeave).toHaveBeenCalled();
  });
});
