// @vitest-environment jsdom
import React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import GroupDetailsPage from "./page";

vi.mock("react", async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  return {
    ...actual,
    use: (promise: any) => ({ groupId: "1" }),
  };
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: vi.fn(), push: vi.fn() }),
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

let mockUserId = "user-1";
vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { id: mockUserId } } }),
}));

let mockMembers = [{ id: "m1", userId: "user-1", role: "owner", status: "active" }];

const mockMutate = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useQuery: ({ queryKey }: any) => {
    if (queryKey[0] === "group") {
      return { data: { id: "1", name: "Detail Group", memberCount: 10, createdBy: "creator", createdAt: "2024-01-01T00:00:00Z" }, isLoading: false };
    }
    if (queryKey[0] === "group-members") {
      return { data: mockMembers };
    }
    if (queryKey[0] === "group-tasks") {
      return { data: [{ id: "t1", title: "Test Task", description: "Desc", status: "todo", dueDate: null }] };
    }
    return { data: [] };
  },
  useMutation: () => ({ mutate: mockMutate, isPending: false }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

describe("GroupDetailsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  afterEach(() => {
    cleanup();
  });

  it("renders the group details and uses member components", () => {
    mockUserId = "user-1";
    mockMembers = [{ id: "m1", userId: "user-1", role: "owner", status: "active" }];
    render(React.createElement(GroupDetailsPage, { params: Promise.resolve({ groupId: "1" }) }));
    expect(screen.getByText("Detail Group")).toBeDefined();
    expect(screen.getByText(/creator/)).toBeDefined();
  });

  it("allows members to toggle task completion", () => {
    mockUserId = "user-1";
    mockMembers = [{ id: "m1", userId: "user-1", role: "member", status: "active" }];
    render(React.createElement(GroupDetailsPage, { params: Promise.resolve({ groupId: "1" }) }));
    
    const toggleButton = screen.getByRole("button", { name: "标记完成" });
    expect(toggleButton).toBeDefined();
    
    fireEvent.click(toggleButton);
    expect(mockMutate).toHaveBeenCalledWith({ taskId: "t1", status: "done" });
  });

  it("does not show task completion toggle to non-members", () => {
    mockUserId = "user-2";
    mockMembers = [{ id: "m1", userId: "user-1", role: "owner", status: "active" }];
    render(React.createElement(GroupDetailsPage, { params: Promise.resolve({ groupId: "1" }) }));
    
    expect(screen.getByText("Test Task")).toBeDefined();
    expect(screen.queryByRole("button", { name: "标记完成" })).toBeNull();
  });
});
