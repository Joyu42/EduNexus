// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen, fireEvent, waitFor, within, cleanup } from "@testing-library/react";
import { JourneyShell } from "./journey-shell";

const mockRouterPush = vi.fn();
const mockFetch = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
}));

function createMockResponse(data: unknown) {
  return {
    ok: true,
    json: () => Promise.resolve(data),
  } as Response;
}

describe("JourneyShell", () => {
  beforeEach(() => {
    mockRouterPush.mockClear();
    mockFetch.mockClear();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    cleanup();
  });

  async function flush() {
    await act(async () => {
      await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    });
  }

  it("renders loading skeleton while fetching", () => {
    mockFetch.mockImplementation(() => new Promise(() => {}));
    render(<JourneyShell />);

    const loadingCard = document.querySelector(".animate-pulse");
    expect(loadingCard).toBeTruthy();
  });

  it("shows empty state when packs array is empty", async () => {
    mockFetch.mockResolvedValue(createMockResponse({ packs: [] }));
    render(<JourneyShell />);
    await flush();

    expect(screen.queryAllByText("暂无学习包").length).toBeGreaterThan(0);
  });

  it("shows empty state when fetch returns error", async () => {
    mockFetch.mockResolvedValue(createMockResponse({ error: "Server error" }));
    render(<JourneyShell />);
    await flush();

    expect(screen.queryAllByText("暂无学习包").length).toBeGreaterThan(0);
  });

  it("renders single pack as active pack", async () => {
    const mockPacks = [
      {
        packId: "lp_java_001",
        title: "Java 学习包",
        topic: "Java",
        stage: "understood" as const,
        totalStudyMinutes: 45,
        updatedAt: new Date().toISOString(),
        moduleCount: 5,
        currentModule: {
          moduleId: "mod_1",
          title: "变量与类型",
          kbDocumentId: "doc_123",
          stage: "understood" as const,
          studyMinutes: 12,
          order: 1,
        },
      },
    ];

    mockFetch.mockResolvedValue(createMockResponse({ packs: mockPacks }));
    render(<JourneyShell />);
    await flush();

    expect(screen.getByText("Java 学习包")).toBeTruthy();
    expect(screen.getByText("理解中")).toBeTruthy(); // stage badge
  });

  it("renders active pack plus history section when multiple packs exist", async () => {
    const mockPacks = [
      {
        packId: "lp_java_002",
        title: "Java 进阶",
        topic: "Java",
        stage: "applied" as const,
        totalStudyMinutes: 90,
        updatedAt: new Date().toISOString(),
        moduleCount: 8,
        currentModule: {
          moduleId: "mod_new",
          title: "并发编程",
          kbDocumentId: "doc_456",
          stage: "applied" as const,
          studyMinutes: 20,
          order: 5,
        },
      },
      {
        packId: "lp_java_001",
        title: "Java 入门",
        topic: "Java",
        stage: "mastered" as const,
        totalStudyMinutes: 45,
        updatedAt: new Date(Date.now() - 86400000).toISOString(),
        moduleCount: 5,
        currentModule: {
          moduleId: "mod_old",
          title: "变量与类型",
          kbDocumentId: "doc_123",
          stage: "mastered" as const,
          studyMinutes: 12,
          order: 1,
        },
      },
    ];

    mockFetch.mockResolvedValue(createMockResponse({ packs: mockPacks }));
    render(<JourneyShell />);
    await flush();

    expect(screen.getByText("Java 进阶")).toBeTruthy();
    expect(screen.getByText("应用中")).toBeTruthy();

    expect(screen.getByText("历史 (1)")).toBeTruthy();
    expect(screen.getByText("Java 入门")).toBeTruthy();
    expect(screen.getByText("已掌握")).toBeTruthy();
  });

  it("navigates to graph path when clicking 图谱 button on active pack", async () => {
    const mockPacks = [
      {
        packId: "lp_java_001",
        title: "Java 学习包",
        topic: "Java",
        stage: "understood" as const,
        totalStudyMinutes: 45,
        updatedAt: new Date().toISOString(),
        moduleCount: 5,
        currentModule: {
          moduleId: "mod_1",
          title: "变量与类型",
          kbDocumentId: "doc_123",
          stage: "understood" as const,
          studyMinutes: 12,
          order: 1,
        },
      },
    ];

    mockFetch.mockResolvedValue(createMockResponse({ packs: mockPacks }));
    render(<JourneyShell />);
    await flush();

    const graphButtons = screen.getAllByRole("button", { name: /图谱/ });
    fireEvent.click(graphButtons[0]);

    expect(mockRouterPush).toHaveBeenCalledWith(
      "/graph?view=path&packId=lp_java_001"
    );
  });

  it("navigates to KB doc when clicking 进入知识库 on active pack with doc", async () => {
    const mockPacks = [
      {
        packId: "lp_java_001",
        title: "Java 学习包",
        topic: "Java",
        stage: "understood" as const,
        totalStudyMinutes: 45,
        updatedAt: new Date().toISOString(),
        moduleCount: 5,
        currentModule: {
          moduleId: "mod_1",
          title: "变量与类型",
          kbDocumentId: "doc_123",
          stage: "understood" as const,
          studyMinutes: 12,
          order: 1,
        },
      },
    ];

    mockFetch.mockResolvedValue(createMockResponse({ packs: mockPacks }));
    render(<JourneyShell />);
    await flush();

    const kbButton = screen.getAllByRole("button", { name: /进入知识库/ })[0];
    fireEvent.click(kbButton);

    expect(mockRouterPush).toHaveBeenCalledWith("/kb?doc=doc_123");
  });

  it("renders active pack by explicit marker even when not first", async () => {
    const mockPacks = [
      {
        packId: "lp_history_1",
        title: "历史学习包",
        topic: "Java",
        active: false,
        stage: "mastered" as const,
        totalStudyMinutes: 10,
        updatedAt: new Date(Date.now() - 86400000).toISOString(),
        moduleCount: 1,
        currentModule: {
          moduleId: "m1",
          title: "旧模块",
          kbDocumentId: "doc_old",
          stage: "mastered" as const,
          studyMinutes: 10,
          order: 0,
        },
      },
      {
        packId: "lp_active_1",
        title: "当前学习包（真正 active）",
        topic: "Java",
        active: true,
        stage: "understood" as const,
        totalStudyMinutes: 0,
        updatedAt: new Date().toISOString(),
        moduleCount: 1,
        currentModule: {
          moduleId: "m2",
          title: "新模块",
          kbDocumentId: "doc_new",
          stage: "understood" as const,
          studyMinutes: 0,
          order: 0,
        },
      },
    ];

    mockFetch.mockResolvedValue(createMockResponse({ packs: mockPacks }));
    render(<JourneyShell />);
    await flush();

    expect(screen.getByText("当前学习包（真正 active）")).toBeTruthy();
    expect(screen.getByText("历史 (1)")).toBeTruthy();

    const historyHeader = screen.getByText("历史 (1)");
    const historyList = historyHeader.parentElement?.nextElementSibling;
    expect(historyList).toBeTruthy();
    expect(within(historyList as HTMLElement).getByText("历史学习包")).toBeTruthy();
    expect(within(historyList as HTMLElement).queryByText("当前学习包（真正 active）")).toBeNull();
  });

  it("navigates to graph when clicking 图谱 on history pack", async () => {
    const mockPacks = [
      {
        packId: "lp_java_002",
        title: "Java 进阶",
        topic: "Java",
        stage: "applied" as const,
        totalStudyMinutes: 90,
        updatedAt: new Date().toISOString(),
        moduleCount: 8,
        currentModule: {
          moduleId: "mod_new",
          title: "并发编程",
          kbDocumentId: "doc_456",
          stage: "applied" as const,
          studyMinutes: 20,
          order: 5,
        },
      },
      {
        packId: "lp_java_001",
        title: "Java 入门",
        topic: "Java",
        stage: "mastered" as const,
        totalStudyMinutes: 45,
        updatedAt: new Date(Date.now() - 86400000).toISOString(),
        moduleCount: 5,
        currentModule: {
          moduleId: "mod_old",
          title: "变量与类型",
          kbDocumentId: "doc_123",
          stage: "mastered" as const,
          studyMinutes: 12,
          order: 1,
        },
      },
    ];

    mockFetch.mockResolvedValue(createMockResponse({ packs: mockPacks }));
    render(<JourneyShell />);
    await flush();

    const historyHeader = screen.getByText("历史 (1)");
    const historyList = historyHeader.parentElement?.nextElementSibling;
    expect(historyList).toBeTruthy();
    const graphButtons = within(historyList as HTMLElement).getAllByRole("button", { name: /图谱/ });
    fireEvent.click(graphButtons[0]);

    expect(mockRouterPush).toHaveBeenCalledWith(
      "/graph?view=path&packId=lp_java_001"
    );
  });

  it("shows current module title and study minutes for active pack", async () => {
    const mockPacks = [
      {
        packId: "lp_java_001",
        title: "Java 学习包",
        topic: "Java",
        stage: "understood" as const,
        totalStudyMinutes: 45,
        updatedAt: new Date().toISOString(),
        moduleCount: 5,
        currentModule: {
          moduleId: "mod_1",
          title: "变量与类型",
          kbDocumentId: "doc_123",
          stage: "understood" as const,
          studyMinutes: 12,
          order: 1,
        },
      },
    ];

    mockFetch.mockResolvedValue(createMockResponse({ packs: mockPacks }));
    render(<JourneyShell />);
    await flush();

    expect(screen.queryAllByText("当前: 变量与类型").length).toBeGreaterThan(0);
    expect(screen.queryAllByText("12m").length).toBeGreaterThan(0);
  });

  it("gracefully handles packs with null currentModule", async () => {
    const mockPacks = [
      {
        packId: "lp_empty_001",
        title: "空学习包",
        topic: "Test",
        stage: "seen" as const,
        totalStudyMinutes: 0,
        updatedAt: new Date().toISOString(),
        moduleCount: 0,
        currentModule: null,
      },
    ];

    mockFetch.mockResolvedValue(createMockResponse({ packs: mockPacks }));
    render(<JourneyShell />);
    await flush();

    expect(screen.getByText("空学习包")).toBeTruthy();
    expect(screen.getByText("查看")).toBeTruthy();
  });

  it("does not show history section when only one pack exists", async () => {
    const mockPacks = [
      {
        packId: "lp_java_001",
        title: "Java 学习包",
        topic: "Java",
        stage: "understood" as const,
        totalStudyMinutes: 45,
        updatedAt: new Date().toISOString(),
        moduleCount: 5,
        currentModule: {
          moduleId: "mod_1",
          title: "变量与类型",
          kbDocumentId: "doc_123",
          stage: "understood" as const,
          studyMinutes: 12,
          order: 1,
        },
      },
    ];

    mockFetch.mockResolvedValue(createMockResponse({ packs: mockPacks }));
    render(<JourneyShell />);
    await flush();

    expect(screen.queryAllByText(/历史/).length).toBeLessThanOrEqual(1);
  });
});
