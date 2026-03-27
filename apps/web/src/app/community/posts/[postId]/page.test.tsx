// @vitest-environment jsdom

import { render, screen, cleanup } from "@testing-library/react";
import { expect, test, vi, afterEach } from "vitest";
import PostDetailPage from "./page";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

afterEach(cleanup);

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
  }),
}));

vi.mock("next-auth/react", () => ({
  useSession: () => ({
    data: { user: { name: "Test User", id: "user_1" } },
    status: "authenticated",
  }),
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

import { Suspense } from "react";

test("renders post detail page loading state", async () => {
  render(
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={<div>Suspense Loading...</div>}>
        <PostDetailPage params={Promise.resolve({ postId: "post_1" })} />
      </Suspense>
    </QueryClientProvider>
  );
  
  expect(await screen.findByText("Suspense Loading...")).toBeDefined();
});
