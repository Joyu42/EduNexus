// @vitest-environment jsdom
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import GroupsPage from "./page";

// Mock dependencies
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: null, status: "unauthenticated" }),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: [{ id: "1", name: "Test Group", description: "Desc", memberCount: 1 }], isLoading: false }),
  useMutation: () => ({ mutate: vi.fn(), isPending: false }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

describe("GroupsPage", () => {
  it("renders the groups page and group cards", () => {
    render(React.createElement(GroupsPage));
    expect(screen.getByText("Test Group")).toBeDefined();
    expect(screen.getByText("Desc")).toBeDefined();
    expect(screen.getByText(/1 成员/)).toBeDefined();
  });
});
