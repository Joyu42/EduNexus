"use client";

import { useState, useEffect } from "react";
import { KBLayout } from "@/components/kb/kb-layout";
import { getKBStorage, type KBDocument, type KBVault } from "@/lib/client/kb-storage";
import { useDocument } from "@/lib/ai/document-context";

export default function KnowledgeBasePage() {
  const { setCurrentDocument } = useDocument();
  const [vaults, setVaults] = useState<KBVault[]>([]);
  const [currentVault, setCurrentVault] = useState<KBVault | null>(null);
  const [documents, setDocuments] = useState<KBDocument[]>([]);
  const [currentDoc, setCurrentDoc] = useState<KBDocument | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 当文档切换时，更新全局文档上下文
  useEffect(() => {
    setCurrentDocument(currentDoc);
  }, [currentDoc, setCurrentDocument]);

  // 初始化数据
  useEffect(() => {
    const initializeData = async () => {
      try {
        const storage = getKBStorage();
        await storage.initialize();

        // 加载知识库列表
        const allVaults = await storage.getAllVaults();

        // 如果没有知识库，创建默认知识库
        if (allVaults.length === 0) {
          const defaultVault = await storage.createVault("我的知识库", "/default");
          setVaults([defaultVault]);
          setCurrentVault(defaultVault);
          storage.setCurrentVault(defaultVault.id);
        } else {
          setVaults(allVaults);

          // 获取当前知识库
          const currentVaultId = storage.getCurrentVaultId();
          const vault = allVaults.find(v => v.id === currentVaultId) || allVaults[0];
          setCurrentVault(vault);

          // 加载文档列表
          const docs = await storage.getDocumentsByVault(vault.id);
          setDocuments(docs);
        }
      } catch (error) {
        console.error("Failed to initialize knowledge base:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeData();
  }, []);

  // 切换知识库
  const handleVaultChange = async (vaultId: string) => {
    const vault = vaults.find(v => v.id === vaultId);
    if (!vault) return;

    setCurrentVault(vault);
    const storage = getKBStorage();
    storage.setCurrentVault(vaultId);

    // 加载该知识库的文档
    const docs = await storage.getDocumentsByVault(vaultId);
    setDocuments(docs);
    setCurrentDoc(null);
  };

  // 创建新文档
  const handleCreateDocument = async (title: string) => {
    if (!currentVault) return;

    const storage = getKBStorage();
    const newDoc = await storage.createDocument(currentVault.id, title);
    setDocuments([...documents, newDoc]);
    setCurrentDoc(newDoc);
  };

  // 更新文档
  const handleUpdateDocument = async (doc: KBDocument) => {
    const storage = getKBStorage();
    await storage.updateDocument(doc);
    setDocuments(documents.map(d => d.id === doc.id ? doc : d));
    setCurrentDoc(doc);
  };

  // 删除文档
  const handleDeleteDocument = async (docId: string) => {
    const storage = getKBStorage();
    await storage.deleteDocument(docId);
    setDocuments(documents.filter(d => d.id !== docId));
    if (currentDoc?.id === docId) {
      setCurrentDoc(null);
    }
  };

  // 选择文档
  const handleSelectDocument = (doc: KBDocument) => {
    setCurrentDoc(doc);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">加载知识库...</p>
        </div>
      </div>
    );
  }

  return (
    <KBLayout
      vaults={vaults}
      currentVault={currentVault}
      documents={documents}
      currentDoc={currentDoc}
      onVaultChange={handleVaultChange}
      onCreateDocument={handleCreateDocument}
      onUpdateDocument={handleUpdateDocument}
      onDeleteDocument={handleDeleteDocument}
      onSelectDocument={handleSelectDocument}
    />
  );
}
