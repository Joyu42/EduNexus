import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      isDemo: boolean;
    };
  }

  interface User {
    id: string;
    isDemo: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    isDemo?: boolean;
    name?: string;
  }
}
