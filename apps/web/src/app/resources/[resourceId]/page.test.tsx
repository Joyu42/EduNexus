// @vitest-environment jsdom

import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import ResourceDetailsPage from "./page";

const mocks = vi.hoisted(() => ({
  fetchResourceFromServer: vi.fn(),
  fetchResourceNotesFromServer: vi.fn(),
  createResourceNoteOnServer: vi.fn(),
  updateResourceNoteOnServer: vi.fn(),
  deleteResourceNoteOnServer: vi.fn(),
  getResourceRatingFromServer: vi.fn(),
  upsertResourceRatingOnServer: vi.fn(),
}));

vi.mock("react", async (importOriginal) => {
  const actual = (await importOriginal()) as typeof import("react");
  return {
    ...actual,
    use: () => ({ resourceId: "resource_1" }),
  };
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    back: vi.fn(),
    push: vi.fn(),
  }),
}));

vi.mock("next-auth/react", () => ({
  useSession: () => ({
    status: "authenticated",
    data: { user: { id: "session-user" } },
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/resources/resource-storage", () => ({
  fetchResourceFromServer: mocks.fetchResourceFromServer,
  fetchResourceNotesFromServer: mocks.fetchResourceNotesFromServer,
  createResourceNoteOnServer: mocks.createResourceNoteOnServer,
  updateResourceNoteOnServer: mocks.updateResourceNoteOnServer,
  deleteResourceNoteOnServer: mocks.deleteResourceNoteOnServer,
  getResourceRatingFromServer: mocks.getResourceRatingFromServer,
  upsertResourceRatingOnServer: mocks.upsertResourceRatingOnServer,
}));

describe("ResourceDetailsPage", () => {
  let queryClient: QueryClient;

  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    mocks.fetchResourceFromServer.mockResolvedValue({
      id: "resource_1",
      title: "Cambridge 18",
      description: "Reading set",
      url: "https://example.com",
      createdBy: "session-user",
      createdAt: "2026-03-27T00:00:00.000Z",
    });
    mocks.fetchResourceNotesFromServer.mockResolvedValue({ notes: [] });
    mocks.createResourceNoteOnServer.mockResolvedValue({
      id: "note_1",
      resourceId: "resource_1",
      userId: "session-user",
      content: "Reading set 3",
      createdAt: "2026-03-27T00:00:00.000Z",
      updatedAt: "2026-03-27T00:00:00.000Z",
    });
    mocks.updateResourceNoteOnServer.mockResolvedValue({
      id: "note_1",
      resourceId: "resource_1",
      userId: "session-user",
      content: "Reading set 3 updated",
      createdAt: "2026-03-27T00:00:00.000Z",
      updatedAt: "2026-03-27T00:01:00.000Z",
    });
    mocks.deleteResourceNoteOnServer.mockResolvedValue(undefined);
    mocks.getResourceRatingFromServer.mockResolvedValue(null);
    mocks.upsertResourceRatingOnServer.mockResolvedValue({
      id: "rating_1",
      resourceId: "resource_1",
      userId: "session-user",
      rating: 5,
      createdAt: "2026-03-27T00:00:00.000Z",
      updatedAt: "2026-03-27T00:00:00.000Z",
    });
  });

  it("shows controlled missing state when resource does not exist", async () => {
    mocks.fetchResourceFromServer.mockResolvedValueOnce(null);

    render(
      <QueryClientProvider client={queryClient}>
        <ResourceDetailsPage params={Promise.resolve({ resourceId: "resource_1" })} />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("未找到该资源")).toBeDefined();
    });
  });

  it("supports note and rating interactions", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ResourceDetailsPage params={Promise.resolve({ resourceId: "resource_1" })} />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(mocks.fetchResourceFromServer).toHaveBeenCalled();
      expect(screen.getByText("Cambridge 18")).toBeDefined();
    });

    fireEvent.change(screen.getByPlaceholderText("添加你的学习笔记"), {
      target: { value: "Reading set 3" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存笔记" }));

    await waitFor(() => {
      expect(mocks.createResourceNoteOnServer).toHaveBeenCalledWith({
        resourceId: "resource_1",
        content: "Reading set 3",
      });
    });

    fireEvent.click(screen.getByRole("button", { name: "5 星" }));

    await waitFor(() => {
      expect(mocks.upsertResourceRatingOnServer).toHaveBeenCalledWith("resource_1", 5);
    });
  });
});
