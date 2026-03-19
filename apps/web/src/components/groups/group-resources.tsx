'use client';

import { useState } from 'react';
import { FileText, Link as LinkIcon, FileCode, Download, Heart, Plus, Upload } from 'lucide-react';
import type { GroupResource } from '@/lib/groups/group-types';

interface GroupResourcesProps {
  resources: GroupResource[];
  onAddResource?: (title: string, description: string, type: 'file' | 'link' | 'note', url?: string) => void;
  onDownload?: (resourceId: string) => void;
}

const typeIcons = {
  file: FileText,
  link: LinkIcon,
  note: FileCode,
};

const typeLabels = {
  file: '文件',
  link: '链接',
  note: '笔记',
};

const typeColors = {
  file: 'text-blue-600 bg-blue-100',
  link: 'text-green-600 bg-green-100',
  note: 'text-purple-600 bg-purple-100',
};

export function GroupResources({ resources, onAddResource, onDownload }: GroupResourcesProps) {
  const [showAddResource, setShowAddResource] = useState(false);
  const [newResource, setNewResource] = useState({
    title: '',
    description: '',
    type: 'file' as 'file' | 'link' | 'note',
    url: '',
  });

  const handleAddResource = () => {
    if (newResource.title.trim() && onAddResource) {
      onAddResource(
        newResource.title,
        newResource.description,
        newResource.type,
        newResource.url || undefined
      );
      setNewResource({ title: '', description: '', type: 'file', url: '' });
      setShowAddResource(false);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">共享资源</h3>
        <button
          onClick={() => setShowAddResource(!showAddResource)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          添加资源
        </button>
      </div>

      {showAddResource && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
          <div className="flex gap-2">
            {(['file', 'link', 'note'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setNewResource({ ...newResource, type })}
                className={`flex-1 px-3 py-2 rounded-lg border-2 transition-colors ${
                  newResource.type === type
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {typeLabels[type]}
              </button>
            ))}
          </div>

          <input
            type="text"
            placeholder="资源标题"
            value={newResource.title}
            onChange={(e) => setNewResource({ ...newResource, title: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <textarea
            placeholder="资源描述"
            value={newResource.description}
            onChange={(e) => setNewResource({ ...newResource, description: e.target.value })}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />

          {newResource.type === 'link' && (
            <input
              type="url"
              placeholder="资源链接"
              value={newResource.url}
              onChange={(e) => setNewResource({ ...newResource, url: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}

          {newResource.type === 'file' && (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors cursor-pointer">
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">点击上传文件或拖拽文件到此处</p>
              <p className="text-xs text-gray-500 mt-1">支持 PDF, DOC, PPT, ZIP 等格式</p>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowAddResource(false)}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleAddResource}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              添加
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {resources.map((resource) => {
          const TypeIcon = typeIcons[resource.type];

          return (
            <div
              key={resource.id}
              className="bg-white rounded-lg border border-gray-200 p-4 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${typeColors[resource.type]}`}>
                  <TypeIcon className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 mb-1 line-clamp-1">{resource.title}</h4>
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">{resource.description}</p>

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-3">
                      <span>{resource.uploadedByName}</span>
                      {resource.fileSize && <span>{formatFileSize(resource.fileSize)}</span>}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <Download className="w-3 h-3" />
                        <span>{resource.downloads}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Heart className="w-3 h-3" />
                        <span>{resource.likes}</span>
                      </div>
                    </div>
                  </div>

                  {resource.type === 'link' && resource.url && (
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                    >
                      <LinkIcon className="w-3 h-3" />
                      访问链接
                    </a>
                  )}

                  {resource.type === 'file' && (
                    <button
                      onClick={() => onDownload?.(resource.id)}
                      className="mt-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors text-xs font-medium flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" />
                      下载文件
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {resources.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600">还没有共享资源</p>
          <p className="text-sm text-gray-500 mt-1">上传文件或分享链接，与小组成员共享学习资料</p>
        </div>
      )}
    </div>
  );
}