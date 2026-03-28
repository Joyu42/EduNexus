// @vitest-environment jsdom
import React from "react";
import { render, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { useSpeechSynthesis } from "./use-speech-synthesis";

const mockSpeechSynthesisInstance = {
  cancel: vi.fn(),
  speak: vi.fn(),
  getVoices: vi.fn().mockReturnValue([]),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
};

class MockSpeechSynthesisUtterance {
  text: string;
  lang: string;
  voice: SpeechSynthesisVoice | null = null;
  onstart: ((this: SpeechSynthesisUtterance, ev: SpeechSynthesisEvent) => void) | null = null;
  onend: ((this: SpeechSynthesisUtterance, ev: SpeechSynthesisEvent) => void) | null = null;
  onerror: ((this: SpeechSynthesisUtterance, ev: SpeechSynthesisErrorEvent) => void) | null = null;

  constructor(text: string) {
    this.text = text;
    this.lang = "en-US";
  }
}

function TestComponent({
  onRender,
}: {
  onRender: (props: {
    isSupported: boolean;
    speakingKind: string | null;
    speak: (text: string, kind: "word" | "example") => void;
    cancel: () => void;
  }) => void;
}) {
  const hook = useSpeechSynthesis();
  React.useEffect(() => {
    onRender(hook);
  });
  return null;
}

describe("useSpeechSynthesis", () => {
  let originalSpeechSynthesis: typeof window.speechSynthesis;

  beforeEach(() => {
    vi.clearAllMocks();
    originalSpeechSynthesis = window.speechSynthesis;
    (window as any).SpeechSynthesisUtterance = MockSpeechSynthesisUtterance;
    Object.defineProperty(window, "speechSynthesis", {
      value: { ...mockSpeechSynthesisInstance },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "speechSynthesis", {
      value: originalSpeechSynthesis,
      writable: true,
      configurable: true,
    });
    delete (window as any).SpeechSynthesisUtterance;
  });

  it("1. unsupported environment → isSupported === false", () => {
    Object.defineProperty(window, "speechSynthesis", {
      value: undefined,
      writable: true,
      configurable: true,
    });

    let hookValues: any;
    render(
      React.createElement(TestComponent, {
        onRender: (v) => {
          hookValues = v;
        },
      })
    );

    expect(hookValues.isSupported).toBe(false);
  });

  it("2. speak(text, 'word') calls speechSynthesis.cancel() before speechSynthesis.speak()", () => {
    const speechSynthesis = window.speechSynthesis;

    let hookValues: any;
    render(
      React.createElement(TestComponent, {
        onRender: (v) => {
          hookValues = v;
        },
      })
    );

    act(() => {
      hookValues.speak("hello", "word");
    });

    expect(speechSynthesis.cancel).toHaveBeenCalledTimes(1);
    expect(speechSynthesis.speak).toHaveBeenCalledTimes(1);
    const cancelOrder = (speechSynthesis.cancel as any).mock.invocationCallOrder[0];
    const speakOrder = (speechSynthesis.speak as any).mock.invocationCallOrder[0];
    expect(cancelOrder).toBeLessThan(speakOrder);
  });

  it("3. speak(text, 'example') calls speechSynthesis.cancel() before speechSynthesis.speak()", () => {
    const speechSynthesis = window.speechSynthesis;

    let hookValues: any;
    render(
      React.createElement(TestComponent, {
        onRender: (v) => {
          hookValues = v;
        },
      })
    );

    act(() => {
      hookValues.speak("This is an example sentence", "example");
    });

    expect(speechSynthesis.cancel).toHaveBeenCalledTimes(1);
    expect(speechSynthesis.speak).toHaveBeenCalledTimes(1);
  });

  it("4. voices available immediately → works without waiting", () => {
    const mockVoices = [
      { name: "English US", lang: "en-US", localService: true } as SpeechSynthesisVoice,
      { name: "English UK", lang: "en-GB", localService: true } as SpeechSynthesisVoice,
    ];
    window.speechSynthesis.getVoices = vi.fn().mockReturnValue(mockVoices);

    let hookValues: any;
    render(
      React.createElement(TestComponent, {
        onRender: (v) => {
          hookValues = v;
        },
      })
    );

    act(() => {
      hookValues.speak("hello", "word");
    });

    expect(window.speechSynthesis.speak).toHaveBeenCalledTimes(1);
    const utterance = (window.speechSynthesis.speak as any).mock.calls[0][0];
    expect(utterance.lang).toMatch(/^en/);
  });

  it("5. voices unavailable initially → listens for voiceschanged once, then uses voices", () => {
    const speechSynthesis = window.speechSynthesis;
    window.speechSynthesis.getVoices = vi.fn().mockReturnValue([]);

    let hookValues: any;
    render(
      React.createElement(TestComponent, {
        onRender: (v) => {
          hookValues = v;
        },
      })
    );

    expect(speechSynthesis.addEventListener).toHaveBeenCalledWith(
      "voiceschanged",
      expect.any(Function),
      { once: true }
    );

    const mockVoices = [
      { name: "English US", lang: "en-US", localService: true } as SpeechSynthesisVoice,
    ];
    act(() => {
      window.speechSynthesis.getVoices = vi.fn().mockReturnValue(mockVoices);
      const voiceschangedHandler = (speechSynthesis.addEventListener as any).mock.calls.find(
        (call: any[]) => call[0] === "voiceschanged"
      )[1];
      voiceschangedHandler();
    });

    act(() => {
      hookValues.speak("hello", "word");
    });

    expect(window.speechSynthesis.speak).toHaveBeenCalledTimes(1);
    const utterance = (window.speechSynthesis.speak as any).mock.calls[0][0];
    expect(utterance.lang).toMatch(/^en/);
  });

  it("6. unmount → calls speechSynthesis.cancel()", () => {
    const speechSynthesis = window.speechSynthesis;

    let hookValues: any;
    const { unmount } = render(
      React.createElement(TestComponent, {
        onRender: (v) => {
          hookValues = v;
        },
      })
    );

    unmount();

    expect(speechSynthesis.cancel).toHaveBeenCalledTimes(1);
  });
});
