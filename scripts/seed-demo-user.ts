import { prisma } from '../apps/web/src/lib/server/prisma';
import bcrypt from 'bcryptjs';

async function main() {
  const demoEmail = 'demo@edunexus.com';
  const demoPassword = 'demo123';

  const hashedPassword = await bcrypt.hash(demoPassword, 10);
  const existingUser = await prisma.user.findUnique({
    where: { email: demoEmail },
  });

  await prisma.user.upsert({
    where: { email: demoEmail },
    update: {
      isDemo: true,
    },
    create: {
      email: demoEmail,
      password: hashedPassword,
      name: 'Demo User',
      isDemo: true,
    },
  });

  console.log(existingUser ? 'Demo user already exists; demo flag ensured' : 'Demo user created successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
