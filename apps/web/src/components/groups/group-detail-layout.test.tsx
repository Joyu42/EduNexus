// @vitest-environment jsdom
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { GroupDetailLayout } from "./group-detail-layout";

describe("GroupDetailLayout", () => {
  it("renders group header details and children", () => {
    const group = {
      id: "group-1",
      name: "Detail Group",
      description: "Detail description",
      memberCount: 10,
      createdBy: "creator",
      createdAt: "2024-01-01T00:00:00Z",
    };

    render(
      React.createElement(
        GroupDetailLayout,
        { 
          group, 
          onBack: () => {}, 
          headerAction: React.createElement("button", null, "Header Action"),
          children: React.createElement("div", null, "Child Content") 
        }
      )
    );

    expect(screen.getByText("Detail Group")).toBeDefined();
    expect(screen.getByText(/10 位成员/)).toBeDefined();
    expect(screen.getByText(/creator/)).toBeDefined();
    expect(screen.getByText("Detail description")).toBeDefined();
    expect(screen.getByText("Header Action")).toBeDefined();
    expect(screen.getByText("Child Content")).toBeDefined();
  });
});
