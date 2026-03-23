"use client";

import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import type { WordAnswerGrade } from "@/lib/words/types";

type ReviewButtonsProps = {
  onGrade: (grade: WordAnswerGrade) => void;
  disabled?: boolean;
};

const GRADE_BUTTONS: Array<{ grade: WordAnswerGrade; label: string; variant?: "outline" | "default" }>
  = [
    { grade: "again", label: "再想想", variant: "outline" },
    { grade: "hard", label: "较难", variant: "outline" },
    { grade: "good", label: "认识" },
    { grade: "easy", label: "很熟" },
  ];

export function ReviewButtons({ onGrade, disabled }: ReviewButtonsProps) {
  useEffect(() => {
    const onKeydown = (event: KeyboardEvent) => {
      if (disabled) {
        return;
      }
      if (event.isComposing || event.repeat) {
        return;
      }
      const target = event.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (target.isContentEditable || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
          return;
        }
      }
      if (event.key === "ArrowRight") {
        onGrade("good");
      }
      if (event.key === "ArrowLeft") {
        onGrade("again");
      }
    };

    window.addEventListener("keydown", onKeydown);
    return () => window.removeEventListener("keydown", onKeydown);
  }, [disabled, onGrade]);

  return (
    <div className="grid grid-cols-2 gap-3">
      {GRADE_BUTTONS.map(({ grade, label, variant }) => (
        <motion.div key={grade} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button
            type="button"
            variant={variant === "outline" ? "outline" : "default"}
            className={
              variant === "outline"
                ? "h-12 w-full border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
                : grade === "easy"
                  ? "h-12 w-full bg-emerald-600 text-white hover:bg-emerald-700"
                  : "h-12 w-full bg-emerald-500/90 text-white hover:bg-emerald-600"
            }
            onClick={() => onGrade(grade)}
            disabled={disabled}
          >
            {label}
          </Button>
        </motion.div>
      ))}
    </div>
  );
}
