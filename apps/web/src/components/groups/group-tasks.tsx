'use client';

import { useState } from 'react';
import { CheckCircle2, Circle, Clock, Plus, Calendar } from 'lucide-react';
import type { GroupTask } from '@/lib/groups/group-types';

interface GroupTasksProps {
  tasks: GroupTask[];
  members: Array<{ userId: string; userName: string }>;
  onCreateTask?: (title: string, description: string, assignedTo: string[], dueDate: string) => void;
  onUpdateStatus?: (taskId: string, status: 'pending' | 'in_progress' | 'completed') => void;
}

const statusConfig = {
  pending: { label: '待处理', color: 'text-gray-500', bgColor: 'bg-gray-100', icon: Circle },
  in_progress: { label: '进行中', color: 'text-blue-600', bgColor: 'bg-blue-100', icon: Clock },
  completed: { label: '已完成', color: 'text-green-600', bgColor: 'bg-green-100', icon: CheckCircle2 },
};

export function GroupTasks({ tasks, members, onCreateTask, onUpdateStatus }: GroupTasksProps) {
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    assignedTo: [] as string[],
    dueDate: '',
  });

  const handleCreateTask = () => {
    if (newTask.title.trim() && newTask.dueDate && onCreateTask) {
      onCreateTask(newTask.title, newTask.description, newTask.assignedTo, newTask.dueDate);
      setNewTask({ title: '', description: '', assignedTo: [], dueDate: '' });
      setShowNewTask(false);
    }
  };

  const groupedTasks = {
    pending: tasks.filter((t) => t.status === 'pending'),
    in_progress: tasks.filter((t) => t.status === 'in_progress'),
    completed: tasks.filter((t) => t.status === 'completed'),
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">任务管理</h3>
        <button
          onClick={() => setShowNewTask(!showNewTask)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          创建任务
        </button>
      </div>

      {showNewTask && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
          <input
            type="text"
            placeholder="任务标题"
            value={newTask.title}
            onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <textarea
            placeholder="任务描述"
            value={newTask.description}
            onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <input
              type="date"
              value={newTask.dueDate}
              onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowNewTask(false)}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleCreateTask}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              创建
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(groupedTasks).map(([status, statusTasks]) => {
          const config = statusConfig[status as keyof typeof statusConfig];
          const StatusIcon = config.icon;

          return (
            <div key={status} className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <StatusIcon className={`w-5 h-5 ${config.color}`} />
                <h4 className="font-semibold text-gray-900">{config.label}</h4>
                <span className="text-sm text-gray-500">({statusTasks.length})</span>
              </div>

              <div className="space-y-2">
                {statusTasks.map((task) => {
                  const isOverdue = new Date(task.dueDate) < new Date() && task.status !== 'completed';

                  return (
                    <div
                      key={task.id}
                      className="bg-white rounded-lg border border-gray-200 p-3 hover:border-gray-300 transition-colors"
                    >
                      <h5 className="font-medium text-gray-900 mb-1">{task.title}</h5>
                      {task.description && (
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">{task.description}</p>
                      )}

                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
                            {new Date(task.dueDate).toLocaleDateString()}
                          </span>
                        </div>
                        {task.assignedTo.length > 0 && (
                          <span>{task.assignedTo.length} 人</span>
                        )}
                      </div>

                      {onUpdateStatus && task.status !== 'completed' && (
                        <button
                          onClick={() => onUpdateStatus(task.id, task.status === 'pending' ? 'in_progress' : 'completed')}
                          className="mt-2 w-full px-3 py-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors text-xs font-medium"
                        >
                          {task.status === 'pending' ? '开始任务' : '完成任务'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}