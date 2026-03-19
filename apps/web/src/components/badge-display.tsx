'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Sparkles } from 'lucide-react';

interface Badge {
  badgeId: string;
  name: string;
  description: string;
  emoji: string;
  category: 'learning' | 'practice' | 'community' | 'special' | 'limited';
  expReward: number;
  isUnlocked: boolean;
  progress: number;
  unlockedAt?: string;
}

interface BadgeDisplayProps {
  badges: Badge[];
  className?: string;
}

export function BadgeDisplay({ badges, className = '' }: BadgeDisplayProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [hoveredBadge, setHoveredBadge] = useState<string | null>(null);

  const categories = [
    { value: 'all', label: '全部' },
    { value: 'learning', label: '学习' },
    { value: 'practice', label: '练习' },
    { value: 'community', label: '社区' },
    { value: 'special', label: '特殊' },
    { value: 'limited', label: '限时' }
  ];

  const filteredBadges = selectedCategory === 'all'
    ? badges
    : badges.filter(b => b.category === selectedCategory);

  const unlockedCount = filteredBadges.filter(b => b.isUnlocked).length;

  return (
    <div className={className}>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-yellow-500" />
          徽章收藏
        </h3>
        <p className="text-sm text-muted-foreground">
          已解锁 {unlockedCount} / {filteredBadges.length} 个徽章
        </p>
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="origin-left"
        >
          <Progress value={(unlockedCount / filteredBadges.length) * 100} className="mt-2 h-2" />
        </motion.div>
      </motion.div>

      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="grid w-full grid-cols-6">
          {categories.map(cat => (
            <TabsTrigger key={cat.value} value={cat.value}>
              {cat.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={selectedCategory} className="mt-6">
          <motion.div
            layout
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
          >
            <AnimatePresence mode="popLayout">
              {filteredBadges.map((badge, index) => (
                <motion.div
                  key={badge.badgeId}
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ delay: index * 0.05 }}
                  onHoverStart={() => setHoveredBadge(badge.badgeId)}
                  onHoverEnd={() => setHoveredBadge(null)}
                >
                  <BadgeCard
                    badge={badge}
                    isHovered={hoveredBadge === badge.badgeId}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function BadgeCard({ badge, isHovered }: { badge: Badge; isHovered: boolean }) {
  const isLocked = !badge.isUnlocked;

  return (
    <motion.div
      whileHover={{ scale: 1.05, y: -5 }}
      whileTap={{ scale: 0.95 }}
      className={`relative rounded-lg border p-4 transition-all ${
        isLocked
          ? 'bg-muted/50 opacity-60 grayscale'
          : 'bg-card hover:shadow-lg hover:border-yellow-300'
      }`}
    >
      <div className="text-center">
        <motion.div
          animate={{
            scale: isHovered && !isLocked ? [1, 1.2, 1] : 1,
            rotate: isHovered && !isLocked ? [0, 10, -10, 0] : 0
          }}
          transition={{ duration: 0.5 }}
          className="text-5xl mb-2"
        >
          {badge.emoji}
        </motion.div>
        <h4 className="font-semibold text-sm mb-1">{badge.name}</h4>
        <p className="text-xs text-muted-foreground mb-2">{badge.description}</p>

        {isLocked ? (
          <div className="mt-3">
            <Progress value={badge.progress} className="h-2 mb-1" />
            <p className="text-xs text-muted-foreground">
              进度: {badge.progress.toFixed(0)}%
            </p>
          </div>
        ) : (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="mt-3"
          >
            <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gradient-to-r from-yellow-100 to-orange-100 text-yellow-700 text-xs font-medium">
              <Sparkles className="h-3 w-3" />
              <span>已解锁</span>
            </div>
            {badge.unlockedAt && (
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(badge.unlockedAt).toLocaleDateString()}
              </p>
            )}
          </motion.div>
        )}

        <div className="mt-2 text-xs text-muted-foreground">
          +{badge.expReward} EXP
        </div>
      </div>

      {isLocked && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <div className="text-4xl">🔒</div>
        </motion.div>
      )}

      {!isLocked && isHovered && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-gradient-to-br from-yellow-400/20 to-orange-400/20 rounded-lg pointer-events-none"
        />
      )}
    </motion.div>
  );
}
