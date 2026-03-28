// @vitest-environment jsdom
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MemberList, type GroupMemberProps } from "./member-list";

describe("MemberList", () => {
  it("renders a list of members", () => {
    const members: GroupMemberProps[] = [
      { id: "1", userId: "cmn9v0fuo000011multexsxbo", role: "owner", status: "active" },
      { id: "2", userId: "cmn9v0fuo000011multexsxbt", role: "member", status: "active" },
    ];

    render(React.createElement(MemberList, { members }));

    expect(screen.getAllByText("cmn9v0fu...")).toHaveLength(2);
    expect(screen.getByTitle("cmn9v0fuo000011multexsxbo")).toBeDefined();
    expect(screen.getByTitle("cmn9v0fuo000011multexsxbt")).toBeDefined();
    
    const ownerBadge = screen.getByText("owner");
    expect(ownerBadge).toBeDefined();
    
    const memberBadge = screen.getByText("member");
    expect(memberBadge).toBeDefined();
  });
});
