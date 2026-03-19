// apps/web/src/lib/server/types/user.ts
export type User = {
  id: string;
  name?: string | null;
  email: string;
  emailVerified?: Date | null;
  image?: string | null;
  password?: string;
  createdAt: Date;
};
