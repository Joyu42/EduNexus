"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  FileText,
  Plus,
  Save,
  Download,
  Settings,
  Tag,
  Clock,
  Link2,
  Eye,
  Edit3,
  Hash,
  List,
  Upload,
  Trash2,
  SortAsc,
  Maximize2,
  Minimize2,
  PanelLeftClose,
  PanelRightClose,
  Sparkles,
  Zap,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { VaultSelector } from "@/components/kb/vault-selector";
import { getKBStorage, type KBDocument } from "@/lib/client/kb-storage";
import { AIAssistant } from "@/components/kb/ai-assistant";
import { TimeRange } from "@/components/ui/timestamp";
import { SearchBar } from "@/components/kb/search-bar";
import { AISummaryPanel } from "@/components/kb/ai-summary-panel";
import { AIKeywordsPanel } from "@/components/kb/ai-keywords-panel";
import { MindMapViewer } from "@/components/kb/mindmap-viewer";
import { LearningPlanner } from "@/components/kb/learning-planner";
import { KBQAAssistant } from "@/components/kb/kb-qa-assistant";
import { SearchFiltersPanel, type SearchFilters } from "@/components/kb/search-filters";
import { SearchResults } from "@/components/kb/search-results";
import { getSearchIndex } from "@/lib/client/search-index";
import { useGlobalShortcuts } from "@/lib/hooks/use-global-shortcuts";
import { FloatingCreateButton } from "@/components/kb/floating-create-button";
import { QuickCreateDialog, type QuickCreateData } from "@/components/kb/quick-create-dialog";
import { ContextMenuCreate } from "@/components/kb/context-menu-create";
import { quickCreateService } from "@/lib/kb/quick-create-service";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TemplateSelector } from "@/components/kb/template-selector";
import { QuickNote } from "@/components/kb/quick-note";
import { EditorToolbar } from "@/components/kb/editor-toolbar";
import { BacklinkGraph } from "@/components/kb/backlink-graph";
import {
  analyzeDocument,
  extractTags,
  getContentSuggestions,
  recommendDocuments,
} from "@/lib/kb/ai-assistant";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ViewSwitcher, getSavedViewMode, type ViewMode } from "@/components/kb/view-switcher";
import { CardView } from "@/components/kb/card-view";
import { TimelineView } from "@/components/kb/timeline-view";
import { KanbanView } from "@/components/kb/kanban-view";

// 文档类型定义
type Document = KBDocument & {
  parentId?: string;
  children?: Document[];
};

export default function KnowledgeBasePage() {
  const storage = getKBStorage();
  const searchIndex = getSearchIndex();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 状态管理
  const [currentVaultId, setCurrentVaultId] = useState<string | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedText, setSelectedText] = useState("");
  const [sortBy, setSortBy] = useState<"relevance" | "date" | "title">("relevance");
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    tags: [],
    docTypes: [],
    logicMode: "AND",
  });
  const [showSearchResults, setShowSearchResults] = useState(false);

  // UI 状态
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [showQuickNote, setShowQuickNote] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [showQuickCreateDialog, setShowQuickCreateDialog] = useState(false);
  const [quickCreateType, setQuickCreateType] = useState<'blank' | 'template' | 'quick' | 'from-selection'>('blank');
  const [quickCreateInitialData, setQuickCreateInitialData] = useState<Partial<QuickCreateData> | undefined>();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  // 初始化
  useEffect(() => {
    const initializeStorage = async () => {
      try {
        await storage.initialize();
        const savedVaultId = storage.getCurrentVaultId();
        if (savedVaultId) {
          setCurrentVaultId(savedVaultId);
          await loadDocuments(savedVaultId);
        }
        // 加载保存的视图模式
        setViewMode(getSavedViewMode());
      } catch (error) {
        console.error("Failed to initialize storage:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeStorage();
  }, []);

  // 加载文档
  const loadDocuments = async (vaultId: string) => {
    try {
      const docs = await storage.getDocumentsByVault(vaultId);
      setDocuments(docs);
      if (docs.length > 0 && !selectedDoc) {
        setSelectedDoc(docs[0]);
      }
    } catch (error) {
      console.error("Failed to load documents:", error);
    }
  };

  // 知识库切换
  const handleVaultChange = async (vaultId: string) => {
    setCurrentVaultId(vaultId);
    storage.setCurrentVault(vaultId);
    await loadDocuments(vaultId);
    setSelectedDoc(null);
  };

  // 初始化编辑内容
  useEffect(() => {
    if (selectedDoc) {
      setEditContent(selectedDoc.content);
      setEditTitle(selectedDoc.title);
      setHasUnsavedChanges(false);
    }
  }, [selectedDoc]);

  // 追踪内容变化
  useEffect(() => {
    if (selectedDoc && isEditing) {
      const hasChanges =
        editTitle !== selectedDoc.title ||
        editContent !== selectedDoc.content;
      setHasUnsavedChanges(hasChanges);
    }
  }, [editTitle, editContent, selectedDoc, isEditing]);

  // 搜索和筛选
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) {
      return documents.map((doc) => ({
        document: doc,
        score: 0,
        highlights: [],
        matchedTerms: [],
      }));
    }

    return searchIndex.search(documents, searchQuery, {
      maxResults: 100,
      minScore: 1,
    });
  }, [documents, searchQuery, searchIndex]);

  const filteredResults = useMemo(() => {
    let filtered = searchResults;

    // 应用标签过滤
    filtered = filtered.filter((result) => {
      const doc = result.document;

      if (searchFilters.tags.length > 0) {
        const hasMatchingTag =
          searchFilters.logicMode === "AND"
            ? searchFilters.tags.every((tag) => doc.tags.includes(tag))
            : searchFilters.tags.some((tag) => doc.tags.includes(tag));
        if (!hasMatchingTag) return false;
      }

      if (searchFilters.dateRange) {
        const docDate = doc.updatedAt.getTime();
        const startDate = searchFilters.dateRange.start.getTime();
        const endDate = searchFilters.dateRange.end.getTime();
        if (docDate < startDate || docDate > endDate) return false;
      }

      return true;
    });

    return filtered;
  }, [searchResults, searchFilters]);

  // 兼容旧代码：提取文档列表
  const filteredDocuments = useMemo(() => {
    return filteredResults.map((result) => result.document);
  }, [filteredResults]);

  // 获取所有标签
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    documents.forEach((doc) => doc.tags.forEach((tag) => tagSet.add(tag)));
    return Array.from(tagSet);
  }, [documents]);

  // 最近访问的文档
  const recentDocuments = useMemo(() => {
    return [...documents]
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, 5);
  }, [documents]);

  // 推荐文档
  const recommendedDocs = useMemo(() => {
    if (!selectedDoc) return [];
    return recommendDocuments(selectedDoc, documents, 5);
  }, [selectedDoc, documents]);

  // 文档统计
  const docStats = useMemo(() => {
    if (!selectedDoc) return null;
    return analyzeDocument(selectedDoc.content);
  }, [selectedDoc]);

  // 内容建议
  const contentSuggestions = useMemo(() => {
    if (!selectedDoc) return [];
    return getContentSuggestions(selectedDoc.content);
  }, [selectedDoc]);

  // 提取大纲
  const extractOutline = useCallback((content: string) => {
    const lines = content.split("\n");
    const outline: { level: number; text: string; id: string }[] = [];
    lines.forEach((line, index) => {
      const match = line.match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        outline.push({
          level: match[1].length,
          text: match[2],
          id: `heading-${index}`,
        });
      }
    });
    return outline;
  }, []);

  const outline = useMemo(() => {
    return selectedDoc ? extractOutline(selectedDoc.content) : [];
  }, [selectedDoc, extractOutline]);

  // 渲染 Markdown
  const renderMarkdown = useCallback((content: string) => {
    let html = content;

    html = html.replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mt-4 mb-2 text-amber-900">$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2 class="text-xl font-semibold mt-6 mb-3 text-amber-950">$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-8 mb-4 text-amber-950">$1</h1>');
    html = html.replace(/\[\[([^\]]+)\]\]/g, '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-100 text-amber-800 hover:bg-amber-200 cursor-pointer text-sm"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>$1</span>');
    html = html.replace(/#(\w+)/g, '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-sm">#$1</span>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-amber-950">$1</strong>');
    html = html.replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-gray-100 text-gray-800 text-sm font-mono">$1</code>');
    html = html.replace(/^- (.+)$/gm, '<li class="ml-4 text-gray-700">• $1</li>');
    html = html.replace(/^- \[ \] (.+)$/gm, '<li class="ml-4 text-gray-700"><input type="checkbox" class="mr-2" /> $1</li>');
    html = html.replace(/^- \[x\] (.+)$/gm, '<li class="ml-4 text-gray-700"><input type="checkbox" checked class="mr-2" /> $1</li>');
    html = html.replace(/\n/g, '<br />');

    return html;
  }, []);

  // 保存文档
  const handleSave = useCallback(async () => {
    if (!selectedDoc || !currentVaultId || !hasUnsavedChanges) return;

    setIsSaving(true);
    try {
      // 自动提取标签
      const autoTags = extractTags(editContent);
      const updatedDoc = {
        ...selectedDoc,
        title: editTitle,
        content: editContent,
        tags: Array.from(new Set([...selectedDoc.tags, ...autoTags])),
      };
      await storage.updateDocument(updatedDoc);
      setDocuments((prev) =>
        prev.map((doc) =>
          doc.id === selectedDoc.id ? updatedDoc : doc
        )
      );
      setSelectedDoc(updatedDoc);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error("Failed to save document:", error);
      alert("保存失败，请重试");
    } finally {
      setIsSaving(false);
    }
  }, [selectedDoc, editContent, editTitle, currentVaultId, hasUnsavedChanges]);

  // 新建文档（使用模板）
  const handleNewDocumentWithTemplate = useCallback(
    async (title: string, content: string, tags: string[]) => {
      if (!currentVaultId) {
        alert("请先选择一个知识库");
        return;
      }

      try {
        const newDoc = await storage.createDocument(
          currentVaultId,
          title,
          content,
          tags
        );
        setDocuments((prev) => [newDoc, ...prev]);
        setSelectedDoc(newDoc);
        setIsEditing(true);
        setHasUnsavedChanges(false);
      } catch (error) {
        console.error("Failed to create document:", error);
        alert("创建文档失败，请重试");
      }
    },
    [currentVaultId]
  );

  // 快速记录
  const handleQuickNote = useCallback(
    async (title: string, content: string, tags: string[]) => {
      if (!currentVaultId) {
        alert("请先选择一个知识库");
        return;
      }

      try {
        const newDoc = await storage.createDocument(
          currentVaultId,
          title,
          content,
          tags
        );
        setDocuments((prev) => [newDoc, ...prev]);
        setSelectedDoc(newDoc);
      } catch (error) {
        console.error("Failed to create quick note:", error);
        throw error;
      }
    },
    [currentVaultId]
  );

  // 删除文档
  const handleDeleteDocument = useCallback(async () => {
    if (!selectedDoc) return;

    if (!confirm(`确定要删除文档"${selectedDoc.title}"吗？`)) return;

    try {
      await storage.deleteDocument(selectedDoc.id);
      setDocuments((prev) => prev.filter((doc) => doc.id !== selectedDoc.id));
      setSelectedDoc(documents.length > 1 ? documents[0] : null);
    } catch (error) {
      console.error("Failed to delete document:", error);
      alert("删除失败，请重试");
    }
  }, [selectedDoc, documents]);

  // 导出文档
  const handleExport = useCallback(() => {
    if (selectedDoc) {
      storage.exportDocumentAsMarkdown(selectedDoc);
    }
  }, [selectedDoc]);

  // 导入文档
  const handleImport = useCallback(async () => {
    if (!currentVaultId) {
      alert("请先选择一个知识库");
      return;
    }

    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".md";
    input.multiple = true;

    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files) return;

      try {
        const importedDocs = await storage.importMultipleFiles(currentVaultId, files);
        setDocuments((prev) => [...importedDocs, ...prev]);
        if (importedDocs.length > 0) {
          setSelectedDoc(importedDocs[0]);
        }
        alert(`成功导入 ${importedDocs.length} 个文档`);
      } catch (error) {
        console.error("Failed to import documents:", error);
        alert("导入失败，请重试");
      }
    };

    input.click();
  }, [currentVaultId]);

  // 快速创建处理
  const handleQuickCreate = useCallback(async (data: QuickCreateData) => {
    if (!currentVaultId) {
      alert("请先选择一个知识库");
      return;
    }

    try {
      const result = await quickCreateService.createBlank({
        title: data.title,
        content: data.content,
        tags: data.tags,
        vaultId: currentVaultId,
        template: data.template,
        linkedNodeId: data.linkedNodeId,
        linkedNodeLabel: data.linkedNodeLabel,
      });

      if (result.success && result.document) {
        setDocuments((prev) => [result.document!, ...prev]);
        setSelectedDoc(result.document);
        setIsEditing(false);
      } else {
        alert(result.error || "创建失败");
      }
    } catch (error) {
      console.error("Failed to create note:", error);
      alert("创建失败，请重试");
    }
  }, [currentVaultId]);

  // 从选中文字创建笔记
  const handleSaveSelection = useCallback(async (selectedText: string) => {
    if (!currentVaultId) {
      alert("请先选择一个知识库");
      return;
    }

    setQuickCreateType('from-selection');
    setQuickCreateInitialData({
      content: selectedText,
      title: '',
    });
    setShowQuickCreateDialog(true);
  }, [currentVaultId]);

  // 打开快速创建对话框
  const openQuickCreateDialog = useCallback((type: 'blank' | 'template' | 'quick') => {
    setQuickCreateType(type);
    setQuickCreateInitialData(undefined);
    setShowQuickCreateDialog(true);
  }, []);

  // 处理搜索
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setShowSearchResults(query.trim().length > 0);
  }, []);

  // 获取搜索建议
  const searchSuggestions = useMemo(() => {
    const suggestions = new Set<string>();
    documents.forEach((doc) => {
      suggestions.add(doc.title);
    });
    allTags.forEach((tag) => {
      suggestions.add(tag);
    });
    return Array.from(suggestions);
  }, [documents, allTags]);

  // 编辑器工具栏插入
  const handleEditorInsert = useCallback((text: string) => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentContent = editContent;

    const newContent =
      currentContent.substring(0, start) +
      text +
      currentContent.substring(end);

    setEditContent(newContent);

    // 设置光标位置
    setTimeout(() => {
      const cursorPos = start + Math.floor(text.length / 2);
      textarea.setSelectionRange(cursorPos, cursorPos);
      textarea.focus();
    }, 0);
  }, [editContent]);

  // 全局快捷键
  useGlobalShortcuts([
    {
      key: 's',
      ctrl: true,
      handler: () => {
        if (isEditing) {
          handleSave();
        }
      },
      description: '保存文档',
    },
    {
      key: 'n',
      ctrl: true,
      shift: true,
      handler: () => {
        openQuickCreateDialog('quick');
      },
      description: '快速创建笔记',
    },
    {
      key: 'e',
      ctrl: true,
      handler: () => {
        setIsEditing(!isEditing);
      },
      description: '切换编辑模式',
    },
    {
      key: 'Escape',
      handler: () => {
        if (isFullscreen) {
          setIsFullscreen(false);
        }
      },
      description: '退出全屏',
    },
  ], {
    enabled: true,
    preventDefault: true,
  });

  return (
    <div className={`flex min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 ${isFullscreen ? "fixed inset-0 z-50" : ""}`}>
      {/* 左侧：文档列表 */}
      {!leftPanelCollapsed && (
        <div className="w-80 border-r border-amber-200/50 bg-white/80 backdrop-blur-sm flex flex-col">
          {/* 知识库选择器 */}
          <div className="p-4 border-b border-amber-200/50">
            <VaultSelector
              currentVaultId={currentVaultId}
              onVaultChange={handleVaultChange}
            />
          </div>

          {/* 搜索框 */}
          <div className="p-4 border-b border-amber-200/50">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              onSearch={handleSearch}
              suggestions={searchSuggestions}
              tags={allTags}
              showHistory={true}
              showSyntaxHelp={true}
            />
          </div>

          {/* 高级筛选 */}
          <div className="p-4 border-b border-amber-200/50">
            <SearchFiltersPanel
              filters={searchFilters}
              onChange={setSearchFilters}
              availableTags={allTags}
              availableDocTypes={[]}
            />
          </div>

          {/* 文档树 */}
          <div className="flex-1 overflow-y-auto p-4">
            <Tabs defaultValue={showSearchResults ? "search" : "all"} className="w-full">
              <TabsList className="w-full bg-amber-100/50">
                {showSearchResults && (
                  <TabsTrigger value="search" className="flex-1">
                    <FileText className="w-4 h-4 mr-1" />
                    搜索结果
                  </TabsTrigger>
                )}
                <TabsTrigger value="all" className="flex-1">
                  <FileText className="w-4 h-4 mr-1" />
                  全部
                </TabsTrigger>
                <TabsTrigger value="recent" className="flex-1">
                  <Clock className="w-4 h-4 mr-1" />
                  最近
                </TabsTrigger>
              </TabsList>

              {showSearchResults && (
                <TabsContent value="search" className="mt-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs text-amber-600">
                      {filteredDocuments.length} 个结果
                    </span>
                    <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                      <SelectTrigger className="w-32 h-7 text-xs border-amber-200">
                        <SortAsc className="w-3 h-3 mr-1" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="relevance">相关性</SelectItem>
                        <SelectItem value="date">日期</SelectItem>
                        <SelectItem value="title">标题</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <SearchResults
                    results={searchResults}
                    searchQuery={searchQuery}
                    onSelectDocument={setSelectedDoc}
                    selectedDocId={selectedDoc?.id}
                    sortBy={sortBy}
                  />
                </TabsContent>
              )}

              <TabsContent value="all" className="mt-4 space-y-1">
                {filteredDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => setSelectedDoc(doc)}
                    className={`p-3 rounded-lg cursor-pointer transition-all ${
                      selectedDoc?.id === doc.id
                        ? "bg-amber-100 border border-amber-300"
                        : "hover:bg-amber-50 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-amber-600 flex-shrink-0" />
                      <span className="text-sm font-medium text-amber-950 truncate">
                        {doc.title}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {doc.tags.slice(0, 3).map((tag) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className="text-xs bg-blue-50 text-blue-700 border-blue-200"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="recent" className="mt-4 space-y-1">
                {recentDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => setSelectedDoc(doc)}
                    className={`p-3 rounded-lg cursor-pointer transition-all ${
                      selectedDoc?.id === doc.id
                        ? "bg-amber-100 border border-amber-300"
                        : "hover:bg-amber-50 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
                      <span className="text-sm font-medium text-amber-950 truncate">
                        {doc.title}
                      </span>
                    </div>
                    <span className="text-xs text-amber-600 mt-1 block">
                      {doc.updatedAt.toLocaleDateString("zh-CN")}
                    </span>
                  </div>
                ))}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      )}

      {/* 中间：编辑器/阅读器 */}
      <div className="flex-1 flex flex-col">
        {/* 工具栏 */}
        <div className="h-14 border-b border-amber-200/50 bg-white/80 backdrop-blur-sm flex items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <TooltipProvider>
              {leftPanelCollapsed && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setLeftPanelCollapsed(false)}
                    >
                      <PanelLeftClose className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>显示侧边栏</TooltipContent>
                </Tooltip>
              )}
              {!leftPanelCollapsed && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setLeftPanelCollapsed(true)}
                    >
                      <PanelLeftClose className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>隐藏侧边栏</TooltipContent>
                </Tooltip>
              )}
            </TooltipProvider>

            <Separator orientation="vertical" className="h-6" />

            {/* 视图切换器 */}
            <ViewSwitcher currentView={viewMode} onViewChange={setViewMode} />

            <Separator orientation="vertical" className="h-6" />

            <Button
              size="sm"
              onClick={() => setShowTemplateSelector(true)}
              className="bg-amber-500 hover:bg-amber-600"
            >
              <Plus className="w-4 h-4 mr-1" />
              新建
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleSave}
              disabled={!isEditing}
              className="border-amber-300 hover:bg-amber-50"
            >
              <Save className="w-4 h-4 mr-1" />
              保存
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleExport}
              className="border-amber-300 hover:bg-amber-50"
            >
              <Download className="w-4 h-4 mr-1" />
              导出
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleImport}
              className="border-amber-300 hover:bg-amber-50"
            >
              <Upload className="w-4 h-4 mr-1" />
              导入
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {/* 保存按钮 */}
            {isEditing && selectedDoc && (
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!hasUnsavedChanges || isSaving}
                className={hasUnsavedChanges ? "bg-amber-500 hover:bg-amber-600" : ""}
              >
                <Save className="w-4 h-4 mr-1" />
                {isSaving ? "保存中..." : hasUnsavedChanges ? "保存" : "已保存"}
              </Button>
            )}

            {docStats && (
              <div className="flex items-center gap-3 text-xs text-amber-600 mr-4">
                <span>{docStats.wordCount} 字</span>
                <span>{docStats.readingTime} 分钟</span>
              </div>
            )}

            <Button
              size="sm"
              variant={isEditing ? "default" : "outline"}
              onClick={() => setIsEditing(!isEditing)}
              className={isEditing ? "bg-amber-500 hover:bg-amber-600" : "border-amber-300 hover:bg-amber-50"}
            >
              {isEditing ? (
                <>
                  <Eye className="w-4 h-4 mr-1" />
                  预览
                </>
              ) : (
                <>
                  <Edit3 className="w-4 h-4 mr-1" />
                  编辑
                </>
              )}
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </Button>

            <TooltipProvider>
              {rightPanelCollapsed && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setRightPanelCollapsed(false)}
                    >
                      <PanelRightClose className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>显示侧边栏</TooltipContent>
                </Tooltip>
              )}
              {!rightPanelCollapsed && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setRightPanelCollapsed(true)}
                    >
                      <PanelRightClose className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>隐藏侧边栏</TooltipContent>
                </Tooltip>
              )}
            </TooltipProvider>
          </div>
        </div>

        {/* 编辑器工具栏 */}
        {isEditing && viewMode === "list" && (
          <EditorToolbar
            onInsert={handleEditorInsert}
            onFormat={(format) => console.log(format)}
            disabled={!selectedDoc}
          />
        )}

        {/* 编辑器/预览区 */}
        <div className="flex-1 overflow-y-auto p-8">
          {viewMode !== "list" ? (
            /* 非列表视图：显示卡片/时间轴/看板 */
            <div className="max-w-7xl mx-auto">
              {viewMode === "card" ? (
                <CardView
                  documents={filteredDocuments}
                  onSelectDocument={setSelectedDoc}
                  selectedDocId={selectedDoc?.id}
                />
              ) : viewMode === "timeline" ? (
                <TimelineView
                  documents={filteredDocuments}
                  onSelectDocument={setSelectedDoc}
                  selectedDocId={selectedDoc?.id}
                />
              ) : (
                <KanbanView
                  documents={filteredDocuments}
                  onSelectDocument={setSelectedDoc}
                  selectedDocId={selectedDoc?.id}
                  onUpdateDocumentStatus={async (docId, status) => {
                    const doc = documents.find((d) => d.id === docId);
                    if (!doc) return;

                    // 更新文档标签以反映新状态
                    const statusTags = ["待学习", "学习中", "已完成"];
                    const newTags = doc.tags.filter((tag) => !statusTags.includes(tag));

                    if (status === "todo") newTags.push("待学习");
                    else if (status === "in-progress") newTags.push("学习中");
                    else if (status === "done") newTags.push("已完成");

                    const updatedDoc = { ...doc, tags: newTags };
                    await storage.updateDocument(updatedDoc);
                    setDocuments((prev) =>
                      prev.map((d) => (d.id === docId ? updatedDoc : d))
                    );
                  }}
                />
              )}
            </div>
          ) : selectedDoc ? (
            /* 列表视图：显示文档编辑器/预览 */
            <div className="max-w-4xl mx-auto">
              {/* 文档标题 */}
              {isEditing ? (
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="text-3xl font-bold text-amber-950 mb-6 border-none focus:ring-0 px-0"
                  placeholder="文档标题"
                />
              ) : (
                <h1 className="text-3xl font-bold text-amber-950 mb-6">
                  {selectedDoc.title}
                </h1>
              )}

              {/* 元信息 */}
              <div className="flex items-center gap-4 text-sm text-amber-600 mb-8">
                <TimeRange
                  createdAt={selectedDoc.createdAt}
                  updatedAt={selectedDoc.updatedAt}
                />
              </div>

              {/* 内容建议 */}
              {isEditing && contentSuggestions.length > 0 && (
                <div className="mb-6 p-4 rounded-lg bg-blue-50 border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">
                      内容优化建议
                    </span>
                  </div>
                  <ul className="space-y-1">
                    {contentSuggestions.map((suggestion, index) => (
                      <li key={index} className="text-sm text-blue-700">
                        • {suggestion}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 内容区 */}
              <ContextMenuCreate
                onSaveToKB={handleSaveSelection}
                disabled={!currentVaultId}
              >
                {isEditing ? (
                  <Textarea
                    ref={textareaRef}
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    onSelect={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      const selected = target.value.substring(
                        target.selectionStart,
                        target.selectionEnd
                      );
                      setSelectedText(selected);
                    }}
                    className="min-h-[600px] font-mono text-sm bg-white border-amber-200 focus:border-amber-400"
                    placeholder="开始编写..."
                  />
                ) : (
                  <div
                    className="prose prose-amber max-w-none"
                    onMouseUp={() => {
                      const selection = window.getSelection();
                      const selected = selection?.toString() || "";
                      setSelectedText(selected);
                    }}
                    dangerouslySetInnerHTML={{
                      __html: renderMarkdown(selectedDoc.content),
                    }}
                  />
                )}
              </ContextMenuCreate>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-amber-600">
              <div className="text-center">
                <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="mb-4">选择一个文档开始编辑</p>
                <Button
                  onClick={() => setShowTemplateSelector(true)}
                  className="bg-amber-500 hover:bg-amber-600"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  创建新文档
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 右侧：大纲和 AI 功能 */}
      {!rightPanelCollapsed && (
        <div className="w-80 border-l border-amber-200/50 bg-white/80 backdrop-blur-sm overflow-y-auto">
          <Tabs defaultValue="outline" className="w-full">
            <TabsList className="w-full bg-amber-100/50 m-2">
              <TabsTrigger value="outline" className="flex-1 text-xs">
                <List className="w-3 h-3 mr-1" />
                大纲
              </TabsTrigger>
              <TabsTrigger value="ai-summary" className="flex-1 text-xs">
                <Sparkles className="w-3 h-3 mr-1" />
                摘要
              </TabsTrigger>
              <TabsTrigger value="ai-keywords" className="flex-1 text-xs">
                <Tag className="w-3 h-3 mr-1" />
                关键词
              </TabsTrigger>
              <TabsTrigger value="mindmap" className="flex-1 text-xs">
                <Zap className="w-3 h-3 mr-1" />
                导图
              </TabsTrigger>
            </TabsList>

            <TabsContent value="outline" className="p-4 space-y-6">
              {/* 文档统计 */}
              {docStats && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart3 className="w-4 h-4 text-amber-600" />
                    <span className="text-sm font-semibold text-amber-900">
                      文档统计
                    </span>
                  </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                    <div className="text-2xl font-bold text-amber-900">
                      {docStats.wordCount}
                    </div>
                    <div className="text-xs text-amber-600">字数</div>
                  </div>
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                    <div className="text-2xl font-bold text-amber-900">
                      {docStats.readingTime}
                    </div>
                    <div className="text-xs text-amber-600">分钟</div>
                  </div>
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                    <div className="text-2xl font-bold text-amber-900">
                      {docStats.links}
                    </div>
                    <div className="text-xs text-amber-600">链接</div>
                  </div>
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                    <div className="text-2xl font-bold text-amber-900">
                      {docStats.headings}
                    </div>
                    <div className="text-xs text-amber-600">标题</div>
                  </div>
                </div>
              </div>
            )}

            <Separator className="bg-amber-200" />

            {/* 大纲导航 */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <List className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-semibold text-amber-900">大纲</span>
              </div>
              <div className="space-y-1">
                {outline.length > 0 ? (
                  outline.map((item) => (
                    <div
                      key={item.id}
                      className="text-sm text-amber-700 hover:text-amber-900 cursor-pointer py-1 px-2 rounded hover:bg-amber-50 transition-colors"
                      style={{ paddingLeft: `${item.level * 12}px` }}
                    >
                      {item.text}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-amber-500">暂无大纲</p>
                )}
              </div>
            </div>

            <Separator className="bg-amber-200" />

            {/* 双链关系图 */}
            <BacklinkGraph
              currentDocument={selectedDoc}
              allDocuments={documents}
              onDocumentClick={setSelectedDoc}
            />

            <Separator className="bg-amber-200" />

            {/* 推荐文档 */}
            {recommendedDocs.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span className="text-sm font-semibold text-amber-900">
                    推荐文档
                  </span>
                </div>
                <div className="space-y-2">
                  {recommendedDocs.map((doc) => (
                    <button
                      key={doc.id}
                      onClick={() => setSelectedDoc(doc)}
                      className="w-full p-2 rounded-lg border border-amber-200 hover:border-amber-400 hover:bg-amber-50 transition-all text-left"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="w-3 h-3 text-amber-600 flex-shrink-0" />
                        <span className="text-sm text-amber-900 truncate">
                          {doc.title}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <Separator className="bg-amber-200" />

            {/* 标签云 */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Hash className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-semibold text-amber-900">标签</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedDoc?.tags.map((tag) => (
                  <Badge
                    key={tag}
                    className="bg-blue-100 text-blue-800 hover:bg-blue-200 cursor-pointer"
                  >
                    #{tag}
                  </Badge>
                ))}
                {(!selectedDoc?.tags || selectedDoc.tags.length === 0) && (
                  <p className="text-sm text-amber-500">暂无标签</p>
                )}
              </div>
            </div>
          </TabsContent>

          {/* AI 摘要标签页 */}
          <TabsContent value="ai-summary" className="p-4">
            <AISummaryPanel
              documentId={selectedDoc?.id}
              documentTitle={selectedDoc?.title}
              documentContent={selectedDoc?.content}
              onInsertText={(text) => {
                if (isEditing) {
                  setEditContent((prev) => prev + "\n\n" + text);
                }
              }}
            />
          </TabsContent>

          {/* AI 关键词标签页 */}
          <TabsContent value="ai-keywords" className="p-4">
            <AIKeywordsPanel
              documentId={selectedDoc?.id}
              documentTitle={selectedDoc?.title}
              documentContent={selectedDoc?.content}
              currentTags={selectedDoc?.tags || []}
              onAddTags={async (tags) => {
                if (selectedDoc) {
                  const updatedDoc = {
                    ...selectedDoc,
                    tags: Array.from(new Set([...selectedDoc.tags, ...tags])),
                  };
                  await storage.updateDocument(updatedDoc);
                  setDocuments((prev) =>
                    prev.map((doc) =>
                      doc.id === selectedDoc.id ? updatedDoc : doc
                    )
                  );
                  setSelectedDoc(updatedDoc);
                }
              }}
            />
          </TabsContent>

          {/* 思维导图标签页 */}
          <TabsContent value="mindmap" className="p-4">
            <MindMapViewer
              documentId={selectedDoc?.id}
              documentTitle={selectedDoc?.title}
              documentContent={selectedDoc?.content}
            />
          </TabsContent>
        </Tabs>
        </div>
      )}

      {/* AI 助手 */}
      <AIAssistant
        documentId={selectedDoc?.id}
        documentTitle={selectedDoc?.title}
        documentContent={selectedDoc?.content}
        selectedText={selectedText}
        onInsertText={(text) => {
          if (isEditing) {
            setEditContent((prev) => prev + "\n\n" + text);
          }
        }}
      />

      {/* 浮动创建按钮 */}
      <FloatingCreateButton
        onCreateBlank={() => openQuickCreateDialog('blank')}
        onCreateFromTemplate={() => openQuickCreateDialog('template')}
        onQuickNote={() => openQuickCreateDialog('quick')}
        position="bottom-right"
      />

      {/* 快速创建对话框 */}
      <QuickCreateDialog
        open={showQuickCreateDialog}
        onOpenChange={setShowQuickCreateDialog}
        type={quickCreateType}
        initialData={quickCreateInitialData}
        onConfirm={handleQuickCreate}
      />

      {/* 模板选择器 */}
      <TemplateSelector
        open={showTemplateSelector}
        onClose={() => setShowTemplateSelector(false)}
        onSelect={handleNewDocumentWithTemplate}
      />

      {/* 快速记录对话框 */}
      <QuickNote
        open={showQuickNote}
        onClose={() => setShowQuickNote(false)}
        onSave={handleQuickNote}
      />
    </div>
  );
}