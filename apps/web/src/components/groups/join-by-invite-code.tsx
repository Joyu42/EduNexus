'use client';

import { useState } from 'react';
import { Key, X } from 'lucide-react';

interface JoinByInviteCodeProps {
  onJoin: (inviteCode: string) => void;
  onClose: () => void;
}

export function JoinByInviteCode({ onJoin, onClose }: JoinByInviteCodeProps) {
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!inviteCode.trim()) {
      setError('请输入邀请码');
      return;
    }

    if (inviteCode.length < 6) {
      setError('邀请码格式不正确');
      return;
    }

    onJoin(inviteCode.toUpperCase());
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">通过邀请码加入</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              邀请码
            </label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => {
                  setInviteCode(e.target.value);
                  setError('');
                }}
                placeholder="输入8位邀请码"
                className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase ${
                  error ? 'border-red-500' : 'border-gray-300'
                }`}
                maxLength={8}
              />
            </div>
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
            <p className="mt-2 text-sm text-gray-500">
              私密小组需要邀请码才能加入
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              加入小组
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
