// @vitest-environment jsdom



import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
afterEach(cleanup);

import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { PostList } from "./post-list";
import { PublicPostRecord } from "@/lib/server/store";

test("renders list of posts", () => {
  const posts: PublicPostRecord[] = [
    {
      id: "post_1",
      title: "First Post",
      content: "Content 1",
      authorId: "user_1",
      authorName: "User 1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "post_2",
      title: "Second Post",
      content: "Content 2",
      authorId: "user_2",
      authorName: "User 2",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  render(<PostList posts={posts} currentUserId="user_1" />);

  expect(screen.getByText("First Post")).toBeDefined();
  expect(screen.getByText("Second Post")).toBeDefined();
});
