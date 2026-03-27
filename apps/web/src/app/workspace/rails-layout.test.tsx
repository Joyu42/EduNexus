// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import { WorkspaceRailsLayout } from "./rails-layout";

afterEach(() => {
  cleanup();
});

function renderLayout(input: { leftCollapsed: boolean; rightCollapsed: boolean }) {
  const onExpandLeft = vi.fn();
  const onExpandRight = vi.fn();
  render(
    <WorkspaceRailsLayout
      leftCollapsed={input.leftCollapsed}
      rightCollapsed={input.rightCollapsed}
      onExpandLeft={onExpandLeft}
      onExpandRight={onExpandRight}
      left={<div data-testid="left-rail" />}
      center={<div data-testid="center" />}
      right={<div data-testid="right-rail" />}
    />
  );
  return { onExpandLeft, onExpandRight };
}

describe("WorkspaceRailsLayout", () => {
  it("renders both rails when not collapsed", () => {
    renderLayout({ leftCollapsed: false, rightCollapsed: false });

    expect(screen.getByTestId("left-rail")).toBeTruthy();
    expect(screen.getByTestId("right-rail")).toBeTruthy();
    
    const centerPane = screen.getByTestId("workspace-center-pane");
    expect(centerPane).toBeTruthy();
    expect(centerPane.className).toContain("flex-1");
    expect(centerPane.className).toContain("min-w-0");
    
    expect(screen.queryByTestId("workspace-left-rail-expand")).toBeNull();
    expect(screen.queryByTestId("workspace-right-rail-expand")).toBeNull();
  });

  it("renders expand affordance when left is collapsed and maintains center pane", () => {
    const { onExpandLeft } = renderLayout({ leftCollapsed: true, rightCollapsed: false });

    expect(screen.queryByTestId("left-rail")).toBeNull();
    expect(screen.getByTestId("right-rail")).toBeTruthy();
    
    const centerPane = screen.getByTestId("workspace-center-pane");
    expect(centerPane).toBeTruthy();
    expect(centerPane.className).toContain("flex-1");
    expect(centerPane.className).toContain("min-w-0");

    screen.getByTestId("workspace-left-rail-expand").click();
    expect(onExpandLeft).toHaveBeenCalledTimes(1);
  });

  it("renders expand affordance when right is collapsed and maintains center pane", () => {
    const { onExpandRight } = renderLayout({ leftCollapsed: false, rightCollapsed: true });

    expect(screen.getByTestId("left-rail")).toBeTruthy();
    expect(screen.queryByTestId("right-rail")).toBeNull();
    
    const centerPane = screen.getByTestId("workspace-center-pane");
    expect(centerPane).toBeTruthy();
    expect(centerPane.className).toContain("flex-1");
    expect(centerPane.className).toContain("min-w-0");

    screen.getByTestId("workspace-right-rail-expand").click();
    expect(onExpandRight).toHaveBeenCalledTimes(1);
  });

  it("maintains stable center pane classes regardless of rail collapse state", () => {
    const { unmount } = render(
      <WorkspaceRailsLayout
        leftCollapsed={false}
        rightCollapsed={false}
        onExpandLeft={vi.fn()}
        onExpandRight={vi.fn()}
        left={<div data-testid="left-rail" />}
        center={<div data-testid="center" />}
        right={<div data-testid="right-rail" />}
      />
    );

    let centerPane = screen.getByTestId("workspace-center-pane");
    expect(centerPane.className).toContain("flex-1");
    expect(centerPane.className).toContain("min-w-0");
    unmount();

    render(
      <WorkspaceRailsLayout
        leftCollapsed={true}
        rightCollapsed={true}
        onExpandLeft={vi.fn()}
        onExpandRight={vi.fn()}
        left={<div data-testid="left-rail" />}
        center={<div data-testid="center" />}
        right={<div data-testid="right-rail" />}
      />
    );

    centerPane = screen.getByTestId("workspace-center-pane");
    expect(centerPane.className).toContain("flex-1");
    expect(centerPane.className).toContain("min-w-0");
  });

  it("renders both expand affordances when both rails collapsed", () => {
    renderLayout({ leftCollapsed: true, rightCollapsed: true });

    expect(screen.queryByTestId("left-rail")).toBeNull();
    expect(screen.queryByTestId("right-rail")).toBeNull();
    expect(screen.getByTestId("workspace-left-rail-expand")).toBeTruthy();
    expect(screen.getByTestId("workspace-right-rail-expand")).toBeTruthy();
  });
});
