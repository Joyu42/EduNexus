'use client';

import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { LogOut, User as UserIcon, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function UserMenu() {
  const { data: session, status } = useSession();
  const [isOpen, setIsOpen] = useState(false);

  if (status === 'loading') {
    return (
      <div className="flex items-center gap-2 px-2 py-1.5">
        <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <a href="/login" className="w-full">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start"
        >
          <UserIcon className="h-4 w-4 mr-2" />
          登录
        </Button>
      </a>
    );
  }

  const user = session?.user;
  const displayName = user?.name || user?.email || '用户';
  const avatarUrl = user?.image;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-between px-2"
        >
          <div className="flex items-center gap-2">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="h-8 w-8 rounded-full"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <UserIcon className="h-4 w-4" />
              </div>
            )}
            <span className="text-sm font-medium truncate max-w-[120px]">
              {displayName}
            </span>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <div className="px-2 py-1.5 text-sm text-muted-foreground">
          {user?.email}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="text-red-600 cursor-pointer"
        >
          <LogOut className="h-4 w-4 mr-2" />
          退出登录
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
