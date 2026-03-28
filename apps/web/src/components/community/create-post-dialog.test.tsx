// @vitest-environment jsdom

import { render, screen, fireEvent } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
afterEach(cleanup);

import { CreatePostDialog } from "./create-post-dialog";

// Mock ResizeObserver for Dialog
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserver as any;

if (typeof window !== 'undefined' && !window.PointerEvent) {
  window.PointerEvent = class PointerEvent extends Event {} as any;
}

test("renders create post dialog and submits form", () => {
  const onSubmit = vi.fn();
  const onOpenChange = vi.fn();
  
  render(<CreatePostDialog open={true} onOpenChange={onOpenChange} onSubmit={onSubmit} />);

  const titleInput = screen.getByLabelText(/标题/i);
  const contentInput = screen.getByLabelText(/内容/i);
  const submitButton = screen.getByRole("button", { name: /发布/i });

  fireEvent.change(titleInput, { target: { value: "New Post Title" } });
  fireEvent.change(contentInput, { target: { value: "New Post Content" } });
  fireEvent.submit(screen.getByRole("button", { name: /发布/i }).closest("form")!);

  expect(onSubmit).toHaveBeenCalledWith({
    title: "New Post Title",
    content: "New Post Content",
  });
});
