'use client';

import { WifiOff, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full bg-card border rounded-2xl shadow-xl p-8 text-center">
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-full mb-4">
            <WifiOff className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            您当前处于离线状态
          </h1>
          <p className="text-muted-foreground">
            无法连接到网络，请检查您的网络连接
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => window.location.reload()}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
            重新加载
          </button>

          <Link
            href="/"
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-lg transition-colors"
          >
            <Home className="w-5 h-5" />
            返回首页
          </Link>
        </div>

        <div className="mt-8 pt-6 border-t border-border">
          <p className="text-sm text-muted-foreground">
            EduNexus 支持离线访问部分功能
          </p>
        </div>
      </div>
    </div>
  );
}
