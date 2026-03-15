'use client';

import { Users, TrendingUp, Lock, Globe } from 'lucide-react';
import type { Group } from '@/lib/groups/group-types';

interface GroupCardProps {
  group: Group;
  onClick?: () => void;
}

const categoryLabels: Record<string, string> = {
  programming: '编程',
  math: '数学',
  language: '语言',
  science: '科学',
  art: '艺术',
  business: '商业',
  other: '其他',
};

const categoryColors: Record<string, string> = {
  programming: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20',
  math: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20',
  language: 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20',
  science: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20',
  art: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border border-pink-500/20',
  business: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20',
  other: 'bg-muted text-muted-foreground border border-border',
};

export function GroupCard({ group, onClick }: GroupCardProps) {
  return (
    <div
      onClick={onClick}
      className="bg-card rounded-lg border border-border hover:border-primary/50 hover:shadow-md transition-all cursor-pointer overflow-hidden"
    >
      <div className="h-32 bg-gradient-to-br from-blue-500 to-purple-600 relative">
        {group.cover && (
          <img src={group.cover} alt={group.name} className="w-full h-full object-cover" />
        )}
        <div className="absolute top-3 right-3">
          {group.visibility === 'private' ? (
            <div className="bg-card/90 backdrop-blur-sm px-2 py-1 rounded-full flex items-center gap-1 text-xs text-foreground">
              <Lock className="w-3 h-3" />
              <span>私密</span>
            </div>
          ) : (
            <div className="bg-card/90 backdrop-blur-sm px-2 py-1 rounded-full flex items-center gap-1 text-xs text-foreground">
              <Globe className="w-3 h-3" />
              <span>公开</span>
            </div>
          )}
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-lg text-foreground line-clamp-1">{group.name}</h3>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${categoryColors[group.category]}`}>
            {categoryLabels[group.category]}
          </span>
        </div>

        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{group.description}</p>

        {group.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {group.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="px-2 py-0.5 bg-muted text-muted-foreground rounded text-xs">
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>{group.memberCount} 成员</span>
            </div>
            <div className="flex items-center gap-1">
              <TrendingUp className="w-4 h-4" />
              <span>活跃度 {group.activeLevel}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
