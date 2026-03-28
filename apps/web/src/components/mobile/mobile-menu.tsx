"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  Home,
  Network,
  BookOpen,
  Route,
  Briefcase,
  Settings,
  Target,
  GitBranch,
  Languages,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const navigation = [
  {
    title: "核心功能",
    items: [
      { name: "总览", href: "/", icon: Home },
      { name: "知识星图", href: "/graph", icon: Network },
      { name: "知识宝库", href: "/kb", icon: BookOpen },
      { name: "单词学习", href: "/words", icon: Languages },
      { name: "目标管理", href: "/goals", icon: Target },
    ],
  },
  {
    title: "工作区",
    items: [
      { name: "学习工作区", href: "/workspace", icon: Briefcase },
    ],
  },
  {
    title: "系统",
    items: [{ name: "配置中心", href: "/settings", icon: Settings }],
  },
];

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * 移动端菜单（汉堡菜单）
 * 全屏侧滑菜单，显示所有导航项
 */
export function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const pathname = usePathname();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 背景遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm md:hidden"
          />

          {/* 菜单内容 */}
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed left-0 top-0 bottom-0 z-50 w-[280px] bg-white dark:bg-gray-900 shadow-2xl md:hidden overflow-y-auto"
          >
            {/* 头部 */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm">
                  EN
                </div>
                <span className="text-base font-semibold">EduNexus</span>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* 导航列表 */}
            <nav className="p-4 space-y-6">
              {navigation.map((section, index) => (
                <div key={section.title}>
                  {index > 0 && <Separator className="my-4" />}
                  <div className="space-y-2">
                    <h3 className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {section.title}
                    </h3>
                    {section.items.map((item) => {
                      const isActive =
                        pathname === item.href ||
                        (item.href !== "/" && pathname?.startsWith(item.href));
                      const Icon = item.icon;

                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          onClick={onClose}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                            isActive
                              ? "bg-primary/10 text-primary font-medium"
                              : "text-foreground hover:bg-accent"
                          )}
                        >
                          <Icon className="h-5 w-5 flex-shrink-0" />
                          <span>{item.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
