import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  canAnonymousRead,
  isAuthorizedRouteRequest,
  isPublicRoute,
  requireUser
} = await import(
  "./lib/server/auth-route-protection"
);

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

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

  it("allows anonymous reads for configured public-read routes only", () => {
    expect(canAnonymousRead("/")).toBe(true);
    expect(canAnonymousRead("/about")).toBe(true);
    expect(canAnonymousRead("/api/auth/session")).toBe(true);
    expect(canAnonymousRead("/kb")).toBe(false);
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

  it("returns 401 when requiring a signed-in user without a session", () => {
    expect(requireUser(null)).toEqual({ ok: false, status: 401 });
  });

  it("treats /demo as a protected route (requires authentication)", () => {
    const request = new NextRequest("http://localhost/demo");

    expect(
      isAuthorizedRouteRequest({
        auth: null,
        request,
      })
    ).toBe(false);

    expect(
      isAuthorizedRouteRequest({
        auth: {
          user: {
            id: "user_123",
            email: "user@example.com",
            isDemo: false,
          },
        },
        request,
      })
    ).toBe(true);
  });
});

describe("auth callbacks", () => {
  it("propagates isDemo through authorize, jwt, and session callbacks", async () => {
    const getUserByEmail = vi.fn().mockResolvedValue({
      id: "demo_123",
      email: "demo@edunexus.com",
      name: "Demo User",
      password: "hashed-password",
      isDemo: true,
    });
    const getUserById = vi.fn().mockResolvedValue({
      id: "demo_123",
      email: "demo@edunexus.com",
      name: "Demo User",
      password: "hashed-password",
      isDemo: true,
    });
    const verifyPassword = vi.fn().mockResolvedValue(true);
    const nextAuth = vi.fn((config) => ({
      handlers: {},
      auth: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
      config,
    }));
    const credentials = vi.fn((config) => config);

    vi.doMock("next-auth", () => ({
      default: nextAuth,
    }));
    vi.doMock("next-auth/providers/credentials", () => ({
      default: credentials,
    }));
    vi.doMock("./lib/server/user-service", () => ({
      getUserByEmail,
      getUserById,
      verifyPassword,
    }));

    const { authConfig } = await import("./auth");
    const provider = authConfig.providers[0];

    if (!provider || !("authorize" in provider) || typeof provider.authorize !== "function") {
      throw new Error("Expected credentials provider with authorize callback");
    }

    const user = await provider.authorize(
      { email: "demo@edunexus.com", password: "demo123" },
      new Request("http://localhost/api/auth/callback/credentials", {
        method: "POST",
      })
    );

    if (!user) {
      throw new Error("Expected authorize to return a user");
    }

    expect(user).toEqual({
      id: "demo_123",
      email: "demo@edunexus.com",
      name: "Demo User",
      isDemo: true,
    });

    const jwtCallback = authConfig.callbacks?.jwt;
    if (!jwtCallback) {
      throw new Error("Expected jwt callback");
    }

    const jwtArgs: Parameters<typeof jwtCallback>[0] = {
      token: { sub: "demo_123" },
      user,
      account: null,
      profile: undefined,
      trigger: "signIn",
      isNewUser: false,
      session: undefined,
    };

    const token = await jwtCallback(jwtArgs);

    expect(token.id).toBe("demo_123");
    expect(token.isDemo).toBe(true);

    const sessionCallback = authConfig.callbacks?.session;
    if (!sessionCallback) {
      throw new Error("Expected session callback");
    }

    const session = await sessionCallback({
      session: {
        expires: new Date(Date.now() + 60_000).toISOString() as unknown as string & Date,
        sessionToken: "session_token_123",
        userId: "demo_123",
        user: {
          id: "demo_123",
          email: "demo@edunexus.com",
          emailVerified: null,
          name: "Demo User",
          image: null,
          isDemo: false,
        },
      },
      token,
      user: {
        id: "demo_123",
        email: "demo@edunexus.com",
        emailVerified: null,
        name: "Demo User",
        image: null,
        isDemo: true,
      },
      newSession: undefined,
      trigger: "update",
    });

    expect(session.user).toEqual({
      id: "demo_123",
      email: "demo@edunexus.com",
      emailVerified: null,
      name: "Demo User",
      image: null,
      isDemo: true,
    });
  });
});

describe("auth host trust policy", () => {
  it("trusts localhost AUTH_URL in production", async () => {
    const nextAuth = vi.fn((config) => ({
      handlers: {},
      auth: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
      config,
    }));
    const credentials = vi.fn((config) => config);

    vi.doMock("next-auth", () => ({ default: nextAuth }));
    vi.doMock("next-auth/providers/credentials", () => ({ default: credentials }));
    vi.doMock("./lib/server/user-service", () => ({
      getUserByEmail: vi.fn(),
      getUserById: vi.fn(),
      verifyPassword: vi.fn(),
    }));

    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUTH_URL", "http://localhost:3002");
    vi.stubEnv("AUTH_TRUST_HOST", "");
    vi.stubEnv("AUTH_SECRET", "test-secret");

    try {
      const { authConfig } = await import("./auth");
      expect(authConfig.trustHost).toBe(true);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

describe("auth callback url sanitization", () => {
  it("returns /workspace when callbackUrl missing or unsafe", async () => {
    let getSafeCallbackUrl: ((callbackUrl: string | null) => string) | undefined;

    try {
      ({ getSafeCallbackUrl } = await import("./lib/auth-callback"));
    } catch (err) {
      expect(err).toBeUndefined();
      return;
    }

    if (!getSafeCallbackUrl) {
      throw new Error("Expected getSafeCallbackUrl export");
    }

    expect(getSafeCallbackUrl(null)).toBe("/workspace");
    expect(getSafeCallbackUrl("https://evil.example")).toBe("/workspace");
    expect(getSafeCallbackUrl("//evil.example")).toBe("/workspace");
    expect(getSafeCallbackUrl("/login")).toBe("/workspace");
    expect(getSafeCallbackUrl("/register")).toBe("/workspace");
  });

  it("returns callbackUrl when it is a safe relative path", async () => {
    let getSafeCallbackUrl: ((callbackUrl: string | null) => string) | undefined;

    try {
      ({ getSafeCallbackUrl } = await import("./lib/auth-callback"));
    } catch (err) {
      expect(err).toBeUndefined();
      return;
    }

    if (!getSafeCallbackUrl) {
      throw new Error("Expected getSafeCallbackUrl export");
    }

    expect(getSafeCallbackUrl("/workspace")).toBe("/workspace");
    expect(getSafeCallbackUrl("/workspace?tab=recent")).toBe("/workspace?tab=recent");
    expect(getSafeCallbackUrl("/kb/123")).toBe("/kb/123");
  });
});
