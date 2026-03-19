import type { NextRequest } from "next/server";
import { ACCESS_SCOPES, getRouteAccessScope } from "./route-access-scope";

type RouteProtectionInput = {
  auth: { user?: unknown } | null;
  request: Pick<NextRequest, "nextUrl">;
};

type GuardResult =
  | { ok: true; status: 200 }
  | { ok: false; status: 401 }
  | { ok: false; status: 403 };

function getSessionUser(auth: RouteProtectionInput["auth"]): Record<string, unknown> | null {
  if (!auth || !auth.user || typeof auth.user !== "object") {
    return null;
  }

  return auth.user as Record<string, unknown>;
}

export function canAnonymousRead(pathname: string): boolean {
  return getRouteAccessScope(pathname) === ACCESS_SCOPES.PUBLIC_READ;
}

export function isPublicRoute(pathname: string): boolean {
  return canAnonymousRead(pathname);
}

export function requireUser(auth: RouteProtectionInput["auth"]): GuardResult {
  return getSessionUser(auth) ? { ok: true, status: 200 } : { ok: false, status: 401 };
}

export function requireDemoUser(auth: RouteProtectionInput["auth"]): GuardResult {
  const user = getSessionUser(auth);
  if (!user) {
    return { ok: false, status: 401 };
  }

  return user.isDemo === true ? { ok: true, status: 200 } : { ok: false, status: 403 };
}

export function isAuthorizedRouteRequest({ auth, request }: RouteProtectionInput): boolean {
  const pathname = request.nextUrl.pathname;
  const scope = getRouteAccessScope(pathname);

  if (scope === ACCESS_SCOPES.PUBLIC_READ) {
    return true;
  }

  if (scope === ACCESS_SCOPES.DEMO_ONLY) {
    return requireDemoUser(auth).ok;
  }

  return requireUser(auth).ok;
}
