/**
 * 测试学习路径存储功能
 * 运行: node apps/web/scripts/test-path-storage.mjs
 */

console.log('学习路径存储测试');
console.log('================');
console.log('');
console.log('此脚本需要在浏览器环境中运行，因为它使用 IndexedDB。');
console.log('请在浏览器控制台中运行以下代码：');
console.log('');
console.log('```javascript');
console.log('// 1. 导入存储模块');
console.log('import { pathStorage } from "@/lib/client/path-storage";');
console.log('');
console.log('// 2. 测试创建路径');
console.log('const testPath = await pathStorage.createPath({');
console.log('  title: "测试路径",');
console.log('  description: "这是一个测试路径",');
console.log('  tags: ["测试"],');
console.log('  status: "not_started",');
console.log('  progress: 0,');
console.log('  tasks: [],');
console.log('  milestones: []');
console.log('});');
console.log('console.log("创建的路径:", testPath);');
console.log('');
console.log('// 3. 验证路径已保存');
console.log('const savedPath = await pathStorage.getPath(testPath.id);');
console.log('console.log("读取的路径:", savedPath);');
console.log('');
console.log('// 4. 获取所有路径');
console.log('const allPaths = await pathStorage.getAllPaths();');
console.log('console.log("所有路径:", allPaths);');
console.log('```');
