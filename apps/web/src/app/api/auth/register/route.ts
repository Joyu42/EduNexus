import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserByEmail, createUser } from '@/lib/server/user-service';

const registerSchema = z.object({
  email: z.string().trim().email('请输入有效的邮箱地址'),
  name: z
    .string()
    .trim()
    .min(2, '用户名长度至少为 2 个字符')
    .max(50, '用户名不能超过 50 个字符'),
  password: z.string().min(6, '密码长度至少为 6 位'),
});

type ApiErrorCode =
  | 'INVALID_JSON'
  | 'VALIDATION_ERROR'
  | 'EMAIL_ALREADY_EXISTS'
  | 'USERNAME_ALREADY_EXISTS'
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

    try {
      const user = await createUser({ email, name, password, isDemo: false });

      return NextResponse.json({
        id: user.id,
        email: user.email,
        name: user.name,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('用户名已被占用')) {
        return errorResponse(409, 'USERNAME_ALREADY_EXISTS', '用户名已被占用');
      }
      if (message.includes('用户名不能为空')) {
        return errorResponse(400, 'VALIDATION_ERROR', '用户名不能为空');
      }
      throw error;
    }
  } catch (error) {
    console.error('Register error:', error);
    return errorResponse(500, 'INTERNAL_SERVER_ERROR', '注册失败，请稍后重试');
  }
}
