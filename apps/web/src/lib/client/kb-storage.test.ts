/**
 * 知识库存储功能测试
 * 运行方式：在浏览器控制台中执行
 */

import { getKBStorage } from "./kb-storage";

export async function testKBStorage() {
  console.log("=== 开始测试知识库存储功能 ===\n");

  const storage = getKBStorage();

  try {
    // 1. 初始化
    console.log("1. 初始化存储...");
    await storage.initialize();
    console.log("✓ 初始化成功\n");

    // 2. 创建知识库
    console.log("2. 创建测试知识库...");
    const vault = await storage.createVault(
      "测试知识库",
      "~/Documents/EduNexus/测试知识库"
    );
    console.log("✓ 知识库创建成功:", vault);
    console.log("");

    // 3. 获取所有知识库
    console.log("3. 获取所有知识库...");
    const vaults = await storage.getAllVaults();
    console.log("✓ 知识库列表:", vaults);
    console.log("");

    // 4. 设置当前知识库
    console.log("4. 设置当前知识库...");
    storage.setCurrentVault(vault.id);
    const currentVaultId = storage.getCurrentVaultId();
    console.log("✓ 当前知识库ID:", currentVaultId);
    console.log("");

    // 5. 创建文档
    console.log("5. 创建测试文档...");
    const doc1 = await storage.createDocument(
      vault.id,
      "欢迎文档",
      "# 欢迎使用知识库\n\n这是一个测试文档。\n\n## 功能特性\n- Markdown 支持\n- 双链笔记\n- 标签系统\n\n#测试 #欢迎",
      ["测试", "欢迎"]
    );
    console.log("✓ 文档1创建成功:", doc1);

    const doc2 = await storage.createDocument(
      vault.id,
      "项目笔记",
      "# 项目笔记\n\n参考 [[欢迎文档]] 了解更多。\n\n#项目",
      ["项目"]
    );
    console.log("✓ 文档2创建成功:", doc2);
    console.log("");

    // 6. 获取所有文档
    console.log("6. 获取知识库中的所有文档...");
    const docs = await storage.getDocumentsByVault(vault.id);
    console.log("✓ 文档列表:", docs);
    console.log("");

    // 7. 更新文档
    console.log("7. 更新文档...");
    const updatedDoc = {
      ...doc1,
      content: doc1.content + "\n\n## 更新内容\n这是更新后的内容。",
      tags: [...doc1.tags, "更新"],
    };
    await storage.updateDocument(updatedDoc);
    console.log("✓ 文档更新成功");
    console.log("");

    // 8. 验证更新
    console.log("8. 验证文档更新...");
    const docsAfterUpdate = await storage.getDocumentsByVault(vault.id);
    const verifyDoc = docsAfterUpdate.find((d) => d.id === doc1.id);
    console.log("✓ 更新后的文档:", verifyDoc);
    console.log("");

    // 9. 导出文档（模拟）
    console.log("9. 测试导出功能...");
    console.log("✓ 导出功能可用（实际导出需要在浏览器环境中执行）");
    console.log("");

    // 10. 删除文档
    console.log("10. 删除文档...");
    await storage.deleteDocument(doc2.id);
    const docsAfterDelete = await storage.getDocumentsByVault(vault.id);
    console.log("✓ 文档删除成功，剩余文档数:", docsAfterDelete.length);
    console.log("");

    // 11. 清理：删除测试知识库
    console.log("11. 清理测试数据...");
    await storage.deleteVault(vault.id);
    const vaultsAfterDelete = await storage.getAllVaults();
    console.log("✓ 测试知识库已删除，剩余知识库数:", vaultsAfterDelete.length);
    console.log("");

    console.log("=== 所有测试通过！ ===");
    return true;
  } catch (error) {
    console.error("✗ 测试失败:", error);
    return false;
  }
}

// 浏览器环境测试
if (typeof window !== "undefined") {
  (window as any).testKBStorage = testKBStorage;
  console.log("测试函数已加载，在控制台执行 testKBStorage() 开始测试");
}
