// @vitest-environment jsdom
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MemberList } from "./member-list";

describe("MemberList", () => {
  it("renders a list of members", () => {
    const members = [
      { id: "1", userId: "user-1", role: "owner", status: "active" },
      { id: "2", userId: "user-2", role: "member", status: "active" },
    ];

    render(React.createElement(MemberList, { members }));

    expect(screen.getByText("user-1")).toBeDefined();
    expect(screen.getByText("user-2")).toBeDefined();
    
    const ownerBadge = screen.getByText("owner");
    expect(ownerBadge).toBeDefined();
    
    const memberBadge = screen.getByText("member");
    expect(memberBadge).toBeDefined();
  });
});
