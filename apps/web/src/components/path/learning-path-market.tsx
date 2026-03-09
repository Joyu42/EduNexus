'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Clock, Users, Download, Play, Search } from 'lucide-react';
import { pathTemplates } from '@/lib/path/path-templates';
import { PathTemplate, LearningPath } from '@/lib/path/path-types';
import { savePath } from '@/lib/path/path-storage';

interface LearningPathMarketProps {
  onSelectTemplate?: (path: LearningPath) => void;
  onStartPath?: (path: LearningPath) => void;
}

export default function LearningPathMarket({
  onSelectTemplate,
  onStartPath,
}: LearningPathMarketProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');

  const categories = Array.from(new Set(pathTemplates.map((t) => t.category)));

  const filteredTemplates = pathTemplates.filter((template) => {
    const matchesSearch =
      template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.tags.some((tag) =>
        tag.toLowerCase().includes(searchQuery.toLowerCase())
      );

    const matchesCategory =
      selectedCategory === 'all' || template.category === selectedCategory;

    const matchesDifficulty =
      selectedDifficulty === 'all' || template.difficulty === selectedDifficulty;

    return matchesSearch && matchesCategory && matchesDifficulty;
  });

  const handleCloneTemplate = async (template: PathTemplate) => {
    const newPath: LearningPath = {
      ...template.path,
      id: `path-${Date.now()}`,
      title: `${template.title}（副本）`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await savePath(newPath);
    onSelectTemplate?.(newPath);
  };

  const handleStartPath = async (template: PathTemplate) => {
    const newPath: LearningPath = {
      ...template.path,
      id: `path-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await savePath(newPath);
    onStartPath?.(newPath);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">学习路径市场</h1>
        <p className="text-gray-600">
          探索精心设计的学习路径，或克隆模板创建你自己的路径
        </p>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="搜索路径、标签..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="选择分类" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有分类</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="选择难度" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有难度</SelectItem>
              <SelectItem value="beginner">初级</SelectItem>
              <SelectItem value="intermediate">中级</SelectItem>
              <SelectItem value="advanced">高级</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => (
          <Card key={template.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between mb-2">
                <Badge
                  variant={
                    template.difficulty === 'beginner'
                      ? 'default'
                      : template.difficulty === 'intermediate'
                      ? 'secondary'
                      : 'destructive'
                  }
                >
                  {template.difficulty === 'beginner' && '初级'}
                  {template.difficulty === 'intermediate' && '中级'}
                  {template.difficulty === 'advanced' && '高级'}
                </Badge>
                <Badge variant="outline">{template.category}</Badge>
              </div>
              <CardTitle className="text-xl">{template.title}</CardTitle>
              <CardDescription className="line-clamp-2">
                {template.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{Math.round(template.estimatedDuration / 60)}h</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{template.path.nodes.length} 节点</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {template.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {template.tags.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{template.tags.length - 3}
                  </Badge>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={() => handleStartPath(template)}
                >
                  <Play className="w-4 h-4 mr-1" />
                  开始学习
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleCloneTemplate(template)}
                >
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p>没有找到匹配的学习路径</p>
          <p className="text-sm mt-2">尝试调整搜索条件或筛选器</p>
        </div>
      )}
    </div>
  );
}