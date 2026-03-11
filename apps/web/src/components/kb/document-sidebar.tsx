"use client";

import { useState, useEffect } from "react";
import { Star, Clock, Tag as TagIcon, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  getTagManager,
  getFavoriteManager,
  getRecentManager,
  type Tag,
  type RecentDocument,
} from "@/lib/client/document-manager";
import { getKBStorage, type KBDocument } from "@/lib/client/kb-storage";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

type DocumentSidebarProps = {
  currentVaultId: string | null;
  onSelectDocument: (docId: string) => void;
  selectedDocId?: string;
};

export function DocumentSidebar({
  currentVaultId,
  onSelectDocument,
  selectedDocId,
}: DocumentSidebarProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [favorites, setFavorites] = useState<KBDocument[]>([]);
  const [recent, setRecent] = useState<RecentDocument[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [taggedDocs, setTaggedDocs] = useState<KBDocument[]>([]);

  const tagManager = getTagManager();
  const favoriteManager = getFavoriteManager();
  const recentManager = getRecentManager();
  const storage = getKBStorage();

  useEffect(() => {
    loadData();
  }, [currentVaultId]);

  const loadData = async () => {
    // 加载标签
    await tagManager.updateTagCounts();
    setTags(tagManager.getPopularTags(20));

    // 加载收藏
    if (currentVaultId) {
      const allDocs = await storage.getDocumentsByVault(currentVaultId);
      const favIds = favoriteManager.getAllFavorites().map((f) => f.docId);
      const favDocs = allDocs.filter((doc) => favIds.includes(doc.id));
      setFavorites(favDocs);
    }

    // 加载最近访问
    setRecent(recentManager.getRecentDocuments().slice(0, 10));
  };

  const handleTagClick = async (tagName: string) => {
    if (selectedTag === tagName) {
      setSelectedTag(null);
      setTaggedDocs([]);
      return;
    }

    setSelectedTag(tagName);

    if (currentVaultId) {
      const allDocs = await storage.getDocumentsByVault(currentVaultId);
      const filtered = allDocs.filter((doc) => doc.tags.includes(tagName));
      setTaggedDocs(filtered);
    }
  };

  const handleRemoveFavorite = (docId: string) => {
    favoriteManager.removeFavorite(docId);
    loadData();
  };

  const handleRemoveRecent = (docId: string) => {
    recentManager.removeRecentDocument(docId);
    loadData();
  };

  return (
    <Card className="h-full overflow-hidden flex flex-col">
      <Tabs defaultValue="tags" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="tags">
            <TagIcon className="w-4 h-4 mr-2" />
            标签
          </TabsTrigger>
          <TabsTrigger value="favorites">
            <Star className="w-4 h-4 mr-2" />
            收藏
          </TabsTrigger>
          <TabsTrigger value="recent">
            <Clock className="w-4 h-4 mr-2" />
            最近
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tags" className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {tags.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                暂无标签
              </p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <Badge
                      key={tag.id}
                      variant={selectedTag === tag.name ? "default" : "outline"}
                      className="cursor-pointer hover:opacity-80 transition-opacity"
                      style={{
                        backgroundColor:
                          selectedTag === tag.name ? tag.color : "transparent",
                        borderColor: tag.color,
                        color: selectedTag === tag.name ? "white" : tag.color,
                      }}
                      onClick={() => handleTagClick(tag.name)}
                    >
                      {tag.name} ({tag.count})
                    </Badge>
                  ))}
                </div>

                {selectedTag && taggedDocs.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium">
                        标签: {selectedTag}
                      </h4>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedTag(null);
                          setTaggedDocs([]);
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    {taggedDocs.map((doc) => (
                      <div
                        key={doc.id}
                        className={`p-2 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors ${
                          selectedDocId === doc.id ? "bg-amber-100" : ""
                        }`}
                        onClick={() => onSelectDocument(doc.id)}
                      >
                        <div className="text-sm font-medium">{doc.title}</div>
                        <div className="text-xs text-gray-500">
                          {formatDistanceToNow(doc.updatedAt, {
                            addSuffix: true,
                            locale: zhCN,
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="favorites" className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {favorites.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                暂无收藏
              </p>
            ) : (
              favorites.map((doc) => (
                <div
                  key={doc.id}
                  className={`p-3 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors group ${
                    selectedDocId === doc.id ? "bg-amber-100" : ""
                  }`}
                  onClick={() => onSelectDocument(doc.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {doc.title}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatDistanceToNow(doc.updatedAt, {
                          addSuffix: true,
                          locale: zhCN,
                        })}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFavorite(doc.id);
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="recent" className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {recent.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                暂无最近访问
              </p>
            ) : (
              recent.map((item) => (
                <div
                  key={item.docId}
                  className={`p-3 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors group ${
                    selectedDocId === item.docId ? "bg-amber-100" : ""
                  }`}
                  onClick={() => onSelectDocument(item.docId)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {item.title}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatDistanceToNow(item.accessedAt, {
                          addSuffix: true,
                          locale: zhCN,
                        })}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveRecent(item.docId);
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
}
