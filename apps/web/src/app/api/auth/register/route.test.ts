import { beforeEach, describe, expect, it, vi } from "vitest";

const getUserByEmail = vi.fn();
const createUser = vi.fn();
const createDocument = vi.fn();

vi.mock("@/lib/server/user-service", () => ({
  getUserByEmail,
  createUser,
}));

vi.mock("@/lib/server/document-service", () => ({
  createDocument,
}));

const { POST } = await import("./route");

describe("register api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a structured validation error for malformed payloads", async () => {
    const response = await POST(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "bad-email", password: "123", name: 42 }),
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "VALIDATION_ERROR",
        message: "请求参数不合法",
        details: {
          fieldErrors: {
            email: ["请输入有效的邮箱地址"],
            password: ["密码长度至少为 6 位"],
            name: ["Expected string, received number"],
          },
        },
      },
    });
    expect(getUserByEmail).not.toHaveBeenCalled();
    expect(createUser).not.toHaveBeenCalled();
    expect(createDocument).not.toHaveBeenCalled();
  });

  it("returns a structured conflict error when email already exists", async () => {
    getUserByEmail.mockResolvedValueOnce({ id: "existing_user" });

    const response = await POST(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "user@example.com",
          password: "123456",
          name: "User",
        }),
      })
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "EMAIL_ALREADY_EXISTS",
        message: "该邮箱已被注册",
      },
    });
    expect(createUser).not.toHaveBeenCalled();
    expect(createDocument).not.toHaveBeenCalled();
  });

  it("creates a normal user even when the payload tries to self-elect demo access", async () => {
    getUserByEmail.mockResolvedValueOnce(null);
    createUser.mockResolvedValueOnce({
      id: "user_123",
      email: "user@example.com",
      name: "User",
      isDemo: false,
    });
    createDocument.mockResolvedValueOnce({ id: "doc_1" });

    const response = await POST(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "user@example.com",
          password: "123456",
          name: "User",
          isDemo: true,
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(createUser).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "123456",
      name: "User",
      isDemo: false,
    });
    expect(createDocument).toHaveBeenCalledWith({
      authorId: "user_123",
      title: expect.any(String),
      content: expect.stringContaining("欢迎使用"),
    });
    await expect(response.json()).resolves.toEqual({
      id: "user_123",
      email: "user@example.com",
      name: "User",
    });
  });
});
