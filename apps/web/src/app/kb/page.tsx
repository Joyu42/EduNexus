"use client";

import { useState, useEffect } from "react";
import { KBLayout } from "@/components/kb/kb-layout";
import { LoginPrompt } from "@/components/ui/login-prompt";
import { type KBDocument, fetchDocumentsFromServer, createDocumentOnServer } from "@/lib/client/kb-storage";
import { useDocument } from "@/lib/ai/document-context";
import { useSession } from "next-auth/react";

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
          const docsFromServer: KBDocument[] = serverDocs.map((d: any) => ({
            id: d.id,
            title: d.title,
            content: d.content,
            tags: d.tags || [],
            createdAt: new Date(d.createdAt),
            updatedAt: new Date(d.updatedAt),
            vaultId: 'server-vault',
          }));
          setDocuments(docsFromServer);
        } catch (error) {
          console.error("Failed to fetch documents from server:", error);
        }
      }
      setIsLoading(false);
    };

    initializeData();
  }, [status]);

  const handleCreateDocument = async (title: string) => {
    if (status !== 'authenticated') {
      alert('请先登录！');
      return;
    }
    try {
      const newDocFromServer = await createDocumentOnServer(title, '');
      const newDoc: KBDocument = {
        id: newDocFromServer.id,
        title: newDocFromServer.title,
        content: newDocFromServer.content,
        tags: [],
        createdAt: new Date(newDocFromServer.createdAt),
        updatedAt: new Date(newDocFromServer.updatedAt),
        vaultId: 'server-vault',
      };
      setDocuments(prev => [...prev, newDoc]);
      setCurrentDoc(newDoc);
    } catch (error) {
      console.error("Failed to create document on server:", error);
      alert('创建文档失败！');
    }
  };
  
  const handleSelectDocument = (doc: KBDocument) => {
    setCurrentDoc(doc);
  };

  const handleVaultChange = (vaultId: string) => console.log("Vault change not implemented:", vaultId);
  const handleDeleteDocument = async (docId: string) => console.log("Delete:", docId);
  const handleUpdateDocument = async (doc: KBDocument) => console.log("Update:", doc.id);

  if (status === 'loading') {
    return <div>Loading Authentication...</div>;
  }
  
  if (status === 'unauthenticated') {
    return <LoginPrompt title="知识宝库" />;
  }
  
  return (
    <KBLayout
      vaults={[]}
      currentVault={null}
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
