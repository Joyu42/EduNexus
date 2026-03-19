import { fail, ok } from "@/lib/server/response";
import { searchVault } from "@/lib/server/kb-lite";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim();
    const type = searchParams.get("type")?.trim() || undefined;
    const domain = searchParams.get("domain")?.trim() || undefined;
    const tag = searchParams.get("tag")?.trim() || undefined;
    const tags = searchParams.get("tags")?.trim(); // 支持多标签
    const logicMode = searchParams.get("logic")?.trim() as "AND" | "OR" | undefined;
    const startDate = searchParams.get("startDate")?.trim();
    const endDate = searchParams.get("endDate")?.trim();
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const sortBy = searchParams.get("sortBy")?.trim() as "relevance" | "date" | "title" | undefined;

    if (!q) {
      return fail({
        code: "INVALID_REQUEST",
        message: "缺少查询参数 q。"
      });
    }

    // 解析多标签
    const tagArray = tags ? tags.split(",").map(t => t.trim()).filter(Boolean) : (tag ? [tag] : []);

    // 执行搜索
    const result = await searchVault(q, { type, domain, tag: tagArray[0] });

    // 应用额外的筛选逻辑
    let candidates = result.candidates;

    // 多标签筛选
    if (tagArray.length > 1) {
      // 这里需要扩展 searchVault 来支持多标签，暂时简化处理
      // 实际应用中需要在 kb-lite.ts 中添加对多标签的支持
    }

    // 日期范围筛选
    if (startDate || endDate) {
      const start = startDate ? new Date(startDate).getTime() : 0;
      const end = endDate ? new Date(endDate).getTime() : Date.now();
      // 这里需要文档包含日期信息，暂时跳过
    }

    // 限制结果数量
    candidates = candidates.slice(0, limit);

    // 排序
    if (sortBy === "date") {
      // 需要文档包含日期信息
    } else if (sortBy === "title") {
      candidates.sort((a, b) => a.docId.localeCompare(b.docId, "zh-CN"));
    }
    // 默认按相关性排序（已经在 searchVault 中完成）

    return ok({
      ...result,
      candidates,
      meta: {
        total: candidates.length,
        limit,
        sortBy: sortBy || "relevance",
        filters: {
          tags: tagArray,
          logicMode: logicMode || "AND",
          dateRange: startDate && endDate ? { start: startDate, end: endDate } : null,
        }
      }
    });
  } catch (error) {
    return fail(
      {
        code: "KB_SEARCH_FAILED",
        message: "知识库检索失败。",
        details: error instanceof Error ? error.message : error
      },
      500
    );
  }
}
