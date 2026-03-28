// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ResourceCard } from "./resource-card";

describe("ResourceCard", () => {
  it("triggers edit/delete/folder callbacks", () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const onAssignFolder = vi.fn();

    render(
      <ResourceCard
        resource={{
          id: "resource_1",
          title: "Cambridge 18",
          description: "Reading set",
          url: "https://example.com",
          createdBy: "session-user",
          createdAt: "2026-03-27T00:00:00.000Z",
        }}
        folders={[{ id: "folder_1", name: "IELTS" }]}
        assignedFolderId={null}
        onEdit={onEdit}
        onDelete={onDelete}
        onAssignFolder={onAssignFolder}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "编辑" }));
    fireEvent.click(screen.getByRole("button", { name: "删除" }));
    fireEvent.change(screen.getByLabelText("文件夹"), { target: { value: "folder_1" } });

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onAssignFolder).toHaveBeenCalledWith("resource_1", "folder_1");
  });
});
