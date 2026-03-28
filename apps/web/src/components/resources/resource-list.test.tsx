// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ResourceList } from "./resource-list";

describe("ResourceList", () => {
  it("renders empty state when no resources", () => {
    render(
      <ResourceList
        resources={[]}
        folders={[]}
        resourceFolderMap={{}}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onAssignFolder={vi.fn()}
      />,
    );

    expect(screen.getByText("没有找到资源")).toBeDefined();
  });

  it("renders resources using cards", () => {
    render(
      <ResourceList
        resources={[
          {
            id: "resource_1",
            title: "Cambridge 18",
            description: "Reading set",
            url: "https://example.com",
            createdBy: "session-user",
            createdAt: "2026-03-27T00:00:00.000Z",
          },
        ]}
        folders={[{ id: "folder_1", name: "IELTS" }]}
        resourceFolderMap={{ resource_1: "folder_1" }}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onAssignFolder={vi.fn()}
      />,
    );

    expect(screen.getByText("Cambridge 18")).toBeDefined();
    expect(screen.getByLabelText("文件夹")).toBeDefined();
  });
});
