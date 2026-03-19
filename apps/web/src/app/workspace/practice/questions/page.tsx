"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  BookOpen,
  Tag,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  getPracticeStorage,
  QuestionBank,
} from "@/lib/client/practice-storage";

export default function QuestionBanksPage() {
  const router = useRouter();
  const [banks, setBanks] = useState<QuestionBank[]>([]);
  const [filteredBanks, setFilteredBanks] = useState<QuestionBank[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<QuestionBank | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 表单状态
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    tags: "",
  });

  useEffect(() => {
    loadBanks();
  }, []);

  useEffect(() => {
    // 搜索过滤
    if (searchQuery.trim() === "") {
      setFilteredBanks(banks);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredBanks(
        banks.filter(
          (bank) =>
            bank.name.toLowerCase().includes(query) ||
            bank.description.toLowerCase().includes(query) ||
            bank.tags.some((tag) => tag.toLowerCase().includes(query))
        )
      );
    }
  }, [searchQuery, banks]);

  const loadBanks = async () => {
    try {
      setIsLoading(true);
      const storage = getPracticeStorage();
      const allBanks = await storage.getAllBanks();
      setBanks(allBanks);
      setFilteredBanks(allBanks);
    } catch (error) {
      console.error("Failed to load banks:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateBank = async () => {
    try {
      const storage = getPracticeStorage();
      const tags = formData.tags
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t);

      await storage.createBank(formData.name, formData.description, tags);
      await loadBanks();
      setIsCreateDialogOpen(false);
      setFormData({ name: "", description: "", tags: "" });
    } catch (error) {
      console.error("Failed to create bank:", error);
      alert("创建题库失败");
    }
  };

  const handleEditBank = async () => {
    if (!editingBank) return;

    try {
      const storage = getPracticeStorage();
      const tags = formData.tags
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t);

      await storage.updateBank({
        ...editingBank,
        name: formData.name,
        description: formData.description,
        tags,
      });
      await loadBanks();
      setIsEditDialogOpen(false);
      setEditingBank(null);
      setFormData({ name: "", description: "", tags: "" });
    } catch (error) {
      console.error("Failed to update bank:", error);
      alert("更新题库失败");
    }
  };

  const handleDeleteBank = async (bankId: string) => {
    if (!confirm("确定要删除这个题库吗？这将删除所有相关题目和记录。")) {
      return;
    }

    try {
      const storage = getPracticeStorage();
      await storage.deleteBank(bankId);
      await loadBanks();
    } catch (error) {
      console.error("Failed to delete bank:", error);
      alert("删除题库失败");
    }
  };

  const openEditDialog = (bank: QuestionBank) => {
    setEditingBank(bank);
    setFormData({
      name: bank.name,
      description: bank.description,
      tags: bank.tags.join(", "),
    });
    setIsEditDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50/30 via-amber-50/20 to-rose-50/30 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-rose-500">
              <BookOpen className="h-6 w-6 text-white" />
            </div>
            题库管理
          </h1>
          <p className="text-muted-foreground">
            创建和管理你的练习题库，支持多种题型和智能组卷
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索题库名称、描述或标签..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 input-enhanced"
            />
          </div>
          <Button
            onClick={() => setIsCreateDialogOpen(true)}
            className="bg-gradient-to-br from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600"
          >
            <Plus className="h-4 w-4 mr-2" />
            创建题库
          </Button>
        </div>

        {/* Banks Grid */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4" />
            <p className="text-muted-foreground">加载中...</p>
          </div>
        ) : filteredBanks.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-orange-500/10 flex items-center justify-center">
              <BookOpen className="h-8 w-8 text-orange-500 opacity-50" />
            </div>
            <p className="text-muted-foreground mb-4">
              {searchQuery ? "没有找到匹配的题库" : "还没有题库"}
            </p>
            {!searchQuery && (
              <Button
                onClick={() => setIsCreateDialogOpen(true)}
                className="bg-gradient-to-br from-orange-500 to-rose-500"
              >
                创建第一个题库
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBanks.map((bank) => (
              <Card
                key={bank.id}
                className="card-hover group border-l-4 border-l-orange-500"
                onClick={() =>
                  router.push(`/workspace/practice/questions/${bank.id}`)
                }
              >
                <CardHeader>
                  <CardTitle className="flex items-start justify-between">
                    <div className="flex items-center gap-2 flex-1">
                      <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500/10 to-rose-500/10 group-hover:from-orange-500/20 group-hover:to-rose-500/20 transition-colors">
                        <BookOpen className="h-5 w-5 text-orange-500" />
                      </div>
                      <span className="flex-1">{bank.name}</span>
                    </div>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(bank)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteBank(bank.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {bank.description || "暂无描述"}
                  </p>

                  <div className="flex items-center gap-4 text-sm mb-3 p-3 rounded-lg bg-gradient-to-br from-orange-50/50 to-rose-50/50">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-orange-500/10">
                        <BookOpen className="h-4 w-4 text-orange-500" />
                      </div>
                      <span className="font-semibold">{bank.questionCount} 题</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-blue-500/10">
                        <Calendar className="h-4 w-4 text-blue-500" />
                      </div>
                      <span className="text-muted-foreground">
                        {bank.updatedAt.toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {bank.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {bank.tags.map((tag, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          <Tag className="h-3 w-3 mr-1" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>创建题库</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">题库名称</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="例如：数学基础练习"
                />
              </div>
              <div>
                <Label htmlFor="description">描述</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="简要描述这个题库的内容和用途"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="tags">标签（用逗号分隔）</Label>
                <Input
                  id="tags"
                  value={formData.tags}
                  onChange={(e) =>
                    setFormData({ ...formData, tags: e.target.value })
                  }
                  placeholder="例如：数学, 基础, 练习"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
              >
                取消
              </Button>
              <Button
                onClick={handleCreateBank}
                disabled={!formData.name.trim()}
              >
                创建
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>编辑题库</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">题库名称</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="edit-description">描述</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="edit-tags">标签（用逗号分隔）</Label>
                <Input
                  id="edit-tags"
                  value={formData.tags}
                  onChange={(e) =>
                    setFormData({ ...formData, tags: e.target.value })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
              >
                取消
              </Button>
              <Button onClick={handleEditBank} disabled={!formData.name.trim()}>
                保存
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

