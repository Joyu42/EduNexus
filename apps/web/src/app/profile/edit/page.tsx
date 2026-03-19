'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import type { UserProfile, PrivacySettings } from '@/lib/profile/profile-types';
import {
  getUserProfile,
  updateUserProfile,
  getPrivacySettings,
  updatePrivacySettings
} from '@/lib/profile/profile-storage';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function EditProfilePage() {
  const router = useRouter();
  const currentUserId = 'user_current';

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [privacy, setPrivacy] = useState<PrivacySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    displayName: '',
    avatar: '',
    coverImage: '',
    bio: '',
    signature: '',
    school: '',
    company: '',
    location: '',
    website: '',
    github: '',
    twitter: '',
    blog: '',
    interests: [] as string[],
    skills: [] as string[],
    theme: 'default' as 'default' | 'dark' | 'blue' | 'green' | 'purple'
  });

  const [newInterest, setNewInterest] = useState('');
  const [newSkill, setNewSkill] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = () => {
    const userProfile = getUserProfile(currentUserId);
    if (!userProfile) {
      const defaultProfile: UserProfile = {
        userId: currentUserId,
        username: 'current_user',
        displayName: '当前用户',
        interests: [],
        skills: [],
        isPublic: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      setProfile(defaultProfile);
      setFormData({
        displayName: defaultProfile.displayName,
        avatar: defaultProfile.avatar || '',
        coverImage: defaultProfile.coverImage || '',
        bio: defaultProfile.bio || '',
        signature: defaultProfile.signature || '',
        school: defaultProfile.school || '',
        company: defaultProfile.company || '',
        location: defaultProfile.location || '',
        website: defaultProfile.website || '',
        github: defaultProfile.github || '',
        twitter: defaultProfile.twitter || '',
        blog: defaultProfile.blog || '',
        interests: defaultProfile.interests,
        skills: defaultProfile.skills,
        theme: defaultProfile.theme || 'default'
      });
    } else {
      setProfile(userProfile);
      setFormData({
        displayName: userProfile.displayName,
        avatar: userProfile.avatar || '',
        coverImage: userProfile.coverImage || '',
        bio: userProfile.bio || '',
        signature: userProfile.signature || '',
        school: userProfile.school || '',
        company: userProfile.company || '',
        location: userProfile.location || '',
        website: userProfile.website || '',
        github: userProfile.github || '',
        twitter: userProfile.twitter || '',
        blog: userProfile.blog || '',
        interests: userProfile.interests,
        skills: userProfile.skills,
        theme: userProfile.theme || 'default'
      });
    }

    const privacySettings = getPrivacySettings(currentUserId);
    setPrivacy(privacySettings);
    setLoading(false);
  };

  const handleSave = () => {
    if (!profile) return;
    setSaving(true);

    updateUserProfile(currentUserId, formData);

    setTimeout(() => {
      setSaving(false);
      router.push(`/profile/${profile.username}`);
    }, 500);
  };

  const handleAddInterest = () => {
    if (newInterest.trim() && !formData.interests.includes(newInterest.trim())) {
      setFormData({
        ...formData,
        interests: [...formData.interests, newInterest.trim()]
      });
      setNewInterest('');
    }
  };

  const handleRemoveInterest = (interest: string) => {
    setFormData({
      ...formData,
      interests: formData.interests.filter(i => i !== interest)
    });
  };

  const handleAddSkill = () => {
    if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
      setFormData({
        ...formData,
        skills: [...formData.skills, newSkill.trim()]
      });
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setFormData({
      ...formData,
      skills: formData.skills.filter(s => s !== skill)
    });
  };

  const handlePrivacyChange = (key: keyof PrivacySettings, value: any) => {
    if (!privacy) return;
    updatePrivacySettings(currentUserId, { [key]: value });
    setPrivacy({ ...privacy, [key]: value });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-600 dark:text-gray-400">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            编辑个人资料
          </h1>
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={() => router.back()}
            >
              取消
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? '保存中...' : '保存'}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">基本信息</TabsTrigger>
            <TabsTrigger value="social">社交链接</TabsTrigger>
            <TabsTrigger value="privacy">隐私设置</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="mt-6">
            <Card className="p-6 space-y-6">
              <div>
                <Label htmlFor="displayName">显示名称</Label>
                <Input
                  id="displayName"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  placeholder="输入显示名称"
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="avatar">头像 Emoji</Label>
                <Input
                  id="avatar"
                  value={formData.avatar}
                  onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                  placeholder="👤"
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="signature">个性签名</Label>
                <Input
                  id="signature"
                  value={formData.signature}
                  onChange={(e) => setFormData({ ...formData, signature: e.target.value })}
                  placeholder="一句话介绍自己"
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="bio">个人简介</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="详细介绍自己，支持 Markdown"
                  rows={6}
                  className="mt-2"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="school">学校</Label>
                  <Input
                    id="school"
                    value={formData.school}
                    onChange={(e) => setFormData({ ...formData, school: e.target.value })}
                    placeholder="清华大学"
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="company">公司</Label>
                  <Input
                    id="company"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    placeholder="字节跳动"
                    className="mt-2"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="location">所在地</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="北京"
                  className="mt-2"
                />
              </div>

              <div>
                <Label>兴趣方向</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    value={newInterest}
                    onChange={(e) => setNewInterest(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddInterest()}
                    placeholder="添加兴趣标签"
                  />
                  <Button onClick={handleAddInterest} type="button">
                    添加
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {formData.interests.map((interest, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => handleRemoveInterest(interest)}
                    >
                      {interest} ×
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <Label>技能标签</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddSkill()}
                    placeholder="添加技能标签"
                  />
                  <Button onClick={handleAddSkill} type="button">
                    添加
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {formData.skills.map((skill, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => handleRemoveSkill(skill)}
                    >
                      {skill} ×
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <Label>主题颜色</Label>
                <div className="grid grid-cols-5 gap-3 mt-2">
                  {(['default', 'dark', 'blue', 'green', 'purple'] as const).map((theme) => (
                    <button
                      key={theme}
                      onClick={() => setFormData({ ...formData, theme })}
                      className={`h-16 rounded-lg border-2 transition-all ${
                        formData.theme === theme
                          ? 'border-blue-600 ring-2 ring-blue-200'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      <div className={`h-full rounded-md bg-gradient-to-r ${
                        theme === 'default' ? 'from-gray-500 to-gray-700' :
                        theme === 'dark' ? 'from-gray-800 to-black' :
                        theme === 'blue' ? 'from-blue-500 to-blue-700' :
                        theme === 'green' ? 'from-green-500 to-green-700' :
                        'from-purple-500 to-purple-700'
                      }`} />
                    </button>
                  ))}
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="social" className="mt-6">
            <Card className="p-6 space-y-6">
              <div>
                <Label htmlFor="website">个人网站</Label>
                <Input
                  id="website"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://example.com"
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="github">GitHub 用户名</Label>
                <div className="flex items-center mt-2">
                  <span className="text-gray-500 dark:text-gray-400 mr-2">github.com/</span>
                  <Input
                    id="github"
                    value={formData.github}
                    onChange={(e) => setFormData({ ...formData, github: e.target.value })}
                    placeholder="username"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="twitter">Twitter 用户名</Label>
                <div className="flex items-center mt-2">
                  <span className="text-gray-500 dark:text-gray-400 mr-2">twitter.com/</span>
                  <Input
                    id="twitter"
                    value={formData.twitter}
                    onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
                    placeholder="username"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="blog">博客地址</Label>
                <Input
                  id="blog"
                  value={formData.blog}
                  onChange={(e) => setFormData({ ...formData, blog: e.target.value })}
                  placeholder="https://blog.example.com"
                  className="mt-2"
                />
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="privacy" className="mt-6">
            {privacy && (
              <Card className="p-6 space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    隐私设置
                  </h3>
                  <div className="space-y-4">
                    <PrivacyToggle
                      label="显示邮箱地址"
                      checked={privacy.showEmail}
                      onChange={(checked) => handlePrivacyChange('showEmail', checked)}
                    />
                    <PrivacyToggle
                      label="显示社交链接"
                      checked={privacy.showSocialLinks}
                      onChange={(checked) => handlePrivacyChange('showSocialLinks', checked)}
                    />
                    <PrivacyToggle
                      label="显示学习统计"
                      checked={privacy.showLearningStats}
                      onChange={(checked) => handlePrivacyChange('showLearningStats', checked)}
                    />
                    <PrivacyToggle
                      label="显示成就徽章"
                      checked={privacy.showAchievements}
                      onChange={(checked) => handlePrivacyChange('showAchievements', checked)}
                    />
                    <PrivacyToggle
                      label="显示动态"
                      checked={privacy.showActivities}
                      onChange={(checked) => handlePrivacyChange('showActivities', checked)}
                    />
                    <PrivacyToggle
                      label="允许他人关注"
                      checked={privacy.allowFollow}
                      onChange={(checked) => handlePrivacyChange('allowFollow', checked)}
                    />
                    <PrivacyToggle
                      label="允许评论"
                      checked={privacy.allowComments}
                      onChange={(checked) => handlePrivacyChange('allowComments', checked)}
                    />
                  </div>
                </div>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function PrivacyToggle({
  label,
  checked,
  onChange
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700 last:border-0">
      <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
      <button
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}
