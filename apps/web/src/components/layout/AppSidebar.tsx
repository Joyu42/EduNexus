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
import {
  Home,
  Network,
  BookOpen,
  Briefcase,
  Settings,
  ChevronLeft,
  Menu,
  Target,
  FolderOpen,
  Users,
  MessageSquare,
  BarChart3,
  Languages,
  Zap,
  Activity
} from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { UserMenu } from './user-menu'

const navigation = [
  {
    title: '概览',
    items: [
      { name: '总览', href: '/', icon: Home },
    ],
  },
  {
    title: '学习系统',
    items: [
      { name: '知识星图', href: '/graph', icon: Network },
      { name: '知识宝库', href: '/kb', icon: BookOpen },
      { name: '单词学习', href: '/words', icon: Languages },
      { name: '目标管理', href: '/goals', icon: Target },
      { name: '学习分析', href: '/analytics', icon: BarChart3 },
    ],
  },
  {
    title: '协作与资源',
    items: [
      { name: '资源中心', href: '/resources', icon: FolderOpen },
      { name: '学习小组', href: '/groups', icon: Users },
      { name: '学习社区', href: '/community', icon: MessageSquare },
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
          'app-sidebar flex h-full flex-col z-40 relative',
          'bg-gradient-to-b from-card/40 to-background/60 backdrop-blur-2xl',
          'border-r border-border/20 shadow-xl shadow-black/5'
        )}
        initial={false}
        animate={{
          width: isCollapsed ? 80 : 280
        }}
        transition={{
          duration: 0.5,
          ease: [0.4, 0, 0.2, 1]
        }}
      >
        {/* Brand Area */}
        <div
          className={cn(
            'flex h-20 items-center px-4 mb-4 mt-2 transition-all duration-300',
            isCollapsed ? 'justify-center' : 'justify-between'
          )}
        >
          <AnimatePresence mode="wait">
            {isCollapsed ? (
              <motion.div
                key="collapsed-logo"
                initial={{ opacity: 0, scale: 0.5, rotate: -20 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.5, rotate: 20 }}
                className="relative group cursor-pointer"
                onClick={toggleCollapse}
              >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary via-accent to-primary shadow-lg shadow-primary/20 flex items-center justify-center overflow-hidden">
                  <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <div className="absolute -inset-1 rounded-2xl bg-primary/20 blur-md -z-10 opacity-0 group-hover:opacity-100 transition-opacity" />
              </motion.div>
            ) : (
              <motion.div
                key="expanded-logo"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex items-center justify-between w-full"
              >
                <Link href="/" className="flex items-center gap-3 group">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary via-accent to-primary shadow-xl shadow-primary/20 flex items-center justify-center transition-transform group-hover:scale-105 group-hover:rotate-3">
                    <Zap className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-lg font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                      EduNexus
                    </span>
                    <span className="text-[10px] font-bold text-primary/60 tracking-wider uppercase">
                      AI 学习引擎
                    </span>
                  </div>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleCollapse}
                  className="rounded-xl hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors h-8 w-8"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation Area */}
        <nav
          className={cn(
            'flex-1 space-y-6 overflow-y-auto scrollbar-thin scrollbar-thumb-primary/10 hover:scrollbar-thumb-primary/20 transition-all',
            isCollapsed ? 'px-3' : 'px-4'
          )}
        >
          {navigation.map((section) => (
            <div key={section.title} className="space-y-2">
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.h3
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="px-4 text-[10px] font-bold uppercase tracking-[0.2em] text-primary/60"
                  >
                    {section.title}
                  </motion.h3>
                )}
              </AnimatePresence>

              <div className="space-y-1">
                {section.items.map((item) => {
                  const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href))
                  const itemContent = (
                    <motion.div
                      whileHover={{ x: isCollapsed ? 0 : 4 }}
                      className="relative"
                    >
                      <Button
                        variant="ghost"
                        className={cn(
                          'w-full group/btn relative overflow-hidden transition-all duration-300 rounded-xl',
                          isActive 
                            ? 'bg-primary/10 text-primary shadow-sm' 
                            : 'text-muted-foreground/80 hover:bg-primary/5 hover:text-foreground',
                          isCollapsed ? 'justify-center h-12 p-0' : 'justify-start h-11 px-4 gap-3'
                        )}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="active-pill"
                            className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-primary rounded-r-full shadow-[0_0_10px_rgba(var(--primary),0.5)]"
                          />
                        )}
                        <item.icon className={cn(
                          'h-5 w-5 transition-all duration-300',
                          isActive ? 'scale-110' : 'group-hover/btn:scale-110 group-hover/btn:text-primary'
                        )} />
                        {!isCollapsed && (
                          <span className={cn(
                            'text-sm transition-colors',
                            isActive ? 'font-bold' : 'font-medium'
                          )}>
                            {item.name}
                          </span>
                        )}
                      </Button>
                    </motion.div>
                  )

                  if (isCollapsed) {
                    return (
                      <Tooltip key={item.name}>
                        <TooltipTrigger asChild>
                          <Link href={item.href}>
                            {itemContent}
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="glass border-primary/20 font-bold text-xs py-2 px-3">
                          {item.name}
                        </TooltipContent>
                      </Tooltip>
                    )
                  }

                  return (
                    <Link key={item.name} href={item.href}>
                      {itemContent}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer Area */}
        <div
          className={cn(
            'p-4 mt-auto border-t border-border/10 space-y-4',
            isCollapsed && 'px-3 flex flex-col items-center'
          )}
        >
          {!isCollapsed && (
            <div className="glass-card p-4 rounded-xl space-y-3 bg-primary/5 border-primary/10">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary animate-pulse" />
                <span className="text-xs font-bold text-primary uppercase tracking-wider">系统监控</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[10px] font-medium text-muted-foreground">
                  <span>引导引擎</span>
                  <span className="text-emerald-500 font-bold">稳定运行</span>
                </div>
                <div className="flex items-center justify-between text-[10px] font-medium text-muted-foreground">
                  <span>星图核心</span>
                  <span className="text-emerald-500 font-bold">同步中</span>
                </div>
              </div>
            </div>
          )}

          <div className={cn(
            'flex items-center gap-2',
            isCollapsed ? 'flex-col' : 'justify-between'
          )}>
            <UserMenu />
            <ThemeToggle />
          </div>
          
          {!isCollapsed && (
            <div className="text-[9px] text-center font-bold text-muted-foreground/30 tracking-widest uppercase">
              EduNexus · v0.1.0
            </div>
          )}
        </div>
      </motion.div>
    </TooltipProvider>
  )
}
