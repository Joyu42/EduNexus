"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

const navGroups = [
  {
    title: "核心链路",
    items: [
      { href: "/", label: "总览" },
      { href: "/workspace", label: "学习工作区" },
      { href: "/graph", label: "知识图谱" },
      { href: "/path", label: "学习路径" }
    ]
  },
  {
    title: "生态支撑",
    items: [
      { href: "/teacher", label: "教师工作台" },
      { href: "/kb", label: "本地知识库" },
      { href: "/dashboard", label: "生态看板" },
      { href: "/settings", label: "配置中心" }
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
  const pathname = usePathname();
  const [themeMode, setThemeMode] = useState<"nebula" | "aurora">("nebula");

  useEffect(() => {
    const saved = window.localStorage.getItem("edunexus-theme");
    if (saved === "nebula" || saved === "aurora") {
      setThemeMode(saved);
    }
  }, []);

  useEffect(() => {
    const handleThemeUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ themeMode?: unknown }>).detail;
      const nextMode = detail?.themeMode;
      if (nextMode === "nebula" || nextMode === "aurora") {
        setThemeMode(nextMode);
      }
    };
    window.addEventListener("edunexus-theme-updated", handleThemeUpdated);
    return () => {
      window.removeEventListener("edunexus-theme-updated", handleThemeUpdated);
    };
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", themeMode);
    window.localStorage.setItem("edunexus-theme", themeMode);
  }, [themeMode]);

  return (
    <div className="shell">
      <aside className="shell-nav">
        <div className="brand">
          <div className="brand-mark" />
          <div>
            <h1>EduNexus</h1>
            <p>思维编织成网</p>
          </div>
        </div>

        {navGroups.map((group) => (
          <div className="nav-group" key={group.title}>
            <p className="nav-title">{group.title}</p>
            <nav>
              {group.items.map((item) => {
                const active = isActivePath(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`nav-link ${active ? "active" : ""}`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}

        <div className="nav-progress">
          <strong>一期能力完成度</strong>
          <div className="progress-track">
            <span style={{ width: "78%" }} />
          </div>
          <p>LangGraph · KB-Lite · Teacher · CI</p>
        </div>

        <div className="theme-switch">
          <button
            type="button"
            className="theme-toggle"
            onClick={() =>
              setThemeMode((prev) => (prev === "nebula" ? "aurora" : "nebula"))
            }
          >
            {themeMode === "nebula" ? "切换到晨曦主题" : "切换到星夜主题"}
          </button>
          <p>当前风格：{themeMode === "nebula" ? "星夜银河" : "晨曦玻璃"}</p>
        </div>

        <div className="nav-foot">
          <p>Web-only · LangGraph · ModelScope</p>
          <p>一期开发中 · 视觉升级版</p>
        </div>
      </aside>

      <main className="shell-main">
        <div className="main-backdrop" />
        <div className="main-content">{children}</div>
      </main>
    </div>
  );
}
