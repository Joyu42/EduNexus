'use client';

import { signIn } from 'next-auth/react';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { getSafeCallbackUrl } from '@/lib/auth-callback';

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await signIn('credentials', {
        email: email.trim(),
        password,
        redirect: false,
        callbackUrl,
      });

      if (result?.error) {
        setError('邮箱或密码错误');
      } else {
        window.location.href = callbackUrl;
      }
    } catch {
      setError('登录失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="bg-card border p-8 rounded-xl shadow-lg w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6">登录 EduNexus</h1>

        <form onSubmit={handleCredentialsLogin} className="space-y-4">
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
              placeholder="••••••••"
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
            {loading ? '登录中...' : '登录'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          还没有账号？{' '}
          <a
            href={`/register?callbackUrl=${encodeURIComponent(callbackUrl)}`}
            className="font-medium text-primary hover:underline"
          >
            立即注册
          </a>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">加载中...</div>}>
      <LoginPageContent />
    </Suspense>
  );
}
