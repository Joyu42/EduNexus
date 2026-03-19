import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { handlers } from "@/auth";

type NextAuthHandler = (request: NextRequest, ctx: { params: { nextauth: string[] } }) => Promise<Response> | Response;

function withJsonErrorHandling(handler: NextAuthHandler): NextAuthHandler {
  return async (request, ctx) => {
    try {
      return await handler(request, ctx);
    } catch (error) {
      if (error instanceof Response) {
        return error;
      }

      console.error("NextAuth handler error", error);
      const errorCode =
        typeof error === "object" && error !== null && "code" in error && typeof (error as { code?: unknown }).code === "string"
          ? (error as { code: string }).code
          : "NEXTAUTH_HANDLER_ERROR";
      const message = error instanceof Error ? error.message : "Unexpected authentication error";

      return NextResponse.json(
        {
          error: {
            code: errorCode,
            message,
          },
        },
        { status: 500 }
      );
    }
  };
}

const getHandler: NextAuthHandler = handlers.GET;
const postHandler: NextAuthHandler = handlers.POST;

export const GET = withJsonErrorHandling(getHandler);
export const POST = withJsonErrorHandling(postHandler);
export const runtime = 'nodejs';
