'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import {
  FileText,
  Video,
  Code,
  CheckCircle2,
  Circle,
  Clock,
  PlayCircle,
  CheckCircle,
  BookOpen,
  Users,
  RotateCcw,
  BookMarked,
  FlaskConical,
  ClipboardList,
  Presentation,
  Search,
  Trophy,
} from 'lucide-react';
import { PathNodeData, NodeType } from '@/lib/path/path-types';
import { cn } from '@/lib/utils';

const nodeIcons: Record<NodeType, React.ComponentType<{ className?: string }>> = {
  document: FileText,
  video: Video,
  practice: Code,
  quiz: CheckCircle2,
  project: BookOpen,
  discussion: Users,
  review: RotateCcw,
  reading: BookMarked,
  lab: FlaskConical,
  assignment: ClipboardList,
  presentation: Presentation,
  research: Search,
  start: PlayCircle,
  end: Trophy,
};

const nodeColors: Record<NodeType, string> = {
  document: 'bg-blue-500',
  video: 'bg-purple-500',
  practice: 'bg-green-500',
  quiz: 'bg-orange-500',
  project: 'bg-teal-500',
  discussion: 'bg-violet-500',
  review: 'bg-yellow-500',
  reading: 'bg-indigo-500',
  lab: 'bg-lime-500',
  assignment: 'bg-emerald-500',
  presentation: 'bg-rose-500',
  research: 'bg-fuchsia-500',
  start: 'bg-gray-500',
  end: 'bg-gray-700',
};

const difficultyColors = {
  beginner: 'text-green-600',
  intermediate: 'text-yellow-600',
  advanced: 'text-red-600',
};

export const PathNode = memo(({ data, selected }: NodeProps<PathNodeData>) => {
  const Icon = nodeIcons[data.type];
  const isStartOrEnd = data.type === 'start' || data.type === 'end';
  const isCompleted = data.status === 'completed';
  const isInProgress = data.status === 'in_progress';

  return (
    <div
      className={cn(
        'relative rounded-lg border-2 bg-white shadow-lg transition-all',
        selected ? 'border-blue-500 shadow-xl' : 'border-gray-200',
        isCompleted && 'border-green-500 bg-green-50',
        isInProgress && 'border-yellow-500 bg-yellow-50',
        'min-w-[200px] max-w-[280px]'
      )}
    >
      {!isStartOrEnd && (
        <Handle
          type="target"
          position={Position.Top}
          className="!bg-gray-400 !w-3 !h-3"
        />
      )}

      <div className="p-4">
        {/* 节点头部 */}
        <div className="flex items-start gap-3 mb-2">
          <div
            className={cn(
              'flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center',
              nodeColors[data.type]
            )}
          >
            <Icon className="w-5 h-5 text-white" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm text-gray-900 line-clamp-2">
              {data.label}
            </h3>
            {data.difficulty && (
              <span
                className={cn(
                  'text-xs font-medium',
                  difficultyColors[data.difficulty]
                )}
              >
                {data.difficulty === 'beginner' && '初级'}
                {data.difficulty === 'intermediate' && '中级'}
                {data.difficulty === 'advanced' && '高级'}
              </span>
            )}
          </div>

          {/* 完成状态图标 */}
          {isCompleted && (
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          )}
          {isInProgress && (
            <Circle className="w-5 h-5 text-yellow-600 flex-shrink-0 animate-pulse" />
          )}
        </div>

        {/* 节点描述 */}
        {data.description && !isStartOrEnd && (
          <p className="text-xs text-gray-600 mb-2 line-clamp-2">
            {data.description}
          </p>
        )}

        {/* 预计时长 */}
        {data.estimatedTime && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Clock className="w-3 h-3" />
            <span>{data.estimatedTime} 分钟</span>
          </div>
        )}
      </div>

      {!isStartOrEnd && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!bg-gray-400 !w-3 !h-3"
        />
      )}
    </div>
  );
});

PathNode.displayName = 'PathNode';

// 节点类型映射
export const nodeTypes = {
  default: PathNode,
  input: PathNode,
  output: PathNode,
};
