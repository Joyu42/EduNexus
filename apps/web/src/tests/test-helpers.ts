import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

type SandboxPaths = {
  rootDir: string;
  vaultDir: string;
  dataDir: string;
};

export async function createSandbox(name: string): Promise<SandboxPaths> {
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), `edunexus-${name}-`));
  const vaultDir = path.join(rootDir, "vault");
  const dataDir = path.join(rootDir, ".edunexus", "data");

  await Promise.all([
    fs.mkdir(path.join(vaultDir, "notes"), { recursive: true }),
    fs.mkdir(path.join(vaultDir, "sources"), { recursive: true }),
    fs.mkdir(path.join(vaultDir, "playbooks"), { recursive: true }),
    fs.mkdir(path.join(vaultDir, "skills"), { recursive: true }),
    fs.mkdir(path.join(vaultDir, "daily"), { recursive: true }),
    fs.mkdir(dataDir, { recursive: true })
  ]);

  return {
    rootDir,
    vaultDir,
    dataDir
  };
}

export async function cleanupSandbox(rootDir: string) {
  await fs.rm(rootDir, { recursive: true, force: true });
}

export async function writeMarkdown(
  vaultDir: string,
  relativePath: string,
  content: string
) {
  const absolute = path.join(vaultDir, relativePath);
  await fs.mkdir(path.dirname(absolute), { recursive: true });
  await fs.writeFile(absolute, content, "utf8");
}
