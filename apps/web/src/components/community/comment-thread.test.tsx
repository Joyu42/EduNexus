// @vitest-environment jsdom



import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
afterEach(cleanup);

import { render, screen, fireEvent } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { CommentThread } from "./comment-thread";
import { CommunityCommentRecord } from "@/lib/server/store";

test("renders comments and allows adding new comment", () => {
  const comments: CommunityCommentRecord[] = [
    {
      id: "comment_1",
      postId: "post_1",
      content: "First comment",
      authorId: "user_2",
      parentCommentId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const onSubmitComment = vi.fn();
  render(<CommentThread comments={comments} postId="post_1" currentUserId="user_1" onSubmitComment={onSubmitComment} />);

  expect(screen.getByText("First comment")).toBeDefined();

  const input = screen.getByPlaceholderText(/写下你的评论/i);
  fireEvent.change(input, { target: { value: "My new comment" } });
  
  const submitButton = screen.getByRole("button", { name: /发表评论/i });
  fireEvent.click(submitButton);

  expect(onSubmitComment).toHaveBeenCalledWith("My new comment");
});
