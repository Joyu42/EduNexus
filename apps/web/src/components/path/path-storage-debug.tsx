"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { pathStorage } from "@/lib/client/path-storage";

/**
 * 学习路径存储调试组件
 * 用于测试和验证 IndexedDB 存储功能
 */
export function PathStorageDebug() {
  const [status, setStatus] = useState<string>("未测试");
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const testStorage = async () => {
    setStatus("测试中...");
    setLogs([]);

    try {
      // 1. 测试初始化
      addLog("1. 测试初始化...");
      await pathStorage.initialize();
      addLog("✓ 初始化成功");

      // 2. 测试创建路径
      addLog("2. 测试创建路径...");
      const testPath = await pathStorage.createPath({
        title: "测试路径 " + Date.now(),
        description: "这是一个测试路径",
        tags: ["测试"],
        status: "not_started",
        progress: 0,
        tasks: [],
        milestones: [],
      });
      addLog(`✓ 创建成功，ID: ${testPath.id}`);

      // 3. 测试读取路径
      addLog("3. 测试读取路径...");
      const savedPath = await pathStorage.getPath(testPath.id);
      if (savedPath) {
        addLog(`✓ 读取成功: ${savedPath.title}`);
      } else {
        addLog("✗ 读取失败：路径不存在");
        setStatus("测试失败");
        return;
      }

      // 4. 测试获取所有路径
      addLog("4. 测试获取所有路径...");
      const allPaths = await pathStorage.getAllPaths();
      addLog(`✓ 获取成功，共 ${allPaths.length} 个路径`);

      // 5. 测试更新路径
      addLog("5. 测试更新路径...");
      const updatedPath = await pathStorage.updatePath(testPath.id, {
        title: "更新后的测试路径",
      });
      addLog(`✓ 更新成功: ${updatedPath.title}`);

      // 6. 测试删除路径
      addLog("6. 测试删除路径...");
      await pathStorage.deletePath(testPath.id);
      addLog("✓ 删除成功");

      // 7. 验证删除
      addLog("7. 验证删除...");
      const deletedPath = await pathStorage.getPath(testPath.id);
      if (!deletedPath) {
        addLog("✓ 验证成功：路径已删除");
      } else {
        addLog("✗ 验证失败：路径仍然存在");
      }

      setStatus("测试通过 ✓");
    } catch (error) {
      addLog(`✗ 测试失败: ${error}`);
      setStatus("测试失败 ✗");
      console.error("Storage test error:", error);
    }
  };

  const clearAllPaths = async () => {
    try {
      addLog("清空所有路径...");
      const allPaths = await pathStorage.getAllPaths();
      for (const path of allPaths) {
        await pathStorage.deletePath(path.id);
      }
      addLog(`✓ 已清空 ${allPaths.length} 个路径`);
    } catch (error) {
      addLog(`✗ 清空失败: ${error}`);
    }
  };

  const showAllPaths = async () => {
    try {
      addLog("获取所有路径...");
      const allPaths = await pathStorage.getAllPaths();
      addLog(`共有 ${allPaths.length} 个路径:`);
      allPaths.forEach((path, index) => {
        addLog(`  ${index + 1}. ${path.title} (ID: ${path.id})`);
      });
    } catch (error) {
      addLog(`✗ 获取失败: ${error}`);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>学习路径存储调试工具</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button onClick={testStorage}>运行测试</Button>
          <Button onClick={showAllPaths} variant="outline">
            显示所有路径
          </Button>
          <Button onClick={clearAllPaths} variant="destructive">
            清空所有路径
          </Button>
        </div>

        <div className="p-4 bg-gray-100 rounded-lg">
          <div className="font-semibold mb-2">状态: {status}</div>
          <div className="space-y-1 text-sm font-mono">
            {logs.map((log, index) => (
              <div key={index} className="text-gray-700">
                {log}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
