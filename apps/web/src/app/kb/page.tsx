"use client";

import { useState, useEffect } from "react";
import { KBLayout } from "@/components/kb/kb-layout";
import { LoginPrompt } from "@/components/ui/login-prompt";
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
        </div>
      </div>
    );
  }
  
  return (
    <KBLayout
      vaults={[SERVER_VAULT]}
      currentVault={SERVER_VAULT}
      documents={documents}
      currentDoc={currentDoc}
      onVaultChange={handleVaultChange}
      onCreateDocument={handleCreateDocument}
      onSelectDocument={handleSelectDocument}
      onDeleteDocument={handleDeleteDocument}
      onUpdateDocument={handleUpdateDocument}
    />
  );
}
