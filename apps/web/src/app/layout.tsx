import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";
import { QueryProvider } from "@/lib/providers/query-provider";
import { PWAInit } from "@/components/pwa/pwa-init";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { OfflineIndicator } from "@/components/pwa/offline-indicator";
import { NotificationPermission } from "@/components/pwa/notification-permission";
import { UpdatePrompt } from "@/components/pwa/update-prompt";
import { GlobalAIAssistant } from "@/components/global/global-ai-assistant";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "EduNexus | AI 教育生态平台",
  description: "以知识建构为核心的 Web-only AI 教育平台",
  manifest: "/manifest.json",
  themeColor: "#3b82f6",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "EduNexus",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <head>
        <script src="https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js" async></script>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body>
        <QueryProvider>
          <PWAInit />
          <AppShell>{children}</AppShell>
          <InstallPrompt />
          <OfflineIndicator />
          <NotificationPermission />
          <UpdatePrompt />
          <GlobalAIAssistant />
        </QueryProvider>
      </body>
    </html>
  );
}
