"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  Search,
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
  List
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// 文档类型定义
type Document = {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  parentId?: string;
  children?: Document[];
};

// 模拟数据
const mockDocuments: Document[] = [
  {
    id: "1",
    title: "欢迎使用知识库",
    content: `# 欢迎使用知识库

这是一个功能强大的知识管理系统，支持：

## 核心功能
- **Markdown 编辑**：完整的 Markdown 语法支持
- **双链笔记**：使用 [[文档名]] 创建文档链接
- **标签系统**：使用 #标签 组织内容
- **实时预览**：边写边看效果

## 快捷键
- \`Ctrl + S\`: 保存文档
- \`Ctrl + N\`: 新建文档
- \`Ctrl + E\`: 切换编辑/预览模式

开始你的知识管理之旅吧！`,
    tags: ["欢迎", "教程"],
    createdAt: new Date("2026-03-01"),
    updatedAt: new Date("2026-03-09"),
  },
  {
    id: "2",
    title: "项目管理",
    content: `# 项目管理

## 当前项目
- [[EduNexus]] - 教育平台
- [[知识库系统]] - 文档管理

## 待办事项
- [ ] 完成知识库功能
- [ ] 优化用户体验
- [x] 设计系统架构

#项目 #管理`,
    tags: ["项目", "管理"],
    createdAt: new Date("2026-03-05"),
    updatedAt: new Date("2026-03-08"),
  },
  {
    id: "3",
    title: "学习笔记",
    content: `# 学习笔记

## React 最佳实践
- 使用 hooks 管理状态
- 组件拆分要合理
- 性能优化很重要

## TypeScript 技巧
- 善用类型推导
- 接口定义要清晰

#学习 #前端`,
    tags: ["学习", "前端"],
    createdAt: new Date("2026-03-03"),
    updatedAt: new Date("2026-03-07"),
  },
];

export default function KnowledgeBasePage() {
  // 状态管理
  const [documents, setDocuments] = useState<Document[]>(mockDocuments);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(mockDocuments[0]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");

  // 初始化编辑内容
  useEffect(() => {
    if (selectedDoc) {
      setEditContent(selectedDoc.content);
    }
  }, [selectedDoc]);

  // 搜索和筛选
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.content.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTags = selectedTags.length === 0 ||
        selectedTags.some((tag) => doc.tags.includes(tag));
      return matchesSearch && matchesTags;
    });
  }, [documents, searchQuery, selectedTags]);

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

  // 提取文档中的双链
  const extractBacklinks = useCallback((content: string) => {
    const regex = /\[\[([^\]]+)\]\]/g;
    const links: string[] = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
      links.push(match[1]);
    }
    return links;
  }, []);

  // 获取反向链接
  const backlinks = useMemo(() => {
    if (!selectedDoc) return [];
    return documents.filter((doc) => {
      const links = extractBacklinks(doc.content);
      return links.includes(selectedDoc.title);
    });
  }, [selectedDoc, documents, extractBacklinks]);

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

  // 渲染 Markdown（简化版）
  const renderMarkdown = useCallback((content: string) => {
    let html = content;

    // 标题
    html = html.replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mt-4 mb-2 text-amber-900">$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2 class="text-xl font-semibold mt-6 mb-3 text-amber-950">$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-8 mb-4 text-amber-950">$1</h1>');

    // 双链
    html = html.replace(/\[\[([^\]]+)\]\]/g, '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-100 text-amber-800 hover:bg-amber-200 cursor-pointer text-sm"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>$1</span>');

    // 标签
    html = html.replace(/#(\w+)/g, '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-sm">#$1</span>');

    // 粗体
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-amber-950">$1</strong>');

    // 代码
    html = html.replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-gray-100 text-gray-800 text-sm font-mono">$1</code>');

    // 列表
    html = html.replace(/^- (.+)$/gm, '<li class="ml-4 text-gray-700">• $1</li>');
    html = html.replace(/^- \[ \] (.+)$/gm, '<li class="ml-4 text-gray-700"><input type="checkbox" class="mr-2" /> $1</li>');
    html = html.replace(/^- \[x\] (.+)$/gm, '<li class="ml-4 text-gray-700"><input type="checkbox" checked class="mr-2" /> $1</li>');

    // 换行
    html = html.replace(/\n/g, '<br />');

    return html;
  }, []);

  // 保存文档
  const handleSave = useCallback(() => {
    if (selectedDoc) {
      setDocuments((prev) =>
        prev.map((doc) =>
          doc.id === selectedDoc.id
            ? { ...doc, content: editContent, updatedAt: new Date() }
            : doc
        )
      );
      setSelectedDoc({ ...selectedDoc, content: editContent, updatedAt: new Date() });
      setIsEditing(false);
    }
  }, [selectedDoc, editContent]);

  // 新建文档
  const handleNewDocument = useCallback(() => {
    const newDoc: Document = {
      id: Date.now().toString(),
      title: "新文档",
      content: "# 新文档\n\n开始编写...",
      tags: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setDocuments((prev) => [newDoc, ...prev]);
    setSelectedDoc(newDoc);
    setIsEditing(true);
  }, []);

  // 导出文档
  const handleExport = useCallback(() => {
    if (selectedDoc) {
      const blob = new Blob([selectedDoc.content], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selectedDoc.title}.md`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }, [selectedDoc]);

  // 切换标签筛选
  const toggleTag = useCallback((tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }, []);

  return (
    <div className="flex h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">
      {/* 左侧：文档列表 */}
      <div className="w-80 border-r border-amber-200/50 bg-white/80 backdrop-blur-sm flex flex-col">
        {/* 搜索框 */}
        <div className="p-4 border-b border-amber-200/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-600" />
            <input
              type="text"
              placeholder="搜索文档..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-amber-50/50 border-amber-200 focus:border-amber-400 flex h-10 w-full rounded-md border border-input px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        </div>

        {/* 标签筛选 */}
        <div className="p-4 border-b border-amber-200/50">
          <div className="flex items-center gap-2 mb-2">
            <Tag className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-900">标签筛选</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {allTags.map((tag) => (
              <Badge
                key={tag}
                variant={selectedTags.includes(tag) ? "default" : "outline"}
                className={`cursor-pointer transition-colors ${
                  selectedTags.includes(tag)
                    ? "bg-amber-500 hover:bg-amber-600"
                    : "hover:bg-amber-100"
                }`}
                onClick={() => toggleTag(tag)}
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>

        {/* 文档树 */}
        <div className="flex-1 overflow-y-auto p-4">
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="w-full bg-amber-100/50">
              <TabsTrigger value="all" className="flex-1">
                <FileText className="w-4 h-4 mr-1" />
                全部
              </TabsTrigger>
              <TabsTrigger value="recent" className="flex-1">
                <Clock className="w-4 h-4 mr-1" />
                最近
              </TabsTrigger>
            </TabsList>

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
                    {doc.tags.map((tag) => (
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

      {/* 中间：编辑器/阅读器 */}
      <div className="flex-1 flex flex-col">
        {/* 工具栏 */}
        <div className="h-14 border-b border-amber-200/50 bg-white/80 backdrop-blur-sm flex items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleNewDocument}
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
          </div>

          <div className="flex items-center gap-2">
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
              variant="outline"
              className="border-amber-300 hover:bg-amber-50"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* 编辑器/预览区 */}
        <div className="flex-1 overflow-y-auto p-8">
          {selectedDoc ? (
            <div className="max-w-4xl mx-auto">
              {/* 文档标题 */}
              <h1 className="text-3xl font-bold text-amber-950 mb-6">
                {selectedDoc.title}
              </h1>

              {/* 元信息 */}
              <div className="flex items-center gap-4 text-sm text-amber-600 mb-8">
                <span>创建于 {selectedDoc.createdAt.toLocaleDateString("zh-CN")}</span>
                <span>•</span>
                <span>更新于 {selectedDoc.updatedAt.toLocaleDateString("zh-CN")}</span>
              </div>

              {/* 内容区 */}
              {isEditing ? (
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="min-h-[600px] font-mono text-sm bg-white border-amber-200 focus:border-amber-400"
                  placeholder="开始编写..."
                />
              ) : (
                <div
                  className="prose prose-amber max-w-none"
                  dangerouslySetInnerHTML={{
                    __html: renderMarkdown(selectedDoc.content),
                  }}
                />
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-amber-600">
              <div className="text-center">
                <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>选择一个文档开始编辑</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 右侧：大纲和反向链接 */}
      <div className="w-80 border-l border-amber-200/50 bg-white/80 backdrop-blur-sm overflow-y-auto">
        <div className="p-4 space-y-6">
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

          {/* 反向链接 */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Link2 className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-semibold text-amber-900">反向链接</span>
              <Badge variant="outline" className="ml-auto text-xs">
                {backlinks.length}
              </Badge>
            </div>
            <div className="space-y-2">
              {backlinks.length > 0 ? (
                backlinks.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => setSelectedDoc(doc)}
                    className="p-2 rounded-lg border border-amber-200 hover:border-amber-400 hover:bg-amber-50 cursor-pointer transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-3 h-3 text-amber-600" />
                      <span className="text-sm text-amber-900">{doc.title}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-amber-500">暂无反向链接</p>
              )}
            </div>
          </div>

          <Separator className="bg-amber-200" />

          {/* 标签云 */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Hash className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-semibold text-amber-900">标签云</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedDoc?.tags.map((tag) => (
                <Badge
                  key={tag}
                  className="bg-blue-100 text-blue-800 hover:bg-blue-200 cursor-pointer"
                  onClick={() => toggleTag(tag)}
                >
                  #{tag}
                </Badge>
              ))}
              {(!selectedDoc?.tags || selectedDoc.tags.length === 0) && (
                <p className="text-sm text-amber-500">暂无标签</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
