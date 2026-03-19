'use client';

import { useState } from 'react';
import { Share2, Copy, Check, Key, Link as LinkIcon, X } from 'lucide-react';
import type { Group } from '@/lib/groups/group-types';

interface GroupShareDialogProps {
  group: Group;
  onClose: () => void;
}

export function GroupShareDialog({ group, onClose }: GroupShareDialogProps) {
  const [copied, setCopied] = useState<'link' | 'code' | null>(null);

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/groups/${group.id}`
    : '';

  const handleCopy = (text: string, type: 'link' | 'code') => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">分享小组</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              小组链接
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 overflow-hidden">
                <div className="flex items-center gap-2">
                  <LinkIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="truncate">{shareUrl}</span>
                </div>
              </div>
              <button
                onClick={() => handleCopy(shareUrl, 'link')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                {copied === 'link' ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>已复制</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>复制</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {group.inviteCode && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                邀请码
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-gray-400" />
                    <span className="text-2xl font-mono font-bold text-gray-900 tracking-wider">
                      {group.inviteCode}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleCopy(group.inviteCode!, 'code')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  {copied === 'code' ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>已复制</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>复制</span>
                    </>
                  )}
                </button>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                {group.visibility === 'private'
                  ? '私密小组需要邀请码才能加入'
                  : '公开小组可以直接加入，也可以使用邀请码'}
              </p>
            </div>
          )}

          <div className="pt-4 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-900 mb-2">小组信息</h4>
            <div className="space-y-1 text-sm text-gray-600">
              <p><span className="font-medium">名称:</span> {group.name}</p>
              <p><span className="font-medium">成员:</span> {group.memberCount} 人</p>
              <p><span className="font-medium">可见性:</span> {group.visibility === 'public' ? '公开' : '私密'}</p>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
