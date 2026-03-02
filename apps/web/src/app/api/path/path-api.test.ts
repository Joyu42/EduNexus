import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { POST as generatePath } from "./generate/route";
import { POST as feedbackFocus } from "./focus/feedback/route";
import { POST as replanPath } from "./replan/route";
import { cleanupSandbox, createSandbox } from "@/tests/test-helpers";

type Sandbox = Awaited<ReturnType<typeof createSandbox>>;

describe("path api", () => {
  let sandbox: Sandbox;

  beforeAll(async () => {
    sandbox = await createSandbox("path");
    process.env.EDUNEXUS_VAULT_DIR = sandbox.vaultDir;
    process.env.EDUNEXUS_DATA_DIR = sandbox.dataDir;
  });

  afterAll(async () => {
    delete process.env.EDUNEXUS_VAULT_DIR;
    delete process.env.EDUNEXUS_DATA_DIR;
    await cleanupSandbox(sandbox.rootDir);
  });

  it("supports graph focus payload and replans", async () => {
    const generateRes = await generatePath(
      new Request("http://localhost/api/path/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goalType: "exam",
          goal: "针对函数与数列联动进行一周冲刺",
          days: 7,
          focusNodeId: "math_function",
          focusNodeLabel: "函数",
          focusNodeRisk: 0.74,
          relatedNodes: ["数列", "导数"]
        })
      })
    );
    expect(generateRes.status).toBe(200);
    const generateJson = (await generateRes.json()) as {
      data: {
        planId: string;
        tasks: Array<{ taskId: string; title: string; reason: string }>;
      };
    };
    expect(generateJson.data.planId).toMatch(/^plan_/);
    expect(
      generateJson.data.tasks.some((task) => task.title.includes("函数"))
    ).toBe(true);

    const replanRes = await replanPath(
      new Request("http://localhost/api/path/replan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: generateJson.data.planId,
          reason: "本周可学习时间减少",
          availableHoursPerDay: 1.1
        })
      })
    );
    expect(replanRes.status).toBe(200);
    const replanJson = (await replanRes.json()) as {
      data: { tasks: Array<{ reason: string }> };
    };
    expect(
      replanJson.data.tasks.every((task) => task.reason.includes("重排原因"))
    ).toBe(true);

    const feedbackRes = await feedbackFocus(
      new Request("http://localhost/api/path/focus/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: generateJson.data.planId,
          taskId: generateJson.data.tasks[0]?.taskId ?? "task_1",
          nodeId: "math_function",
          nodeLabel: "函数",
          relatedNodes: ["数列"],
          quality: "solid"
        })
      })
    );
    expect(feedbackRes.status).toBe(200);
    const feedbackJson = (await feedbackRes.json()) as {
      data: { nodeId: string; mastery: number; risk: number };
    };
    expect(feedbackJson.data.nodeId).toBe("math_function");
    expect(feedbackJson.data.mastery).toBeGreaterThan(0.35);
    expect(feedbackJson.data.risk).toBeLessThan(0.65);
  });
});
