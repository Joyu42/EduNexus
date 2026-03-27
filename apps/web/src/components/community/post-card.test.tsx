// @vitest-environment jsdom



import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
afterEach(cleanup);

import { render, screen, fireEvent } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { PostCard } from "./post-card";
import { PublicPostRecord } from "@/lib/server/store";

test("renders post card with title and content", () => {
  const post: PublicPostRecord = {
    id: "post_1",
    title: "Test Post",
    content: "This is a test post content",
    authorId: "user_1",
    authorName: "Test User",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  render(<PostCard post={post} />);

  expect(screen.getByText("Test Post")).toBeDefined();
  expect(screen.getByText("This is a test post content")).toBeDefined();
  expect(screen.getByText("Test User")).toBeDefined();
});

test("calls onEdit when edit button is clicked for own post", () => {
  const post: PublicPostRecord = {
    id: "post_1",
    title: "Test Post",
    content: "Content",
    authorId: "user_1",
    authorName: "Test User",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const onEdit = vi.fn();
  render(<PostCard post={post} currentUserId="user_1" onEdit={onEdit} />);

  const editButton = screen.getByRole("button", { name: /编辑/i });
  fireEvent.click(editButton);

  expect(onEdit).toHaveBeenCalledWith(post);
});

test("does not show edit button for others post", () => {
  const post: PublicPostRecord = {
    id: "post_1",
    title: "Test Post",
    content: "Content",
    authorId: "user_2",
    authorName: "Other User",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  render(<PostCard post={post} currentUserId="user_1" />);

  expect(screen.queryByRole("button", { name: /编辑/i })).toBeNull();
});
