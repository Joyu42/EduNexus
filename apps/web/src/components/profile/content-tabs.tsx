'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { UserNote, UserActivity, UserProject, UserGroup } from '@/lib/profile/profile-types';

type ContentTabsProps = {
  notes: UserNote[];
  activities: UserActivity[];
  projects: UserProject[];
  groups: UserGroup[];
};

export function ContentTabs({ notes, activities, projects, groups }: ContentTabsProps) {
  return (
    <Tabs defaultValue="notes" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="notes">笔记 ({notes.length})</TabsTrigger>
        <TabsTrigger value="activities">动态 ({activities.length})</TabsTrigger>
        <TabsTrigger value="projects">项目 ({projects.length})</TabsTrigger>
        <TabsTrigger value="groups">小组 ({groups.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="notes" className="mt-6">
        <NotesTab notes={notes} />
      </TabsContent>

      <TabsContent value="activities" className="mt-6">
        <ActivitiesTab activities={activities} />
      </TabsContent>

      <TabsContent value="projects" className="mt-6">
        <ProjectsTab projects={projects} />
      </TabsContent>

      <TabsContent value="groups" className="mt-6">
        <GroupsTab groups={groups} />
      </TabsContent>
    </Tabs>
  );
}

function NotesTab({ notes }: { notes: UserNote[] }) {
  if (notes.length === 0) {
    return (
      <Card className="p-12 text-center text-gray-500 dark:text-gray-400">
        暂无公开笔记
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {notes.map(note => (
        <Card key={note.noteId} className="p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between mb-3">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
              {note.title}
            </h4>
            <Badge variant={note.isPublic ? 'default' : 'secondary'}>
              {note.isPublic ? '公开' : '私密'}
            </Badge>
          </div>
          {note.excerpt && (
            <p className="text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
              {note.excerpt}
            </p>
          )}
          <div className="flex flex-wrap gap-2 mb-3">
            {note.tags.map((tag, index) => (
              <Badge key={index} variant="outline">
                {tag}
              </Badge>
            ))}
          </div>
          <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center space-x-4">
              <span>❤️ {note.likesCount}</span>
              <span>👁️ {note.viewsCount}</span>
              <span>💬 {note.commentsCount}</span>
            </div>
            <span>{new Date(note.updatedAt).toLocaleDateString('zh-CN')}</span>
          </div>
        </Card>
      ))}
    </div>
  );
}

function ActivitiesTab({ activities }: { activities: UserActivity[] }) {
  if (activities.length === 0) {
    return (
      <Card className="p-12 text-center text-gray-500 dark:text-gray-400">
        暂无动态
      </Card>
    );
  }

  const activityIcons = {
    note_created: '📝',
    note_updated: '✏️',
    question_asked: '❓',
    answer_posted: '💡',
    achievement_unlocked: '🏆',
    level_up: '⬆️',
    group_joined: '👥',
    project_shared: '🚀'
  };

  const activityLabels = {
    note_created: '创建了笔记',
    note_updated: '更新了笔记',
    question_asked: '提出了问题',
    answer_posted: '回答了问题',
    achievement_unlocked: '解锁了成就',
    level_up: '等级提升',
    group_joined: '加入了小组',
    project_shared: '分享了项目'
  };

  return (
    <div className="space-y-4">
      {activities.map(activity => (
        <Card key={activity.activityId} className="p-6">
          <div className="flex items-start space-x-4">
            <div className="text-3xl">{activityIcons[activity.type]}</div>
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {activityLabels[activity.type]}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-500">
                  {new Date(activity.createdAt).toLocaleString('zh-CN')}
                </span>
              </div>
              <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
                {activity.title}
              </h4>
              {activity.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {activity.description}
                </p>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function ProjectsTab({ projects }: { projects: UserProject[] }) {
  if (projects.length === 0) {
    return (
      <Card className="p-12 text-center text-gray-500 dark:text-gray-400">
        暂无项目
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {projects.map(project => (
        <Card key={project.projectId} className="p-6 hover:shadow-lg transition-shadow">
          {project.coverImage && (
            <img
              src={project.coverImage}
              alt={project.name}
              className="w-full h-40 object-cover rounded-lg mb-4"
            />
          )}
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {project.name}
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            {project.description}
          </p>
          <div className="flex flex-wrap gap-2 mb-3">
            {project.technologies.map((tech, index) => (
              <Badge key={index} variant="secondary">
                {tech}
              </Badge>
            ))}
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-3 text-gray-500 dark:text-gray-400">
              <span>❤️ {project.likesCount}</span>
              <span>👁️ {project.viewsCount}</span>
            </div>
            <div className="flex space-x-2">
              {project.githubUrl && (
                <a
                  href={project.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  GitHub
                </a>
              )}
              {project.demoUrl && (
                <a
                  href={project.demoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Demo
                </a>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function GroupsTab({ groups }: { groups: UserGroup[] }) {
  if (groups.length === 0) {
    return (
      <Card className="p-12 text-center text-gray-500 dark:text-gray-400">
        暂未加入小组
      </Card>
    );
  }

  const roleColors = {
    owner: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    member: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
  };

  const roleLabels = {
    owner: '组长',
    admin: '管理员',
    member: '成员'
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {groups.map(group => (
        <Card key={group.groupId} className="p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-start space-x-4">
            <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-3xl">
              {group.avatar || '👥'}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {group.name}
                </h4>
                <Badge className={roleColors[group.role]}>
                  {roleLabels[group.role]}
                </Badge>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                {group.description}
              </p>
              <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                <span>👥 {group.memberCount} 成员</span>
                <span>加入于 {new Date(group.joinedAt).toLocaleDateString('zh-CN')}</span>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
