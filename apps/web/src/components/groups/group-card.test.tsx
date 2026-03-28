// @vitest-environment jsdom
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { GroupCard } from "./group-card";

describe("GroupCard", () => {
  it("renders group details correctly", () => {
    const group = {
      id: "group-1",
      name: "Test Group",
      description: "Test description",
      memberCount: 42,
    };

    render(React.createElement(GroupCard, { group }));

    expect(screen.getByText("Test Group")).toBeDefined();
    expect(screen.getByText("Test description")).toBeDefined();
    expect(screen.getByText(/42 成员/)).toBeDefined();
  });
});
