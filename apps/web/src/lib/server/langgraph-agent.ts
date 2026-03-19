import { END, START, StateGraph } from "@langchain/langgraph";
import { searchDocuments } from "./document-service";
import { buildSocraticGuidance } from "./socratic";
import { getModelscopeClient } from "./modelscope";

type AgentRunInput = {
  sessionId?: string;
  userId: string;
  userInput: string;
  currentLevel?: number;
};

type AgentRunOutput = {
  intent: string;
  nextLevel: number;
  guidance: string;
  contextRefs: string[];
  mode: "rule" | "langgraph_model";
  trace: string[];
};

type AgentStreamEvent =
  | {
      type: "meta";
      value: {
        mode: "rule" | "langgraph_model";
        intent: string;
        nextLevel: number;
        contextRefs: string[];
      };
    }
  | { type: "trace"; value: string }
  | { type: "token"; value: string }
  | { type: "done"; value: AgentRunOutput };

type ModelGuidance = {
  guidance: string;
  nextLevel: number;
};

type GraphState = {
  sessionId: string;
  userId: string;
  userInput: string;
  currentLevel: number;
  intent: string;
  contextSummary: string;
  contextRefs: string[];
  guidance: string;
  nextLevel: number;
  mode: "rule" | "langgraph_model";
  trace: string[];
};

type AgentGraph = {
  invoke(input: {
    sessionId: string;
    userId: string;
    userInput: string;
    currentLevel: number;
  }): Promise<GraphState>;
};

const GRAPH_CHANNELS = {
  sessionId: {
    value: (_left: string, right: string) => right,
    default: () => ""
  },
  userId: {
    value: (_left: string, right: string) => right,
    default: () => ""
  },
  userInput: {
    value: (_left: string, right: string) => right,
    default: () => ""
  },
  currentLevel: {
    value: (_left: number, right: number) => right,
    default: () => 1
  },
  intent: {
    value: (_left: string, right: string) => right,
    default: () => "knowledge_practice"
  },
  contextSummary: {
    value: (_left: string, right: string) => right,
    default: () => ""
  },
  contextRefs: {
    value: (left: string[] = [], right: string[] = []) => left.concat(right),
    default: () => []
  },
  guidance: {
    value: (_left: string, right: string) => right,
    default: () => ""
  },
  nextLevel: {
    value: (_left: number, right: number) => right,
    default: () => 1
  },
  mode: {
    value: (_left: "rule" | "langgraph_model", right: "rule" | "langgraph_model") =>
      right,
    default: () => "rule" as const
  },
  trace: {
    value: (left: string[] = [], right: string[] = []) => left.concat(right),
    default: () => []
  }
};

let compiledGraph: AgentGraph | null = null;

function detectIntent(userInput: string) {
  const normalized = userInput.toLowerCase();
  if (
    normalized.includes("复盘") ||
    normalized.includes("错因") ||
    normalized.includes("错题")
  ) {
    return "error_review";
  }
  if (
    normalized.includes("计划") ||
    normalized.includes("路径") ||
    normalized.includes("安排")
  ) {
    return "path_planning";
  }
  return "knowledge_practice";
}

function safeJsonParseModelResponse(raw: string): ModelGuidance | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  try {
    const parsed = JSON.parse(trimmed) as Partial<ModelGuidance>;
    if (typeof parsed.guidance !== "string") return null;
    const nextLevel =
      typeof parsed.nextLevel === "number" && Number.isFinite(parsed.nextLevel)
        ? Math.max(1, Math.min(4, Math.round(parsed.nextLevel)))
        : 1;
    return {
      guidance: parsed.guidance,
      nextLevel
    };
  } catch {
    return null;
  }
}

function normalizeModelJson(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }
  return trimmed;
}

function splitGuidanceToTokens(text: string) {
  return text
    .split(/(?<=[，。！？；])/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildModelJsonPrompt(input: {
  intent: string;
  userInput: string;
  currentLevel: number;
  contextSummary: string;
}) {
  return [
    "你是 EduNexus 的学习引导 Agent。",
    "目标：只做启发式引导，不直接给最终答案。",
    `意图: ${input.intent}`,
    `当前层级: ${input.currentLevel}`,
    "请基于以下学习输入和知识片段，输出一个 JSON 对象：",
    '{"guidance":"...", "nextLevel":1-4}',
    "约束：guidance 控制在 80-160 字，强调先写条件、再拆步骤、最后自检。",
    "",
    `学习输入: ${input.userInput}`,
    `知识片段:\n${input.contextSummary || "暂无命中知识片段"}`
  ].join("\n");
}

function buildModelStreamPrompt(input: {
  intent: string;
  userInput: string;
  currentLevel: number;
  contextSummary: string;
}) {
  return [
    "你是 EduNexus 的学习引导 Agent。",
    "请直接输出一段中文学习引导文本（80~160字），不要输出 JSON、不要输出代码块。",
    "要求：先提示整理条件，再提示拆步骤，最后提示自检；不直接给最终答案。",
    `意图: ${input.intent}`,
    `当前层级: ${input.currentLevel}`,
    `学习输入: ${input.userInput}`,
    `知识片段:\n${input.contextSummary || "暂无命中知识片段"}`
  ].join("\n");
}

async function buildGuidanceWithModel(input: {
  intent: string;
  userInput: string;
  currentLevel: number;
  contextSummary: string;
}): Promise<ModelGuidance | null> {
  if (!process.env.MODELSCOPE_API_KEY) {
    return null;
  }

  try {
    const client = getModelscopeClient();
    const model = process.env.MODELSCOPE_CHAT_MODEL ?? "deepseek-ai/DeepSeek-V3.2";
    const response = await client.chat.completions.create(
      {
        model,
        messages: [
          {
            role: "system",
            content: "你是严谨的中文学习教练，输出必须是合法 JSON。"
          },
          {
            role: "user",
            content: buildModelJsonPrompt(input)
          }
        ],
        temperature: 0.25,
        max_tokens: 800
      },
      {
        body: {
          extra_body: {
            enable_thinking: true
          }
        } as Record<string, unknown>
      }
    );
    const raw = normalizeModelJson(response.choices[0]?.message?.content ?? "");
    return safeJsonParseModelResponse(raw);
  } catch {
    return null;
  }
}

function createAgentGraph() {
  // LangGraph v1 对 channels 推导较严格，这里保留最小化断言以确保运行态可用。
  const graph = new StateGraph({
    channels: GRAPH_CHANNELS
  } as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .addNode("route_intent", (state: GraphState) => ({
      intent: detectIntent(state.userInput),
      trace: [`route_intent -> ${detectIntent(state.userInput)}`]
    }))
    .addNode("retrieve_context", async (state: GraphState) => {
      const result = await searchDocuments(state.userInput, state.userId);
      const top = result.slice(0, 3);
      const refs = top.map((item) => item.docId);
      const contextSummary = top
        .map((item, index) => `${index + 1}. ${item.docId}: ${item.snippet}`)
        .join("\n");
      return {
        contextRefs: refs,
        contextSummary,
        trace: [`retrieve_context -> 命中 ${top.length} 条`]
      };
    })
    .addNode("generate_guidance", async (state: GraphState) => {
      const rule = buildSocraticGuidance({
        userInput: state.userInput,
        currentLevel: state.currentLevel
      });
      const modelResult = await buildGuidanceWithModel({
        intent: state.intent,
        userInput: state.userInput,
        currentLevel: state.currentLevel,
        contextSummary: state.contextSummary
      });
      if (!modelResult) {
        return {
          nextLevel: rule.nextLevel,
          guidance: rule.guidance,
          mode: "rule" as const,
          trace: ["generate_guidance -> rule"]
        };
      }
      return {
        nextLevel: modelResult.nextLevel,
        guidance: modelResult.guidance,
        mode: "langgraph_model" as const,
        trace: ["generate_guidance -> langgraph_model"]
      };
    })
    .addEdge(START, "route_intent")
    .addEdge("route_intent", "retrieve_context")
    .addEdge("retrieve_context", "generate_guidance")
    .addEdge("generate_guidance", END);

  return graph.compile() as unknown as AgentGraph;
}

function getCompiledGraph() {
  if (!compiledGraph) {
    compiledGraph = createAgentGraph();
  }
  return compiledGraph;
}

function dedupe(items: string[]) {
  return Array.from(new Set(items));
}

export async function runLangGraphAgent(input: AgentRunInput): Promise<AgentRunOutput> {
  const graph = getCompiledGraph();
  const result = (await graph.invoke({
    sessionId: input.sessionId ?? "",
    userId: input.userId,
    userInput: input.userInput,
    currentLevel: input.currentLevel ?? 1
  })) as GraphState;

  return {
    intent: result.intent,
    nextLevel: result.nextLevel,
    guidance: result.guidance,
    contextRefs: dedupe(result.contextRefs),
    mode: result.mode,
    trace: result.trace
  };
}

export async function* streamLangGraphAgent(
  input: AgentRunInput
): AsyncGenerator<AgentStreamEvent, AgentRunOutput, void> {
  const state: GraphState = {
    sessionId: input.sessionId ?? "",
    userId: input.userId,
    userInput: input.userInput,
    currentLevel: input.currentLevel ?? 1,
    intent: "knowledge_practice",
    contextSummary: "",
    contextRefs: [],
    guidance: "",
    nextLevel: input.currentLevel ?? 1,
    mode: "rule",
    trace: []
  };

  state.intent = detectIntent(state.userInput);
  const routeTrace = `route_intent -> ${state.intent}`;
  state.trace.push(routeTrace);
  yield { type: "trace", value: routeTrace };

  const searchResult = await searchDocuments(state.userInput, state.userId);
  const top = searchResult.slice(0, 3);
  state.contextRefs = top.map((item) => item.docId);
  state.contextSummary = top
    .map((item, index) => `${index + 1}. ${item.docId}: ${item.snippet}`)
    .join("\n");
  const retrieveTrace = `retrieve_context -> 命中 ${top.length} 条`;
  state.trace.push(retrieveTrace);
  yield { type: "trace", value: retrieveTrace };

  const rule = buildSocraticGuidance({
    userInput: state.userInput,
    currentLevel: state.currentLevel
  });
  state.nextLevel = rule.nextLevel;

  yield {
    type: "meta",
    value: {
      mode: state.mode,
      intent: state.intent,
      nextLevel: state.nextLevel,
      contextRefs: dedupe(state.contextRefs)
    }
  };

  let modelStreamText = "";
  if (process.env.MODELSCOPE_API_KEY) {
    try {
      const client = getModelscopeClient();
      const model = process.env.MODELSCOPE_CHAT_MODEL ?? "deepseek-ai/DeepSeek-V3.2";
      const stream = await client.chat.completions.create(
        {
          model,
          messages: [
            {
              role: "system",
              content: "你是严谨的中文学习教练，只输出学习引导文本。"
            },
            {
              role: "user",
              content: buildModelStreamPrompt({
                intent: state.intent,
                userInput: state.userInput,
                currentLevel: state.currentLevel,
                contextSummary: state.contextSummary
              })
            }
          ],
          temperature: 0.25,
          stream: true
        },
        {
          body: {
            extra_body: {
              enable_thinking: true
            }
          } as Record<string, unknown>
        }
      );
      for await (const chunk of stream) {
        const delta = chunk.choices?.[0]?.delta?.content ?? "";
        if (!delta.trim()) continue;
        modelStreamText += delta;
        yield {
          type: "token",
          value: delta
        };
      }
    } catch {
      modelStreamText = "";
    }
  }

  if (modelStreamText.trim()) {
    state.mode = "langgraph_model";
    state.guidance = modelStreamText.trim();
  } else {
    state.mode = "rule";
    state.guidance = rule.guidance;
    for (const item of splitGuidanceToTokens(rule.guidance)) {
      yield {
        type: "token",
        value: item
      };
    }
  }

  const guidanceTrace = `generate_guidance -> ${state.mode}`;
  state.trace.push(guidanceTrace);
  yield {
    type: "trace",
    value: guidanceTrace
  };

  const output: AgentRunOutput = {
    intent: state.intent,
    nextLevel: state.nextLevel,
    guidance: state.guidance,
    contextRefs: dedupe(state.contextRefs),
    mode: state.mode,
    trace: state.trace
  };

  yield {
    type: "meta",
    value: {
      mode: output.mode,
      intent: output.intent,
      nextLevel: output.nextLevel,
      contextRefs: output.contextRefs
    }
  };

  yield {
    type: "done",
    value: output
  };
  return output;
}

export type { AgentRunInput, AgentRunOutput, AgentStreamEvent };
