"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Lock } from "lucide-react";

interface LoginPromptProps {
  title?: string;
}

export function LoginPrompt({ title = "知识星图" }: LoginPromptProps) {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 pb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-100">
            <Lock className="h-8 w-8 text-orange-500" />
          </div>
          <h2 className="text-xl font-semibold mb-2">请先登录</h2>
          <p className="text-muted-foreground mb-6">
            登录后可查看{title}
          </p>
          <Button
            onClick={() => router.push("/login")}
            className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
          >
            去登录
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
