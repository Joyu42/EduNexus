// @vitest-environment jsdom
import React from "react";
import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { WordCard } from "./word-card";
import { useSpeechSynthesis } from "@/lib/hooks/use-speech-synthesis";

vi.mock("@/lib/hooks/use-speech-synthesis", () => ({
  useSpeechSynthesis: vi.fn(),
}));

const mockSpeak = vi.fn();
const mockCancel = vi.fn();

const baseWord = {
  phonetic: "/test/",
  example: "example",
  bookId: "book",
  difficulty: "easy" as const,
  definition: "test definition",
};

describe("WordCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useSpeechSynthesis as any).mockReturnValue({
      speak: mockSpeak,
      cancel: mockCancel,
      isSupported: true,
      speakingKind: null,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("resets definition visibility when the word changes", () => {
    const wordA = { ...baseWord, id: "a", word: "alpha", definition: "definition-a" };
    const wordB = { ...baseWord, id: "b", word: "beta", definition: "definition-b" };

    const { rerender } = render(React.createElement(WordCard, { word: wordA, showDefinition: false }));

    fireEvent.click(screen.getByRole("button", { name: /释义/i }));
    expect(screen.getByText("definition-a")).toBeDefined();

    rerender(React.createElement(WordCard, { word: wordB, showDefinition: false }));
    expect(screen.queryByText("definition-b")).toBeNull();
  });

  it("calls speak with word when pronounce word button is clicked", () => {
    const word = { ...baseWord, id: "1", word: "test word" };
    render(<WordCard word={word} />);

    const pronounceBtn = screen.getByRole("button", { name: "pronounce word" });
    fireEvent.click(pronounceBtn);

    expect(mockSpeak).toHaveBeenCalledWith("test word", "word");
  });

  it("calls speak with example when pronounce example button is clicked", () => {
    const word = { ...baseWord, id: "1", word: "test", example: "this is an example" };
    render(<WordCard word={word} showExample={true} />);

    const exampleBtn = screen.getByRole("button", { name: "pronounce example" });
    fireEvent.click(exampleBtn);

    expect(mockSpeak).toHaveBeenCalledWith("this is an example", "example");
  });

  it("does not render pronounce example button when example is empty", () => {
    const word = { ...baseWord, id: "1", word: "test", example: "" };
    render(<WordCard word={word} showExample={true} />);

    expect(screen.queryByRole("button", { name: "pronounce example" })).toBeNull();
  });

  it("disables both pronunciation buttons when speaking is active", () => {
    (useSpeechSynthesis as any).mockReturnValue({
      speak: mockSpeak,
      cancel: mockCancel,
      isSupported: true,
      speakingKind: "word",
    });

    const word = { ...baseWord, id: "1", word: "test", example: "test example" };
    render(<WordCard word={word} showExample={true} />);

    const wordBtn = screen.getByRole("button", { name: "pronounce word" }) as HTMLButtonElement;
    const exampleBtn = screen.getByRole("button", { name: "pronounce example" }) as HTMLButtonElement;

    expect(wordBtn.disabled).toBe(true);
    expect(exampleBtn.disabled).toBe(true);
  });

  it("disables pronunciation buttons when speech synthesis is not supported", () => {
    (useSpeechSynthesis as any).mockReturnValue({
      speak: mockSpeak,
      cancel: mockCancel,
      isSupported: false,
      speakingKind: null,
    });

    const word = { ...baseWord, id: "1", word: "test", example: "test example" };
    render(<WordCard word={word} showExample={true} />);

    const wordBtn = screen.getByRole("button", { name: "pronounce word" }) as HTMLButtonElement;
    const exampleBtn = screen.getByRole("button", { name: "pronounce example" }) as HTMLButtonElement;

    expect(wordBtn.disabled).toBe(true);
    expect(exampleBtn.disabled).toBe(true);
  });
});
