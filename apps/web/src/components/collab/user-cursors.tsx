"use client";

import { useEffect, useState } from "react";
import type { CollabCursor } from "@/lib/collab/collab-types";

interface UserCursorsProps {
  cursors: CollabCursor[];
  editorElement?: HTMLElement | null;
}

export function UserCursors({ cursors, editorElement }: UserCursorsProps) {
  const [cursorPositions, setCursorPositions] = useState<
    Map<string, { x: number; y: number }>
  >(new Map());

  useEffect(() => {
    if (!editorElement) return;

    // 计算光标在屏幕上的位置
    const positions = new Map<string, { x: number; y: number }>();

    cursors.forEach((cursor) => {
      // 这里简化处理，实际应该根据编辑器的行列计算精确位置
      const x = cursor.position.column * 8; // 假设每个字符宽度 8px
      const y = cursor.position.line * 20; // 假设每行高度 20px

      positions.set(cursor.userId, { x, y });
    });

    setCursorPositions(positions);
  }, [cursors, editorElement]);

  return (
    <>
      {cursors.map((cursor) => {
        const position = cursorPositions.get(cursor.userId);
        if (!position) return null;

        return (
          <div
            key={cursor.userId}
            className="absolute pointer-events-none z-50"
            style={{
              left: `${position.x}px`,
              top: `${position.y}px`,
              transform: "translate(-50%, -100%)",
            }}
          >
            {/* 光标标签 */}
            <div
              className="px-2 py-1 rounded text-xs text-white whitespace-nowrap mb-1"
              style={{ backgroundColor: cursor.color }}
            >
              {cursor.userName}
            </div>

            {/* 光标线 */}
            <div
              className="w-0.5 h-5"
              style={{ backgroundColor: cursor.color }}
            />

            {/* 选区高亮 */}
            {cursor.selection && (
              <div
                className="absolute opacity-20"
                style={{
                  backgroundColor: cursor.color,
                  left: 0,
                  top: 0,
                  width: `${
                    (cursor.selection.end.column - cursor.selection.start.column) * 8
                  }px`,
                  height: `${
                    (cursor.selection.end.line - cursor.selection.start.line + 1) * 20
                  }px`,
                }}
              />
            )}
          </div>
        );
      })}
    </>
  );
}
