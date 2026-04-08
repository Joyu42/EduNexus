import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const PASSWORD = "playwright_pass_123";

type AuthUser = {
  email: string;
  name: string;
  password: string;
};

async function createUser(request: APIRequestContext): Promise<AuthUser> {
  const token = Math.random().toString(36).slice(2, 8);
  const user: AuthUser = {
    email: `ana-${token}@test.com`,
    name: `User ${token}`,
    password: PASSWORD,
  };

  const res = await request.post("/api/auth/register", {
    data: {
      email: user.email,
      name: user.name,
      password: user.password,
    },
  });

  expect(res.status(), `register failed: ${await res.text()}`).toBe(200);
  return user;
}

test.describe("Analytics Page E2E", () => {
  test("displays empty state and correct labels for new user", async ({ page, request }) => {
    const user = await createUser(request);

    // Use the API login to bypass UI
    const csrfResponse = await request.get("/api/auth/csrf");
    expect(csrfResponse.ok(), `csrf fetch failed: ${await csrfResponse.text()}`).toBeTruthy();
    const csrfJson = (await csrfResponse.json()) as { csrfToken?: string };
    
    const signInResponse = await request.post("/api/auth/callback/credentials", {
      form: {
        csrfToken: csrfJson.csrfToken ?? "",
        email: user.email,
        password: user.password,
        callbackUrl: "/analytics",
        redirect: "false",
        json: "true",
      },
      headers: {
        "X-Auth-Return-Redirect": "1",
      },
    });

    const cookieHeaders = signInResponse.headersArray().filter((header) => header.name.toLowerCase() === "set-cookie");
    const cookiesToSet = cookieHeaders.map((header) => {
      const raw = header.value;
      const parts = raw.split(";");
      const [nameValue] = parts;
      const [name, ...valueParts] = nameValue.split("=");
      const value = valueParts.join("=");

      return {
        name: name.trim(),
        value: value.trim(),
        domain: "127.0.0.1",
        path: "/",
        sameSite: "Lax" as const,
      };
    });

    await page.context().addCookies(cookiesToSet);

    // Go to analytics page
    await page.goto("/analytics");
    
    // Wait for the data overview title
    await page.waitForSelector('h1:has-text("数据概览")');

    // Wait until there's either empty state or data
    await expect(async () => {
      const empty = await page.getByText("暂无分析数据").isVisible();
      const weekly = await page.getByText("连续学习天数").isVisible();
      const monthly = await page.getByText("总词量").isVisible();
      expect(empty || weekly || monthly).toBe(true);
    }).toPass({ timeout: 15_000 });

    // Switch to Monthly Report
    await page.click('button:has-text("月度报告")');
    
    await expect(async () => {
      const empty = await page.getByText("暂无分析数据").isVisible();
      const monthly = await page.getByText("总词量").isVisible();
      expect(empty || monthly).toBe(true);
    }).toPass({ timeout: 15_000 });

    await expect(page.getByRole("button", { name: "月度报告" })).toBeVisible();

    // Verify old labels are gone
    await expect(page.getByText("事件总数")).toBeHidden();
    await expect(page.getByText("快照总数")).toBeHidden();
  });
});
