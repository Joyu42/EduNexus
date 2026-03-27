import { PrismaClient } from '@prisma/client';

const BOOKS = ['medical', 'computer', 'economics', 'electrical'];
const prisma = new PrismaClient();

let allPassed = true;
const results = [];

for (const bookId of BOOKS) {
  const [entries, book] = await Promise.all([
    prisma.builtinWordEntry.findMany({ where: { bookId }, select: { example: true } }),
    prisma.builtinWordBook.findUnique({ where: { id: bookId }, select: { wordCount: true } }),
  ]);

  const count = entries.length;
  const expectedCount = book?.wordCount ?? count;
  const nonNull = entries.filter(e => e.example != null).length;
  const nonEmpty = entries.filter(e => e.example != null && e.example.trim().length > 0).length;

  results.push({ bookId, count, expectedCount, nonNull, nonEmpty });

  if (count !== expectedCount) {
    console.error(`FAIL: ${bookId} has ${count} entries, expected ${expectedCount}`);
    allPassed = false;
  } else {
    console.log(`PASS: ${bookId} count=${expectedCount}, examplesNonEmpty=${nonEmpty}`);
  }

  // Fail if ANY entry is missing a non-empty example (since cleaning guarantees all have examples)
  if (nonEmpty < count) {
    console.error(`FAIL: ${bookId} has ${count - nonEmpty} entries with empty/missing examples`);
    allPassed = false;
  }
}

await prisma.$disconnect();

if (!allPassed) {
  console.error('\nSome checks failed.');
  process.exitCode = 1;
} else {
  console.log('\nAll checks passed.');
  process.exitCode = 0;
}
