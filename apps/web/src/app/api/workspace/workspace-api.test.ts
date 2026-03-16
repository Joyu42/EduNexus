import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanupSandbox,
  createSandbox,
  writeMarkdown
} from "@/tests/test-helpers";

const getCurrentUserId = vi.fn();
const runLangGraphAgent = vi.fn();

vi.mock("@/lib/server/auth-utils", () => ({
  getCurrentUserId,
}));

vi.mock("@/lib/server/langgraph-agent", () => ({
  runLangGraphAgent,
}));

const { POST: createSession } = await import("./session/route");
const { GET: listSessions } = await import("./sessions/route");
const { GET: getSessionDetail } = await import("./session/[id]/route");
const { POST: runAgent } = await import("./agent/run/route");

type Sandbox = Awaited<ReturnType<typeof createSandbox>>;

describe("workspace api", () => {
  let sandbox: Sandbox;

  beforeAll(async () => {
    sandbox = await createSandbox("workspace");
    process.env.EDUNEXUS_VAULT_DIR = sandbox.vaultDir;
    process.env.EDUNEXUS_DATA_DIR = sandbox.dataDir;
    delete process.env.MODELSCOPE_API_KEY;

    await writeMarkdown(
      sandbox.vaultDir,
      "notes/note_session_bootstrap.md",
      [
        "---",
        "id: note_session_bootstrap",
        "title: 数列引导示例",
        "type: note",
        "domain: math",
        "tags: [数列, 复盘]",
        "links: []",
        "source_refs: [textbook]",
        "owner: test",
        "---",
        "",
        "等差数列需要先识别公差与首项，再判断目标量。"
      ].join("\n")
    );
  });

  afterAll(async () => {
    delete process.env.EDUNEXUS_VAULT_DIR;
    delete process.env.EDUNEXUS_DATA_DIR;
    await cleanupSandbox(sandbox.rootDir);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUserId.mockResolvedValue("user-1");
    runLangGraphAgent.mockResolvedValue({
      intent: "coach",
      nextLevel: 2,
      guidance: "先识别题目给出的首项和公差，再决定公式。",
      mode: "rule",
      contextRefs: ["note_session_bootstrap"],
      trace: [{ step: "route" }]
    });
  });

  it("returns 401 for unauthenticated workspace session endpoints", async () => {
    getCurrentUserId.mockResolvedValue(null);

    const [createRes, listRes, detailRes, agentRes] = await Promise.all([
      createSession(
        new Request("http://localhost/api/workspace/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "测试会话" })
        })
      ),
      listSessions(new Request("http://localhost/api/workspace/sessions?q=测试会话")),
      getSessionDetail(new Request("http://localhost"), {
        params: Promise.resolve({ id: "ws_missing" })
      }),
      runAgent(
        new Request("http://localhost/api/workspace/agent/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: "ws_missing",
            userInput: "我想复盘条件识别",
            currentLevel: 1
          })
        })
      )
    ]);

    expect(createRes.status).toBe(401);
    expect(listRes.status).toBe(401);
    expect(detailRes.status).toBe(401);
    expect(agentRes.status).toBe(401);
    expect(runLangGraphAgent).not.toHaveBeenCalled();
  });

  it("creates session, runs agent and persists messages for the authenticated user", async () => {
    const createRes = await createSession(
      new Request("http://localhost/api/workspace/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "测试会话"
        })
      })
    );
    expect(createRes.status).toBe(200);
    const createJson = (await createRes.json()) as {
      data: { session: { id: string } };
    };
    const sessionId = createJson.data.session.id;
    expect(sessionId).toMatch(/^ws_/);

    const agentRes = await runAgent(
      new Request("http://localhost/api/workspace/agent/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          userInput: "我总是会直接套等差数列公式，想先复盘条件识别。",
          currentLevel: 1
        })
      })
    );
    expect(agentRes.status).toBe(200);
    const agentJson = (await agentRes.json()) as {
      data: { mode: string; guidance: string; nextLevel: number };
    };
    expect(agentJson.data.mode).toBe("rule");
    expect(agentJson.data.guidance.length).toBeGreaterThan(0);
    expect(agentJson.data.nextLevel).toBe(2);

    const detailRes = await getSessionDetail(new Request("http://localhost"), {
      params: Promise.resolve({ id: sessionId })
    });
    expect(detailRes.status).toBe(200);
    const detailJson = (await detailRes.json()) as {
      data: { messages: Array<{ role: string; content: string }> };
    };
    const assistantMessages = detailJson.data.messages.filter(
      (item) => item.role === "assistant"
    );
    expect(
      assistantMessages.some((item) => item.content.includes("[LangGraph:rule]"))
    ).toBe(true);

    const listRes = await listSessions(
      new Request("http://localhost/api/workspace/sessions?q=测试会话")
    );
    expect(listRes.status).toBe(200);
    const listJson = (await listRes.json()) as {
      data: { sessions: Array<{ id: string }> };
    };
    expect(listJson.data.sessions.some((item) => item.id === sessionId)).toBe(true);
  });

  it("hides another user's workspace session from detail and list queries", async () => {
    const createRes = await createSession(
      new Request("http://localhost/api/workspace/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "私有会话" })
      })
    );
    expect(createRes.status).toBe(200);
    const createJson = (await createRes.json()) as {
      data: { session: { id: string } };
    };
    const sessionId = createJson.data.session.id;

    getCurrentUserId.mockResolvedValue("user-2");

    const detailRes = await getSessionDetail(new Request("http://localhost"), {
      params: Promise.resolve({ id: sessionId })
    });
    const listRes = await listSessions(
      new Request("http://localhost/api/workspace/sessions?q=私有会话")
    );

    expect(detailRes.status).toBe(404);
    expect(listRes.status).toBe(200);

    const listJson = (await listRes.json()) as {
      data: { sessions: Array<{ id: string }> };
    };
    expect(listJson.data.sessions.some((item) => item.id === sessionId)).toBe(false);
  });
});
