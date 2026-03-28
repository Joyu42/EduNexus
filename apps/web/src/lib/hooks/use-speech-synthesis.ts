import { useState, useEffect, useCallback, useRef } from "react";

type SpeakingKind = "word" | "example" | null;

interface UseSpeechSynthesisReturn {
  speak: (text: string, kind: "word" | "example") => void;
  cancel: () => void;
  isSupported: boolean;
  speakingKind: SpeakingKind;
}

export function useSpeechSynthesis(): UseSpeechSynthesisReturn {
  const [speakingKind, setSpeakingKind] = useState<SpeakingKind>(null);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const voicesLoadedRef = useRef(false);

  const isSupported =
    typeof window !== "undefined" &&
    window.speechSynthesis != null;

  useEffect(() => {
    if (!isSupported) return;

    let timeoutId: ReturnType<typeof setTimeout>;

    const loadVoices = () => {
      voicesRef.current = window.speechSynthesis.getVoices();
      if (voicesRef.current.length > 0) {
        voicesLoadedRef.current = true;
        clearTimeout(timeoutId);
      }
    };

    window.speechSynthesis.addEventListener("voiceschanged", loadVoices, {
      once: true,
    });
    loadVoices();

    if (voicesRef.current.length === 0) {
      timeoutId = setTimeout(() => {
        voicesLoadedRef.current = true;
      }, 5000);
    }

    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
      clearTimeout(timeoutId);
    };
  }, [isSupported]);

  useEffect(() => {
    if (!isSupported) return;

    return () => {
      window.speechSynthesis.cancel();
    };
  }, [isSupported]);

  useEffect(() => {
    if (!speakingKind) return;
    const timeoutId = setTimeout(() => setSpeakingKind(null), 15000);
    return () => clearTimeout(timeoutId);
  }, [speakingKind]);

  const getEnglishVoice = useCallback((): SpeechSynthesisVoice | null => {
    const voices = voicesRef.current;
    if (voices.length === 0) return null;

    const englishVoice = voices.find((v) => v.lang.startsWith("en"));
    return englishVoice ?? voices[0] ?? null;
  }, []);

  const speak = useCallback(
    (text: string, kind: "word" | "example") => {
      if (!isSupported) return;
      if (!text || text.trim() === "") return;

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";

      const voice = getEnglishVoice();
      if (voice) {
        utterance.voice = voice;
      }

      utterance.onstart = () => setSpeakingKind(kind);
      utterance.onend = () => setSpeakingKind(null);
      utterance.onerror = () => setSpeakingKind(null);

      window.speechSynthesis.speak(utterance);
    },
    [isSupported, getEnglishVoice]
  );

  const cancel = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    setSpeakingKind(null);
  }, [isSupported]);

  return {
    speak,
    cancel,
    isSupported,
    speakingKind,
  };
}
