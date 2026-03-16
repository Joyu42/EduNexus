import type { NextRequest } from "next/server";

type RouteProtectionInput = {
  auth: { user?: unknown } | null;
  request: Pick<NextRequest, "nextUrl">;
};

export const PUBLIC_ROUTE_PREFIXES = ["/api/auth"] as const;
export const PUBLIC_ROUTE_PATHS = ["/login", "/register"] as const;

export function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_ROUTE_PATHS.includes(pathname as (typeof PUBLIC_ROUTE_PATHS)[number])) {
    return true;
  }

  return PUBLIC_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function isAuthorizedRouteRequest({ auth, request }: RouteProtectionInput): boolean {
  if (isPublicRoute(request.nextUrl.pathname)) {
    return true;
  }

  return Boolean(auth);
}
