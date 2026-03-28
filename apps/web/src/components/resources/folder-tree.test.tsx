// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { FolderTree } from "./folder-tree";

describe("FolderTree", () => {
  it("selects folder and creates a folder", () => {
    const onSelectFolder = vi.fn();
    const onCreateFolder = vi.fn();

    render(
      <FolderTree
        folders={[
          {
            id: "folder_1",
            name: "IELTS",
            description: "",
            resourceIds: ["resource_1"],
          },
        ]}
        selectedFolderId={null}
        onSelectFolder={onSelectFolder}
        onCreateFolder={onCreateFolder}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /IELTS/ }));
    fireEvent.change(screen.getByLabelText("新建文件夹"), { target: { value: "Grammar" } });
    fireEvent.submit(screen.getByTestId("folder-create-form"));

    expect(onSelectFolder).toHaveBeenCalledWith("folder_1");
    expect(onCreateFolder).toHaveBeenCalledWith({ name: "Grammar" });
  });
});
