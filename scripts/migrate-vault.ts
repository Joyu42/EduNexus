import fs from 'node:fs/promises';
import path from 'node:path';
import { prisma } from '../apps/web/src/lib/server/prisma';

const VAULT_DIR = '/Users/Ng/workspace/EduNexus/vault';

async function readMarkdownFile(filePath: string) {
  const content = await fs.readFile(filePath, 'utf8');
  
  const frontmatter: Record<string, string> = {};
  let body = content;
  
  if (content.startsWith('---')) {
    const endIndex = content.indexOf('\n---', 3);
    if (endIndex !== -1) {
      const frontmatterBlock = content.slice(3, endIndex).trim();
      body = content.slice(endIndex + 4).trim();
      
      for (const line of frontmatterBlock.split('\n')) {
        const idx = line.indexOf(':');
        if (idx > 0) {
          const key = line.slice(0, idx).trim();
          const value = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
          frontmatter[key] = value;
        }
      }
    }
  }
  
  return { frontmatter, body };
}

async function migrateVault() {
  console.log('Starting vault migration...');
  
  const demoUser = await prisma.user.findUnique({
    where: { email: 'demo@edunexus.com' }
  });
  
  if (!demoUser) {
    console.error('Demo user not found! Please run seed script first.');
    process.exit(1);
  }
  
  console.log(`Found demo user: ${demoUser.email} (${demoUser.id})`);
  
  const subdirs = ['notes', 'sources', 'playbooks', 'skills', 'daily'];
  let totalImported = 0;
  
  for (const subdir of subdirs) {
    const dirPath = path.join(VAULT_DIR, subdir);
    
    try {
      const files = await fs.readdir(dirPath);
      const mdFiles = files.filter(f => f.endsWith('.md'));
      
      for (const file of mdFiles) {
        const filePath = path.join(dirPath, file);
        const { frontmatter, body } = await readMarkdownFile(filePath);
        
        const title = frontmatter.title || file.replace('.md', '');
        
        await prisma.document.create({
          data: {
            title,
            content: body,
            authorId: demoUser.id
          }
        });
        
        totalImported++;
        console.log(`Imported: ${title} (${subdir}/${file})`);
      }
    } catch (e: any) {
      if (e.code === 'ENOENT') {
        console.log(`Skipping non-existent directory: ${subdir}`);
      } else {
        console.error(`Error processing ${subdir}:`, e.message);
      }
    }
  }
  
  console.log(`\nMigration complete! Total documents imported: ${totalImported}`);
}

migrateVault()
  .catch(e => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
