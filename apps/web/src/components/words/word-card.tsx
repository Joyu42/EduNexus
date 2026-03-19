"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { Word } from "@/lib/words/types";

type WordCardProps = {
  word: Word;
  showDefinition?: boolean;
  showExample?: boolean;
  mnemonic?: string;
  mnemonicLoading?: boolean;
  onGenerateMnemonic?: (word: Word) => void;
};

export function WordCard({
  word,
  showDefinition = false,
  showExample = false,
  mnemonic,
  mnemonicLoading,
  onGenerateMnemonic,
}: WordCardProps) {
  const [definitionVisible, setDefinitionVisible] = useState(showDefinition);
  const [exampleVisible, setExampleVisible] = useState(showExample);

  useEffect(() => {
    setDefinitionVisible(showDefinition);
    setExampleVisible(showExample);
  }, [word.id, showDefinition, showExample]);

  const difficultyLabel = useMemo(() => {
    if (word.difficulty === "easy") return "Easy";
    if (word.difficulty === "hard") return "Hard";
    return "Medium";
  }, [word.difficulty]);

  const pronounce = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }
    const utterance = new SpeechSynthesisUtterance(word.word);
    utterance.lang = "en-US";
    window.speechSynthesis.speak(utterance);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="perspective-1000"
    >
      <Card className="overflow-hidden border-slate-200 bg-gradient-to-br from-white via-cyan-50/40 to-emerald-50/30 shadow-md">
        <CardHeader className="space-y-3 border-b bg-white/70 pb-4">
          <div className="flex items-center justify-between gap-3">
            <span className="rounded-full bg-slate-900 px-2.5 py-1 text-xs font-medium text-white">
              {difficultyLabel}
            </span>
            <Button size="icon" variant="ghost" onClick={pronounce} aria-label="pronounce word">
              <Volume2 className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-2 text-center">
            <p className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">{word.word}</p>
            <p className="font-mono text-sm text-slate-500">{word.phonetic}</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-5">
          <div className="rounded-lg border border-cyan-200 bg-cyan-50/70 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-cyan-900">记忆技巧</p>
              {onGenerateMnemonic ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 border-cyan-300 bg-white text-cyan-800 hover:bg-cyan-100"
                  onClick={() => onGenerateMnemonic(word)}
                  disabled={mnemonicLoading}
                >
                  {mnemonicLoading ? "生成中..." : "AI 生成"}
                </Button>
              ) : null}
            </div>
            <p className="mt-2 text-sm leading-6 text-cyan-900/90">
              {mnemonic ?? "点击 AI 生成，获取这个单词的联想记忆法。"}
            </p>
          </div>

          <div className="space-y-2 rounded-lg border border-slate-200 bg-white/80 p-3">
            <button
              type="button"
              className="w-full text-left text-sm font-medium text-slate-700"
              onClick={() => setDefinitionVisible((current) => !current)}
            >
              释义 {definitionVisible ? "▲" : "▼"}
            </button>
            {definitionVisible ? (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="text-sm leading-6 text-slate-600"
              >
                {word.definition}
              </motion.p>
            ) : null}
          </div>

          <div className="space-y-2 rounded-lg border border-slate-200 bg-white/80 p-3">
            <button
              type="button"
              className="w-full text-left text-sm font-medium text-slate-700"
              onClick={() => setExampleVisible((current) => !current)}
            >
              例句 {exampleVisible ? "▲" : "▼"}
            </button>
            {exampleVisible ? (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
                <p className="text-sm leading-6 text-slate-700">{word.example}</p>
                {word.exampleZh ? <p className="mt-2 text-xs text-slate-500">{word.exampleZh}</p> : null}
              </motion.div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
