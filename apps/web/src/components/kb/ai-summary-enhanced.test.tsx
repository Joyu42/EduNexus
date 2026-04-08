// @vitest-environment jsdom

import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AISummaryEnhanced } from "./ai-summary-enhanced";

const routerPushMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPushMock }),
}));

vi.mock("framer-motion", async () => {
  const React = await import("react");
  return {
    motion: new Proxy({}, { get: (_target, prop) => (props: any) => React.createElement(String(prop), props) }),
    AnimatePresence: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
  };
});

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, ...rest }: any) => React.createElement("button", { onClick, ...rest }, children),
}));

vi.mock("@/components/ui/progress", () => ({
  Progress: ({ value }: any) => React.createElement("div", { "data-testid": "progress", "data-value": value }),
}));

vi.mock("@/lib/client/model-config", () => ({
  getModelConfig: () => ({ apiKey: "", apiEndpoint: "", model: "", temperature: 0 }),
}));

describe("AISummaryEnhanced", () => {
  it("passes the active KB document id into the workspace handoff path", () => {
    routerPushMock.mockClear();

    render(
      <AISummaryEnhanced
        document={{
          id: "doc-99",
          title: "Doc 99",
          content: "# Title",
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          vaultId: "vault-1",
        }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "去学习工作区继续提问与总结" }));
    expect(routerPushMock).toHaveBeenCalledWith("/workspace?doc=doc-99");
  });
});
