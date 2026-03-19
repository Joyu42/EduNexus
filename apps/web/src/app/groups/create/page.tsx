'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Users, Lock, Globe } from 'lucide-react';
import { createGroup } from '@/lib/groups/group-storage';
import type { GroupCategory } from '@/lib/groups/group-types';

const categories: Array<{ value: GroupCategory; label: string; description: string }> = [
  { value: 'programming', label: '编程', description: '软件开发、算法、框架等' },
  { value: 'math', label: '数学', description: '微积分、线性代数、统计等' },
  { value: 'language', label: '语言', description: '英语、日语、编程语言等' },
  { value: 'science', label: '科学', description: '物理、化学、生物等' },
  { value: 'art', label: '艺术', description: '设计、绘画、音乐等' },
  { value: 'business', label: '商业', description: '管理、营销、金融等' },
  { value: 'other', label: '其他', description: '其他学习领域' },
];

export default function CreateGroupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'programming' as GroupCategory,
    visibility: 'public' as 'public' | 'private',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = '请输入小组名称';
    } else if (formData.name.length < 2) {
      newErrors.name = '小组名称至少需要2个字符';
    } else if (formData.name.length > 50) {
      newErrors.name = '小组名称不能超过50个字符';
    }

    if (!formData.description.trim()) {
      newErrors.description = '请输入小组描述';
    } else if (formData.description.length < 10) {
      newErrors.description = '小组描述至少需要10个字符';
    } else if (formData.description.length > 500) {
      newErrors.description = '小组描述不能超过500个字符';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    const group = createGroup(
      formData.name,
      formData.description,
      formData.category,
      formData.visibility,
      'user-1',
      '当前用户'
    );

    router.push(`/groups/${group.id}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <button
          onClick={() => router.push('/groups')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回小组列表
        </button>

        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">创建学习小组</h1>
          <p className="text-gray-600 mb-6">创建一个小组，邀请志同道合的伙伴一起学习</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                小组名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="例如：JavaScript 学习小组"
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                小组描述 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="介绍一下你的小组，学习目标和内容..."
                rows={4}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
                  errors.description ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              <div className="flex justify-between mt-1">
                {errors.description ? (
                  <p className="text-sm text-red-600">{errors.description}</p>
                ) : (
                  <p className="text-sm text-gray-500">详细描述有助于吸引更多成员</p>
                )}
                <p className="text-sm text-gray-500">{formData.description.length}/500</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                小组分类 <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                {categories.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, category: cat.value })}
                    className={`p-4 border-2 rounded-lg text-left transition-all ${
                      formData.category === cat.value
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium text-gray-900 mb-1">{cat.label}</div>
                    <div className="text-sm text-gray-600">{cat.description}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                小组可见性 <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, visibility: 'public' })}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    formData.visibility === 'public'
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Globe className="w-5 h-5 text-blue-600" />
                    <span className="font-medium text-gray-900">公开小组</span>
                  </div>
                  <p className="text-sm text-gray-600">任何人都可以搜索并加入</p>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, visibility: 'private' })}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    formData.visibility === 'private'
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Lock className="w-5 h-5 text-blue-600" />
                    <span className="font-medium text-gray-900">私密小组</span>
                  </div>
                  <p className="text-sm text-gray-600">需要邀请码才能加入</p>
                </button>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => router.push('/groups')}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                取消
              </button>
              <button
                type="submit"
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
              >
                <Users className="w-5 h-5" />
                创建小组
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}