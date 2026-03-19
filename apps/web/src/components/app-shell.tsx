"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useThemeStore } from "@/lib/stores/theme-store";
import { useNavigationStore } from "@/lib/stores/navigation-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ArrowUp, Moon, Sun } from "lucide-react";

const navGroups = [
  {
    title: "核心链路",
    items: [
      { href: "/", label: "总览", hint: "平台入口与能力总览" },
      { href: "/workspace", label: "学习工作区", hint: "引导学习与会话沉淀" },
      { href: "/graph", label: "知识图谱", hint: "风险关系链与批次联动" },
      { href: "/path", label: "学习路径", hint: "目标生成与任务回写" }
    ]
  },
  {
    title: "学习生态",
    items: [
      { href: "/resources", label: "资源中心", hint: "学习资源分享与发现" },
      { href: "/groups", label: "学习小组", hint: "协作学习与交流" },
      { href: "/community", label: "学习社区", hint: "讨论与经验分享" },
      { href: "/analytics", label: "学习分析", hint: "学习数据统计与分析" }
    ]
  },
  {
    title: "生态支撑",
    items: [
      { href: "/kb", label: "本地知识库", hint: "双链检索与证据沉淀" },
      { href: "/settings", label: "配置中心", hint: "模板、策略与参数管理" }
    ]
  }
];

function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname.startsWith(href);
}

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { mode: themeMode, toggleMode } = useThemeStore();
  const { quickQuery, setQuickQuery } = useNavigationStore();
  const [showBackTop, setShowBackTop] = useState(false);
  const quickInputRef = useRef<HTMLInputElement | null>(null);

  const quickNavItems = useMemo(
    () =>
      navGroups.flatMap((group) =>
        group.items.map((item) => ({
          ...item,
          groupTitle: group.title
        }))
      ),
    []
  );

  const currentNavItem = useMemo(
    () => quickNavItems.find((item) => isActivePath(pathname, item.href)),
    [pathname, quickNavItems]
  );

  const normalizedQuickQuery = useMemo(() => quickQuery.trim().toLowerCase(), [quickQuery]);

  const quickMatchedItems = useMemo(() => {
    if (!normalizedQuickQuery) {
      return quickNavItems.slice(0, 8);
    }
    return quickNavItems
      .filter((item) => {
        const text = `${item.label} ${item.href} ${item.groupTitle} ${item.hint ?? ""}`.toLowerCase();
        return text.includes(normalizedQuickQuery);
      })
      .slice(0, 8);
  }, [normalizedQuickQuery, quickNavItems]);

  const jumpToQuickItem = (href: string) => {
    router.push(href);
    setQuickQuery("");
  };

  useEffect(() => {
    const handleScroll = () => setShowBackTop(window.scrollY > 520);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        quickInputRef.current?.focus();
        quickInputRef.current?.select();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="grid grid-cols-[280px_1fr] min-h-screen relative">
      {/* Sidebar */}
      <aside className={cn(
        "border-r border-border/30 backdrop-blur-xl",
        "bg-gradient-to-b from-card/80 to-background/95",
        "p-6 flex flex-col gap-4 sticky top-0 h-screen overflow-auto scrollbar-thin"
      )}>
        {/* Brand */}
        <div className="flex gap-3 items-center glass-card p-4 rounded-2xl">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary via-accent to-primary shadow-xl shadow-primary/30" />
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary to-accent opacity-50 blur-md" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">EduNexus</h1>
            <p className="text-xs text-muted-foreground">学习闭环中枢</p>
          </div>
        </div>

        {/* Navigation Groups */}
        {navGroups.map((group) => (
          <div key={group.title} className="space-y-2">
            <p className="text-xs font-semibold text-primary/80 tracking-wider uppercase px-2">
              {group.title}
            </p>
            <nav className="space-y-1">
              {group.items.map((item) => {
                const active = isActivePath(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "nav-link block",
                      active && "active"
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}

        <Separator className="my-2" />

        {/* System Status */}
        <div className="glass-card p-4 rounded-xl space-y-3">
          <strong className="text-sm font-semibold">系统状态</strong>
          <ul className="text-xs space-y-2">
            <li className="flex items-center gap-2">
              <div className="status-dot online" />
              <span className="text-muted-foreground">引导引擎：在线</span>
            </li>
            <li className="flex items-center gap-2">
              <div className="status-dot online" />
              <span className="text-muted-foreground">知识库索引：可用</span>
            </li>
            <li className="flex items-center gap-2">
              <div className="status-dot online" />
              <span className="text-muted-foreground">图谱联动：可用</span>
            </li>
          </ul>
        </div>

        {/* Theme Toggle */}
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={toggleMode}
        >
          {themeMode === "nebula" ? (
            <>
              <Sun className="h-4 w-4" />
              <span className="flex-1 text-left">切换到晨曦主题</span>
            </>
          ) : (
            <>
              <Moon className="h-4 w-4" />
              <span className="flex-1 text-left">切换到星夜主题</span>
            </>
          )}
        </Button>

        <div className="text-xs text-center text-muted-foreground pt-2 space-y-1">
          <p className="font-medium">当前：{themeMode === "nebula" ? "星夜银河" : "晨曦玻璃"}</p>
        </div>

        <Separator className="my-2" />

        {/* Footer */}
        <div className="text-xs text-center text-muted-foreground space-y-1 opacity-60">
          <p>纯 Web · LangGraph · ModelScope</p>
          <p>统一学习、图谱、路径与教学协同</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="relative min-h-screen">
        {/* Background Effect */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-transparent to-accent/3" />
        </div>

        {/* Topbar */}
        <div className="sticky top-0 z-20 glass backdrop-blur-xl border-b border-border/50">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between gap-6 max-w-7xl mx-auto">
              {/* Current Route Info */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {currentNavItem?.groupTitle ?? "EduNexus"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">·</span>
                  <h2 className="text-base font-semibold truncate">
                    {currentNavItem?.label ?? "AI 教育生态平台"}
                  </h2>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {currentNavItem?.hint ?? "统一学习引导、图谱分析与本地知识沉淀"}
                </p>
              </div>

              {/* Quick Search */}
              <div className="relative w-96 hidden md:block">
                <Input
                  ref={quickInputRef}
                  value={quickQuery}
                  onChange={(e) => setQuickQuery(e.target.value)}
                  placeholder="快速跳转（Ctrl+K）"
                  className="input-enhanced pr-16"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const target = quickMatchedItems[0];
                      if (target) {
                        jumpToQuickItem(target.href);
                      }
                    }
                    if (e.key === "Escape") {
                      setQuickQuery("");
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                />
                <kbd className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none inline-flex h-6 select-none items-center gap-1 rounded bg-muted px-2 font-mono text-[10px] font-medium text-muted-foreground">
                  <span className="text-xs">⌘</span>K
                </kbd>

                {/* Search Results */}
                {normalizedQuickQuery && (
                  <div className="absolute top-full mt-2 w-full glass-card rounded-xl shadow-xl overflow-hidden z-50 animate-in">
                    {quickMatchedItems.length === 0 ? (
                      <p className="p-4 text-sm text-muted-foreground text-center">
                        未匹配到页面，请换一个关键词。
                      </p>
                    ) : (
                      <div className="py-1">
                        {quickMatchedItems.map((item) => (
                          <button
                            key={`quick_nav_${item.href}`}
                            type="button"
                            onClick={() => jumpToQuickItem(item.href)}
                            className={cn(
                              "w-full px-4 py-3 text-left hover:bg-accent/10 transition-colors border-l-2 border-transparent hover:border-primary",
                              isActivePath(pathname, item.href) && "bg-accent/10 border-primary"
                            )}
                          >
                            <span className="block text-sm font-medium">{item.label}</span>
                            <span className="block text-xs text-muted-foreground mt-0.5">
                              {item.groupTitle} · {item.hint}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Quick Shortcuts */}
                {!normalizedQuickQuery && typeof window !== 'undefined' && quickInputRef.current === document.activeElement && (
                  <div className="absolute top-full mt-2 w-full glass-card rounded-xl shadow-xl overflow-hidden z-50 animate-in">
                    <div className="p-2 border-b border-border/50">
                      <p className="text-xs text-muted-foreground font-medium">快速访问</p>
                    </div>
                    <div className="py-1">
                      {quickNavItems.slice(0, 4).map((item) => (
                        <button
                          key={`shortcut_${item.href}`}
                          type="button"
                          onClick={() => jumpToQuickItem(item.href)}
                          className={cn(
                            "w-full px-4 py-2 text-left text-sm hover:bg-accent/10 transition-colors",
                            isActivePath(pathname, item.href) && "bg-accent/10 font-medium text-primary"
                          )}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="btn-ghost"
                  onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="btn-ghost"
                  onClick={toggleMode}
                >
                  {themeMode === "nebula" ? (
                    <Sun className="h-4 w-4" />
                  ) : (
                    <Moon className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="relative z-10">
          {children}
        </div>

        {/* Back to Top Button */}
        {showBackTop && (
          <Button
            size="icon"
            className="fixed bottom-8 right-8 rounded-full shadow-2xl shadow-primary/20 z-50 btn-primary"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
        )}
      </main>
    </div>
  );
}
