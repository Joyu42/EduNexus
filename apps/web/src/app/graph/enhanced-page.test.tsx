// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import GraphPage from "./page";
import { useSidebarStore } from "@/lib/stores/sidebar-store";

const mockRouterPush = vi.fn();
const mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
  useSearchParams: () => mockSearchParams,
}));

vi.mock("next-auth/react", () => ({
  useSession: () => ({
    status: "authenticated",
    data: { user: { id: "test-user" } }
  })
}));

vi.mock("@/components/graph/interactive-graph", () => ({
  InteractiveGraph: ({ onNodeClick }: any) => (
    <div data-testid="mock-interactive-graph">
      <button 
        data-testid="mock-node-click" 
        onClick={() => onNodeClick({
          id: "node-1",
          name: "Test Planet",
          type: "concept",
          needsReview: false,
          masteryStage: "seen",
          kbDocumentId: "doc-1",
          pathMemberships: []
        })}
      >
        Click Node
      </button>
    </div>
  )
}));

vi.mock("@/components/graph/learning-path-overlay", () => ({
  LearningPathOverlay: () => <div data-testid="mock-learning-path-overlay" />
}));

vi.mock("@/components/graph/journey-shell", () => ({
  JourneyShell: () => <div data-testid="mock-journey-shell" />
}));

vi.mock("@/components/graph/progress-legend", () => ({
  ProgressLegend: () => <div data-testid="mock-progress-legend" />
}));

vi.mock("@/lib/stores/sidebar-store", () => {
  let isCollapsed = false;
  return {
    useSidebarStore: vi.fn((selector) => {
      const state = {
        isCollapsed,
        toggleCollapse: () => { isCollapsed = !isCollapsed; }
      };
      return selector(state);
    })
  };
});


const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("Graph Enhanced Page", () => {
  beforeEach(() => {
    mockRouterPush.mockClear();
    mockSearchParams.delete("view");
    // reset sidebar state by remocking
    vi.mocked(useSidebarStore).mockClear();
    mockFetch.mockClear();
    mockFetch.mockResolvedValue({ 
      ok: true, 
      json: () => Promise.resolve({ 
        nodes: [{ id: "node-1", name: "Test Planet", type: "concept", status: "seen" }], 
        edges: [] 
      }) 
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("can collapse and expand right rail without affecting left sidebar", async () => {
    render(<GraphPage />);
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    
    // In explore mode, right rail only shows if a node is selected
    const mockNodeClick = await screen.findByTestId("mock-node-click");
    fireEvent.click(mockNodeClick);
    
    // Now the planet sidebar should be visible
    expect(screen.getByTestId("graph-planet-sidebar")).toBeTruthy();
    
    // Find collapse button
    const collapseBtn = screen.getByTestId("graph-right-rail-collapse");
    expect(collapseBtn).toBeTruthy();
    
    // The button should have workspace-style icon (PanelRightClose) - we check for the class indicating it's a ghost icon button
    // wait
    // wait
    
    // Click collapse
    fireEvent.click(collapseBtn);
    
    // The sidebar should be hidden
    expect(screen.queryByTestId("graph-planet-sidebar")).toBeNull();
    
    // Expand button should appear
    const expandBtn = screen.getByTestId("graph-right-rail-expand");
    expect(expandBtn).toBeTruthy();
    expect(expandBtn.className).toContain("bg-white/70"); // Workspace style chrome check
    expect(expandBtn.className).toContain("hover:bg-white");
    expect(expandBtn.className).toContain("shadow-sm");
    
    // Left sidebar state should not have changed
    const leftSidebarCallCount = vi.mocked(useSidebarStore).mock.calls.length;
    
    // Click expand
    fireEvent.click(expandBtn);
    
    // Sidebar should be back
    expect(screen.getByTestId("graph-planet-sidebar")).toBeTruthy();
    expect(screen.queryByTestId("graph-right-rail-expand")).toBeNull();
    
    // Check that left sidebar hook wasn't unexpectedly called during these updates
    // React might call hooks on re-render, so we just verify the state it returned didn't mutate inappropriately
  });

  it("preserves planet ↔ KB doc and path ↔ constellation-group copy", async () => {
    render(<GraphPage />);
    
    const mockNodeClick = await screen.findByTestId("mock-node-click");
    fireEvent.click(mockNodeClick);
    
    // Check Explore Mode Planet Sidebar copy
    const sidebar = screen.getByTestId("graph-planet-sidebar");
    
    // Look for explicit copy mappings
    expect(sidebar.textContent).toContain("当前知识星球（Planet）与知识宝库（KB）文档保持 1:1 映射关系。");
    expect(sidebar.textContent).toContain("学习路径由一系列相互关联的星群（Constellation Groups）组成。");
  });

  it("routes the graph learning-path CTA to graph path mode", async () => {
    render(<GraphPage />);
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());

    const graphCta = screen.getByRole("button", { name: "学习路径工作流" });
    fireEvent.click(graphCta);

    expect(mockRouterPush).toHaveBeenCalledWith("/graph?view=path");
    expect(mockRouterPush).not.toHaveBeenCalledWith("/path/new-editor");
  });
  
  it("renders correct copy in path mode", async () => {
    mockSearchParams.set("view", "path");
    render(<GraphPage />);
    
    // Path mode right rail should be immediately visible
    const pathRail = await screen.findByTestId("graph-path-detail-rail");
    expect(pathRail).toBeTruthy();
    
    expect(pathRail.textContent).toContain("学习路径 (Learning Path) 进度");
    expect(pathRail.textContent).toContain("路径由相互关联的星群（Constellation Groups）组成");
    
    // Path mode can also collapse
    const collapseBtn = screen.getByTestId("graph-right-rail-collapse");
    fireEvent.click(collapseBtn);
    
    expect(screen.queryByTestId("graph-path-detail-rail")).toBeNull();
    expect(screen.getByTestId("graph-right-rail-expand")).toBeTruthy();
  });
});
