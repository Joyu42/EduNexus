// @vitest-environment jsdom

import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { KBQAAssistant } from "./kb-qa-assistant";

const { fetchMock, getModelConfigMock } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
  getModelConfigMock: vi.fn(),
}));

vi.stubGlobal("fetch", fetchMock);

vi.mock("@/lib/client/model-config", () => ({
  getModelConfig: getModelConfigMock,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardHeader: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}));

vi.mock("@/components/ui/textarea", () => ({
  Textarea: ({ ...props }: any) => <textarea {...props} />,
}));

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}));

vi.mock("@/components/markdown-renderer", () => ({
  MarkdownRenderer: ({ content }: { content: string }) => <div>{content}</div>,
}));

describe("KBQAAssistant", () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
    fetchMock.mockReset();
    getModelConfigMock.mockReset();
    fetchMock.mockResolvedValue({
      json: async () => ({ success: true, answer: "OK" }),
    });
    getModelConfigMock.mockReturnValue({
      apiKey: "stored-client-key",
      apiEndpoint: "https://api-inference.modelscope.cn/v1",
      model: "Qwen/Qwen3.5-122B-A10B",
      temperature: 0.7,
      topP: 0.9,
      maxTokens: 2000,
    });
  });

  it("sends the same model config payload shape as the workspace flow", async () => {
    render(
      <KBQAAssistant
        documents={[
          {
            id: "doc-1",
            title: "Doc 1",
            content: "Knowledge base content",
            tags: [],
            createdAt: new Date(),
            updatedAt: new Date(),
            vaultId: "vault-1",
          },
        ]}
      />
    );

    fireEvent.change(screen.getByPlaceholderText("基于知识库提问..."), {
      target: { value: "帮我总结一下" },
    });
    fireEvent.click(screen.getAllByRole("button").at(-1)!);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const payload = JSON.parse(String(init.body));

    expect(payload.config).toEqual({
      apiKey: "stored-client-key",
      apiEndpoint: "https://api-inference.modelscope.cn/v1",
      modelName: "Qwen/Qwen3.5-122B-A10B",
      temperature: 0.7,
    });
  });
});
