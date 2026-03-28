"use client";

import { useEffect, useMemo, useState } from "react";
import { KBLayout } from "@/components/kb/kb-layout";
import { LoginPrompt } from "@/components/ui/login-prompt";
import { Button } from "@/components/ui/button";
import {
  type KBDocument,
  type KBVault,
  type ServerDocument,
  fetchDocumentsFromServer,
  createDocumentOnServer,
  updateDocumentOnServer,
  deleteDocumentOnServer,
} from "@/lib/client/kb-storage";
import { useDocument } from "@/lib/ai/document-context";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { normalizeGraphToKbHandoff, resolveRequestedKbDocument } from "./handoff";
import { getKnowledgeBaseViewState } from "./view-state";

const SERVER_VAULT: KBVault = {
  id: "server-vault",
  name: "我的知识库",
  path: "/kb",
  createdAt: new Date(0),
  lastAccessedAt: new Date(0),
  isDefault: true,
};

function toKBDocument(doc: ServerDocument): KBDocument {
  return {
    id: doc.id,
    title: doc.title,
    content: doc.content,
    tags: doc.tags ?? [],
    createdAt: new Date(doc.createdAt),
    updatedAt: new Date(doc.updatedAt),
    vaultId: SERVER_VAULT.id,
  };
}

export default function KnowledgeBasePage() {
  const { setCurrentDocument } = useDocument();
  const { status } = useSession();
  
  const [documents, setDocuments] = useState<KBDocument[]>([]);
  const [currentDoc, setCurrentDoc] = useState<KBDocument | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [handoffNotice, setHandoffNotice] = useState<string | null>(null);
  const [handoffInput, setHandoffInput] = useState<{ doc: string | null; node: string | null }>({
    doc: null,
    node: null,
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    setHandoffInput({
      doc: params.get("doc"),
      node: params.get("node"),
    });
  }, []);

  const handoff = useMemo(
    () =>
      normalizeGraphToKbHandoff({
        doc: handoffInput.doc,
        node: handoffInput.node,
      }),
    [handoffInput.doc, handoffInput.node]
  );

  useEffect(() => {
    setCurrentDocument(currentDoc);
  }, [currentDoc, setCurrentDocument]);

  useEffect(() => {
    const initializeData = async () => {
      setIsLoading(true);
      setDocuments([]); 

      if (status === 'authenticated') {
        try {
          const serverDocs = await fetchDocumentsFromServer();
          const docsFromServer: KBDocument[] = serverDocs.map(toKBDocument);
          setDocuments(docsFromServer);
        } catch (error) {
          console.error("Failed to fetch documents from server:", error);
          toast.error("加载文档失败");
        }
      }
      setIsLoading(false);
    };

    initializeData();
  }, [status]);

  useEffect(() => {
    if (handoff.source !== "node" || !handoff.requestedDocumentId) {
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    const url = new URL(window.location.href);
    const params = url.searchParams;
    params.delete("node");
    params.set("doc", handoff.requestedDocumentId);
    window.history.replaceState(null, "", url.toString());

    setHandoffInput({
      doc: handoff.requestedDocumentId,
      node: null,
    });
  }, [handoff.requestedDocumentId, handoff.source]);

  useEffect(() => {
    if (status !== "authenticated" || isLoading) {
      return;
    }

    if (!handoff.requestedDocumentId) {
      setHandoffNotice(null);
      return;
    }

    const requestedDoc = resolveRequestedKbDocument(documents, handoff.requestedDocumentId);
    if (requestedDoc) {
      setCurrentDoc((previousCurrentDoc) =>
        previousCurrentDoc?.id === requestedDoc.id ? previousCurrentDoc : requestedDoc
      );
      setHandoffNotice(null);
      return;
    }

    setCurrentDoc((previousCurrentDoc) => previousCurrentDoc ?? documents[0] ?? null);
    setHandoffNotice(
      `未找到知识文档「${handoff.requestedDocumentId}」，已为你保留当前文档视图。`
    );
  }, [documents, handoff.requestedDocumentId, isLoading, status]);

  const handleCreateDocument = async (title: string) => {
    if (status !== 'authenticated') {
      toast.error('请先登录');
      return;
    }

    try {
      const newDocFromServer = await createDocumentOnServer(title, '# 新建文档\n');
      const newDoc = toKBDocument(newDocFromServer);
      setDocuments(prev => [...prev, newDoc]);
      setCurrentDoc(newDoc);
    } catch (error) {
      console.error("Failed to create document on server:", error);
      const message = error instanceof Error ? error.message : '创建文档失败';
      toast.error(message);
    }
  };
  
  const handleSelectDocument = (doc: KBDocument) => {
    setCurrentDoc(doc);
  };

  const handleVaultChange = (vaultId: string) => {
    if (vaultId !== SERVER_VAULT.id) {
      toast.error("当前版本仅支持默认知识库");
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    try {
      await deleteDocumentOnServer(docId);
      setDocuments((prev) => {
        const nextDocuments = prev.filter((doc) => doc.id !== docId);
        setCurrentDoc((previousCurrentDoc) => {
          if (previousCurrentDoc?.id !== docId) {
            return previousCurrentDoc;
          }

          return nextDocuments[0] ?? null;
        });
        return nextDocuments;
      });
      toast.success("文档已删除");
    } catch (error) {
      console.error("Failed to delete document on server:", error);
      const message = error instanceof Error ? error.message : "删除文档失败";
      toast.error(message);
    }
  };

  const handleDeleteDocuments = async (docIds: string[]) => {
    const uniqueIds = Array.from(new Set(docIds)).filter(Boolean);
    if (uniqueIds.length === 0) {
      return;
    }

    let deletedCount = 0;
    for (const docId of uniqueIds) {
      try {
        await deleteDocumentOnServer(docId);
        deletedCount += 1;
      } catch (error) {
        console.error(`Failed to delete document ${docId}:`, error);
      }
    }

    if (deletedCount === 0) {
      toast.error("批量删除失败");
      return;
    }

    setDocuments((prev) => {
      const deleteSet = new Set(uniqueIds);
      const nextDocuments = prev.filter((doc) => !deleteSet.has(doc.id));
      setCurrentDoc((previousCurrentDoc) => {
        if (!previousCurrentDoc || !deleteSet.has(previousCurrentDoc.id)) {
          return previousCurrentDoc;
        }
        return nextDocuments[0] ?? null;
      });
      return nextDocuments;
    });

    toast.success(`已删除 ${deletedCount} 篇文档`);
  };

  const handleUpdateDocument = async (doc: KBDocument) => {
    try {
      const updatedFromServer = await updateDocumentOnServer(doc.id, {
        title: doc.title,
        content: doc.content,
        tags: doc.tags,
      });
      const updatedDoc = toKBDocument(updatedFromServer);

      setDocuments((prev) =>
        prev.map((existingDoc) =>
          existingDoc.id === updatedDoc.id ? updatedDoc : existingDoc
        )
      );

      setCurrentDoc((previousCurrentDoc) =>
        previousCurrentDoc?.id === updatedDoc.id ? updatedDoc : previousCurrentDoc
      );
    } catch (error) {
      console.error("Failed to update document on server:", error);
      const message = error instanceof Error ? error.message : "更新文档失败";
      toast.error(message);
    }
  };

  if (status === 'loading') {
    return <div>Loading Authentication...</div>;
  }
  
  if (status === 'unauthenticated') {
    return <LoginPrompt title="知识宝库" />;
  }

  const viewState = getKnowledgeBaseViewState({
    status,
    isLoading,
    documents,
  });

  if (viewState.kind === "loading") {
    return <div>Loading Knowledge Base...</div>;
  }

  if (viewState.kind === "empty") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="max-w-md rounded-3xl border bg-card p-10 text-center shadow-sm">
          <h1 className="text-2xl font-semibold text-foreground">{viewState.title}</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{viewState.description}</p>
          {handoffNotice ? (
            <p className="mt-4 rounded-xl border border-amber-300/70 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
              {handoffNotice}
            </p>
          ) : null}
          <div className="mt-6">
            <Button
              data-testid="kb-empty-create-first-document"
              onClick={() => void handleCreateDocument("我的第一篇文档")}
            >
              创建第一篇文档
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <>
      {handoffNotice ? (
        <div className="border-b border-amber-300/70 bg-amber-50 px-4 py-2 text-xs text-amber-800">
          {handoffNotice}
        </div>
      ) : null}
      <KBLayout
        vaults={[SERVER_VAULT]}
        currentVault={SERVER_VAULT}
        documents={documents}
        currentDoc={currentDoc}
        onVaultChange={handleVaultChange}
        onCreateDocument={handleCreateDocument}
        onSelectDocument={handleSelectDocument}
        onDeleteDocument={handleDeleteDocument}
        onDeleteDocuments={handleDeleteDocuments}
        onUpdateDocument={handleUpdateDocument}
      />
    </>
  );
}
