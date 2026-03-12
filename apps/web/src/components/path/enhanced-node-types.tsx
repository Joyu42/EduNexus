'use client';

import React, { memo, useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import {
  FileText,
  Video,
  Code,
  CheckCircle2,
  PlayCircle,
  CheckCircle,
  BookOpen,
  Lightbulb,
  Trophy,
  Clock,
  MoreVertical,
  Edit,
  Trash2,
  Users,
  RotateCcw,
  BookMarked,
  FlaskConical,
  ClipboardList,
  Presentation,
  Search,
} from 'lucide-react';
import { PathNodeData, NodeType } from '@/lib/path/path-types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const nodeConfig: Record<NodeType, {
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  label: string;
}> = {
  document: { icon: FileText, gradient: 'from-blue-500 to-cyan-500', label: '文档学习' },
  video: { icon: Video, gradient: 'from-purple-500 to-pink-500', label: '视频课程' },
  practice: { icon: Code, gradient: 'from-green-500 to-emerald-500', label: '实践练习' },
  quiz: { icon: CheckCircle2, gradient: 'from-orange-500 to-amber-500', label: '测验考核' },
  project: { icon: BookOpen, gradient: 'from-teal-500 to-cyan-500', label: '项目实战' },
  discussion: { icon: Users, gradient: 'from-violet-500 to-purple-500', label: '讨论交流' },
  review: { icon: RotateCcw, gradient: 'from-yellow-500 to-orange-500', label: '复习回顾' },
  reading: { icon: BookMarked, gradient: 'from-indigo-500 to-blue-500', label: '阅读材料' },
  lab: { icon: FlaskConical, gradient: 'from-lime-500 to-green-500', label: '实验室' },
  assignment: { icon: ClipboardList, gradient: 'from-emerald-500 to-teal-500', label: '作业任务' },
  presentation: { icon: Presentation, gradient: 'from-rose-500 to-pink-500', label: '演示汇报' },
  research: { icon: Search, gradient: 'from-fuchsia-500 to-purple-500', label: '研究调研' },
  start: { icon: PlayCircle, gradient: 'from-gray-600 to-gray-700', label: '开始' },
  end: { icon: Trophy, gradient: 'from-yellow-500 to-orange-500', label: '完成' },
};

const difficultyConfig = {
  beginner: { label: '初级', color: 'bg-green-100 text-green-700 border-green-300' },
  intermediate: { label: '中级', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  advanced: { label: '高级', color: 'bg-red-100 text-red-700 border-red-300' },
};

export const EnhancedPathNode = memo(({ data, selected, id }: NodeProps<PathNodeData>) => {
  const [isHovered, setIsHovered] = useState(false);
  const config = nodeConfig[data.type];
  const Icon = config.icon;
  const isStartOrEnd = data.type === 'start' || data.type === 'end';
  const isCompleted = data.status === 'completed';
  const isInProgress = data.status === 'in_progress';

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {!isStartOrEnd && (
        <Handle
          type="target"
          position={Position.Top}
          className="!bg-gradient-to-r !from-blue-500 !to-purple-500 !w-3 !h-3 !border-2 !border-white"
        />
      )}

      <div
        className={cn(
          'relative rounded-xl bg-white shadow-lg transition-all duration-300',
          'border-2',
          selected ? 'border-blue-500 shadow-2xl scale-105' : 'border-gray-200',
          isCompleted && 'border-green-500 bg-gradient-to-br from-green-50 to-emerald-50',
          isInProgress && 'border-yellow-500 bg-gradient-to-br from-yellow-50 to-amber-50',
          isHovered && !selected && 'shadow-xl scale-102',
          'min-w-[160px] max-w-[200px]'
        )}
      >
        {/* 顶部渐变条 */}
        <div className={cn('h-1.5 rounded-t-xl bg-gradient-to-r', config.gradient)} />

        <div className="p-3">
          {/* 节点头部 */}
          <div className="flex items-start gap-2 mb-2">
            <div
              className={cn(
                'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center',
                'bg-gradient-to-br shadow-md',
                config.gradient
              )}
            >
              <Icon className="w-4 h-4 text-white" />
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-xs text-gray-900 mb-0.5 line-clamp-2">
                {data.label}
              </h3>
              {data.difficulty && (
                <span
                  className={cn(
                    'inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-full border',
                    difficultyConfig[data.difficulty].color
                  )}
                >
                  {difficultyConfig[data.difficulty].label}
                </span>
              )}
            </div>

            {/* 操作按钮 */}
            {isHovered && !isStartOrEnd && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Edit className="w-4 h-4 mr-2" />
                    编辑
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-red-600">
                    <Trash2 className="w-4 h-4 mr-2" />
                    删除
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* 节点描述 */}
          {data.description && !isStartOrEnd && (
            <p className="text-[10px] text-gray-600 mb-2 line-clamp-2 leading-relaxed">
              {data.description}
            </p>
          )}

          {/* 底部信息 */}
          <div className="flex items-center justify-between">
            {data.estimatedTime && (
              <div className="flex items-center gap-1 text-[10px] text-gray-500">
                <Clock className="w-3 h-3" />
                <span>{data.estimatedTime}分钟</span>
              </div>
            )}

            {/* 完成状态 */}
            {isCompleted && (
              <div className="flex items-center gap-0.5 text-[10px] text-green-600 font-medium">
                <CheckCircle className="w-3 h-3" />
                完成
              </div>
            )}
            {isInProgress && (
              <div className="flex items-center gap-0.5 text-[10px] text-yellow-600 font-medium">
                <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
                进行中
              </div>
            )}
          </div>
        </div>

        {/* 底部装饰线 */}
        {(isCompleted || isInProgress) && (
          <div
            className={cn(
              'h-1 rounded-b-xl',
              isCompleted && 'bg-gradient-to-r from-green-500 to-emerald-500',
              isInProgress && 'bg-gradient-to-r from-yellow-500 to-amber-500'
            )}
          />
        )}
      </div>

      {!isStartOrEnd && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!bg-gradient-to-r !from-purple-500 !to-pink-500 !w-3 !h-3 !border-2 !border-white"
        />
      )}
    </div>
  );
});

EnhancedPathNode.displayName = 'EnhancedPathNode';

// 节点类型映射
export const nodeTypes = {
  default: EnhancedPathNode,
  input: EnhancedPathNode,
  output: EnhancedPathNode,
};
