'use client';

import { SessionProvider } from 'next-auth/react';
import { AuthSyncProvider } from '@/components/providers/auth-sync-provider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AuthSyncProvider>
        {children}
      </AuthSyncProvider>
    </SessionProvider>
  );
}
