"use client";

import { useState, useEffect } from "react";
import { Flag, Plus, X, Edit, Trash2 } from "lucide-react";
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
import { Card, CardContent } from "@/components/ui/card";
import type { Milestone, Task } from "@/lib/client/path-storage";

type MilestoneDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  milestones: Milestone[];
  tasks: Task[];
  onUpdate: (milestones: Milestone[]) => void;
};

export function MilestoneDialog({
  open,
  onOpenChange,
  milestones,
  tasks,
  onUpdate,
}: MilestoneDialogProps) {
  const [localMilestones, setLocalMilestones] = useState<Milestone[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [newTitle, setNewTitle] = useState("");

  useEffect(() => {
    setLocalMilestones(milestones);
  }, [milestones]);

  const handleAddMilestone = () => {
    if (!newTitle.trim()) return;

    const newMilestone: Milestone = {
      id: `milestone_${Date.now()}`,
      title: newTitle.trim(),
      taskIds: [],
    };

    setLocalMilestones([...localMilestones, newMilestone]);
    setNewTitle("");
  };

  const handleEditMilestone = (id: string) => {
    const milestone = localMilestones.find(m => m.id === id);
    if (milestone) {
      setEditingId(id);
      setEditTitle(milestone.title);
    }
  };

  const handleSaveEdit = () => {
    if (!editTitle.trim() || !editingId) return;

    setLocalMilestones(localMilestones.map(m =>
      m.id === editingId ? { ...m, title: editTitle.trim() } : m
    ));
    setEditingId(null);
    setEditTitle("");
  };

  const handleDeleteMilestone = (id: string) => {
    setLocalMilestones(localMilestones.filter(m => m.id !== id));
  };

  const handleToggleTask = (milestoneId: string, taskId: string) => {
    setLocalMilestones(localMilestones.map(m => {
      if (m.id === milestoneId) {
        const taskIds = m.taskIds.includes(taskId)
          ? m.taskIds.filter(id => id !== taskId)
          : [...m.taskIds, taskId];
        return { ...m, taskIds };
      }
      return m;
    }));
  };

  const handleSubmit = () => {
    onUpdate(localMilestones);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-amber-500" />
            管理里程碑
          </DialogTitle>
          <DialogDescription>
            创建里程碑并分配任务，规划学习阶段
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 添加新里程碑 */}
          <div className="flex gap-2">
            <Input
              placeholder="新里程碑名称..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddMilestone();
                }
              }}
            />
            <Button onClick={handleAddMilestone} size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* 里程碑列表 */}
          <div className="space-y-3">
            {localMilestones.map((milestone) => (
              <Card key={milestone.id} className="border-amber-200">
                <CardContent className="p-4 space-y-3">
                  {/* 里程碑标题 */}
                  <div className="flex items-center gap-2">
                    <Flag className="h-4 w-4 text-amber-500 flex-shrink-0" />
                    {editingId === milestone.id ? (
                      <div className="flex-1 flex gap-2">
                        <Input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleSaveEdit();
                            }
                          }}
                          autoFocus
                        />
                        <Button size="sm" onClick={handleSaveEdit}>
                          保存
                        </Button>
                      </div>
                    ) : (
                      <>
                        <span className="flex-1 font-medium">{milestone.title}</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleEditMilestone(milestone.id)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDeleteMilestone(milestone.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </>
                    )}
                  </div>

                  {/* 任务选择 */}
                  <div className="space-y-1 pl-6">
                    <Label className="text-xs text-gray-500">
                      包含的任务 ({milestone.taskIds.length})
                    </Label>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {tasks.map(task => (
                        <label
                          key={task.id}
                          className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={milestone.taskIds.includes(task.id)}
                            onChange={() => handleToggleTask(milestone.id, task.id)}
                            className="rounded"
                          />
                          <span className="flex-1">{task.title}</span>
                          <span className="text-xs text-gray-400">
                            {task.progress}%
                          </span>
                        </label>
                      ))}
                      {tasks.length === 0 && (
                        <p className="text-sm text-gray-400 py-2">
                          暂无任务，请先创建任务
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {localMilestones.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <Flag className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>暂无里程碑，添加一个开始规划吧</p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
          >
            保存里程碑
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
