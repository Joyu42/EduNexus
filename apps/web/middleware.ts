// apps/web/middleware.ts
import { auth } from "@/auth";

export default auth;

export const config = {
  matcher: ['/((?!api/|_next/|static/|public/|.*\\..*).*)'],
};
