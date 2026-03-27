// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import ResourcesPage from "./page";

const mocks = vi.hoisted(() => ({
  fetchResourcesFromServer: vi.fn(),
  createResourceOnServer: vi.fn(),
  updateResourceOnServer: vi.fn(),
  deleteResourceOnServer: vi.fn(),
  fetchResourceFoldersFromServer: vi.fn(),
  createResourceFolderOnServer: vi.fn(),
  updateResourceFolderOnServer: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock("next-auth/react", () => ({
  useSession: () => ({
    status: "authenticated",
    data: { user: { id: "session-user", name: "Session User" } },
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/resources/resource-storage", () => ({
  fetchResourcesFromServer: mocks.fetchResourcesFromServer,
  createResourceOnServer: mocks.createResourceOnServer,
  updateResourceOnServer: mocks.updateResourceOnServer,
  deleteResourceOnServer: mocks.deleteResourceOnServer,
  fetchResourceFoldersFromServer: mocks.fetchResourceFoldersFromServer,
  createResourceFolderOnServer: mocks.createResourceFolderOnServer,
  updateResourceFolderOnServer: mocks.updateResourceFolderOnServer,
}));

describe("ResourcesPage", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    mocks.fetchResourcesFromServer.mockResolvedValue({
      resources: [
        {
          id: "resource_1",
          title: "Cambridge 18",
          description: "Reading set",
          url: "https://example.com",
          createdBy: "session-user",
          createdAt: "2026-03-27T00:00:00.000Z",
        },
      ],
      total: 1,
    });
    mocks.fetchResourceFoldersFromServer.mockResolvedValue({
      folders: [
        {
          id: "folder_1",
          name: "IELTS",
          description: "",
          resourceIds: [],
          userId: "session-user",
          createdAt: "2026-03-27T00:00:00.000Z",
          updatedAt: "2026-03-27T00:00:00.000Z",
        },
      ],
    });
    mocks.createResourceOnServer.mockResolvedValue({
      id: "resource_2",
      title: "Cambridge 19",
      description: "Writing",
      url: "https://example.com/new",
      createdBy: "session-user",
      createdAt: "2026-03-27T00:00:00.000Z",
    });
    mocks.updateResourceOnServer.mockResolvedValue({
      id: "resource_1",
      title: "Cambridge 18 Updated",
      description: "Reading set",
      url: "https://example.com",
      createdBy: "session-user",
      createdAt: "2026-03-27T00:00:00.000Z",
    });
    mocks.deleteResourceOnServer.mockResolvedValue(true);
    mocks.createResourceFolderOnServer.mockResolvedValue({
      id: "folder_2",
      name: "Grammar",
      description: "",
      resourceIds: [],
      userId: "session-user",
      createdAt: "2026-03-27T00:00:00.000Z",
      updatedAt: "2026-03-27T00:00:00.000Z",
    });
    mocks.updateResourceFolderOnServer.mockResolvedValue({
      id: "folder_1",
      name: "IELTS",
      description: "",
      resourceIds: ["resource_1"],
      userId: "session-user",
      createdAt: "2026-03-27T00:00:00.000Z",
      updatedAt: "2026-03-27T00:00:00.000Z",
    });
  });

  it("supports create/edit/delete and folder assignment from resource management UI", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ResourcesPage />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Cambridge 18")).toBeDefined();
    });

    fireEvent.click(screen.getByRole("button", { name: "分享资源" }));
    fireEvent.change(screen.getByLabelText(/资源名称/), { target: { value: "Cambridge 19" } });
    fireEvent.change(screen.getByLabelText(/链接地址/), { target: { value: "https://example.com/new" } });
    fireEvent.change(screen.getByLabelText(/资源描述/), { target: { value: "Writing" } });
    fireEvent.submit(screen.getByTestId("resource-editor-form"));

    await waitFor(() => {
      expect(mocks.createResourceOnServer).toHaveBeenCalled();
    });
    expect(mocks.createResourceOnServer.mock.calls[0]?.[0]).toEqual({
      title: "Cambridge 19",
      description: "Writing",
      url: "https://example.com/new",
    });

    fireEvent.click(screen.getByRole("button", { name: "编辑" }));
    fireEvent.change(screen.getByLabelText(/资源名称/), { target: { value: "Cambridge 18 Updated" } });
    fireEvent.submit(screen.getByTestId("resource-editor-form"));

    await waitFor(() => {
      expect(mocks.updateResourceOnServer).toHaveBeenCalledWith("resource_1", {
        title: "Cambridge 18 Updated",
        description: "Reading set",
        url: "https://example.com",
      });
    });

    fireEvent.change(screen.getByLabelText("文件夹"), { target: { value: "folder_1" } });
    await waitFor(() => {
      expect(mocks.updateResourceFolderOnServer).toHaveBeenCalledWith("folder_1", {
        resourceIds: ["resource_1"],
      });
    });

    fireEvent.click(screen.getByRole("button", { name: "删除" }));
    await waitFor(() => {
      expect(mocks.deleteResourceOnServer).toHaveBeenCalled();
    });
    expect(mocks.deleteResourceOnServer.mock.calls[0]?.[0]).toBe("resource_1");
  });
});
