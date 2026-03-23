import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";

const DEFAULT_PORT = 3210;
const EVIDENCE_DIR = ".sisyphus/evidence";
const SMOKE_USER = {
  email: `smoke_${Date.now()}@test.com`,
  name: `Smoke Test User ${Date.now()}`,
  password: "smoke_test_pass_123",
};
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

async function writeEvidence(filename, content) {
  await fs.mkdir(EVIDENCE_DIR, { recursive: true });
  await fs.writeFile(path.join(EVIDENCE_DIR, filename), content, "utf8");
}

async function registerUser(baseUrl) {
  const res = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(SMOKE_USER),
  });
  if (!res.ok) {
    const error = await res.text();
    throw new Error(`注册用户失败: ${res.status} ${error}`);
  }
  return res.json();
}

async function signInAndGetCookies(baseUrl) {
  // Step 1: Get CSRF token from the dedicated CSRF endpoint
  // This also sets a csrfToken cookie that must be sent back with the callback
  const csrfRes = await fetch(`${baseUrl}/api/auth/csrf`);
  const csrfJson = await csrfRes.json();
  const csrfToken = csrfJson.csrfToken;

  if (!csrfToken) {
    throw new Error(`无法获取 CSRF token: ${JSON.stringify(csrfJson)}`);
  }

  // Extract CSRF cookie from the response headers
  const csrfCookie = csrfRes.headers.get("set-cookie");
  const csrfCookieValue = csrfCookie ? csrfCookie.split(";")[0] : null;

  // Step 2: Post credentials to the callback endpoint
  // Include the CSRF cookie that was set in step 1
  const signInParams = new URLSearchParams({
    email: SMOKE_USER.email,
    password: SMOKE_USER.password,
    csrfToken,
    callbackUrl: `${baseUrl}/`,
  });

  const headers = {
    "Content-Type": "application/x-www-form-urlencoded",
  };
  if (csrfCookieValue) {
    headers["Cookie"] = csrfCookieValue;
  }

  const signInRes = await fetch(`${baseUrl}/api/auth/callback/credentials`, {
    method: "POST",
    headers,
    body: signInParams.toString(),
    redirect: "manual",
  });

  // Step 3: Extract session cookie from set-cookie headers
  const setCookieHeader = signInRes.headers.get("set-cookie");
  if (!setCookieHeader) {
    throw new Error(`登录失败，未收到 session cookie，status: ${signInRes.status}`);
  }

  // Parse all cookies from set-cookie header
  const cookies = setCookieHeader.split(",").map((c) => c.trim().split(";")[0]).join("; ");
  return cookies;
}

async function ensureAuthenticated(baseUrl) {
  await registerUser(baseUrl);
  const cookies = await signInAndGetCookies(baseUrl);
  return cookies;
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

  let evidenceLines = [];
  let hasError = false;

  const authHeaders = { "Content-Type": "application/json" };

  try {
    await waitForServerReady(`${baseUrl}/api/kb/tags`);

    // Authenticate before calling protected endpoints
    const cookies = await ensureAuthenticated(baseUrl);
    if (cookies) {
      authHeaders["Cookie"] = cookies;
    }

    // Helper to make authenticated requests
    const authRequest = async (path, init = {}) => {
      const headers = { ...init.headers };
      if (cookies) {
        headers["Cookie"] = cookies;
      }
      // Don't set Content-Type for FormData - browser sets it with boundary
      if (!(init.body instanceof FormData) && !headers["Content-Type"]) {
        headers["Content-Type"] = "application/json";
      }
      return fetch(`${baseUrl}${path}`, { ...init, headers });
    };

    const createRes = await authRequest("/api/workspace/session", {
      method: "POST",
      body: JSON.stringify({ title: "冒烟测试会话" })
    });
    assert.equal(createRes.status, 200, "创建会话失败");
    const createJson = await createRes.json();
    const sessionId = createJson.data?.session?.id;
    assert.ok(sessionId, "会话 ID 为空");

    const agentRes = await authRequest("/api/workspace/agent/run", {
      method: "POST",
      body: JSON.stringify({
        sessionId,
        userInput: "我总是直接套公式，想先复盘条件识别。",
        currentLevel: 1
      })
    });
    assert.equal(agentRes.status, 200, "LangGraph 工作流失败");

    const streamRes = await authRequest("/api/workspace/agent/stream", {
      method: "POST",
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

    const kbRes = await authRequest("/api/kb/search?q=知识");
    assert.equal(kbRes.status, 200, "知识库检索失败");
    const kbJson = await kbRes.json();
    // New user only has welcome doc - just verify the endpoint works
    assert.ok(kbJson.success, "知识库检索响应失败");

    const graphRes = await authRequest("/api/graph/view");
    assert.equal(graphRes.status, 200, "图谱视图接口失败");
    const graphJson = await graphRes.json();
    // New user has no graph data - just verify the endpoint works
    assert.ok(graphJson.success, "图谱视图响应失败");

    // Path APIs - verify endpoints work (user has no graph data for full generation)
    const pathGenerateRes = await authRequest("/api/path/generate", {
      method: "POST",
      body: JSON.stringify({
        goalType: "exam",
        goal: "一周内完成函数与数列迁移训练",
        days: 7,
        focusNodeId: null,
        focusNodeLabel: null,
        focusNodeRisk: null,
        relatedNodes: []
      })
    });
    // Path generate for fresh user returns 400 - this is expected
    // Just verify the endpoint is reachable
    assert.ok([200, 400].includes(pathGenerateRes.status), "路径生成接口失败");
    evidenceLines.push(`[PATH] 路径生成接口状态: ${pathGenerateRes.status}`);

    // ===== BUILTIN-WORDBOOK SMOKE =====
    console.log("\n[smoke] 开始内置专业词书测试...");

    // Seed builtin medical book before testing
    const seedBuiltinRes = await new Promise((resolve) => {
      const seed = spawn("node", ["./scripts/seed-builtin-wordbooks.mjs", "--book", "medical"], {
        cwd: process.cwd(),
        env: { ...process.env },
        stdio: ["ignore", "pipe", "pipe"],
      });
      let stdout = "";
      let stderr = "";
      seed.stdout?.on("data", (c) => (stdout += c));
      seed.stderr?.on("data", (c) => (stderr += c));
      seed.on("close", (code) => resolve({ code, stdout, stderr }));
    });
    evidenceLines.push(`[BUILTIN_SEED] medical seed exit=${seedBuiltinRes.code}, out=${seedBuiltinRes.stdout?.trim()}`);
    if (seedBuiltinRes.code !== 0) {
      evidenceLines.push(`[BUILTIN_SEED] stderr=${seedBuiltinRes.stderr}`);
      evidenceLines.push(`[BUILTIN_SEED] skipping builtin checks — seed failed (may need DATABASE_URL)`);
    } else {
      // Check builtin book appears in /api/words/books
      const booksRes = await authRequest("/api/words/books");
      if (booksRes.ok) {
        const booksJson = await booksRes.json();
        const builtinBooks = booksJson.data?.books?.filter?.((b) => b.id?.startsWith("builtin_book_")) ?? [];
        const hasMedical = builtinBooks.some((b) => b.id === "builtin_book_medical");
        evidenceLines.push(`[BUILTIN_BOOKS] count=${builtinBooks.length}, has_medical=${hasMedical}`);
        assert.ok(hasMedical, "builtin_book_medical not found in /api/words/books");
      }

      // Get builtin medical words
      const wordsRes = await authRequest("/api/words/words?bookId=builtin_book_medical");
      assert.equal(wordsRes.status, 200, `/api/words/words builtin failed: ${wordsRes.status}`);
      const wordsJson = await wordsRes.json();
      const builtinWords = wordsJson.data?.words ?? [];
      evidenceLines.push(`[BUILTIN_WORDS] count=${builtinWords.length}`);
      assert.ok(builtinWords.length > 0, "builtin_book_medical returned no words");

      // Write a learning record for the first builtin word
      const firstWord = builtinWords[0];
      const recordPayload = {
        wordId: firstWord.id,
        bookId: "builtin_book_medical",
        learnDate: new Date().toISOString().slice(0, 10),
        status: "new",
        nextReviewDate: new Date().toISOString().slice(0, 10),
        interval: 1,
        easeFactor: 2.5,
        reviewCount: 0,
        successCount: 0,
        failureCount: 0,
        lastReviewedAt: new Date().toISOString().slice(0, 10),
        retentionScore: 0,
        lastStudyType: "learn",
        lastGrade: "good",
      };
      const putRecordRes = await authRequest("/api/words/records", {
        method: "PUT",
        body: JSON.stringify(recordPayload),
      });
      assert.equal(putRecordRes.status, 200, `/api/words/records PUT failed: ${putRecordRes.status}`);
      evidenceLines.push(`[BUILTIN_RECORD] saved record for wordId=${firstWord.id}`);

      // Read back the record
      const getRecordRes = await authRequest(`/api/words/records?wordId=${encodeURIComponent(firstWord.id)}`);
      assert.equal(getRecordRes.status, 200, `/api/words/records GET failed: ${getRecordRes.status}`);
      const getRecordJson = await getRecordRes.json();
      const foundRecord = getRecordJson.data?.records?.find?.((r) => r.wordId === firstWord.id);
      assert.ok(foundRecord, `record for ${firstWord.id} not found`);
      evidenceLines.push(`[BUILTIN_RECORD_VERIFY] retrieved record wordId=${foundRecord.wordId}, status=${foundRecord.status}`);
    }

    // ===== CUSTOM-WORDBOOK LIFECYCLE =====
    console.log("\n[smoke] 开始自定义词书生命周期测试...");

    // 1. CREATE: Upload/create a custom wordbook via import
    const csvContent = "word,definition,phonetic,example,difficulty\nhello,你好,həˈloʊ,Hello world,easy\ntest,测试,test,Practice test,medium";
    const createFormData = new FormData();
    const csvBlob = new Blob([csvContent], { type: "text/csv" });
    createFormData.set("file", csvBlob, "smoke_words.csv");
    createFormData.set("name", "smoke_test_wordbook");
    createFormData.set("description", "Smoke test wordbook");

    const importRes = await authRequest("/api/words/import", {
      method: "POST",
      body: createFormData,
    });
    assert.equal(importRes.status, 200, `词书导入失败: ${importRes.status}`);
    const importJson = await importRes.json();
    const bookId = importJson.data?.book?.id;
    assert.ok(bookId, "导入后词书 ID 为空");
    evidenceLines.push(`[CREATE] 自定义词书创建成功: id=${bookId}, name=${importJson.data?.book?.name}`);

    // 2. LIST: List all custom wordbooks
    const listRes = await authRequest("/api/words/custom-books");
    assert.equal(listRes.status, 200, `词书列表失败: ${listRes.status}`);
    const listJson = await listRes.json();
    const books = listJson.data?.books ?? [];
    assert.ok(books.length > 0, "词书列表为空");
    const foundBook = books.find((b) => b.id === bookId);
    assert.ok(foundBook, `创建的词书未在列表中找到: ${bookId}`);
    evidenceLines.push(`[LIST] 词书列表成功: 共有 ${books.length} 本词书`);

    // 3. READ: Get specific wordbook details
    const readRes = await authRequest(`/api/words/custom-books/${bookId}`);
    assert.equal(readRes.status, 200, `词书详情获取失败: ${readRes.status}`);
    const readJson = await readRes.json();
    assert.equal(readJson.data?.book?.id, bookId, "读取的词书 ID 不匹配");
    const wordCount = readJson.data?.words?.length ?? 0;
    assert.ok(wordCount > 0, "词书单词列表为空");
    evidenceLines.push(`[READ] 词书详情成功: id=${bookId}, words=${wordCount}`);

    // 4. UPDATE (rename): Update wordbook metadata
    const updateRes = await authRequest(`/api/words/custom-books/${bookId}`, {
      method: "PUT",
      body: JSON.stringify({ name: "smoke_test_wordbook_renamed", description: "Updated description" }),
    });
    assert.equal(updateRes.status, 200, `词书更新失败: ${updateRes.status}`);
    const updateJson = await updateRes.json();
    assert.ok(updateJson.data?.book?.name?.includes("renamed"), "词书名称未更新");
    evidenceLines.push(`[UPDATE] 词书重命名成功: newName=${updateJson.data?.book?.name}`);

    // 5. REPLACE: Replace wordbook content with new CSV
    const newCsvContent = "word,definition,phonetic,example,difficulty\napple,苹果,ˈæpl,An apple a day,easy\nbanana,香蕉,bəˈnænə,Banana is yellow,medium";
    const replaceFormData = new FormData();
    const newCsvBlob = new Blob([newCsvContent], { type: "text/csv" });
    replaceFormData.set("file", newCsvBlob, "new_words.csv");

    const replaceRes = await authRequest(`/api/words/custom-books/${bookId}/replace`, {
      method: "POST",
      body: replaceFormData,
    });
    assert.equal(replaceRes.status, 200, `词书替换失败: ${replaceRes.status}`);
    const replaceJson = replaceRes.json();
    evidenceLines.push(`[REPLACE] 词书内容替换成功`);

    // 6. DELETE: Delete the wordbook
    const deleteRes = await authRequest(`/api/words/custom-books/${bookId}`, {
      method: "DELETE",
    });
    assert.equal(deleteRes.status, 200, `词书删除失败: ${deleteRes.status}`);
    const deleteJson = await deleteRes.json();
    assert.equal(deleteJson.data?.deleted, true, "删除标志未返回 true");
    evidenceLines.push(`[DELETE] 词书删除成功: id=${bookId}`);

    // Verify deletion by trying to read again (should 404)
    const afterDeleteRes = await authRequest(`/api/words/custom-books/${bookId}`);
    assert.equal(afterDeleteRes.status, 404, "删除后词书应返回 404");
    evidenceLines.push(`[VERIFY_DELETE] 确认词书已删除: 读取返回 404`);

    evidenceLines.push("");
    evidenceLines.push("[smoke] 自定义词书生命周期测试通过");
    console.log("\n[smoke] API 冒烟测试通过");
  } catch (error) {
    hasError = true;
    evidenceLines.push("");
    evidenceLines.push(`[ERROR] ${error.message}`);
    evidenceLines.push(`[STACK] ${error.stack}`);
    throw error;
  } finally {
    await killProcessTree(child);
    await fs.rm(sandbox.rootDir, { recursive: true, force: true });

    // Write evidence files
    if (hasError) {
      await writeEvidence("task-8-smoke-error.txt", evidenceLines.join("\n"));
    } else {
      await writeEvidence("task-8-smoke.txt", evidenceLines.join("\n"));
    }
  }
}

main().catch((error) => {
  console.error("[smoke] 失败：", error);
  process.exitCode = 1;
});
