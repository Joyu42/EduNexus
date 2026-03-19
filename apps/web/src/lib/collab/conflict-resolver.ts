// 冲突解决器（简化版 Operational Transformation）
import type { CollabOperation } from "./collab-types";

export class ConflictResolver {
  // 转换操作以解决冲突
  transform(
    op1: CollabOperation,
    op2: CollabOperation
  ): CollabOperation | null {
    // 如果操作来自同一用户，按时间顺序处理
    if (op1.userId === op2.userId) {
      return op1.timestamp < op2.timestamp ? op1 : op2;
    }

    // 处理插入-插入冲突
    if (op1.type === "insert" && op2.type === "insert") {
      return this.transformInsertInsert(op1, op2);
    }

    // 处理删除-删除冲突
    if (op1.type === "delete" && op2.type === "delete") {
      return this.transformDeleteDelete(op1, op2);
    }

    // 处理插入-删除冲突
    if (op1.type === "insert" && op2.type === "delete") {
      return this.transformInsertDelete(op1, op2);
    }

    if (op1.type === "delete" && op2.type === "insert") {
      return this.transformDeleteInsert(op1, op2);
    }

    // 默认返回较新的操作
    return op1.timestamp > op2.timestamp ? op1 : op2;
  }

  private transformInsertInsert(
    op1: CollabOperation,
    op2: CollabOperation
  ): CollabOperation {
    const pos1 = this.positionToOffset(op1.position);
    const pos2 = this.positionToOffset(op2.position);

    if (pos1 <= pos2) {
      return op1;
    } else {
      // 调整 op2 的位置
      const newPos = this.offsetToPosition(
        pos2 + (op1.content?.length || 0)
      );
      return { ...op2, position: newPos };
    }
  }

  private transformDeleteDelete(
    op1: CollabOperation,
    op2: CollabOperation
  ): CollabOperation | null {
    const pos1 = this.positionToOffset(op1.position);
    const pos2 = this.positionToOffset(op2.position);
    const len1 = op1.length || 0;
    const len2 = op2.length || 0;

    // 如果删除区域重叠，保留较早的操作
    if (pos1 < pos2 + len2 && pos2 < pos1 + len1) {
      return op1.timestamp < op2.timestamp ? op1 : null;
    }

    return op1;
  }

  private transformInsertDelete(
    insert: CollabOperation,
    del: CollabOperation
  ): CollabOperation {
    const insertPos = this.positionToOffset(insert.position);
    const deletePos = this.positionToOffset(del.position);
    const deleteLen = del.length || 0;

    // 如果插入位置在删除区域内，调整插入位置
    if (insertPos >= deletePos && insertPos < deletePos + deleteLen) {
      const newPos = this.offsetToPosition(deletePos);
      return { ...insert, position: newPos };
    }

    // 如果插入位置在删除区域后，调整插入位置
    if (insertPos >= deletePos + deleteLen) {
      const newPos = this.offsetToPosition(insertPos - deleteLen);
      return { ...insert, position: newPos };
    }

    return insert;
  }

  private transformDeleteInsert(
    del: CollabOperation,
    insert: CollabOperation
  ): CollabOperation {
    const deletePos = this.positionToOffset(del.position);
    const insertPos = this.positionToOffset(insert.position);
    const insertLen = insert.content?.length || 0;

    // 如果删除位置在插入位置后，调整删除位置
    if (deletePos >= insertPos) {
      const newPos = this.offsetToPosition(deletePos + insertLen);
      return { ...del, position: newPos };
    }

    return del;
  }

  // 简化的位置转换（假设单行）
  private positionToOffset(pos: { line: number; column: number }): number {
    return pos.line * 1000 + pos.column;
  }

  private offsetToPosition(offset: number): { line: number; column: number } {
    return {
      line: Math.floor(offset / 1000),
      column: offset % 1000,
    };
  }

  // 应用操作到内容
  applyOperation(content: string, operation: CollabOperation): string {
    const lines = content.split("\n");
    const { line, column } = operation.position;

    if (operation.type === "insert" && operation.content) {
      const currentLine = lines[line] || "";
      lines[line] =
        currentLine.slice(0, column) +
        operation.content +
        currentLine.slice(column);
    } else if (operation.type === "delete" && operation.length) {
      const currentLine = lines[line] || "";
      lines[line] =
        currentLine.slice(0, column) +
        currentLine.slice(column + operation.length);
    } else if (operation.type === "replace" && operation.content && operation.length) {
      const currentLine = lines[line] || "";
      lines[line] =
        currentLine.slice(0, column) +
        operation.content +
        currentLine.slice(column + operation.length);
    }

    return lines.join("\n");
  }
}
