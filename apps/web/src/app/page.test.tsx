// @vitest-environment jsdom
import React from "react";
import { render, cleanup } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import HomePage from "./page";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  })),
  usePathname: vi.fn(() => "/"),
}));

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(() => ({
    data: null,
    status: "unauthenticated",
  })),
}));

vi.mock("framer-motion", async () => {
  const actual = await vi.importActual("framer-motion");
  return {
    ...actual,
    motion: {
      div: vi.fn(({ children, className, "data-testid": testId }) => (
        <div className={className} data-testid={testId}>
          {children}
        </div>
      )),
      section: vi.fn(({ children, className }) => (
        <section className={className}>{children}</section>
      )),
    },
  };
});

describe("HomePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the 5 core shipped modules", () => {
    const { getByText, getByRole } = render(<HomePage />);

    expect(getByText("学习工作区")).toBeTruthy();
    expect(getByText("知识宝库")).toBeTruthy();
    expect(getByText("知识星图")).toBeTruthy();
    expect(getByText("学习分析")).toBeTruthy();
    expect(getByText("资源中心")).toBeTruthy();
  });

  it("does not render stale or unsupported claims", () => {
    const { queryByText } = render(<HomePage />);

    expect(queryByText("配置中心")).toBeNull();
    expect(queryByText("路径回写")).toBeNull();
    expect(queryByText("路径干预")).toBeNull();
  });

  it("links map to correct valid destinations", () => {
    const { container } = render(<HomePage />);

    const links = Array.from(container.querySelectorAll("a"));
    const hrefs = links.map((link) => link.getAttribute("href"));

    expect(hrefs).toContain("/workspace");
    expect(hrefs).toContain("/kb");
    expect(hrefs).toContain("/graph");
    expect(hrefs).toContain("/analytics");
    expect(hrefs).toContain("/resources");

    expect(hrefs).not.toContain("/settings");
  });
});