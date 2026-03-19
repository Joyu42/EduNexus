'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useSidebarStore } from '@/lib/stores/sidebar-store'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Separator } from '@/components/ui/separator'
import {
  Home,
  Network,
  BookOpen,
  Route,
  Briefcase,
  Settings,
  ChevronLeft,
  Menu,
  Target,
  GitBranch,
  FolderOpen,
  Users,
  MessageSquare,
  BarChart3,
  Languages,
} from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { UserMenu } from './user-menu'

const navigation = [
  {
    title: '',
    items: [
      { name: '总览', href: '/', icon: Home },
    ],
  },
  {
    title: '学习系统',
    items: [
      { name: '🌌 知识星图', href: '/graph', icon: Network },
      { name: '📚 知识宝库', href: '/kb', icon: BookOpen },
      { name: '🎮 成长地图', href: '/path', icon: Route },
      { name: '🛤️ 学习路径', href: '/learning-paths', icon: GitBranch },
      { name: '🧠 单词学习', href: '/words', icon: Languages },
      { name: '🎯 目标管理', href: '/goals', icon: Target },
      { name: '📊 学习分析', href: '/analytics', icon: BarChart3 },
    ],
  },
  {
    title: '学习生态',
    items: [
      { name: '📁 资源中心', href: '/resources', icon: FolderOpen },
      { name: '👥 学习小组', href: '/groups', icon: Users },
      { name: '💬 学习社区', href: '/community', icon: MessageSquare },
    ],
  },
  {
    title: '工作区',
    items: [
      { name: '学习工作区', href: '/workspace', icon: Briefcase },
    ],
  },
  {
    title: '系统',
    items: [
      { name: '配置中心', href: '/settings', icon: Settings },
    ],
  },
] as const

export function AppSidebar() {
  const pathname = usePathname()
  const { isCollapsed, toggleCollapse } = useSidebarStore()

  return (
    <TooltipProvider delayDuration={0}>
      <motion.div
        className={cn(
          'app-sidebar flex h-full flex-col bg-sidebar border-sidebar-border border-r'
        )}
        initial={false}
        animate={{
          width: isCollapsed ? 64 : 256
        }}
        transition={{
          duration: 0.3,
          ease: [0.4, 0, 0.2, 1]
        }}
      >
        <div
          className={cn(
            'flex h-16 items-center group',
            isCollapsed ? 'justify-center px-2' : 'justify-between px-4'
          )}
        >
          <AnimatePresence mode="wait">
            {isCollapsed ? (
              <motion.div
                key="collapsed"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
                className="relative flex items-center justify-center w-full"
              >
                <motion.div
                  className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm transition-opacity group-hover:opacity-0"
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.6 }}
                >
                  EN
                </motion.div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleCollapse}
                  className="absolute text-sidebar-foreground hover:bg-sidebar-accent opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Menu className="h-4 w-4" />
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="expanded"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="flex items-center justify-between w-full"
              >
                <div className="flex items-center gap-2">
                  <motion.div
                    className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm"
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.6 }}
                  >
                    EN
                  </motion.div>
                  <span className="text-base font-medium text-sidebar-foreground">
                    EduNexus
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleCollapse}
                  className="text-sidebar-foreground hover:bg-sidebar-accent"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <nav
          className={cn(
            'flex-1 space-y-1 py-4 overflow-y-auto scrollbar-thin',
            isCollapsed ? 'px-2' : 'px-3'
          )}
        >
          {navigation.map((section, index) => (
            <div key={section.title}>
              {index > 0 && (
                <Separator className="my-3" />
              )}
              <div className="space-y-1">
                <AnimatePresence>
                  {!isCollapsed && section.title && (
                    <motion.h3
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.2 }}
                      className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/60"
                    >
                      {section.title}
                    </motion.h3>
                  )}
                </AnimatePresence>

                {section.items.map((item) => {
                  const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href))
                  const button = (
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ type: "spring", stiffness: 400, damping: 17 }}
                    >
                      <Button
                        variant={isActive ? 'secondary' : 'ghost'}
                        className={cn(
                          'w-full gap-3 text-sidebar-foreground sidebar-menu-item relative overflow-hidden',
                          isActive && 'bg-sidebar-accent text-sidebar-accent-foreground',
                          isCollapsed ? 'justify-center px-2' : 'justify-start'
                        )}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="activeIndicator"
                            className="absolute left-0 top-0 bottom-0 w-1 bg-primary"
                            initial={false}
                            transition={{
                              type: "spring",
                              stiffness: 500,
                              damping: 30
                            }}
                          />
                        )}
                        <item.icon className="h-4 w-4 flex-shrink-0" />
                        <AnimatePresence>
                          {!isCollapsed && (
                            <motion.span
                              initial={{ opacity: 0, width: 0 }}
                              animate={{ opacity: 1, width: "auto" }}
                              exit={{ opacity: 0, width: 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              {item.name}
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </Button>
                    </motion.div>
                  )

                  if (isCollapsed) {
                    return (
                      <Tooltip key={item.name}>
                        <TooltipTrigger asChild>
                          <Link href={item.href}>
                            {button}
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="font-medium">
                          {item.name}
                        </TooltipContent>
                      </Tooltip>
                    )
                  }

                  return (
                    <Link key={item.name} href={item.href}>
                      {button}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <div
          className={cn(
            'border-t border-sidebar-border p-3 space-y-2',
            isCollapsed && 'px-2'
          )}
        >
          <UserMenu />
          <div className={cn(
            'flex items-center',
            isCollapsed ? 'justify-center' : 'justify-end'
          )}>
            <ThemeToggle />
          </div>
        </div>
      </motion.div>
    </TooltipProvider>
  )
}
