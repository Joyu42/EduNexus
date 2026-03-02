import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { POST as createSession } from "./session/route";
import { GET as listSessions } from "./sessions/route";
import { GET as getSessionDetail } from "./session/[id]/route";
import { POST as runAgent } from "./agent/run/route";
import { POST as streamAgent } from "./agent/stream/route";
import {
  cleanupSandbox,
  createSandbox,
  writeMarkdown
} from "@/tests/test-helpers";

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

  it("can create session, run langgraph agent and persist messages", async () => {
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
    expect(["rule", "langgraph_model"]).toContain(agentJson.data.mode);
    expect(agentJson.data.guidance.length).toBeGreaterThan(0);
    expect(agentJson.data.nextLevel).toBeGreaterThanOrEqual(1);

    const streamRes = await streamAgent(
      new Request("http://localhost/api/workspace/agent/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          userInput: "继续给我分步引导，但请流式展示节点轨迹。",
          currentLevel: 2
        })
      })
    );
    expect(streamRes.status).toBe(200);
    const streamText = await streamRes.text();
    expect(streamText.includes("\"type\":\"trace\"")).toBe(true);
    expect(streamText.includes("\"type\":\"done\"")).toBe(true);

    const detailRes = await getSessionDetail(new Request("http://localhost"), {
      params: { id: sessionId }
    });
    expect(detailRes.status).toBe(200);
    const detailJson = (await detailRes.json()) as {
      data: { messages: Array<{ role: string; content: string }> };
    };
    const assistantMessages = detailJson.data.messages.filter(
      (item) => item.role === "assistant"
    );
    expect(
      assistantMessages.some((item) => item.content.includes("[LangGraph:"))
    ).toBe(true);

    const listRes = await listSessions(
      new Request("http://localhost/api/workspace/sessions?q=测试会话")
    );
    expect(listRes.status).toBe(200);
    const listJson = (await listRes.json()) as {
      data: { sessions: Array<{ id: string }> };
    };
    expect(listJson.data.sessions.some((item) => item.id === sessionId)).toBe(
      true
    );
  });
});
