/**
 * 保存状态指示器组件
 * 显示文档的保存状态（保存中/已保存/保存失败）
 */

'use client';

import { Clock, Loader2, Check, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { SaveStatus } from '@/lib/hooks/use-auto-save';

/**
 * 保存状态指示器属性
 */
export interface SaveStatusIndicatorProps {
  /** 当前保存状态 */
  status: SaveStatus;
  /** 最后保存时间 */
  lastSaved: Date | null;
  /** 错误信息 */
  error?: Error | null;
  /** 自定义类名 */
  className?: string;
  /** 是否显示详细信息 */
  showDetails?: boolean;
}

/**
 * 保存状态配置
 */
const STATUS_CONFIG = {
  idle: {
    icon: Clock,
    text: '未保存',
    color: 'text-gray-500',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    animate: false,
  },
  saving: {
    icon: Loader2,
    text: '保存中...',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    animate: true,
  },
  saved: {
    icon: Check,
    text: '已保存',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    animate: false,
  },
  error: {
    icon: AlertCircle,
    text: '保存失败',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    animate: false,
  },
} as const;

/**
 * 保存状态指示器组件
 *
 * @example
 * <SaveStatusIndicator
 *   status={status}
 *   lastSaved={lastSaved}
 *   error={error}
 *   showDetails={true}
 * />
 */
export function SaveStatusIndicator({
  status,
  lastSaved,
  error,
  className,
  showDetails = true,
}: SaveStatusIndicatorProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-md border transition-all duration-200',
        config.bgColor,
        config.borderColor,
        className
      )}
    >
      <Icon
        className={cn(
          'w-4 h-4 flex-shrink-0',
          config.color,
          config.animate && 'animate-spin'
        )}
      />
      <div className="flex flex-col min-w-0">
        <span className={cn('text-sm font-medium', config.color)}>
          {config.text}
        </span>
        {showDetails && lastSaved && status === 'saved' && (
          <span className="text-xs text-gray-500 truncate">
            {formatDistanceToNow(lastSaved, {
              addSuffix: true,
              locale: zhCN,
            })}
          </span>
        )}
        {showDetails && error && status === 'error' && (
          <span className="text-xs text-red-600 truncate" title={error.message}>
            {error.message}
          </span>
        )}
      </div>
    </div>
  );
}
