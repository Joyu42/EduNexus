"use client";

import { useState } from "react";
import { Plus, X, Link2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Task, Resource } from "@/lib/client/path-storage";

type TaskCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingTasks: Task[];
  onSubmit: (data: Omit<Task, 'id' | 'createdAt' | 'status' | 'progress'>) => void;
};

export function TaskCreateDialog({
  open,
  onOpenChange,
  existingTasks,
  onSubmit,
}: TaskCreateDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [estimatedTime, setEstimatedTime] = useState("");
  const [notes, setNotes] = useState("");
  const [dependencies, setDependencies] = useState<string[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [resourceTitle, setResourceTitle] = useState("");
  const [resourceUrl, setResourceUrl] = useState("");
  const [resourceType, setResourceType] = useState<Resource['type']>("article");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSubmit({
      title: title.trim(),
      description: description.trim(),
      estimatedTime: estimatedTime.trim() || "1小时",
      notes: notes.trim(),
      dependencies,
      resources,
    });

    // 重置表单
    setTitle("");
    setDescription("");
    setEstimatedTime("");
    setNotes("");
    setDependencies([]);
    setResources([]);
  };

  const addResource = () => {
    if (!resourceTitle.trim()) return;
    const resource: Resource = {
      id: `res_${Date.now()}`,
      title: resourceTitle.trim(),
      url: resourceUrl.trim(),
      type: resourceType,
    };
    setResources([...resources, resource]);
    setResourceTitle("");
    setResourceUrl("");
    setResourceType("article");
  };

  const removeResource = (id: string) => {
    setResources(resources.filter(r => r.id !== id));
  };

  const toggleDependency = (taskId: string) => {
    if (dependencies.includes(taskId)) {
      setDependencies(dependencies.filter(d => d !== taskId));
    } else {
      setDependencies([...dependencies, taskId]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-orange-500" />
            创建学习任务
          </DialogTitle>
          <DialogDescription>
            添加一个新的学习任务到当前路径
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="task-title">任务名称 *</Label>
            <Input
              id="task-title"
              placeholder="例如：学习 React Hooks"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-desc">任务描述</Label>
            <Textarea
              id="task-desc"
              placeholder="描述这个任务的学习内容和目标..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="estimated-time">预计时间</Label>
            <Input
              id="estimated-time"
              placeholder="例如：2小时、30分钟"
              value={estimatedTime}
              onChange={(e) => setEstimatedTime(e.target.value)}
            />
          </div>

          {existingTasks.length > 0 && (
            <div className="space-y-2">
              <Label>前置依赖（可选）</Label>
              <div className="space-y-1 max-h-32 overflow-y-auto border rounded-md p-2">
                {existingTasks.map(task => (
                  <label
                    key={task.id}
                    className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={dependencies.includes(task.id)}
                      onChange={() => toggleDependency(task.id)}
                      className="rounded"
                    />
                    <span className="text-sm">{task.title}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>学习资源</Label>
            <div className="space-y-2 border rounded-md p-3">
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="资源名称"
                  value={resourceTitle}
                  onChange={(e) => setResourceTitle(e.target.value)}
                />
                <Select value={resourceType} onValueChange={(v) => setResourceType(v as Resource['type'])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="article">文章</SelectItem>
                    <SelectItem value="video">视频</SelectItem>
                    <SelectItem value="document">文档</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="资源链接（可选）"
                  value={resourceUrl}
                  onChange={(e) => setResourceUrl(e.target.value)}
                  className="flex-1"
                />
                <Button type="button" size="icon" onClick={addResource}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {resources.length > 0 && (
                <div className="space-y-1 mt-2">
                  {resources.map(resource => (
                    <div key={resource.id} className="flex items-center gap-2 text-sm bg-gray-50 rounded p-2">
                      <Link2 className="h-3 w-3 text-blue-500 flex-shrink-0" />
                      <span className="flex-1 truncate">{resource.title}</span>
                      <span className="text-gray-400 text-xs">{resource.type}</span>
                      <button type="button" onClick={() => removeResource(resource.id)}>
                        <X className="h-3 w-3 text-gray-400 hover:text-red-500" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-notes">笔记</Label>
            <Textarea
              id="task-notes"
              placeholder="添加学习笔记..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button
              type="submit"
              className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
            >
              创建任务
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
