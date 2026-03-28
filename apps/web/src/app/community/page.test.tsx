// @vitest-environment jsdom

import { render, screen, cleanup } from "@testing-library/react";
import { expect, test, vi, afterEach } from "vitest";
import CommunityPage from "./page";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

afterEach(cleanup);

// Mock Dialog ResizeObserver
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserver as any;
if (typeof window !== 'undefined' && !window.PointerEvent) {
  window.PointerEvent = class PointerEvent extends Event {} as any;
}

// Mock hooks
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
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

test("renders community page loading state and then lists", () => {
  render(
    <QueryClientProvider client={queryClient}>
      <CommunityPage />
    </QueryClientProvider>
  );
  
  expect(screen.getByText("加载动态中...")).toBeDefined();
});
