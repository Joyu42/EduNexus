import { prisma } from './prisma';
import type { Document } from '@prisma/client';

export type { Document } from '@prisma/client';

export async function listDocuments(userId: string): Promise<Document[]> {
  return prisma.document.findMany({
    where: { authorId: userId },
    orderBy: { updatedAt: 'desc' },
  });
}

export async function getDocument(id: string, userId: string): Promise<Document | null> {
  return prisma.document.findFirst({
    where: { id, authorId: userId },
  });
}

export async function createDocument(data: {
  title: string;
  content: string;
  authorId: string;
}): Promise<Document> {
  return prisma.document.create({
    data: {
      title: data.title,
      content: data.content,
      authorId: data.authorId,
    },
  });
}

export async function updateDocument(
  id: string,
  data: { title?: string; content?: string },
  userId: string
): Promise<Document | null> {
  const existing = await getDocument(id, userId);
  if (!existing) return null;

  return prisma.document.update({
    where: { id },
    data: {
      title: data.title ?? existing.title,
      content: data.content ?? existing.content,
    },
  });
}

export async function deleteDocument(id: string, userId: string): Promise<boolean> {
  const existing = await getDocument(id, userId);
  if (!existing) return false;

  await prisma.document.delete({ where: { id } });
  return true;
}

export async function searchDocuments(
  query: string,
  userId: string
): Promise<Array<{ docId: string; snippet: string }>> {
  const documents = await prisma.document.findMany({
    where: {
      authorId: userId,
      OR: [
        { title: { contains: query } },
        { content: { contains: query } }
      ]
    },
    take: 10,
  });

  return documents.map(doc => ({
    docId: doc.id,
    snippet: doc.content.slice(0, 200) + (doc.content.length > 200 ? '...' : '')
  }));
}
