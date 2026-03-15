// apps/web/src/lib/server/user-service.ts
import bcrypt from 'bcryptjs';
import { loadDb, saveDb } from './store';
import type { User } from './types/user';

export async function getUserByEmail(email: string): Promise<User | null> {
  const db = await loadDb();
  return db.users.find(u => u.email === email) ?? null;
}

export async function getUserById(id: string): Promise<User | null> {
  const db = await loadDb();
  return db.users.find(u => u.id === id) ?? null;
}

export async function verifyPassword(plain: string, hashed: string): Promise<boolean> {
  return await bcrypt.compare(plain, hashed);
}

export async function createUser(data: { email: string; name?: string; password: string }): Promise<User> {
  const db = await loadDb();
  const hashedPassword = await bcrypt.hash(data.password, 10);
  
  const newUser: User = {
    id: `user_${Date.now()}`,
    email: data.email,
    name: data.name ?? null,
    password: hashedPassword,
    createdAt: new Date(),
  };

  db.users.push(newUser);
  await saveDb(db);
  return newUser;
}
