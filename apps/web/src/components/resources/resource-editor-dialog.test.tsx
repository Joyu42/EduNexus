// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ResourceEditorDialog } from "./resource-editor-dialog";

describe("ResourceEditorDialog", () => {
  it("submits create payload", () => {
    const onSubmit = vi.fn();

    render(
      <ResourceEditorDialog
        open
        mode="create"
        initialValue={null}
        pending={false}
        onOpenChange={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByLabelText(/资源名称/), { target: { value: "Cambridge 18" } });
    fireEvent.change(screen.getByLabelText(/链接地址/), { target: { value: "https://example.com" } });
    fireEvent.change(screen.getByLabelText(/资源描述/), { target: { value: "Reading set" } });
    fireEvent.submit(screen.getByTestId("resource-editor-form"));

    expect(onSubmit).toHaveBeenCalledWith({
      title: "Cambridge 18",
      description: "Reading set",
      url: "https://example.com",
    });
  });
});
