import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserByEmail, createUser } from '@/lib/server/user-service';

const registerSchema = z.object({
  email: z.string().trim().email('请输入有效的邮箱地址'),
  name: z.preprocess(
    (value) => {
      if (typeof value !== 'string') {
        return value;
      }

      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    },
    z.string().max(50, '昵称不能超过 50 个字符').optional()
  ),
  password: z.string().min(6, '密码长度至少为 6 位'),
});

type ApiErrorCode =
  | 'INVALID_JSON'
  | 'VALIDATION_ERROR'
  | 'EMAIL_ALREADY_EXISTS'
  | 'INTERNAL_SERVER_ERROR';

function errorResponse(
  status: number,
  code: ApiErrorCode,
  message: string,
  details?: Record<string, unknown>
) {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        ...(details ? { details } : {}),
      },
    },
    { status }
  );
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return errorResponse(400, 'INVALID_JSON', '请求体必须是合法的 JSON');
  }

  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse(400, 'VALIDATION_ERROR', '请求参数不合法', {
      fieldErrors: parsed.error.flatten().fieldErrors,
    });
  }

  const { email, name, password } = parsed.data;

  try {

    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return errorResponse(409, 'EMAIL_ALREADY_EXISTS', '该邮箱已被注册');
    }

    const user = await createUser({ email, name, password });

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
    });
  } catch (error) {
    console.error('Register error:', error);
    return errorResponse(500, 'INTERNAL_SERVER_ERROR', '注册失败，请稍后重试');
  }
}
