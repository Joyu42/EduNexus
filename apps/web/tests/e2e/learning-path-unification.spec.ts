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

async function loginAsFreshUser(
  page: Page,
  request: APIRequestContext,
  callbackPath: string
): Promise<AuthUser> {
  const token = uniqueValue("learning-path-e2e-user");
  const user: AuthUser = {
    email: `${token}@test.com`,
    name: `LP E2E ${token}`,
    password: PASSWORD,
  };

  const registerResponse = await request.post("/api/auth/register", {
    data: {
      email: user.email,
      name: user.name,
      password: user.password,
    },
  });

  expect(registerResponse.status(), `register failed: ${await registerResponse.text()}`).toBe(200);

  await page.goto(`/login?callbackUrl=${encodeURIComponent(callbackPath)}`);
  await page.getByPlaceholder("your@email.com").fill(user.email);
  await page.getByPlaceholder("••••••••").fill(user.password);
  await page.locator("form").getByRole("button", { name: "登录" }).click();

  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 30_000 });
  await page.waitForFunction(() => Boolean(localStorage.getItem("edunexus_current_user")));

  return user;
}

async function getGraphEdgeIds(page: Page) {
  const payload = (await page.evaluate(async () => {
    const response = await fetch("/api/graph/view", { credentials: "include" });
    if (!response.ok) {
      throw new Error(`graph view fetch failed: ${response.status}`);
    }

    return response.json();
  })) as {
    data?: { edges?: Array<{ edgeId?: string; source: string; target: string }> };
    edges?: Array<{ edgeId?: string; source: string; target: string }>;
  };

  const edges = payload.data?.edges ?? payload.edges ?? [];
  return edges.map((edge) => edge.edgeId ?? `${edge.source}->${edge.target}`);
}

test("learning path creation flows preserve graph edges on refresh", async ({ page, request }) => {
  const workspaceTopic = uniqueValue("Java");
  const evidencePath = ".sisyphus/evidence/task-9-e2e-parity.png";
  const workspacePackId = "lp-workspace-1";
  const workspaceSessionId = "ws-learning-path-1";
  const now = () => new Date().toISOString();
  const workspaceSessionStore = new Map<string, {
    id: string;
    title: string;
    userId: string;
    createdAt: string;
    updatedAt: string;
    lastLevel: number;
    messages: Array<{
      role: "user" | "assistant" | "system";
      content: string;
      createdAt: string;
      learningPack?: {
        packId: string;
        title: string;
        topic: string;
        graphUrl: string;
      };
    }>;
  }>();
  const graphViewPayload = {
    packId: workspacePackId,
    nodes: [
      {
        id: "lp-node-1",
        label: "基础概念",
        domain: "general",
        mastery: 0.35,
        masteryStage: "understood",
        needsReview: false,
        pathMemberships: [],
        category: "general",
        kbDocumentId: "doc-linked-1",
      },
    ],
    edges: [
      {
        edgeId: "lp-edge-1",
        source: "lp-node-1",
        target: "lp-node-1",
        weight: 0.5,
      },
    ],
  };

  await page.route("**/api/kb/docs", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      json: {
        success: true,
        data: {
          documents: [],
        },
      },
    });
  });

  await page.route("**/api/workspace/session", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }

    const createdAt = now();
    workspaceSessionStore.set(workspaceSessionId, {
      id: workspaceSessionId,
      title: "新对话",
      userId: "user-1",
      createdAt,
      updatedAt: createdAt,
      lastLevel: 1,
      messages: [],
    });

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      json: {
        success: true,
        data: {
          session: {
            id: workspaceSessionId,
            title: "新对话",
            userId: "user-1",
            createdAt,
            updatedAt: createdAt,
            lastLevel: 1,
            messages: [],
          },
        },
      },
    });
  });

  await page.route("**/api/workspace/sessions**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      json: {
        success: true,
        data: {
          sessions: Array.from(workspaceSessionStore.values()).map((session) => ({
            id: session.id,
            title: session.title,
            createdAt: session.createdAt,
            updatedAt: session.updatedAt,
            lastLevel: session.lastLevel,
            messageCount: session.messages.length,
          })),
        },
      },
    });
  });

  await page.route("**/api/workspace/session/**", async (route) => {
    const url = new URL(route.request().url());
    const sessionId = url.pathname.split("/")[4] ?? workspaceSessionId;
    const session = workspaceSessionStore.get(sessionId);

    if (!session) {
      await route.fulfill({
        status: 404,
        contentType: "application/json",
        json: { success: false, error: "Session not found" },
      });
      return;
    }

    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        json: {
          success: true,
          data: session,
        },
      });
      return;
    }

    if (route.request().method() === "POST" && url.pathname.endsWith("/messages")) {
      const body = JSON.parse(route.request().postData() || "{}") as {
        role: "user" | "assistant" | "system";
        content: string;
        learningPack?: {
          packId: string;
          title: string;
          topic: string;
          graphUrl: string;
        };
      };

      session.messages.push({
        role: body.role,
        content: body.content,
        createdAt: now(),
        ...(body.learningPack ? { learningPack: body.learningPack } : {}),
      });
      session.updatedAt = now();

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        json: {
          success: true,
          data: {
            session: {
              id: session.id,
              updatedAt: session.updatedAt,
              messageCount: session.messages.length,
            },
          },
        },
      });
      return;
    }

    await route.continue();
  });

  await page.route("**/api/workspace/agent/chat", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      json: {
        success: true,
        response: `已为你生成「${workspaceTopic} 学习路线图」`,
        learningPack: {
          packId: workspacePackId,
          title: `${workspaceTopic} 学习路线图`,
          topic: workspaceTopic.toLowerCase(),
          graphUrl: `/graph?view=path&packId=${workspacePackId}`,
        },
      },
    });
  });

  await page.route("**/api/graph/view**", async (route) => {
    const url = new URL(route.request().url());
    const packId = url.searchParams.get("packId") ?? graphViewPayload.packId;

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      json: {
        ...graphViewPayload,
        packId,
      },
    });
  });

  await page.route("**/api/path/focus/feedback", async (route) => {
    if (route.request().method() !== "POST") {
      await route.abort();
      return;
    }

    const body = route.request().postDataJSON() as {
      planId?: string;
      taskId?: string;
      nodeId?: string;
      nodeLabel?: string;
      relatedNodes?: string[];
      quality?: "light" | "solid" | "deep";
    };

    expect(body).toMatchObject({
      taskId: workspacePackId,
      nodeId: workspacePackId,
      nodeLabel: workspacePackId,
      relatedNodes: [],
      quality: expect.stringMatching(/^(light|solid|deep)$/),
    });

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      json: {
        success: true,
        data: {
          nodeId: workspacePackId,
          mastery: 0.45,
          risk: 0.4,
          planId: workspacePackId,
          taskId: workspacePackId,
        },
      },
    });
  });

  await loginAsFreshUser(page, request, "/workspace");

  await page.goto("/workspace", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "学习工作区" })).toBeVisible();

  const chatInput = page.locator("textarea").first();
  await chatInput.fill(`我想学习 ${workspaceTopic}`);
  await Promise.all([
    page.waitForResponse((response) => response.url().includes("/api/workspace/agent/chat") && response.ok()),
    chatInput.press("Enter"),
  ]);

  const openPackButton = page.getByRole("button", { name: /进入 .*学习路线图/ }).last();
  await expect(openPackButton).toBeVisible({ timeout: 60_000 });
  await openPackButton.evaluate((button) => {
    (button as HTMLButtonElement).click();
  });
  await expect.poll(() => page.url(), { timeout: 60_000 }).toContain("/graph?view=path&packId=");

  await page.goto("/graph", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("graph-workspace")).toBeVisible({ timeout: 60_000 });

  const initialEdgeIds = await getGraphEdgeIds(page);
  expect(initialEdgeIds.length).toBeGreaterThan(0);

  await page.route("**/api/path/ai-generate", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      json: {
        nodes: [
          {
            id: "start",
            type: "default",
            position: { x: 400, y: 0 },
            data: {
              label: "开始学习",
              description: "欢迎开始学习之旅",
              type: "start",
              estimatedTime: 5,
              difficulty: "beginner",
              status: "not_started",
            },
          },
          {
            id: "node-1",
            type: "default",
            position: { x: 400, y: 180 },
            data: {
              label: "基础概念",
              description: "学习核心概念和术语",
              type: "document",
              estimatedTime: 30,
              difficulty: "beginner",
              status: "not_started",
            },
          },
          {
            id: "node-2",
            type: "default",
            position: { x: 650, y: 360 },
            data: {
              label: "实践练习",
              description: "动手完成一个最小练习",
              type: "practice",
              estimatedTime: 45,
              difficulty: "intermediate",
              status: "not_started",
            },
          },
        ],
        edges: [
          {
            id: "e-start-1",
            source: "start",
            target: "node-1",
            animated: true,
            style: { stroke: "#6366f1", strokeWidth: 2 },
            type: "smoothstep",
          },
          {
            id: "e-1-2",
            source: "node-1",
            target: "node-2",
            animated: true,
            style: { stroke: "#6366f1", strokeWidth: 2 },
            type: "smoothstep",
          },
        ],
      },
    });
  });

  await page.goto("/path/new-editor", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "学习路径编辑器" })).toBeVisible();
  await page.getByRole("button", { name: "AI 生成" }).click();
  await page.getByLabel("学习目标").fill(`为 ${workspaceTopic} 生成一条可保存的学习路径`);
  await page.getByRole("button", { name: "生成路径" }).click();
  await expect(page.getByRole("button", { name: "保存路径" })).toBeVisible({ timeout: 60_000 });
  await page.getByRole("button", { name: "保存路径" }).click();
  await expect(page).toHaveURL(/\/path\?selected=/, { timeout: 60_000 });

  await page.goto("/graph", { waitUntil: "domcontentloaded" });
  await Promise.all([
    page.waitForResponse((response) => response.url().includes("/api/graph/view") && response.ok()),
    page.reload({ waitUntil: "domcontentloaded" }),
  ]);
  await expect(page.getByTestId("graph-workspace")).toBeVisible({ timeout: 60_000 });

  const refreshedEdgeIds = await getGraphEdgeIds(page);
  expect(refreshedEdgeIds).toEqual(expect.arrayContaining(initialEdgeIds));

  await page.screenshot({ path: evidencePath, fullPage: true });
});
