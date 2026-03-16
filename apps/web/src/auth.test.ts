import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

const { isAuthorizedRouteRequest, isPublicRoute } = await import(
  "./lib/server/auth-route-protection"
);

describe("auth route protection", () => {
  it("allows fixed public routes without a session", async () => {
    expect(
      isAuthorizedRouteRequest({
        auth: null,
        request: new NextRequest("http://localhost/login")
      })
    ).toBe(true);

    expect(
      isAuthorizedRouteRequest({
        auth: null,
        request: new NextRequest("http://localhost/register")
      })
    ).toBe(true);

    expect(isPublicRoute("/api/auth/session")).toBe(true);
    expect(isPublicRoute("/api/auth/callback/credentials")).toBe(true);
  });

  it("blocks protected pages when unauthenticated", () => {
    expect(
      isAuthorizedRouteRequest({
        auth: null,
        request: new NextRequest("http://localhost/workspace?tab=recent")
      })
    ).toBe(false);
  });

  it("allows protected pages when authenticated", () => {
    expect(
      isAuthorizedRouteRequest({
        auth: {
          user: {
            id: "user_123",
            email: "user@example.com"
          }
        },
        request: new NextRequest("http://localhost/workspace")
      })
    ).toBe(true);
  });
});
