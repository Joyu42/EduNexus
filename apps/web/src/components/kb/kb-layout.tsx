"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PanelLeftClose, PanelRightClose } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KBSidebar } from "./kb-sidebar";
import { KBEditor } from "./kb-editor";
import { KBRightPanel } from "./kb-right-panel";
import { useKBShortcuts } from "@/lib/hooks/use-kb-shortcuts";
import type { KBDocument, KBVault } from "@/lib/client/kb-storage";

interface KBLayoutProps {
  vaults: KBVault[];
  currentVault: KBVault | null;
  documents: KBDocument[];
  currentDoc: KBDocument | null;
  onVaultChange: (vaultId: string) => void;
  onCreateDocument: (title: string) => Promise<void>;
  onUpdateDocument: (doc: KBDocument) => Promise<void>;
  onDeleteDocument: (docId: string) => Promise<void>;
  onSelectDocument: (doc: KBDocument) => void;
}

export function KBLayout({
  vaults,
  currentVault,
  documents,
  currentDoc,
  onVaultChange,
  onCreateDocument,
  onUpdateDocument,
  onDeleteDocument,
  onSelectDocument,
}: KBLayoutProps) {
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);

  // 快捷键支持
  useKBShortcuts([
    {
      key: "b",
      ctrl: true,
      callback: () => setLeftSidebarOpen(prev => !prev),
    },
    {
      key: "\\",
      ctrl: true,
      callback: () => setRightPanelOpen(prev => !prev),
    },
  ]);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* 左侧边栏 */}
      <AnimatePresence mode="wait">
        {leftSidebarOpen && (
          <motion.div
            initial={{ x: -280, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -280, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="w-[280px] border-r bg-muted/30 flex-shrink-0"
          >
            <KBSidebar
              vaults={vaults}
              currentVault={currentVault}
              documents={documents}
              currentDoc={currentDoc}
              onVaultChange={onVaultChange}
              onCreateDocument={onCreateDocument}
              onDeleteDocument={onDeleteDocument}
              onSelectDocument={onSelectDocument}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 左侧边栏切换按钮 */}
      {!leftSidebarOpen && (
        <div className="absolute top-4 left-4 z-10">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLeftSidebarOpen(true)}
            className="h-8 w-8"
          >
            <PanelLeftClose className="h-4 w-4 rotate-180" />
          </Button>
        </div>
      )}

      {/* 中间编辑区 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 顶部工具栏 */}
        <div className="h-12 border-b flex items-center justify-between px-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center gap-2">
            {leftSidebarOpen && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLeftSidebarOpen(false)}
                className="h-8 w-8"
              >
                <PanelLeftClose className="h-4 w-4" />
              </Button>
            )}
            <div className="text-sm text-muted-foreground">
              {currentDoc ? currentDoc.title : "选择或创建文档"}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {rightPanelOpen && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setRightPanelOpen(false)}
                className="h-8 w-8"
              >
                <PanelRightClose className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* 编辑器 */}
        <div className="flex-1 overflow-hidden">
          <KBEditor
            document={currentDoc}
            onUpdate={onUpdateDocument}
          />
        </div>
      </div>

      {/* 右侧面板 */}
      <AnimatePresence mode="wait">
        {rightPanelOpen && (
          <motion.div
            initial={{ x: 320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 320, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="w-[320px] border-l bg-muted/30 flex-shrink-0"
          >
            <KBRightPanel document={currentDoc} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 右侧面板切换按钮 */}
      {!rightPanelOpen && (
        <div className="absolute top-4 right-4 z-10">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setRightPanelOpen(true)}
            className="h-8 w-8"
          >
            <PanelRightClose className="h-4 w-4 rotate-180" />
          </Button>
        </div>
      )}
    </div>
  );
}
