'use client';

import { motion } from 'framer-motion';
import { Progress } from '@/components/ui/progress';
import { Sparkles, TrendingUp } from 'lucide-react';

interface UserLevelCardProps {
  level: number;
  title: string;
  titleEmoji: string;
  titleDescription: string;
  currentExp: number;
  totalExp: number;
  nextLevel?: {
    level: number;
    title: string;
    titleEmoji: string;
    expNeeded: number;
    progressPercent: number;
  } | null;
  className?: string;
}

export function UserLevelCard({
  level,
  title,
  titleEmoji,
  titleDescription,
  currentExp,
  totalExp,
  nextLevel,
  className = ''
}: UserLevelCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={{ scale: 1.01 }}
      className={`rounded-lg border bg-gradient-to-br from-orange-50 to-amber-50 p-6 shadow-lg hover:shadow-xl transition-all ${className}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
            whileHover={{ scale: 1.1, rotate: 10 }}
            className="text-6xl cursor-pointer"
          >
            {titleEmoji}
          </motion.div>
          <div>
            <div className="flex items-center gap-2">
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="text-sm font-medium text-muted-foreground flex items-center gap-1"
              >
                <Sparkles className="h-3 w-3" />
                Lv {level}
              </motion.span>
              <motion.h3
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent"
              >
                {title}
              </motion.h3>
            </div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-1 text-sm text-muted-foreground"
            >
              {titleDescription}
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-2 text-xs text-muted-foreground flex items-center gap-1"
            >
              <TrendingUp className="h-3 w-3" />
              总经验值: {totalExp.toLocaleString()}
            </motion.p>
          </div>
        </div>
      </div>

      {nextLevel && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mt-6"
        >
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground flex items-center gap-1">
              距离 Lv {nextLevel.level} {nextLevel.titleEmoji} {nextLevel.title}
            </span>
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.8, type: 'spring' }}
              className="font-medium text-orange-600"
            >
              {nextLevel.expNeeded.toLocaleString()} EXP
            </motion.span>
          </div>
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.9, duration: 0.8 }}
            className="origin-left"
          >
            <Progress value={nextLevel.progressPercent} className="h-3" />
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="mt-1 text-xs text-muted-foreground text-right"
          >
            {nextLevel.progressPercent.toFixed(1)}%
          </motion.p>
        </motion.div>
      )}

      {!nextLevel && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-6 text-center"
        >
          <p className="text-sm font-medium text-primary flex items-center justify-center gap-2">
            <Sparkles className="h-4 w-4" />
            🎉 已达到最高等级！
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}
