import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const PASSWORD = "playwright_pass_123";

type AuthUser = {
  email: string;
  name: string;
  password: string;
};

function uniqueValue(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function createUser(request: APIRequestContext): Promise<AuthUser> {
  const token = uniqueValue("kb-e2e-user");
  const user: AuthUser = {
    email: `${token}@test.com`,
    name: `KB E2E ${token}`,
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

async function loginAsFreshUser(page: Page, request: APIRequestContext, callbackPath: string): Promise<AuthUser> {
  const user = await createUser(request);

  const csrfResponse = await request.get("/api/auth/csrf");
  expect(csrfResponse.ok(), `csrf fetch failed: ${await csrfResponse.text()}`).toBeTruthy();
  const csrfJson = (await csrfResponse.json()) as { csrfToken?: string };
  expect(csrfJson.csrfToken).toBeTruthy();

  const signInResponse = await request.post("/api/auth/callback/credentials", {
    form: {
      csrfToken: csrfJson.csrfToken ?? "",
      email: user.email,
      password: user.password,
      callbackUrl: callbackPath,
      redirect: "false",
      json: "true",
    },
    headers: {
      "X-Auth-Return-Redirect": "1",
    },
  });

  expect(signInResponse.ok() || signInResponse.status() === 302).toBeTruthy();

  const cookieHeaders = signInResponse.headersArray().filter((header) => header.name.toLowerCase() === "set-cookie");
  expect(cookieHeaders.length).toBeGreaterThan(0);

  const cookies = cookieHeaders.map((header) => {
    const [nameValue] = header.value.split(";");
    const equalsIndex = nameValue.indexOf("=");
    return {
      name: nameValue.slice(0, equalsIndex),
      value: nameValue.slice(equalsIndex + 1),
      path: "/",
      domain: "127.0.0.1",
      httpOnly: true,
      secure: false,
      sameSite: "Lax" as const,
    };
  });

  await page.context().addCookies(cookies);
  await page.context().addInitScript((snapshot) => {
    localStorage.setItem("edunexus_current_user", JSON.stringify(snapshot));
  }, { id: user.email, email: user.email, isDemo: false });

  return user;
}

async function ensureEditorReady(page: Page) {
  await expect(page.getByRole("main")).toBeVisible({ timeout: 30_000 });

  const createFirstDocButton = page.getByTestId("kb-empty-create-first-document");
  if (await createFirstDocButton.count()) {
    await createFirstDocButton.click();
  }

  const welcomeDoc = page.locator("div.cursor-pointer").filter({ hasText: "开始构建你的知识宝库" }).first();
  await expect(welcomeDoc).toBeVisible({ timeout: 30_000 });
  await welcomeDoc.click();

  await expect(page.getByRole("textbox", { name: "Markdown source" })).toBeVisible({ timeout: 30_000 });
}

async function reopenDocumentFromSidebar(page: Page, title: string) {
  const documentItem = page.locator("div.cursor-pointer").filter({ hasText: title }).first();
  await expect(documentItem).toBeVisible({ timeout: 30_000 });
  await documentItem.click();
  await expect(page.getByRole("textbox", { name: "Markdown source" })).toBeVisible({ timeout: 30_000 });
}

test("kb markdown editing happy path", async ({ page, request }) => {
  await loginAsFreshUser(page, request, "/kb");
  await page.goto("/kb");
  await ensureEditorReady(page);

  const sourceButton = page.getByRole("button", { name: "源码" });
  const renderButton = page.getByRole("button", { name: "渲染" });
  const textarea = page.getByRole("textbox", { name: "Markdown source" });

  await sourceButton.click();
  await textarea.fill("# KB E2E\n\n- a\n- b");
  await renderButton.click();

  await expect(page.getByRole("heading", { name: "KB E2E" })).toBeVisible();
  const list = page.getByRole("list");
  await expect(list).toBeVisible();
  await expect(list).toContainText("a");
  await expect(list).toContainText("b");
  await expect(textarea).not.toBeVisible();
});

test("kb markdown editing handles malformed markdown safely", async ({ page, request }) => {
  await loginAsFreshUser(page, request, "/kb");
  await page.goto("/kb");
  await ensureEditorReady(page);

  const sourceButton = page.getByRole("button", { name: "源码" });
  const renderButton = page.getByRole("button", { name: "渲染" });
  const textarea = page.getByRole("textbox", { name: "Markdown source" });

  await sourceButton.click();
  await textarea.fill("**未闭合");
  await renderButton.click();

  await expect(page.getByText("**未闭合")).toBeVisible();
  await expect(page.getByRole("button", { name: "渲染" })).toBeVisible();
});

test("kb outline follows live markdown and jumps via rendered anchors", async ({ page, request }) => {
  await loginAsFreshUser(page, request, "/kb");
  await page.goto("/kb");
  await ensureEditorReady(page);

  const sourceButton = page.getByRole("button", { name: "源码" });
  const renderButton = page.getByRole("button", { name: "渲染" });
  const textarea = page.getByRole("textbox", { name: "Markdown source" });

  await sourceButton.click();
  await textarea.fill("# Live Title\n\n## Live Child");

  await expect(page.getByRole("button", { name: "Live Title" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Live Child" })).toBeVisible();

  await page.getByRole("button", { name: "Live Child" }).click();
  await expect(renderButton).toBeVisible();
  await expect(page.getByRole("button", { name: "渲染" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Live Child" })).toBeVisible();
});

test("kb right panel shows only outline and summary, and summary has correct handoff CTA", async ({ page, request }) => {
  await loginAsFreshUser(page, request, "/kb");
  await page.goto("/kb");
  await ensureEditorReady(page);

  // Check tabs in right panel
  await expect(page.getByRole("tab", { name: "大纲" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "摘要" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "属性" })).toBeHidden();
  await expect(page.getByRole("tab", { name: "AI" })).toBeHidden();

  // Click Summary tab
  await page.getByRole("tab", { name: "摘要" }).click();

  // Check AI Summary content
  await expect(page.getByText("AI 智能摘要")).toBeVisible();
  
  // Assert MindMap is gone
  await expect(page.getByText("AI 思维导图")).toBeHidden();

  // Check the CTA button
  const ctaButton = page.getByRole("button", { name: /去学习工作区继续提问与总结/ });
  await expect(ctaButton).toBeVisible();

  // Click CTA and verify navigation initiates (intercepting or checking URL)
  await ctaButton.evaluate((button) => (button as HTMLButtonElement).click());
  await expect(page).toHaveURL(/\/workspace/, { timeout: 30_000 });
});

test("kb autosave keeps source edits and preserves outline navigation", async ({ page, request }) => {
  await loginAsFreshUser(page, request, "/kb");
  await page.goto("/kb");
  await ensureEditorReady(page);

  const sourceButton = page.getByRole("button", { name: "源码" });
  const textarea = page.getByRole("textbox", { name: "Markdown source" });

  await sourceButton.click();
  await textarea.fill("# Autosave Title\n\n## Outline Child\n\nDraft body");

  await expect(page.getByText("已保存")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("button", { name: "Autosave Title" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Outline Child" })).toBeVisible();

  await page.reload();
  await reopenDocumentFromSidebar(page, "开始构建你的知识宝库");

  await expect(textarea).toHaveValue("# Autosave Title\n\n## Outline Child\n\nDraft body");

  await page.getByRole("button", { name: "Outline Child" }).click();
  await expect(page.getByRole("heading", { name: "Outline Child" })).toBeVisible();
  await expect(page.getByText("Draft body")).toBeVisible();
});
