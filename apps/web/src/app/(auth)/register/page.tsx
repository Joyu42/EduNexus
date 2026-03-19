'use client';

import { signIn } from 'next-auth/react';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { getSafeCallbackUrl } from '@/lib/auth-callback';

type RegisterErrorResponse = {
  error?: {
    code?: string;
    message?: string;
  };
};

function RegisterPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const callbackUrl = useMemo(
    () => getSafeCallbackUrl(searchParams.get('callbackUrl')),
    [searchParams]
  );

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace(callbackUrl);
      router.refresh();
    }
  }, [callbackUrl, router, status]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    if (name.trim().length < 2) {
      setError('用户名长度至少为 2 个字符');
      return;
    }

    if (password.length < 6) {
      setError('密码长度至少为 6 位');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), name, password }),
      });

      const data = (await res.json()) as RegisterErrorResponse;

      if (!res.ok) {
        setError(data.error?.message || '注册失败，请重试');
        return;
      }

      const result = await signIn('credentials', {
        email: email.trim(),
        password,
        redirect: false,
        callbackUrl,
      });

      if (result?.error) {
        setError('注册成功但登录失败，请尝试手动登录');
      } else {
        window.location.href = callbackUrl;
      }
    } catch {
      setError('注册失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="bg-card border p-8 rounded-xl shadow-lg w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6 text-foreground">注册 EduNexus</h1>
        
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">用户名</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-input bg-background text-foreground rounded-lg focus:ring-2 focus:ring-primary focus:border-primary/50 placeholder:text-muted-foreground"
              placeholder="唯一用户名（不可重复）"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">邮箱</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-input bg-background text-foreground rounded-lg focus:ring-2 focus:ring-primary focus:border-primary/50 placeholder:text-muted-foreground"
              placeholder="your@email.com"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-input bg-background text-foreground rounded-lg focus:ring-2 focus:ring-primary focus:border-primary/50 placeholder:text-muted-foreground"
              placeholder="至少 6 位"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">确认密码</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2 border border-input bg-background text-foreground rounded-lg focus:ring-2 focus:ring-primary focus:border-primary/50 placeholder:text-muted-foreground"
              placeholder="再次输入密码"
              required
            />
          </div>

          {error && (
            <p className="text-destructive text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground py-3 rounded-lg hover:bg-primary/90 transition disabled:opacity-50"
          >
            {loading ? '注册中...' : '注册'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          已有账号？{' '}
          <a
            href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
            className="font-medium text-primary hover:underline"
          >
            立即登录
          </a>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">加载中...</div>}>
      <RegisterPageContent />
    </Suspense>
  );
}
