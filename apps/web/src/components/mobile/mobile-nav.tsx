"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Home,
  Network,
  BookOpen,
  Briefcase,
  Settings,
} from "lucide-react";
import { useSafeArea } from "@/lib/hooks/use-safe-area";

const navItems = [
  { name: "总览", href: "/", icon: Home },
  { name: "星图", href: "/graph", icon: Network },
  { name: "宝库", href: "/kb", icon: BookOpen },
  { name: "工作区", href: "/workspace", icon: Briefcase },
  { name: "设置", href: "/settings", icon: Settings },
];

/**
 * 移动端底部导航栏
 * 替代桌面端的侧边栏
 */
export function MobileNav() {
  const pathname = usePathname();
  const safeArea = useSafeArea();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg border-t border-border shadow-lg md:hidden"
      style={{
        paddingBottom: `${safeArea.bottom}px`,
      }}
    >
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname?.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-all duration-200 min-w-[60px]",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5 transition-transform",
                  isActive && "scale-110"
                )}
              />
              <span
                className={cn(
                  "text-xs font-medium",
                  isActive && "font-semibold"
                )}
              >
                {item.name}
              </span>
              {isActive && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-t-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
