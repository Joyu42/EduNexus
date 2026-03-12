"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function KBGraphRedirect() {
  const router = useRouter();

  useEffect(() => {
    // 重定向到主知识图谱页面
    router.replace("/graph");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-muted-foreground">跳转到知识图谱...</p>
      </div>
    </div>
  );
}
