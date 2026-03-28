'use client'

import { useState } from 'react'
import { AppSidebar } from './AppSidebar'
import { MobileNav } from '@/components/mobile/mobile-nav'
import { MobileMenu } from '@/components/mobile/mobile-menu'
import { Footer } from './Footer'
import { useIsMobile } from '@/lib/hooks/use-media-query'
import { useSidebarStore } from '@/lib/stores/sidebar-store'
import { cn } from '@/lib/utils'
import { Search, Bell, Command, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const isMobile = useIsMobile()
  const { isCollapsed } = useSidebarStore()

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* 主体容器 */}
      <div className="flex flex-1 min-h-0 relative">
        {/* 桌面端侧边栏 - 宽度由 AppSidebar 内部 motion.div 控制 */}
        <div className="hidden md:block h-full shrink-0">
          <AppSidebar />
        </div>

        {/* 右侧主体区 */}
        <div className="flex-1 flex flex-col min-w-0 relative h-full">
          {/* 沉浸式顶部栏 */}
          <header className="h-16 shrink-0 flex items-center justify-between px-6 border-b border-border/10 bg-background/40 backdrop-blur-md z-30 sticky top-0">
            <div className="flex items-center gap-4 flex-1">
              <div className="relative w-full max-w-md group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input 
                  placeholder="搜索知识、文档或功能..." 
                  className="pl-10 h-9 bg-card/30 border-border/50 focus:border-primary/50 transition-all rounded-xl text-sm"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 px-1.5 py-0.5 rounded border border-border/50 bg-muted/50 text-[10px] font-bold text-muted-foreground">
                  <Command className="h-2.5 w-2.5" />
                  <span>K</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-primary/10 transition-colors">
                <Bell className="h-4 w-4 text-muted-foreground" />
              </Button>
              <div className="h-4 w-px bg-border/20 mx-1" />
              <Button variant="ghost" className="h-9 gap-2 px-3 rounded-xl hover:bg-primary/10 transition-colors">
                <div className="h-6 w-6 rounded-full bg-gradient-to-tr from-primary to-accent p-0.5">
                  <div className="h-full w-full rounded-full bg-card flex items-center justify-center">
                    <User className="h-3 w-3 text-primary" />
                  </div>
                </div>
                <span className="text-xs font-bold text-foreground">研习者</span>
              </Button>
            </div>
          </header>

          {/* 主内容滚动区 */}
          <main className={cn(
            "flex-1 overflow-y-auto overflow-x-hidden transition-all duration-300 relative z-10 pb-16",
            "scrollbar-thin scrollbar-thumb-primary/10"
          )}>
            <div className="page-container animate-in fade-in slide-in-from-bottom-4 duration-700">
              {children}
            </div>
          </main>
        </div>
      </div>

      {/* 页脚 - 仅在非移动端显示在底部 */}
      <div className="hidden md:block">
        <Footer />
      </div>

      {/* 移动端导航 */}
      {isMobile && (
        <>
          <MobileNav />
          <MobileMenu
            isOpen={isMobileMenuOpen}
            onClose={() => setIsMobileMenuOpen(false)}
          />
        </>
      )}
    </div>
  )
}
