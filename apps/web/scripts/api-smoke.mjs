import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";

const DEFAULT_PORT = 3210;
const parsedPort = Number(process.env.EDUNEXUS_SMOKE_PORT ?? DEFAULT_PORT);
const PREFERRED_PORT =
  Number.isInteger(parsedPort) && parsedPort > 0 && parsedPort <= 65535
    ? parsedPort
    : DEFAULT_PORT;

function getNextDevSpawn(port) {
  if (process.platform === "win32") {
    return {
      command: "cmd.exe",
      args: [
        "/d",
        "/s",
        "/c",
        `pnpm exec next dev --port ${String(port)}`
      ]
    };
  }
  return {
    command: "pnpm",
    args: ["exec", "next", "dev", "--port", String(port)]
  };
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    // Do not pin host here; Windows may report 127.0.0.1 free while :: is occupied.
    server.listen(port);
  });
}

async function findRandomAvailablePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.once("listening", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close(() => reject(new Error("无法分配可用端口")));
        return;
      }
      const port = address.port;
      server.close(() => resolve(port));
    });
    server.listen(0);
  });
}

async function resolveSmokePort(preferredPort) {
  const preferredAvailable = await isPortAvailable(preferredPort);
  if (preferredAvailable) {
    return preferredPort;
  }
  return findRandomAvailablePort();
}

async function waitForServerReady(url, timeoutMs = 90_000) {
  const start = Date.now();
  let lastError = null;
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status >= 400) {
        return;
      }
    } catch (error) {
      lastError = error;
    }
    await sleep(1000);
  }
  throw new Error(`开发服务器启动超时：${String(lastError)}`);
}

async function killProcessTree(child) {
  if (!child.pid) return;
  if (process.platform === "win32") {
    await new Promise((resolve) => {
      const killer = spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
        stdio: "ignore"
      });
      killer.on("exit", () => resolve());
    });
    return;
  }
  child.kill("SIGTERM");
}

function requestJson(baseUrl, pathname, init) {
  return fetch(`${baseUrl}${pathname}`, init);
}

async function createSandbox() {
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "edunexus-smoke-"));
  const vaultDir = path.join(rootDir, "vault");
  const dataDir = path.join(rootDir, ".edunexus", "data");

  await Promise.all([
    fs.mkdir(path.join(vaultDir, "notes"), { recursive: true }),
    fs.mkdir(path.join(vaultDir, "sources"), { recursive: true }),
    fs.mkdir(path.join(vaultDir, "playbooks"), { recursive: true }),
    fs.mkdir(path.join(vaultDir, "skills"), { recursive: true }),
    fs.mkdir(path.join(vaultDir, "daily"), { recursive: true }),
    fs.mkdir(dataDir, { recursive: true })
  ]);

  const note = [
    "---",
    "id: note_smoke_seq",
    "title: 数列复盘测试",
    "type: note",
    "domain: math",
    "tags: [数列, 复盘]",
    "links: [source_smoke_math]",
    "source_refs: [book]",
    "owner: smoke",
    "---",
    "",
    "等差数列题目先写条件，再列目标量，最后检验结果。"
  ].join("\n");

  const source = [
    "---",
    "id: source_smoke_math",
    "title: 数学教材节选",
    "type: source",
    "domain: math",
    "tags: [教材]",
    "links: []",
    "source_refs: [book]",
    "owner: smoke",
    "---",
    "",
    "教材强调步骤完整性，避免只写结论。"
  ].join("\n");

  await Promise.all([
    fs.writeFile(path.join(vaultDir, "notes", "note_smoke_seq.md"), note, "utf8"),
    fs.writeFile(path.join(vaultDir, "sources", "source_smoke_math.md"), source, "utf8")
  ]);

  return { rootDir, vaultDir, dataDir };
}

async function main() {
  const port = await resolveSmokePort(PREFERRED_PORT);
  const baseUrl = `http://127.0.0.1:${port}`;
  const sandbox = await createSandbox();
  const env = {
    ...process.env,
    EDUNEXUS_VAULT_DIR: sandbox.vaultDir,
    EDUNEXUS_DATA_DIR: sandbox.dataDir,
    PORT: String(port)
  };
  const nextDev = getNextDevSpawn(port);

  const cwd = process.cwd();
  const child = spawn(nextDev.command, nextDev.args, {
    cwd,
    env,
    stdio: ["ignore", "pipe", "pipe"]
  });

  child.stdout?.on("data", (chunk) => process.stdout.write(`[smoke:dev] ${chunk}`));
  child.stderr?.on("data", (chunk) => process.stderr.write(`[smoke:dev] ${chunk}`));

  try {
    await waitForServerReady(`${baseUrl}/api/kb/tags`);

    const createRes = await requestJson(baseUrl, "/api/workspace/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "冒烟测试会话" })
    });
    assert.equal(createRes.status, 200, "创建会话失败");
    const createJson = await createRes.json();
    const sessionId = createJson.data?.session?.id;
    assert.ok(sessionId, "会话 ID 为空");

    const agentRes = await requestJson(baseUrl, "/api/workspace/agent/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        userInput: "我总是直接套公式，想先复盘条件识别。",
        currentLevel: 1
      })
    });
    assert.equal(agentRes.status, 200, "LangGraph 工作流失败");

    const streamRes = await requestJson(baseUrl, "/api/workspace/agent/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        userInput: "请流式展示一次分步引导。",
        currentLevel: 2
      })
    });
    assert.equal(streamRes.status, 200, "LangGraph 流式工作流失败");
    const streamText = await streamRes.text();
    assert.ok(streamText.includes("\"type\":\"trace\""), "流式结果缺少 trace 事件");
    assert.ok(streamText.includes("\"type\":\"done\""), "流式结果缺少 done 事件");

    const kbRes = await requestJson(baseUrl, "/api/kb/search?q=数列");
    assert.equal(kbRes.status, 200, "知识库检索失败");
    const kbJson = await kbRes.json();
    assert.ok((kbJson.data?.candidates?.length ?? 0) > 0, "知识库未返回候选文档");

    const graphRes = await requestJson(baseUrl, "/api/graph/view");
    assert.equal(graphRes.status, 200, "图谱视图接口失败");
    const graphJson = await graphRes.json();
    const graphNodes = graphJson.data?.nodes ?? [];
    const graphEdges = graphJson.data?.edges ?? [];
    assert.ok(graphNodes.length > 0, "图谱节点为空");
    assert.ok(graphEdges.length > 0, "图谱关系为空");

    const focusNode = graphNodes[0];
    const pathGenerateRes = await requestJson(baseUrl, "/api/path/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        goalType: "exam",
        goal: "一周内完成函数与数列迁移训练",
        days: 7,
        focusNodeId: focusNode?.id,
        focusNodeLabel: focusNode?.label,
        focusNodeRisk: focusNode?.risk,
        relatedNodes: []
      })
    });
    assert.equal(pathGenerateRes.status, 200, "路径生成接口失败");
    const pathGenerateJson = await pathGenerateRes.json();
    const planId = pathGenerateJson.data?.planId;
    const pathTasks = pathGenerateJson.data?.tasks ?? [];
    assert.ok(planId, "路径计划 planId 为空");
    assert.ok(pathTasks.length > 0, "路径计划任务为空");

    const pathReplanRes = await requestJson(baseUrl, "/api/path/replan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        planId,
        reason: "冒烟测试验证重排能力",
        availableHoursPerDay: 1.5
      })
    });
    assert.equal(pathReplanRes.status, 200, "路径重排接口失败");

    const focusTask = pathTasks[0];
    const pathFeedbackRes = await requestJson(baseUrl, "/api/path/focus/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        planId,
        taskId: focusTask?.taskId,
        nodeId: focusNode?.id,
        nodeLabel: focusNode?.label,
        relatedNodes: [],
        quality: "solid"
      })
    });
    assert.equal(pathFeedbackRes.status, 200, "路径焦点反馈接口失败");

    console.log("\n[smoke] API 冒烟测试通过");
  } finally {
    await killProcessTree(child);
    await fs.rm(sandbox.rootDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error("[smoke] 失败：", error);
  process.exitCode = 1;
});
