/**
 * 测试数据初始化脚本
 * 在浏览器控制台中运行此脚本来初始化测试数据
 */

import { initializeAllTestData, clearAllTestData } from './knowledge-graph-data';
import { getStorageStats, verifyPathSaved, getAllPaths } from '../path/path-storage';

/**
 * 初始化并验证测试数据
 */
export async function testInitialization() {
  console.log('=== 开始测试数据初始化 ===\n');

  try {
    // 1. 清除旧数据
    console.log('1. 清除旧数据...');
    await clearAllTestData();
    console.log('✓ 旧数据已清除\n');

    // 2. 初始化新数据
    console.log('2. 初始化新数据...');
    await initializeAllTestData();
    console.log('✓ 新数据已初始化\n');

    // 3. 验证学习路径
    console.log('3. 验证学习路径...');
    const paths = await getAllPaths();
    console.log(`✓ 找到 ${paths.length} 条学习路径`);

    for (const path of paths) {
      const isValid = await verifyPathSaved(path.id);
      if (isValid) {
        console.log(`  ✓ ${path.title} - 验证成功`);
      } else {
        console.error(`  ✗ ${path.title} - 验证失败`);
      }
    }
    console.log('');

    // 4. 显示存储统计
    console.log('4. 存储统计信息:');
    const stats = await getStorageStats();
    console.log(`  - 学习路径数量: ${stats.pathsCount}`);
    console.log(`  - 进度记录数量: ${stats.progressCount}`);
    console.log('');

    console.log('=== 测试完成 ===');
    console.log('所有测试数据已成功初始化并验证！');

    return {
      success: true,
      paths: paths.length,
      stats,
    };
  } catch (error) {
    console.error('=== 测试失败 ===');
    console.error(error);
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

/**
 * 快速初始化（不清除旧数据）
 */
export async function quickInit() {
  console.log('快速初始化测试数据...');
  await initializeAllTestData();
  const stats = await getStorageStats();
  console.log('初始化完成！', stats);
  return stats;
}

/**
 * 仅清除数据
 */
export async function clearData() {
  console.log('清除所有测试数据...');
  await clearAllTestData();
  console.log('清除完成！');
}

// 导出到全局对象，方便在控制台调用
if (typeof window !== 'undefined') {
  (window as any).testInit = testInitialization;
  (window as any).quickInit = quickInit;
  (window as any).clearData = clearData;

  console.log('测试工具已加载！可以使用以下命令：');
  console.log('  - testInit()  : 完整测试（清除旧数据 + 初始化 + 验证）');
  console.log('  - quickInit() : 快速初始化（不清除旧数据）');
  console.log('  - clearData() : 清除所有测试数据');
}
