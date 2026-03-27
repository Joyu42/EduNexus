// @vitest-environment jsdom
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { expect, test, vi, beforeEach } from "vitest";
import AnalyticsPage from "./page";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mockUseSession = vi.fn();

vi.mock("next-auth/react", () => ({
  useSession: () => mockUseSession(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

let queryClient: QueryClient;

beforeEach(() => {
  queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  global.fetch = vi.fn();
});

test("renders LoginPrompt when unauthenticated", () => {
  mockUseSession.mockReturnValue({ status: "unauthenticated" });
  render(
    <QueryClientProvider client={queryClient}>
      <AnalyticsPage />
    </QueryClientProvider>
  );
  expect(screen.getByText("请先登录")).toBeDefined(); 
});

test("renders analytics dashboard mapping response envelope correctly when authenticated", async () => {
  mockUseSession.mockReturnValue({ status: "authenticated" });
  
  // Mock fetch to return the expected envelope shape
  (global.fetch as any).mockImplementation((url: string) => {
    if (url.includes("/api/analytics/reports")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            report: {
              range: "weekly",
              window: { start: "2023-01-01", end: "2023-01-07", days: 7 },
              totals: {
                eventCount: 99,
                snapshotCount: 2,
                uniqueEventNames: 1,
                uniqueEventCategories: 1,
                latestSnapshotMetrics: {},
                aggregateSnapshotMetrics: {}
              },
              timeline: [],
              topEvents: [],
              topCategories: []
            }
          }
        })
      });
    }
    if (url.includes("/api/analytics/insights")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            insights: [
              {
                id: "activity-volume",
                title: "Mock Insight",
                description: "This is a mocked insight description.",
                severity: "positive"
              }
            ]
          }
        })
      });
    }
    return Promise.reject(new Error("Not found"));
  });

  render(
    <QueryClientProvider client={queryClient}>
      <AnalyticsPage />
    </QueryClientProvider>
  );
  
  expect(screen.getByText("数据概览")).toBeDefined();
  
  // Wait for the data to load and render the values mapped from the envelope
  await waitFor(() => {
    // 99 comes from eventCount inside the `{ success: true, data: { report: ... } }` payload
    expect(screen.getByText("99")).toBeDefined();
    expect(screen.getByText("Mock Insight")).toBeDefined();
  });
});
