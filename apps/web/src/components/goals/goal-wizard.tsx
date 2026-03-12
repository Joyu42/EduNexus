'use client';

import { useState } from 'react';
import { Goal, GoalType, GoalCategory } from '@/lib/goals/goal-storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Loader2, BookOpen, Target, Brain } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getModelConfig } from '@/lib/client/model-config';

interface GoalWizardProps {
  onComplete: (goal: Goal) => void;
  onCancel: () => void;
}

interface AISuggestion {
  smart: {
    specific: string;
    measurable: string;
    achievable: string;
    relevant: string;
    timeBound: string;
  };
  suggestedPaths: Array<{
    title: string;
    description: string;
    estimatedWeeks: number;
  }>;
  relatedKnowledge: string[];
  challenges: Array<{
    challenge: string;
    solution: string;
  }>;
}

export function GoalWizard({ onComplete, onCancel }: GoalWizardProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'short-term' as GoalType,
    category: 'other' as GoalCategory,
    specific: '',
    measurable: '',
    achievable: '',
    relevant: '',
    timeBound: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
  });
  const [aiSuggestion, setAiSuggestion] = useState<AISuggestion | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);

  const totalSteps = 4;

  const handleNext = async () => {
    if (step === 1 && formData.title) {
      await fetchAISuggestions();
    }
    if (step < totalSteps) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const fetchAISuggestions = async () => {
    setIsLoadingAI(true);
    try {
      const config = getModelConfig();
      const response = await fetch('/api/goals/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goalTitle: formData.title,
          goalDescription: formData.description,
          category: formData.category,
          type: formData.type,
          apiKey: config.apiKey,
          apiEndpoint: config.apiEndpoint,
          model: config.model,
        }),
      });

      if (response.ok) {
        const suggestion = await response.json();
        setAiSuggestion(suggestion);
        setFormData(prev => ({
          ...prev,
          specific: suggestion.smart?.specific || prev.specific,
          measurable: suggestion.smart?.measurable || prev.measurable,
          achievable: suggestion.smart?.achievable || prev.achievable,
          relevant: suggestion.smart?.relevant || prev.relevant,
          timeBound: suggestion.smart?.timeBound || prev.timeBound,
        }));
      }
    } catch (error) {
      console.error('Failed to fetch AI suggestions:', error);
    } finally {
      setIsLoadingAI(false);
    }
  };

  const handleSubmit = () => {
    const goal: Goal = {
      id: Date.now().toString(),
      title: formData.title,
      description: formData.description,
      type: formData.type,
      category: formData.category,
      status: 'active',
      smart: {
        specific: formData.specific,
        measurable: formData.measurable,
        achievable: formData.achievable,
        relevant: formData.relevant,
        timeBound: formData.timeBound,
      },
      progress: 0,
      linkedPathIds: [],
      relatedKnowledge: aiSuggestion?.relatedKnowledge || [],
      startDate: formData.startDate,
      endDate: formData.endDate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onComplete(goal);
  };

  const categoryIcons: Record<string, string> = {
    exam: '📝', skill: '⚡', project: '🚀', habit: '🔄', other: '🎯'
  };

  const stepLabels = ['基本信息', 'SMART (S/M/A)', 'SMART (R/T)', '时间与确认'];

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-5">
            <div>
              <Label htmlFor="title">目标标题 *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="例如：通过英语六级考试"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="description">目标描述</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="详细描述你的目标，越具体越好..."
                rows={3}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="mb-2 block">目标类型</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'short-term', label: '短期', desc: '1-3个月' },
                  { value: 'mid-term', label: '中期', desc: '3-12个月' },
                  { value: 'long-term', label: '长期', desc: '1年以上' },
                ].map(({ value, label, desc }) => (
                  <div
                    key={value}
                    onClick={() => setFormData({ ...formData, type: value as GoalType })}
                    className={`p-3 rounded-lg border-2 cursor-pointer text-center transition-all ${
                      formData.type === value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="font-medium text-sm">{label}</div>
                    <div className="text-xs text-muted-foreground">{desc}</div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <Label className="mb-2 block">目标分类</Label>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { value: 'exam', label: '考试' },
                  { value: 'skill', label: '技能' },
                  { value: 'project', label: '项目' },
                  { value: 'habit', label: '习惯' },
                  { value: 'other', label: '其他' },
                ].map(({ value, label }) => (
                  <div
                    key={value}
                    onClick={() => setFormData({ ...formData, category: value as GoalCategory })}
                    className={`p-2 rounded-lg border-2 cursor-pointer text-center transition-all ${
                      formData.category === value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="text-lg">{categoryIcons[value]}</div>
                    <div className="text-xs font-medium">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Brain className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">SMART 目标设定</h3>
              {aiSuggestion && (
                <Badge variant="secondary" className="text-xs">
                  <Sparkles className="w-3 h-3 mr-1" />
                  AI 已填充
                </Badge>
              )}
            </div>
            {isLoadingAI && (
              <div className="flex items-center justify-center py-8 bg-muted/30 rounded-lg">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <span className="ml-2 text-sm text-muted-foreground">AI 正在分析你的目标...</span>
              </div>
            )}
            {[
              { key: 'specific', label: 'S - 具体的', placeholder: '你的目标具体是什么？' },
              { key: 'measurable', label: 'M - 可衡量的', placeholder: '如何衡量进度？' },
              { key: 'achievable', label: 'A - 可实现的', placeholder: '为什么这个目标是可实现的？' },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <Label htmlFor={key}>{label}</Label>
                <Textarea
                  id={key}
                  value={formData[key as keyof typeof formData] as string}
                  onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                  placeholder={placeholder}
                  rows={2}
                  className="mt-1"
                />
              </div>
            ))}
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            {[
              { key: 'relevant', label: 'R - 相关的', placeholder: '这个目标为什么重要？' },
              { key: 'timeBound', label: 'T - 有时限的', placeholder: '完成时间？' },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <Label htmlFor={key}>{label}</Label>
                <Textarea
                  id={key}
                  value={formData[key as keyof typeof formData] as string}
                  onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                  placeholder={placeholder}
                  rows={2}
                  className="mt-1"
                />
              </div>
            ))}
            {aiSuggestion?.challenges && aiSuggestion.challenges.length > 0 && (
              <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <p className="text-sm font-semibold mb-2 flex items-center gap-1">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  AI 预见的挑战与应对
                </p>
                <div className="space-y-2">
                  {aiSuggestion.challenges.slice(0, 2).map((c, i) => (
                    <div key={i} className="text-xs">
                      <span className="text-red-500">⚠ {c.challenge}</span>
                      <span className="text-green-600 ml-2">→ {c.solution}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">开始日期</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="endDate">目标完成日期 *</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg space-y-2">
              <h4 className="font-semibold text-sm">目标摘要</h4>
              <p className="text-sm"><strong>{formData.title}</strong></p>
              <div className="flex gap-2">
                <Badge variant="outline">{formData.type}</Badge>
                <Badge variant="outline">{categoryIcons[formData.category]} {formData.category}</Badge>
              </div>
            </div>

            {aiSuggestion?.suggestedPaths && aiSuggestion.suggestedPaths.length > 0 && (
              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm font-semibold mb-2 flex items-center gap-1">
                  <BookOpen className="w-4 h-4 text-blue-500" />
                  AI 推荐的学习路径
                </p>
                <div className="space-y-2">
                  {aiSuggestion.suggestedPaths.map((p, i) => (
                    <div key={i} className="text-xs bg-white dark:bg-gray-900 p-2 rounded border">
                      <div className="font-medium">{p.title}</div>
                      <div className="text-muted-foreground">{p.description} · 约 {p.estimatedWeeks} 周</div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">创建目标后可在学习路径中关联</p>
              </div>
            )}

            {aiSuggestion?.relatedKnowledge && aiSuggestion.relatedKnowledge.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">相关知识点</p>
                <div className="flex flex-wrap gap-1">
                  {aiSuggestion.relatedKnowledge.map((k, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">{k}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          创建新目标
        </CardTitle>
        <CardDescription>步骤 {step} / {totalSteps} · {stepLabels[step - 1]}</CardDescription>
        <div className="flex gap-1 mt-2">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-all ${
                i + 1 <= step ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {renderStep()}
        <div className="flex justify-between mt-6">
          <Button variant="outline" onClick={step === 1 ? onCancel : handleBack}>
            {step === 1 ? '取消' : '上一步'}
          </Button>
          {step < totalSteps ? (
            <Button onClick={handleNext} disabled={!formData.title || isLoadingAI}>
              {isLoadingAI ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />AI 分析中...</>
              ) : (
                <>下一步 {step === 1 && formData.title && <Sparkles className="w-4 h-4 ml-2" />}</>
              )}
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={!formData.endDate}>
              创建目标
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
