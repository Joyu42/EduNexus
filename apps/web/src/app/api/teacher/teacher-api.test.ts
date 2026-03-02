import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { GET as listTemplates } from "./lesson-plan/templates/route";
import { POST as generatePlan } from "./lesson-plan/generate/route";

describe("teacher api", () => {
  const previousApiKey = process.env.MODELSCOPE_API_KEY;

  beforeAll(() => {
    delete process.env.MODELSCOPE_API_KEY;
  });

  afterAll(() => {
    if (previousApiKey) {
      process.env.MODELSCOPE_API_KEY = previousApiKey;
    } else {
      delete process.env.MODELSCOPE_API_KEY;
    }
  });

  it("returns subject-aware weakness templates", async () => {
    const res = await listTemplates(
      new Request(
        "http://localhost/api/teacher/lesson-plan/templates?subject=高中数学"
      )
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      data: { subject: string; templates: Array<{ label: string; scope: string }> };
    };
    expect(json.data.subject).toBe("高中数学");
    expect(json.data.templates.length).toBeGreaterThan(0);
    expect(
      json.data.templates.some(
        (item) => item.scope === "数学" || item.scope === "通用"
      )
    ).toBe(true);
  });

  it("can generate fallback lesson plan when ModelScope key is absent", async () => {
    const res = await generatePlan(
      new Request("http://localhost/api/teacher/lesson-plan/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: "高中数学",
          topic: "等差数列求和",
          grade: "高一",
          difficulty: "中等",
          classWeakness: "条件识别能力弱，易直接套公式"
        })
      })
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      data: { title: string; source: string; objectives: string[] };
    };
    expect(json.data.title).toContain("高中数学");
    expect(json.data.objectives.length).toBeGreaterThan(0);
    expect(["rule", "rule_fallback"]).toContain(json.data.source);
  });
});
