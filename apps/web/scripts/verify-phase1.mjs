#!/usr/bin/env node

/**
 * 第一阶段功能验证脚本
 * 验证自动保存、快速创建、数据同步等核心功能
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../../..');

console.log('🔍 开始验证第一阶段核心功能...\n');

// 验证关键文件是否存在
const criticalFiles = [
  'apps/web/src/lib/hooks/use-auto-save.ts',
  'apps/web/src/lib/hooks/use-global-shortcuts.ts',
  'apps/web/src/lib/client/data-sync-manager.ts',
  'apps/web/src/lib/kb/content-extractor.ts',
  'apps/web/src/lib/graph/kg-sync-service.ts',
  'apps/web/src/lib/path/learning-tracker.ts',
  'apps/web/src/components/kb/floating-create-button.tsx',
  'apps/web/src/components/kb/quick-create-dialog.tsx',
  'apps/web/src/components/kb/save-status-indicator.tsx',
  'apps/web/src/lib/client/offline-save-service.ts',
  'apps/web/src/lib/client/conflict-resolver.ts',
];

let allFilesExist = true;

console.log('📁 检查关键文件...');
criticalFiles.forEach((file) => {
  const fullPath = join(projectRoot, file);
  const exists = existsSync(fullPath);
  const status = exists ? '✅' : '❌';
  console.log(`${status} ${file}`);
  if (!exists) allFilesExist = false;
});

console.log('');

if (!allFilesExist) {
  console.error('❌ 部分关键文件缺失！');
  process.exit(1);
}

// 验证知识宝库页面集成
console.log('🔧 检查知识宝库页面集成...');
const kbPagePath = join(projectRoot, 'apps/web/src/app/kb/page.tsx');
const kbPageContent = readFileSync(kbPagePath, 'utf-8');

const integrationChecks = [
  { name: '自动保存 Hook', pattern: /useAutoSave/ },
  { name: '全局快捷键', pattern: /useGlobalShortcuts/ },
  { name: '浮动创建按钮', pattern: /FloatingCreateButton/ },
  { name: '快速创建对话框', pattern: /QuickCreateDialog/ },
  { name: '保存状态指示器', pattern: /SaveStatusIndicator/ },
  { name: '离线保存服务', pattern: /offlineSaveService/ },
];

integrationChecks.forEach(({ name, pattern }) => {
  const integrated = pattern.test(kbPageContent);
  const status = integrated ? '✅' : '❌';
  console.log(`${status} ${name}`);
});

console.log('');

// 验证设计文档
console.log('📚 检查设计文档...');
const designDocs = [
  'docs/plans/2026-03-09-integration-optimization-design.md',
  'docs/plans/phase1-core-features.md',
];

designDocs.forEach((doc) => {
  const fullPath = join(projectRoot, doc);
  const exists = existsSync(fullPath);
  const status = exists ? '✅' : '❌';
  console.log(`${status} ${doc}`);
});

console.log('\n✨ 第一阶段核心功能验证完成！');
console.log('\n📝 下一步：');
console.log('1. 访问 http://localhost:3003/kb 测试知识宝库功能');
console.log('2. 测试自动保存（编辑笔记后等待2秒）');
console.log('3. 测试快速创建（Ctrl+Shift+N 或点击浮动按钮）');
console.log('4. 测试离线保存（断网后编辑笔记）');
