'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  Edit,
  Trash2,
  Download,
  Upload,
  Check,
  X,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  getAllTeachers,
  createCustomTeacher,
  updateTeacher,
  deleteCustomTeacher,
  exportTeacher,
  importTeacher,
  type AITeacher,
} from '@/lib/workspace/teacher-storage';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface TeacherManagerProps {
  currentTeacherId: string;
  onSelectTeacher: (teacher: AITeacher) => void;
}

const ageGroupLabels = {
  elementary: '小学',
  middle: '中学',
  high: '高中',
  college: '大学',
  professional: '职场',
  general: '通用',
};

const teachingStyleLabels = {
  socratic: '苏格拉底式',
  direct: '直接教学',
  interactive: '互动式',
  'project-based': '项目式',
  mixed: '混合式',
};

export function TeacherManager({ currentTeacherId, onSelectTeacher }: TeacherManagerProps) {
  const [teachers, setTeachers] = useState<AITeacher[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<AITeacher | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    avatar: '👨‍🏫',
    description: '',
    systemPrompt: '',
    ageGroup: 'general' as AITeacher['ageGroup'],
    specialty: '',
    teachingStyle: 'mixed' as AITeacher['teachingStyle'],
    temperature: 0.7,
  });

  useEffect(() => {
    loadTeachers();
  }, []);

  const loadTeachers = async () => {
    const allTeachers = await getAllTeachers();
    setTeachers(allTeachers);
  };

  const handleCreate = async () => {
    try {
      const teacher = await createCustomTeacher({
        name: formData.name,
        avatar: formData.avatar,
        description: formData.description,
        systemPrompt: formData.systemPrompt,
        ageGroup: formData.ageGroup,
        specialty: formData.specialty.split(',').map(s => s.trim()).filter(Boolean),
        teachingStyle: formData.teachingStyle,
        temperature: formData.temperature,
      });

      setTeachers(prev => [...prev, teacher]);
      setShowCreateDialog(false);
      resetForm();
      toast.success('老师创建成功！');
    } catch (error) {
      console.error('创建老师失败:', error);
      toast.error('创建失败');
    }
  };

  const handleUpdate = async () => {
    if (!editingTeacher) return;

    try {
      await updateTeacher(editingTeacher.id, {
        name: formData.name,
        avatar: formData.avatar,
        description: formData.description,
        systemPrompt: formData.systemPrompt,
        ageGroup: formData.ageGroup,
        specialty: formData.specialty.split(',').map(s => s.trim()).filter(Boolean),
        teachingStyle: formData.teachingStyle,
        temperature: formData.temperature,
      });

      await loadTeachers();
      setEditingTeacher(null);
      resetForm();
      toast.success('老师更新成功！');
    } catch (error) {
      console.error('更新老师失败:', error);
      toast.error('更新失败');
    }
  };

  const handleDelete = async (teacher: AITeacher) => {
    if (!teacher.isCustom) {
      toast.error('预设老师不能删除');
      return;
    }

    if (!confirm(`确定要删除"${teacher.name}"吗？`)) return;

    try {
      await deleteCustomTeacher(teacher.id);
      setTeachers(prev => prev.filter(t => t.id !== teacher.id));
      toast.success('老师已删除');
    } catch (error) {
      console.error('删除老师失败:', error);
      toast.error('删除失败');
    }
  };

  const handleExport = (teacher: AITeacher) => {
    const json = exportTeacher(teacher);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `teacher-${teacher.id}.json`;
    a.click();
    toast.success('老师配置已导出');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const teacher = await importTeacher(text);
      setTeachers(prev => [...prev, teacher]);
      toast.success('老师导入成功！');
    } catch (error) {
      console.error('导入老师失败:', error);
      toast.error('导入失败');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      avatar: '👨‍🏫',
      description: '',
      systemPrompt: '',
      ageGroup: 'general',
      specialty: '',
      teachingStyle: 'mixed',
      temperature: 0.7,
    });
  };

  const openEditDialog = (teacher: AITeacher) => {
    if (!teacher.isCustom) {
      toast.error('预设老师不能编辑');
      return;
    }

    setEditingTeacher(teacher);
    setFormData({
      name: teacher.name,
      avatar: teacher.avatar,
      description: teacher.description,
      systemPrompt: teacher.systemPrompt,
      ageGroup: teacher.ageGroup,
      specialty: teacher.specialty.join(', '),
      teachingStyle: teacher.teachingStyle,
      temperature: teacher.temperature,
    });
  };

  const presetTeachers = teachers.filter(t => !t.isCustom);
  const customTeachers = teachers.filter(t => t.isCustom);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">AI 老师</h3>
        <div className="flex gap-2">
          <input
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
            id="import-teacher"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => document.getElementById('import-teacher')?.click()}
            className="text-xs"
          >
            <Upload className="h-3 w-3 mr-1" />
            导入
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowCreateDialog(true)}
            className="text-xs"
          >
            <Plus className="h-3 w-3 mr-1" />
            创建
          </Button>
        </div>
      </div>

      {/* 预设老师 */}
      <div>
        <p className="text-xs text-muted-foreground mb-2">预设老师</p>
        <div className="space-y-2">
          {presetTeachers.map((teacher) => (
            <motion.div
              key={teacher.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Card
                className={cn(
                  'cursor-pointer transition-all',
                  currentTeacherId === teacher.id
                    ? 'border-orange-500 bg-orange-50 shadow-md'
                    : 'hover:border-orange-300 hover:shadow-sm'
                )}
                onClick={() => onSelectTeacher(teacher)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl flex-shrink-0">{teacher.avatar}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-semibold">{teacher.name}</h4>
                        {currentTeacherId === teacher.id && (
                          <Check className="h-3 w-3 text-orange-500" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                        {teacher.description}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="secondary" className="text-[10px]">
                          {ageGroupLabels[teacher.ageGroup]}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {teachingStyleLabels[teacher.teachingStyle]}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExport(teacher);
                      }}
                      className="h-6 w-6 p-0"
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* 自定义老师 */}
      {customTeachers.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-2">自定义老师</p>
          <div className="space-y-2">
            {customTeachers.map((teacher) => (
              <motion.div
                key={teacher.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Card
                  className={cn(
                    'cursor-pointer transition-all',
                    currentTeacherId === teacher.id
                      ? 'border-purple-500 bg-purple-50 shadow-md'
                      : 'hover:border-purple-300 hover:shadow-sm'
                  )}
                  onClick={() => onSelectTeacher(teacher)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <div className="text-2xl flex-shrink-0">{teacher.avatar}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-sm font-semibold">{teacher.name}</h4>
                          {currentTeacherId === teacher.id && (
                            <Check className="h-3 w-3 text-purple-500" />
                          )}
                          <Badge variant="secondary" className="text-[10px]">
                            <Sparkles className="h-2 w-2 mr-1" />
                            自定义
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                          {teacher.description}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {teacher.specialty.slice(0, 3).map((s, i) => (
                            <Badge key={i} variant="outline" className="text-[10px]">
                              {s}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditDialog(teacher);
                          }}
                          className="h-6 w-6 p-0"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(teacher);
                          }}
                          className="h-6 w-6 p-0 text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* 创建/编辑对话框 */}
      <Dialog
        open={showCreateDialog || editingTeacher !== null}
        onOpenChange={(open) => {
          if (!open) {
            setShowCreateDialog(false);
            setEditingTeacher(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTeacher ? '编辑老师' : '创建自定义老师'}
            </DialogTitle>
            <DialogDescription>
              自定义 AI 老师的教学风格和专长领域
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">老师名称 *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例如：Python 专家"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="avatar">头像 Emoji</Label>
                <Input
                  id="avatar"
                  value={formData.avatar}
                  onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                  placeholder="👨‍🏫"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">描述 *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="简要描述这位老师的特点和教学风格..."
                rows={2}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="systemPrompt">系统提示词 *</Label>
              <Textarea
                id="systemPrompt"
                value={formData.systemPrompt}
                onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
                placeholder="定义老师的教学原则、回复风格等..."
                rows={6}
                className="mt-1 font-mono text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ageGroup">适合年龄段</Label>
                <select
                  id="ageGroup"
                  value={formData.ageGroup}
                  onChange={(e) => setFormData({ ...formData, ageGroup: e.target.value as AITeacher['ageGroup'] })}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="general">通用</option>
                  <option value="elementary">小学</option>
                  <option value="middle">中学</option>
                  <option value="high">高中</option>
                  <option value="college">大学</option>
                  <option value="professional">职场</option>
                </select>
              </div>
              <div>
                <Label htmlFor="teachingStyle">教学风格</Label>
                <select
                  id="teachingStyle"
                  value={formData.teachingStyle}
                  onChange={(e) => setFormData({ ...formData, teachingStyle: e.target.value as AITeacher['teachingStyle'] })}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="socratic">苏格拉底式</option>
                  <option value="direct">直接教学</option>
                  <option value="interactive">互动式</option>
                  <option value="project-based">项目式</option>
                  <option value="mixed">混合式</option>
                </select>
              </div>
            </div>

            <div>
              <Label htmlFor="specialty">专长领域（用逗号分隔）</Label>
              <Input
                id="specialty"
                value={formData.specialty}
                onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                placeholder="例如：Python, 数据分析, 机器学习"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="temperature">温度参数：{formData.temperature}</Label>
              <input
                id="temperature"
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={formData.temperature}
                onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                className="w-full mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                较低值更保守，较高值更有创造性
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false);
                setEditingTeacher(null);
                resetForm();
              }}
            >
              取消
            </Button>
            <Button
              onClick={editingTeacher ? handleUpdate : handleCreate}
              disabled={!formData.name || !formData.description || !formData.systemPrompt}
              className="bg-gradient-to-r from-orange-500 to-rose-500"
            >
              {editingTeacher ? '更新' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
