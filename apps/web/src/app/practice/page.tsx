"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Search, Tag, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getPracticeStorage, QuestionBank } from "@/lib/practice";

export default function PracticeDashboardPage() {
  const router = useRouter();
  const [banks, setBanks] = useState<QuestionBank[]>([]);
  const [filteredBanks, setFilteredBanks] = useState<QuestionBank[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadBanks();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredBanks(banks);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredBanks(
        banks.filter(
          (bank) =>
            bank.name.toLowerCase().includes(query) ||
            (bank.description && bank.description.toLowerCase().includes(query)) ||
            (bank.tags && bank.tags.some((tag) => tag.toLowerCase().includes(query)))
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50/30 via-white to-cyan-50/30 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-100 text-indigo-700">
                <BookOpen className="h-6 w-6" />
              </div>
              题库练习
            </h1>
            <p className="text-muted-foreground mt-2">
              选择一个题库开始专项练习，检验你的学习成果。
            </p>
          </div>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="搜索题库名称、描述或标签..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white/80 border-slate-200"
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        ) : filteredBanks.length === 0 ? (
          <div className="text-center py-20 bg-white/50 rounded-2xl border border-dashed border-slate-200">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 mb-4">
              <BookOpen className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900">没有找到题库</h3>
            <p className="text-slate-500 mt-1 max-w-sm mx-auto">
              {searchQuery ? "没有找到符合搜索条件的题库" : "暂无可用的练习题库，请先在工作区创建。"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBanks.map((bank) => (
              <Card
                key={bank.id}
                className="group hover:shadow-md transition-all border-slate-200/60 overflow-hidden flex flex-col"
              >
                <CardHeader className="bg-slate-50/50 pb-4 border-b border-slate-100">
                  <CardTitle className="text-lg flex items-start gap-3">
                    <span className="flex-1 text-slate-800 group-hover:text-indigo-700 transition-colors">
                      {bank.name}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 flex-1 flex flex-col">
                  <p className="text-sm text-slate-600 mb-4 line-clamp-2 flex-1">
                    {bank.description || "暂无描述"}
                  </p>

                  <div className="flex items-center gap-4 text-sm mb-5 text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <BookOpen className="h-4 w-4" />
                      <span>{bank.questionCount} 题</span>
                    </div>
                  </div>

                  {bank.tags && bank.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-5">
                      {bank.tags.map((tag, idx) => (
                        <Badge key={idx} variant="secondary" className="bg-slate-100 text-slate-600 hover:bg-slate-200 font-normal">
                          <Tag className="h-3 w-3 mr-1" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <Button 
                    className="w-full bg-indigo-600 hover:bg-indigo-700 mt-auto"
                    onClick={() => router.push(`/practice/${bank.id}`)}
                  >
                    <PlayCircle className="mr-2 h-4 w-4" />
                    开始练习
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
