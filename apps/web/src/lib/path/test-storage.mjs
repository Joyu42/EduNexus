/**
 * 学习路径存储测试脚本
 *
 * 在浏览器控制台中运行此脚本来测试存储功能
 */

// 测试路径数据
const testPath = {
  id: 'test-path-' + Date.now(),
  title: '测试学习路径',
  description: '这是一个测试路径',
  category: '测试',
  difficulty: 'beginner',
  estimatedDuration: 120,
  nodes: [
    {
      id: 'start',
      type: 'input',
      position: { x: 250, y: 0 },
      data: { label: '开始', type: 'start' },
    },
    {
      id: 'node-1',
      type: 'default',
      position: { x: 250, y: 100 },
      data: {
        label: '测试节点',
        description: '这是一个测试节点',
        type: 'document',
        estimatedTime: 60,
        difficulty: 'beginner',
      },
    },
    {
      id: 'end',
      type: 'output',
      position: { x: 250, y: 200 },
      data: { label: '结束', type: 'end' },
    },
  ],
  edges: [
    { id: 'e1', source: 'start', target: 'node-1' },
    { id: 'e2', source: 'node-1', target: 'end' },
  ],
  tags: ['测试'],
  isPublic: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  version: 1,
};

// 测试函数
async function testPathStorage() {
  console.log('🧪 开始测试学习路径存储...\n');

  try {
    // 动态导入存储模块
    const storage = await import('./path-storage.js');

    // 测试 1: 保存路径
    console.log('📝 测试 1: 保存路径');
    await storage.savePath(testPath);
    console.log('✅ 路径保存成功\n');

    // 测试 2: 获取路径
    console.log('📖 测试 2: 获取路径');
    const retrievedPath = await storage.getPath(testPath.id);
    console.log('✅ 路径获取成功:', retrievedPath?.title);
    console.assert(retrievedPath?.id === testPath.id, '路径 ID 匹配');
    console.log('');

    // 测试 3: 获取所有路径
    console.log('📚 测试 3: 获取所有路径');
    const allPaths = await storage.getAllPaths();
    console.log('✅ 获取到', allPaths.length, '个路径\n');

    // 测试 4: 更新节点完成状态
    console.log('✔️ 测试 4: 更新节点完成状态');
    await storage.updateNodeCompletion(testPath.id, 'node-1', true);
    const progress = await storage.getProgress(testPath.id);
    console.log('✅ 进度更新成功:', progress?.progress + '%');
    console.assert(progress?.completedNodes.includes('node-1'), '节点已标记为完成');
    console.log('');

    // 测试 5: 导出路径
    console.log('💾 测试 5: 导出路径');
    const exported = await storage.exportPath(testPath.id);
    console.log('✅ 路径导出成功，JSON 长度:', exported.length);
    console.log('');

    // 测试 6: 导入路径
    console.log('📥 测试 6: 导入路径');
    const imported = await storage.importPath(exported);
    console.log('✅ 路径导入成功:', imported.title);
    console.log('');

    // 测试 7: 删除路径
    console.log('🗑️ 测试 7: 删除测试路径');
    await storage.deletePath(testPath.id);
    await storage.deletePath(imported.id);
    console.log('✅ 测试路径已删除\n');

    console.log('🎉 所有测试通过！');
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

// 运行测试
testPathStorage();

// 导出测试函数供手动调用
export { testPathStorage };
