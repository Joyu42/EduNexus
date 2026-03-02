import { NextResponse } from "next/server";
import { createTraceId } from "./trace";

type ErrorPayload = {
  code: string;
  message: string;
  details?: unknown;
};

export function ok<T>(data: T, traceId = createTraceId()) {
  return NextResponse.json({
    success: true,
    data,
    traceId
  });
}

export function fail(error: ErrorPayload, status = 400, traceId = createTraceId()) {
  return NextResponse.json(
    {
      success: false,
      error,
      traceId
    },
    { status }
  );
}
