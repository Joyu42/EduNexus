// @vitest-environment jsdom
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Footer } from "./Footer";

describe("Footer", () => {
  it("renders the ICP filing link and record number in the frontend footer", () => {
    render(<Footer />);

    const filingLink = screen.getByRole("link", { name: "ICP备案" });
    expect(filingLink.getAttribute("href")).toBe("https://beian.miit.gov.cn/");
    expect(filingLink.getAttribute("target")).toBe("_blank");
    expect(filingLink.getAttribute("rel")).toContain("noopener");
    expect(filingLink.getAttribute("rel")).toContain("noreferrer");
    expect(screen.getByText("豫ICP备2026005340号-1")).toBeTruthy();
  });
});
