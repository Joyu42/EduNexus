// @vitest-environment jsdom
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Footer } from "./Footer";

describe("Footer", () => {
  it("does not show ICP filing information while keeping the copyright text", () => {
    render(<Footer />);

    expect(screen.getByText("© 2026 EduNexus. All rights reserved.")).toBeTruthy();
    expect(screen.queryByText("ICP备案")).toBeNull();
    expect(screen.queryByText("豫ICP备2026005340号-1")).toBeNull();
  });
});
