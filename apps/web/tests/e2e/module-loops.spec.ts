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
  const token = uniqueValue("e2e-user");
  const user: AuthUser = {
    email: `${token}@test.com`,
    name: `E2E ${token}`,
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

  await page.goto(`/login?callbackUrl=${encodeURIComponent(callbackPath)}`);
  await page.getByPlaceholder("your@email.com").fill(user.email);
  await page.getByPlaceholder("••••••••").fill(user.password);
  await page.locator("form").getByRole("button", { name: "登录" }).click();

  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 30_000 });
  await page.waitForFunction(() => Boolean(localStorage.getItem("edunexus_current_user")));

  return user;
}

async function seedPracticeBank(page: Page, bankId: string, bankName: string) {
  await page.evaluate(
    async ({ bankId: targetBankId, bankName: targetBankName }) => {
      const snapshotRaw = localStorage.getItem("edunexus_current_user");
      if (!snapshotRaw) {
        throw new Error("missing client user snapshot");
      }

      const snapshot = JSON.parse(snapshotRaw) as { id?: string; email?: string };
      const userIdentity = snapshot.id ?? snapshot.email;
      if (!userIdentity) {
        throw new Error("missing user identity");
      }

      const dbName = `EduNexusPractice_${userIdentity}`;
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(dbName, 1);
        request.onerror = () => reject(request.error);
        request.onupgradeneeded = () => {
          const database = request.result;

          if (!database.objectStoreNames.contains("question_banks")) {
            const bankStore = database.createObjectStore("question_banks", { keyPath: "id" });
            bankStore.createIndex("name", "name", { unique: false });
            bankStore.createIndex("updatedAt", "updatedAt", { unique: false });
          }

          if (!database.objectStoreNames.contains("questions")) {
            const questionStore = database.createObjectStore("questions", { keyPath: "id" });
            questionStore.createIndex("bankId", "bankId", { unique: false });
            questionStore.createIndex("type", "type", { unique: false });
            questionStore.createIndex("difficulty", "difficulty", { unique: false });
            questionStore.createIndex("status", "status", { unique: false });
            questionStore.createIndex("updatedAt", "updatedAt", { unique: false });
          }

          if (!database.objectStoreNames.contains("practice_records")) {
            const recordStore = database.createObjectStore("practice_records", { keyPath: "id" });
            recordStore.createIndex("questionId", "questionId", { unique: false });
            recordStore.createIndex("bankId", "bankId", { unique: false });
            recordStore.createIndex("createdAt", "createdAt", { unique: false });
          }

          if (!database.objectStoreNames.contains("wrong_questions")) {
            const wrongStore = database.createObjectStore("wrong_questions", { keyPath: "id" });
            wrongStore.createIndex("questionId", "questionId", { unique: false });
            wrongStore.createIndex("bankId", "bankId", { unique: false });
            wrongStore.createIndex("isMastered", "isMastered", { unique: false });
            wrongStore.createIndex("lastWrongAt", "lastWrongAt", { unique: false });
          }
        };
        request.onsuccess = () => resolve(request.result);
      });

      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(["question_banks", "questions"], "readwrite");
        const bankStore = tx.objectStore("question_banks");
        const questionStore = tx.objectStore("questions");
        const now = new Date().toISOString();

        bankStore.put({
          id: targetBankId,
          name: targetBankName,
          description: "Playwright practice bank",
          tags: ["e2e", "practice"],
          createdAt: now,
          updatedAt: now,
          questionCount: 2,
        });

        questionStore.put({
          id: `${targetBankId}-question-1`,
          bankId: targetBankId,
          type: "multiple_choice",
          title: "2 + 2 = ?",
          content: "请选择正确答案",
          difficulty: "easy",
          status: "active",
          tags: ["math"],
          points: 5,
          options: [
            { id: "option-3", text: "3", isCorrect: false },
            { id: "option-4", text: "4", isCorrect: true },
            { id: "option-5", text: "5", isCorrect: false },
          ],
          createdAt: now,
          updatedAt: now,
        });

        questionStore.put({
          id: `${targetBankId}-question-2`,
          bankId: targetBankId,
          type: "multiple_choice",
          title: "3 + 3 = ?",
          content: "请选择正确答案",
          difficulty: "easy",
          status: "active",
          tags: ["math"],
          points: 5,
          options: [
            { id: "option-5", text: "5", isCorrect: false },
            { id: "option-6", text: "6", isCorrect: true },
            { id: "option-7", text: "7", isCorrect: false },
          ],
          createdAt: now,
          updatedAt: now,
        });

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });

      db.close();
    },
    { bankId, bankName }
  );
}

test("practice module loop is browser-verifiable", async ({ page, request }) => {
  const bankId = uniqueValue("practice-bank");
  const bankName = uniqueValue("Practice题库");

  await loginAsFreshUser(page, request, "/practice");
  await seedPracticeBank(page, bankId, bankName);

  await page.goto("/practice");
  await expect(page.getByRole("heading", { name: "题库练习" })).toBeVisible();
  await expect(page.getByText(bankName)).toBeVisible();

  await page.goto(`/practice/${bankId}`);
  await expect(page.getByText(/\?\s*$/)).toBeVisible();
  
  const textContent = await page.textContent('body');
  if (textContent?.includes("2 + 2 = ?")) {
    await page.getByLabel("4").click();
  } else {
    await page.getByLabel("6").click();
  }
  
  await page.getByRole("button", { name: "下一题" }).click();
  
  await expect(page.getByText("进度: 2 / 2")).toBeVisible();
  
  await page.reload();
  
  await expect(page.getByText("进度: 2 / 2")).toBeVisible();
  
  const secondTextContent = await page.textContent('body');
  if (secondTextContent?.includes("2 + 2 = ?")) {
    await page.getByLabel("4").click();
  } else {
    await page.getByLabel("6").click();
  }

  await page.getByRole("button", { name: "完成提交" }).click();
  await expect(page.getByRole("heading", { name: "练习完成" })).toBeVisible();
});

test("goals module loop is browser-verifiable", async ({ page, request }) => {
  const goalTitle = uniqueValue("Playwright Goal");

  await loginAsFreshUser(page, request, "/goals");
  await expect(page.getByRole("heading", { name: "目标管理" })).toBeVisible();

  await page.getByRole("button", { name: "创建目标" }).first().click();
  await page.locator("#title").fill(goalTitle);

  await page.getByRole("button", { name: /下一步/ }).click();
  await expect(page.getByText("步骤 2 / 4")).toBeVisible();

  await page.getByRole("button", { name: /下一步/ }).click();
  await expect(page.getByText("步骤 3 / 4")).toBeVisible();

  await page.getByRole("button", { name: /下一步/ }).click();
  await expect(page.getByText("步骤 4 / 4")).toBeVisible();

  await page.locator("#endDate").fill("2030-12-31");
  await page.getByRole("button", { name: "创建目标" }).click();

  await expect(page.getByText(goalTitle)).toBeVisible();
});

test("analytics module loop is browser-verifiable", async ({ page, request }) => {
  await loginAsFreshUser(page, request, "/analytics");

  await expect(page.getByRole("heading", { name: "数据概览" })).toBeVisible();
  await expect(page.getByText("分析洞察", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "月度报告" }).click();
  await expect(page.getByText(/暂无月度数据|月度事件总数/)).toBeVisible();
});

test("community module loop is browser-verifiable", async ({ page, request }) => {
  const postTitle = uniqueValue("Community Post");
  const comment = uniqueValue("Community comment");

  await loginAsFreshUser(page, request, "/community");

  await expect(page.getByRole("heading", { name: "学习社区" })).toBeVisible();
  await page.getByRole("button", { name: "发布动态" }).click();

  await page.locator("#title").fill(postTitle);
  await page.locator("#content").fill("This is a deterministic community e2e post.");
  await page.getByRole("button", { name: "发布" }).click();

  await expect(page.getByText(postTitle)).toBeVisible();
  await page.getByRole("link", { name: postTitle }).first().click();
  await expect(page).toHaveURL(/\/community\/posts\/.+/);
  await expect(page.getByText(postTitle, { exact: true })).toBeVisible();

  await page.getByPlaceholder("写下你的评论...").fill(comment);
  await page.getByRole("button", { name: "发表评论" }).click();
  await expect(page.getByText(comment)).toBeVisible();
});

test("groups module loop is browser-verifiable", async ({ page, request }) => {
  const groupName = uniqueValue("Group");
  const postTitle = uniqueValue("Group Post");

  await loginAsFreshUser(page, request, "/groups");

  await expect(page.getByRole("heading", { name: "学习小组" })).toBeVisible();
  await page.getByRole("button", { name: "创建小组" }).first().click();

  await page.locator("#name").fill(groupName);
  await page.locator("#description").fill("Playwright group flow test");
  await page.locator("form").getByRole("button", { name: "创建小组" }).click();

  await expect(page).toHaveURL(/\/groups\/.+/);
  await expect(page.getByRole("heading", { name: groupName })).toBeVisible();

  await page.getByPlaceholder("帖子标题").fill(postTitle);
  await page.getByPlaceholder("帖子内容").fill("Group post from e2e");
  await page.getByRole("button", { name: "发布帖子" }).click();
  await expect(page.getByText(postTitle)).toBeVisible();

  const createResourceRes = await page.request.post("/api/resources", {
    data: {
      title: uniqueValue("Group Resource"),
      description: "Resource used for group sharing flow",
    },
  });
  expect(createResourceRes.status()).toBe(200);
  const createResourceJson = (await createResourceRes.json()) as {
    success: boolean;
    data?: { resource?: { id?: string } };
  };
  const resourceId = createResourceJson.data?.resource?.id;
  expect(resourceId).toBeTruthy();

  await page.getByPlaceholder("输入资源 ID").fill(resourceId ?? "");
  await page.getByRole("button", { name: "分享" }).click();
  await expect(page.getByRole("link", { name: `资源 ${resourceId}` })).toBeVisible();

  const taskTitle = uniqueValue("Group Task");
  await page.getByPlaceholder("任务标题").fill(taskTitle);
  await page.getByRole("button", { name: "创建任务" }).click();
  await expect(page.getByText(taskTitle)).toBeVisible();
  
  await page.getByRole("button", { name: "标记完成" }).first().click();
  await expect(page.getByRole("button", { name: "标记未完成" }).first()).toBeVisible();
  await expect(page.getByText("状态: done")).toBeVisible();

  const groupUrl = page.url();
  
  const visitorContext = await page.context().browser()?.newContext();
  const visitorPage = await visitorContext?.newPage();
  if (visitorPage) {
    await loginAsFreshUser(visitorPage, visitorPage.request, groupUrl);
    await visitorPage.goto(groupUrl);
    await expect(visitorPage.getByRole("heading", { name: groupName })).toBeVisible();
    await expect(visitorPage.getByText(taskTitle)).toBeVisible();
    await expect(visitorPage.getByRole("button", { name: "标记完成" })).not.toBeVisible();
    await expect(visitorPage.getByRole("button", { name: "标记未完成" })).not.toBeVisible();
    await visitorContext?.close();
  }
});

test("resources module loop is browser-verifiable", async ({ page, request }) => {
  const resourceTitle = uniqueValue("Resource");
  const note = uniqueValue("Resource note");

  await loginAsFreshUser(page, request, "/resources");

  await expect(page.getByRole("heading", { name: "资源中心" })).toBeVisible();
  await page.getByRole("button", { name: "分享资源" }).click();

  await page.locator("#resource-editor-title").fill(resourceTitle);
  await page.locator("#resource-editor-url").fill("https://example.com/resource");
  await page.locator("#resource-editor-description").fill("Resource created by e2e test");
  await page.getByRole("button", { name: "发布资源" }).click();

  await expect(page.getByRole("link", { name: resourceTitle })).toBeVisible();
  await page.getByRole("link", { name: resourceTitle }).first().click();
  await expect(page).toHaveURL(/\/resources\/.+/);
  await expect(page.getByText(resourceTitle)).toBeVisible();

  await page.getByRole("button", { name: "5 星" }).click();
  await page.getByPlaceholder("添加你的学习笔记").fill(note);
  await page.getByRole("button", { name: "保存笔记" }).click();
  await expect(page.getByText(note)).toBeVisible();
});
