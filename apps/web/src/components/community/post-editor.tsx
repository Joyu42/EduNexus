'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Image, Code, FileText, Calendar, Trophy, X } from 'lucide-react'
import type { PostType } from '@/lib/community/types'
import { createPost } from '@/lib/community/post-storage'

interface PostEditorProps {
  currentUserId: string
  currentUserName: string
  currentUserAvatar?: string
  onPostCreated?: () => void
}

export function PostEditor({ currentUserId, currentUserName, currentUserAvatar, onPostCreated }: PostEditorProps) {
  const [content, setContent] = useState('')
  const [postType, setPostType] = useState<PostType>('text')
  const [topics, setTopics] = useState<string[]>([])
  const [topicInput, setTopicInput] = useState('')
  const [codeLanguage, setCodeLanguage] = useState('javascript')
  const [codeContent, setCodeContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleAddTopic = () => {
    if (topicInput.trim() && !topics.includes(topicInput.trim())) {
      setTopics([...topics, topicInput.trim()])
      setTopicInput('')
    }
  }

  const handleRemoveTopic = (topic: string) => {
    setTopics(topics.filter(t => t !== topic))
  }

  const handleSubmit = async () => {
    if (!content.trim()) return

    setIsSubmitting(true)
    try {
      const postData: any = {
        userId: currentUserId,
        userName: currentUserName,
        userAvatar: currentUserAvatar,
        type: postType,
        content: content.trim(),
        topics,
      }

      if (postType === 'text' && codeContent.trim()) {
        postData.codeSnippet = {
          language: codeLanguage,
          code: codeContent.trim(),
        }
      }

      createPost(postData)

      // 重置表单
      setContent('')
      setTopics([])
      setCodeContent('')
      setPostType('text')

      onPostCreated?.()
    } finally {
      setIsSubmitting(false)
    }
  }

  const getPlaceholder = () => {
    switch (postType) {
      case 'checkin':
        return '分享今天的学习内容...\n\n例如：\n✅ 完成了 React Hooks 章节\n✅ 做了 5 道算法题\n✅ 复习了设计模式'
      case 'achievement':
        return '分享你的学习成果...\n\n例如：通过了某个认证、完成了某个项目、掌握了某项技能'
      case 'note':
        return '分享你的学习笔记...'
      case 'article':
        return '写一篇长文分享你的学习心得...'
      default:
        return '分享你的学习动态...'
    }
  }

  return (
    <Card className="p-6">
      <div className="flex gap-4">
        <Avatar>
          <AvatarFallback>{currentUserAvatar || currentUserName[0]}</AvatarFallback>
        </Avatar>

        <div className="flex-1 space-y-4">
          {/* 动态类型选择 */}
          <Select value={postType} onValueChange={(v) => setPostType(v as PostType)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text">💬 普通动态</SelectItem>
              <SelectItem value="checkin">📅 学习打卡</SelectItem>
              <SelectItem value="achievement">🎉 学习成果</SelectItem>
              <SelectItem value="note">📝 学习笔记</SelectItem>
              <SelectItem value="article">📄 长文分享</SelectItem>
            </SelectContent>
          </Select>

          {/* 内容输入 */}
          <Textarea
            placeholder={getPlaceholder()}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[120px] resize-none"
          />

          {/* 代码片段输入 */}
          {postType === 'text' && (
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCodeContent(codeContent ? '' : '// 在这里输入代码')}
              >
                <Code className="h-4 w-4 mr-2" />
                {codeContent ? '移除代码' : '添加代码'}
              </Button>

              {codeContent !== '' && (
                <div className="space-y-2">
                  <Select value={codeLanguage} onValueChange={setCodeLanguage}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="javascript">JavaScript</SelectItem>
                      <SelectItem value="typescript">TypeScript</SelectItem>
                      <SelectItem value="python">Python</SelectItem>
                      <SelectItem value="java">Java</SelectItem>
                      <SelectItem value="go">Go</SelectItem>
                      <SelectItem value="rust">Rust</SelectItem>
                    </SelectContent>
                  </Select>

                  <Textarea
                    placeholder="在这里输入代码..."
                    value={codeContent}
                    onChange={(e) => setCodeContent(e.target.value)}
                    className="min-h-[150px] font-mono text-sm"
                  />
                </div>
              )}
            </div>
          )}

          {/* 话题标签 */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder="添加话题标签（按回车添加）"
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddTopic()
                  }
                }}
                className="flex-1"
              />
              <Button onClick={handleAddTopic} variant="outline" size="sm">
                添加
              </Button>
            </div>

            {topics.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {topics.map(topic => (
                  <Badge key={topic} variant="secondary" className="gap-1">
                    #{topic}
                    <button
                      onClick={() => handleRemoveTopic(topic)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* 工具栏和发布按钮 */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" disabled>
                <Image className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" disabled>
                <FileText className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setContent('')
                  setTopics([])
                  setCodeContent('')
                }}
              >
                取消
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!content.trim() || isSubmitting}
              >
                {isSubmitting ? '发布中...' : '发布'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
