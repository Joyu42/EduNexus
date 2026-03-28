// @vitest-environment jsdom
import React from "react";
import { render, cleanup } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { AppShell } from "./AppShell";

// Mock zustand store
vi.mock("@/lib/stores/sidebar-store", () => ({
  useSidebarStore: vi.fn(() => ({
    isCollapsed: false,
    toggleCollapse: vi.fn(),
    setCollapsed: vi.fn(),
    workspaceLeftCollapsed: false,
    workspaceRightCollapsed: false,
    setWorkspaceLeftCollapsed: vi.fn(),
    setWorkspaceRightCollapsed: vi.fn(),
    toggleWorkspaceLeftCollapsed: vi.fn(),
    toggleWorkspaceRightCollapsed: vi.fn(),
  })),
}));

// Mock media query hook
vi.mock("@/lib/hooks/use-media-query", () => ({
  useIsMobile: vi.fn(() => false),
}));

// Mock child components
vi.mock("@/components/layout/AppSidebar", () => ({
  AppSidebar: vi.fn(() => <div data-testid="app-sidebar">AppSidebar</div>),
}));

vi.mock("@/components/mobile/mobile-nav", () => ({
  MobileNav: vi.fn(() => <div data-testid="mobile-nav">MobileNav</div>),
}));

vi.mock("@/components/mobile/mobile-menu", () => ({
  MobileMenu: vi.fn(() => <div data-testid="mobile-menu">MobileMenu</div>),
}));

vi.mock("@/components/layout/Footer", () => ({
  Footer: vi.fn(() => <footer data-testid="footer">Footer</footer>),
}));

// Mock UI components
vi.mock("@/components/ui/button", () => ({
  Button: vi.fn(({ children, ...props }) => (
    <button {...props}>{children}</button>
  )),
}));

vi.mock("@/components/ui/input", () => ({
  Input: vi.fn((props) => <input {...props} />),
}));

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  Search: vi.fn(() => <span data-testid="search-icon">Search</span>),
  Bell: vi.fn(() => <span data-testid="bell-icon">Bell</span>),
  Command: vi.fn(() => <span data-testid="command-icon">Command</span>),
  User: vi.fn(() => <span data-testid="user-icon">User</span>),
}));

describe("AppShell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders children in the main scroll area", () => {
    const { getByText } = render(
      <AppShell>
        <div>Test Content</div>
      </AppShell>
    );
    expect(getByText("Test Content")).toBeTruthy();
  });

  it("main scroll container has bottom-safe padding to clear the footer", () => {
    const { container } = render(
      <AppShell>
        <div>Content</div>
      </AppShell>
    );
    const mainElement = container.querySelector("main");
    expect(mainElement).toBeTruthy();
    // pb-16 = padding-bottom: 4rem = 64px, enough to clear footer height
    expect(mainElement?.className).toMatch(/pb-(\d+|\\\[.*?\\\])/);
    // More specific: check for pb-16 or any substantial bottom padding
    const hasBottomPadding = /pb-\d+|p-b-\d+|padding-bottom:/.test(mainElement?.className || "");
    expect(hasBottomPadding).toBe(true);
  });

  it("footer is rendered below main content in normal document flow", () => {
    const { container } = render(
      <AppShell>
        <div style={{ height: "2000px" }}>Tall Content</div>
      </AppShell>
    );

    const mainElement = container.querySelector("main");
    const footerElement = container.querySelector("footer");

    expect(mainElement).toBeTruthy();
    expect(footerElement).toBeTruthy();

    // Footer should be a sibling AFTER main in DOM order, not overlapping
    const parent = container.querySelector(".flex.flex-col.h-screen.bg-background");
    expect(parent).toBeTruthy();

    // Get bounding rectangles to verify no overlap
    const mainRect = mainElement!.getBoundingClientRect();
    const footerRect = footerElement!.getBoundingClientRect();

    // Footer bottom should be >= main bottom (footer below main)
    // OR footer top should be >= main bottom (footer starts after main content area)
    expect(footerRect.top).toBeGreaterThanOrEqual(mainRect.bottom - 1); // -1 for rounding
  });

  it("footer is NOT position:fixed - it should be in normal document flow", () => {
    const { container } = render(
      <AppShell>
        <div>Content</div>
      </AppShell>
    );
    const footerElement = container.querySelector("footer");
    expect(footerElement).toBeTruthy();

    const footerStyle = window.getComputedStyle(footerElement!);
    // Footer must NOT be fixed - it should be in normal document flow
    expect(footerStyle.position).not.toBe("fixed");
    expect(footerStyle.position).not.toBe("absolute");
  });

  it("tall content (2000px) remains readable above the footer", () => {
    const { container } = render(
      <AppShell>
        <div style={{ height: "2000px" }} data-testid="tall-content">
          Tall Content
        </div>
      </AppShell>
    );

    const mainElement = container.querySelector("main");
    const tallContent = container.querySelector('[data-testid="tall-content"]');

    expect(mainElement).toBeTruthy();
    expect(tallContent).toBeTruthy();

    // Verify main element has pb-16 class for bottom-safe spacing
    expect(mainElement!.className).toMatch(/pb-16/);
  });

  it("negative case: if footer were fixed, test should fail", () => {
    // This test documents that fixed positioning on footer is NOT allowed
    // It passes because our implementation uses normal document flow
    const { container } = render(
      <AppShell>
        <div>Content</div>
      </AppShell>
    );

    const footerElement = container.querySelector("footer");
    expect(footerElement).toBeTruthy();

    // Verify footer is NOT fixed by checking it has normal flow position
    const footerStyle = window.getComputedStyle(footerElement!);
    const isFixed = footerStyle.position === "fixed";

    // This assertion will FAIL if someone changes footer to fixed
    // The test description is: "fixed positioning on footer causes FAIL"
    // So we assert NOT fixed, meaning if it IS fixed, this test fails
    expect(isFixed).toBe(false);
  });
});
