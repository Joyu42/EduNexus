import bcrypt from 'bcryptjs';
import { prisma } from './prisma';
import type { User } from '@prisma/client';

export type { User } from '@prisma/client';

export async function getUserByEmail(email: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { email } });
}

export async function getUserById(id: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { id } });
}

export async function getUserByName(name: string): Promise<User | null> {
  return prisma.user.findFirst({ where: { name } });
}

export async function verifyPassword(plain: string, hashed: string): Promise<boolean> {
  return bcrypt.compare(plain, hashed);
}

export async function createUser(data: {
  email: string;
  name: string;
  password: string;
  isDemo?: boolean;
}): Promise<User> {
  const normalizedName = data.name.trim();
  if (!normalizedName) {
    throw new Error('用户名不能为空');
  }

  const existingName = await getUserByName(normalizedName);
  if (existingName) {
    throw new Error('用户名已被占用');
  }

  const hashedPassword = await bcrypt.hash(data.password, 10);
  return prisma.user.create({
    data: {
      email: data.email,
      name: normalizedName,
      password: hashedPassword,
      isDemo: data.isDemo ?? false,
    },
  });
}

export async function updateUserName(userId: string, name: string): Promise<User> {
  const normalizedName = name.trim();
  if (!normalizedName) {
    throw new Error('用户名不能为空');
  }

  const existingName = await prisma.user.findFirst({
    where: {
      name: normalizedName,
      NOT: { id: userId }
    }
  });

  if (existingName) {
    throw new Error('用户名已被占用');
  }

  return prisma.user.update({
    where: { id: userId },
    data: { name: normalizedName }
  });
}
