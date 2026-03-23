import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserByEmail, createUser } from '@/lib/server/user-service';
import { createDocument } from '@/lib/server/document-service';

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

const DEFAULT_WELCOME_DOCUMENT = {
  title: '开始构建你的知识宝库',
  content: `# 欢迎使用 EduNexus

这是为你自动生成的第一篇学习文档，建议完成以下步骤，让知识星图和知识宝库立刻拥有内容：

- 使用 ## 二级标题拆分主题，比如「学习计划」「问题记录」
- 在段落中使用 [学科] 标签，方便之后筛选和检索
- 尝试在页面右上角的「知识星图」查看文档节点是否已经生成

你可以直接修改或删除本笔记，它只是一个模板。祝学习顺利！
`,
} as const;

async function seedDefaultKnowledgeBase(userId: string) {
  try {
    await createDocument({
      title: DEFAULT_WELCOME_DOCUMENT.title,
      content: DEFAULT_WELCOME_DOCUMENT.content,
      authorId: userId,
    });
  } catch (error) {
    console.warn('Failed to seed default knowledge document', error);
  }
}

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
      void seedDefaultKnowledgeBase(user.id);

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
