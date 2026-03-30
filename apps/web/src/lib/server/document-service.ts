type DocumentRecord = {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  authorId: string;
  tags: string[];
};

export type Document = DocumentRecord;

async function getPrisma() {
  return (await import('./prisma')).prisma;
}

export async function listDocuments(userId: string): Promise<DocumentRecord[]> {
  const prisma = await getPrisma();
  return prisma.document.findMany({
    where: { authorId: userId },
    orderBy: { updatedAt: 'desc' },
  });
}

export async function getDocument(id: string, userId: string): Promise<DocumentRecord | null> {
  const prisma = await getPrisma();
  return prisma.document.findFirst({
    where: { id, authorId: userId },
  });
}

export async function createDocument(data: {
  title: string;
  content: string;
  tags?: string[];
  authorId: string;
}): Promise<DocumentRecord> {
  const prisma = await getPrisma();
  return prisma.document.create({
    data: {
      title: data.title,
      content: data.content,
      tags: data.tags ?? [],
      authorId: data.authorId,
    },
  });
}

export async function updateDocument(
  id: string,
  data: { title?: string; content?: string },
  userId: string
): Promise<DocumentRecord | null> {
  const prisma = await getPrisma();
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
  const prisma = await getPrisma();
  const existing = await getDocument(id, userId);
  if (!existing) return false;

  await prisma.document.delete({ where: { id } });
  return true;
}

export async function searchDocuments(
  query: string,
  userId: string
): Promise<Array<{ docId: string; snippet: string }>> {
  const prisma = await getPrisma();
  const documents = (await prisma.document.findMany({
    where: {
      authorId: userId,
      OR: [
        { title: { contains: query } },
        { content: { contains: query } },
      ],
    },
    take: 10,
  })) as DocumentRecord[];

  return documents.map((doc) => ({
    docId: doc.id,
    snippet: doc.content.slice(0, 200) + (doc.content.length > 200 ? '...' : ''),
  }));
}

export async function searchDocumentsForLearningPack(
  query: string,
  userId: string
): Promise<Array<{ docId: string; title: string; snippet: string }>> {
  const prisma = await getPrisma();
  const documents = (await prisma.document.findMany({
    where: {
      authorId: userId,
      OR: [
        { title: { contains: query } },
        { content: { contains: query } },
      ],
    },
    take: 5,
  })) as DocumentRecord[];

  return documents.map((doc) => ({
    docId: doc.id,
    title: doc.title,
    snippet: doc.content.slice(0, 200) + (doc.content.length > 200 ? '...' : ''),
  }));
}

export { setPackKbDocument } from './learning-pack-store';
