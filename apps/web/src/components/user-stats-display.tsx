'use client';

import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';

interface UserStats {
  learningMinutes: number;
  notesCreated: number;
  practiceCorrect: number;
  practiceWrong: number;
  knowledgePointsMastered: number;
  pathsCompleted: number;
  currentStreak: number;
  longestStreak: number;
  postsCount: number;
  answersCount: number;
  answersAccepted: number;
  likesReceived: number;
}

interface UserStatsDisplayProps {
  stats: UserStats;
  className?: string;
}

export function UserStatsDisplay({ stats, className = '' }: UserStatsDisplayProps) {
  const learningHours = (stats.learningMinutes / 60).toFixed(1);
  const totalPractice = stats.practiceCorrect + stats.practiceWrong;
  const accuracy = totalPractice > 0
    ? ((stats.practiceCorrect / totalPractice) * 100).toFixed(1)
    : '0.0';

  const statGroups = [
    {
      title: '学习数据',
      icon: '📚',
      color: 'from-blue-500 to-cyan-500',
      stats: [
        { label: '学习时长', value: `${learningHours} 小时`, icon: '⏱️', color: 'text-blue-600' },
        { label: '掌握知识点', value: stats.knowledgePointsMastered, icon: '🎯', color: 'text-cyan-600' },
        { label: '完成路径', value: stats.pathsCompleted, icon: '🛤️', color: 'text-blue-500' },
        { label: '创建笔记', value: stats.notesCreated, icon: '📝', color: 'text-cyan-500' }
      ]
    },
    {
      title: '练习数据',
      icon: '💪',
      color: 'from-green-500 to-emerald-500',
      stats: [
        { label: '练习题目', value: totalPractice, icon: '📊', color: 'text-green-600' },
        { label: '正确题数', value: stats.practiceCorrect, icon: '✅', color: 'text-emerald-600' },
        { label: '错误题数', value: stats.practiceWrong, icon: '❌', color: 'text-green-500' },
        { label: '正确率', value: `${accuracy}%`, icon: '🎯', color: 'text-emerald-500' }
      ]
    },
    {
      title: '社区数据',
      icon: '🤝',
      color: 'from-purple-500 to-pink-500',
      stats: [
        { label: '发帖数', value: stats.postsCount, icon: '💬', color: 'text-purple-600' },
        { label: '回答数', value: stats.answersCount, icon: '🎤', color: 'text-pink-600' },
        { label: '被采纳', value: stats.answersAccepted, icon: '🏆', color: 'text-purple-500' },
        { label: '获赞数', value: stats.likesReceived, icon: '❤️', color: 'text-pink-500' }
      ]
    },
    {
      title: '连续学习',
      icon: '🔥',
      color: 'from-orange-500 to-red-500',
      stats: [
        { label: '当前连续', value: `${stats.currentStreak} 天`, icon: '📅', color: 'text-orange-600' },
        { label: '最长连续', value: `${stats.longestStreak} 天`, icon: '🏅', color: 'text-red-600' }
      ]
    }
  ];

  return (
    <div className={className}>
      <motion.h3
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className="text-lg font-semibold mb-4 flex items-center gap-2"
      >
        <TrendingUp className="h-5 w-5 text-primary" />
        学习统计
      </motion.h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {statGroups.map((group, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            whileHover={{ scale: 1.02, y: -4 }}
            className="rounded-lg border bg-card p-4 shadow-sm hover:shadow-lg transition-all"
          >
            <div className="flex items-center gap-2 mb-4">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: idx * 0.1 + 0.2, type: 'spring' }}
                className={`p-2 rounded-lg bg-gradient-to-br ${group.color} text-white`}
              >
                <span className="text-xl">{group.icon}</span>
              </motion.div>
              <h4 className="font-semibold">{group.title}</h4>
            </div>
            <div className="space-y-3">
              {group.stats.map((stat, statIdx) => (
                <motion.div
                  key={statIdx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 + statIdx * 0.05 + 0.3 }}
                  whileHover={{ x: 4 }}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{stat.icon}</span>
                    <span className="text-sm text-muted-foreground">{stat.label}</span>
                  </div>
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: idx * 0.1 + statIdx * 0.05 + 0.4, type: 'spring' }}
                    className={`font-semibold ${stat.color}`}
                  >
                    {stat.value}
                  </motion.span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
