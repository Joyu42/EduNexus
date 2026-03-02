type ApiErrorBody = {
  code: string;
  message: string;
  details?: unknown;
};

type ApiSuccessEnvelope<T> = {
  success: true;
  data: T;
  traceId?: string;
};

type ApiErrorEnvelope = {
  success: false;
  error: ApiErrorBody;
  traceId?: string;
};

type ApiEnvelope<T> = ApiSuccessEnvelope<T> | ApiErrorEnvelope;

type JsonLike = Record<string, unknown>;

function isJsonObject(value: unknown): value is JsonLike {
  return typeof value === "object" && value !== null;
}

function toErrorEnvelope(value: unknown): ApiErrorEnvelope | null {
  if (!isJsonObject(value)) return null;
  if (value.success !== false) return null;
  const rawError = value.error;
  if (!isJsonObject(rawError)) return null;
  const code = typeof rawError.code === "string" ? rawError.code : "UNKNOWN_ERROR";
  const message =
    typeof rawError.message === "string" ? rawError.message : "接口返回了未知错误。";

  return {
    success: false,
    error: {
      code,
      message,
      details: rawError.details
    },
    traceId: typeof value.traceId === "string" ? value.traceId : undefined
  };
}

function toSuccessEnvelope<T>(value: unknown): ApiSuccessEnvelope<T> | null {
  if (!isJsonObject(value)) return null;
  if (value.success !== true) return null;
  return {
    success: true,
    data: value.data as T,
    traceId: typeof value.traceId === "string" ? value.traceId : undefined
  };
}

async function parseJsonSafely(response: Response): Promise<unknown | null> {
  const contentType = response.headers.get("content-type");
  if (!contentType?.toLowerCase().includes("application/json")) {
    return null;
  }
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export class ApiRequestError extends Error {
  status: number;
  code: string;
  traceId?: string;

  constructor(input: { message: string; status: number; code: string; traceId?: string }) {
    super(input.message);
    this.name = "ApiRequestError";
    this.status = input.status;
    this.code = input.code;
    this.traceId = input.traceId;
  }
}

function createFallbackMessage(response: Response, fallback?: string) {
  if (fallback) return fallback;
  if (response.status >= 500) {
    return "服务暂时不可用，请稍后重试。";
  }
  return "请求失败，请检查输入后重试。";
}

function buildApiError(input: {
  response: Response;
  envelope: ApiErrorEnvelope | null;
  fallbackMessage?: string;
}) {
  const message = input.envelope?.error.message ?? createFallbackMessage(input.response, input.fallbackMessage);
  return new ApiRequestError({
    status: input.response.status,
    code: input.envelope?.error.code ?? `HTTP_${input.response.status}`,
    traceId: input.envelope?.traceId,
    message
  });
}

export async function requestJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(input, init);
  const payload = await parseJsonSafely(response);
  const successEnvelope = toSuccessEnvelope<T>(payload);
  const errorEnvelope = toErrorEnvelope(payload);

  if (!response.ok || errorEnvelope) {
    throw buildApiError({
      response,
      envelope: errorEnvelope
    });
  }

  if (!successEnvelope) {
    throw new ApiRequestError({
      status: response.status,
      code: "INVALID_API_RESPONSE",
      message: "接口响应格式不符合预期。"
    });
  }

  return successEnvelope.data;
}

export async function readApiErrorMessage(
  response: Response,
  fallbackMessage: string
): Promise<string> {
  const payload = await parseJsonSafely(response);
  const envelope = toErrorEnvelope(payload);
  if (envelope?.error.message) {
    return envelope.traceId
      ? `${envelope.error.message}（traceId: ${envelope.traceId}）`
      : envelope.error.message;
  }
  return fallbackMessage;
}

export function formatErrorMessage(error: unknown, fallbackMessage: string) {
  if (error instanceof ApiRequestError) {
    if (error.traceId) {
      return `${error.message}（traceId: ${error.traceId}）`;
    }
    return error.message;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallbackMessage;
}

export type { ApiEnvelope, ApiErrorEnvelope, ApiSuccessEnvelope };
