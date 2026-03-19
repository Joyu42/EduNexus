// 版本管理器
import type { CollabSession, CollabVersion } from "./collab-types";
import { saveVersion, getVersionsBySession } from "./collab-storage";

export class VersionManager {
  private sessionId: string;
  private autoSaveInterval: number = 5 * 60 * 1000; // 5分钟
  private autoSaveTimer: NodeJS.Timeout | null = null;
  private lastContent: string = "";

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  // 创建版本快照
  async createVersion(
    content: string,
    userId: string,
    userName: string,
    description?: string
  ): Promise<CollabVersion> {
    const version: CollabVersion = {
      id: `version_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sessionId: this.sessionId,
      content,
      createdAt: new Date().toISOString(),
      createdBy: userId,
      createdByName: userName,
      description,
      changesSummary: this.generateChangesSummary(this.lastContent, content),
    };

    await saveVersion(version);
    this.lastContent = content;
    return version;
  }

  // 启动自动保存
  startAutoSave(
    getContent: () => string,
    userId: string,
    userName: string
  ): void {
    this.stopAutoSave();
    this.autoSaveTimer = setInterval(() => {
      const content = getContent();
      if (content !== this.lastContent) {
        this.createVersion(content, userId, userName, "自动保存");
      }
    }, this.autoSaveInterval);
  }

  // 停止自动保存
  stopAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }

  // 获取版本历史
  async getHistory(): Promise<CollabVersion[]> {
    return getVersionsBySession(this.sessionId);
  }

  // 生成变更摘要
  private generateChangesSummary(oldContent: string, newContent: string): string {
    const oldLines = oldContent.split("\n");
    const newLines = newContent.split("\n");

    const added = newLines.length - oldLines.length;
    const changed = this.countChangedLines(oldLines, newLines);

    if (added > 0) {
      return `新增 ${added} 行，修改 ${changed} 行`;
    } else if (added < 0) {
      return `删除 ${Math.abs(added)} 行，修改 ${changed} 行`;
    } else {
      return `修改 ${changed} 行`;
    }
  }

  private countChangedLines(oldLines: string[], newLines: string[]): number {
    let changed = 0;
    const minLength = Math.min(oldLines.length, newLines.length);
    for (let i = 0; i < minLength; i++) {
      if (oldLines[i] !== newLines[i]) {
        changed++;
      }
    }
    return changed;
  }

  // 比较两个版本
  compareVersions(
    version1: CollabVersion,
    version2: CollabVersion
  ): {
    additions: string[];
    deletions: string[];
    changes: Array<{ line: number; old: string; new: string }>;
  } {
    const lines1 = version1.content.split("\n");
    const lines2 = version2.content.split("\n");

    const additions: string[] = [];
    const deletions: string[] = [];
    const changes: Array<{ line: number; old: string; new: string }> = [];

    const maxLength = Math.max(lines1.length, lines2.length);

    for (let i = 0; i < maxLength; i++) {
      const line1 = lines1[i];
      const line2 = lines2[i];

      if (line1 === undefined && line2 !== undefined) {
        additions.push(line2);
      } else if (line1 !== undefined && line2 === undefined) {
        deletions.push(line1);
      } else if (line1 !== line2) {
        changes.push({ line: i + 1, old: line1, new: line2 });
      }
    }

    return { additions, deletions, changes };
  }
}
