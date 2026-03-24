import { z } from "zod";

const sessionSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  lastLevel: z.number(),
  messageCount: z.number()
});

const sessionMessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
  createdAt: z.string(),
  learningPack: z
    .object({
      packId: z.string(),
      title: z.string(),
      topic: z.string(),
      graphUrl: z.string(),
    })
    .optional(),
});

const sessionDetailSchema = z.object({
  id: z.string(),
  title: z.string(),
  userId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  lastLevel: z.number(),
  messages: z.array(sessionMessageSchema)
});

const appendMessageInputSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().min(1),
  learningPack: z
    .object({
      packId: z.string().min(1),
      title: z.string().min(1),
      topic: z.string().min(1),
      graphUrl: z.string().min(1),
    })
    .optional(),
});

const createSessionInputSchema = z.object({
  title: z.string().min(1).optional(),
  courseId: z.string().min(1).optional(),
  initialGoal: z.string().min(1).optional()
});

const successEnvelopeSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
    traceId: z.string().optional()
  });

const listSessionsResponseSchema = successEnvelopeSchema(
  z.object({
    sessions: z.array(sessionSummarySchema)
  })
);

const sessionDetailResponseSchema = successEnvelopeSchema(sessionDetailSchema);

const createSessionResponseSchema = successEnvelopeSchema(
  z.object({
    session: sessionDetailSchema
  })
);

const appendMessageResponseSchema = successEnvelopeSchema(
  z.object({
    session: z.object({
      id: z.string(),
      updatedAt: z.string(),
      messageCount: z.number()
    })
  })
);

const deleteSessionResponseSchema = successEnvelopeSchema(
  z.object({
    deleted: z.literal(true),
    id: z.string()
  })
);

export type WorkspaceSessionSummary = z.infer<typeof sessionSummarySchema>;
export type WorkspaceSessionMessage = z.infer<typeof sessionMessageSchema>;
export type WorkspaceSessionDetail = z.infer<typeof sessionDetailSchema>;
export type CreateWorkspaceSessionInput = z.infer<typeof createSessionInputSchema>;
export type AppendWorkspaceSessionMessageInput = z.infer<typeof appendMessageInputSchema>;
export type AppendWorkspaceSessionMessageResult = z.infer<
  typeof appendMessageResponseSchema
>["data"]["session"];
export type DeleteWorkspaceSessionResult = z.infer<typeof deleteSessionResponseSchema>["data"];

async function parseSuccessResponse<T>(response: Response, schema: z.ZodType<T>): Promise<T> {
  if (!response.ok) {
    throw new Error(`Workspace session request failed with status ${response.status}`);
  }

  const json = await response.json();
  return schema.parse(json);
}

export async function listSessions(): Promise<WorkspaceSessionSummary[]> {
  const response = await fetch("/api/workspace/sessions", {
    credentials: "include"
  });
  const json = await parseSuccessResponse(response, listSessionsResponseSchema);
  return json.data.sessions;
}

export async function getSession(id: string): Promise<WorkspaceSessionDetail> {
  const response = await fetch(`/api/workspace/session/${id}`, {
    credentials: "include"
  });
  const json = await parseSuccessResponse(response, sessionDetailResponseSchema);
  return json.data;
}

export async function createSession(
  input: CreateWorkspaceSessionInput = {}
): Promise<WorkspaceSessionDetail> {
  const body = createSessionInputSchema.parse(input);
  const response = await fetch("/api/workspace/session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    credentials: "include",
    body: JSON.stringify(body)
  });
  const json = await parseSuccessResponse(response, createSessionResponseSchema);
  return json.data.session;
}

export async function appendMessage(
  sessionId: string,
  input: AppendWorkspaceSessionMessageInput
): Promise<AppendWorkspaceSessionMessageResult> {
  const body = appendMessageInputSchema.parse(input);
  const response = await fetch(`/api/workspace/session/${sessionId}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    credentials: "include",
    body: JSON.stringify(body)
  });
  const json = await parseSuccessResponse(response, appendMessageResponseSchema);
  return json.data.session;
}

export async function deleteSession(sessionId: string): Promise<DeleteWorkspaceSessionResult> {
  const response = await fetch(`/api/workspace/session/${sessionId}`, {
    method: "DELETE",
    credentials: "include"
  });
  const json = await parseSuccessResponse(response, deleteSessionResponseSchema);
  return json.data;
}
