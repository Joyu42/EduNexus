export const ACCESS_SCOPES = {
  PUBLIC_READ: "PUBLIC_READ",
  PRIVATE_USER: "PRIVATE_USER",
  DEMO_ONLY: "DEMO_ONLY"
} as const;

export type AccessScope = (typeof ACCESS_SCOPES)[keyof typeof ACCESS_SCOPES];

type RouteScopeContract = {
  publicReadPaths: readonly string[];
  publicReadPrefixes: readonly string[];
  demoOnlyPaths: readonly string[];
  demoOnlyPrefixes: readonly string[];
};

export const ROUTE_SCOPE_CONTRACT: RouteScopeContract = {
  publicReadPaths: ["/", "/about", "/login", "/register"],
  publicReadPrefixes: [
    "/api/auth",
    "/community",
    "/groups",
    "/resources",
    "/profile"
  ],
  demoOnlyPaths: ["/demo"],
  demoOnlyPrefixes: ["/api/demo"]
};

function matchesPath(pathname: string, path: string): boolean {
  return pathname === path;
}

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function getRouteAccessScope(pathname: string): AccessScope {
  if (
    ROUTE_SCOPE_CONTRACT.publicReadPaths.some((path) => matchesPath(pathname, path)) ||
    ROUTE_SCOPE_CONTRACT.publicReadPrefixes.some((prefix) => matchesPrefix(pathname, prefix))
  ) {
    return ACCESS_SCOPES.PUBLIC_READ;
  }

  if (
    ROUTE_SCOPE_CONTRACT.demoOnlyPaths.some((path) => matchesPath(pathname, path)) ||
    ROUTE_SCOPE_CONTRACT.demoOnlyPrefixes.some((prefix) => matchesPrefix(pathname, prefix))
  ) {
    return ACCESS_SCOPES.DEMO_ONLY;
  }

  return ACCESS_SCOPES.PRIVATE_USER;
}
