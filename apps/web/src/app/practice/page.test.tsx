/** @vitest-environment jsdom */
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import PracticeDashboardPage from "./page";
import { getPracticeStorage } from "@/lib/practice";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock("@/lib/practice", () => ({
  getPracticeStorage: vi.fn(),
}));

describe("PracticeDashboardPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders a list of available question banks", async () => {
    const mockBanks = [
      { id: "bank-1", name: "Math 101", description: "Basic Math", tags: ["math"], questionCount: 10, updatedAt: new Date() },
      { id: "bank-2", name: "History 101", description: "World History", tags: ["history"], questionCount: 5, updatedAt: new Date() },
    ];
    
    (getPracticeStorage as any).mockReturnValue({
      getAllBanks: vi.fn().mockResolvedValue(mockBanks),
    });

    render(<PracticeDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Math 101")).toBeTruthy();
      expect(screen.getByText("History 101")).toBeTruthy();
    });

    expect(screen.getByText("Basic Math")).toBeTruthy();
  });

  it("handles empty bank list gracefully", async () => {
    (getPracticeStorage as any).mockReturnValue({
      getAllBanks: vi.fn().mockResolvedValue([]),
    });

    render(<PracticeDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/没有找到题库/)).toBeTruthy();
    });
  });
});
