# EduNexus
思维编织成网

EduNexus 是一个 **仅 Web 端** 的 AI 教育生态平台，核心目标是帮助学习者真正学会知识，而不是依赖“直接给答案”的捷径。

## 当前进展

当前仓库已经完成一期（MVP）前置工作：

- 战略方案、PRD、一期执行计划
- 一期任务板（可直接转项目管理）
- Phase 1 OpenAPI 草案
- 本地轻量知识库（Vault）目录与模板
- 可运行的 Next.js Web 端一期原型（含 Workspace / KB 闭环）
- Galaxy 风格本地 UI 组件层（统一 Hero、指标卡、策略聚焦卡视觉）
- 全站主题切换（星夜 / 晨曦）与 Dashboard 微图表（Sparkline + Ring）
- Dashboard 支持 7/14/30 天周期切换、真实日期轴、跨图联动 hover、固定日期锁定、自定义基准/跨周期同位、双日期 A/B Δ 对比、风险色阶摘要卡与自动预警面板（含策略档位、参数面板持久化、告警处理/恢复、班级/章节聚合、处置时间线）
- Workspace 支持 LangGraph 流式链路回放、暂停/继续、单步前进/回退、可拖拽进度定位、关键帧锚点跳转、回放书签命名/保存/重命名/恢复、书签筛选排序、书签批量勾选导出（全量/选中）、回放参数面板持久化、回放脚本导出、倍速与自动导出摘要
- Graph 支持关系链回放批次历史面板（来源预设自动筛选、目标/来源/模式筛选、排序、TopN 快速视图、双批次差异对比、复推到原目标/路径/工作区、JSON/Markdown 导出、跨页批次定位高亮），Path 与 Workspace 支持“回放批次历史入口”一键载入队列并回图谱定位，形成图谱回放到执行面的可复用闭环
- KB 小地图支持节点高亮、邻接关系过滤、入边/出边方向筛选、权重阈值、Top N、按主题/类型分组、章节锚点布局、章节树侧栏一键高亮子图（高亮/仅本章模式）、章节子图统计、7/14 窗口章节关系趋势、章节参数面板持久化与路径方向动画
- 新增统一配置中心（Settings）：支持三大模块参数统一编辑、策略画像（profile）新增/复制/切换/置顶/删除/恢复最近删除、单画像/整仓库导出与 JSON 导入（新增或覆盖，含冲突预览与覆盖确认）、模板包一键应用、变更历史差异对比、整包/模块级回滚、本地持久化、JSON 导入导出与默认恢复，并可广播配置变更到 Dashboard/Workspace/KB 实时生效；配置 schema 已升级到 v3（迁移注册表），兼容旧版自动迁移，并可联动全站主题切换
- Settings 导入逻辑已模块化：独立导入预览/动作判定状态引擎与单测，支持重复 ID 冲突分组、冲突明细筛选搜索/CSV 导出、导入二次确认弹层与“仅导入新增项”快捷切换、导入操作日志（最近 12 条，支持来源/模式/关键词/时间区间筛选 + 近 1/7 天快捷筛选、筛选结果 JSON 导出、单条 JSON 导出、从 JSON 草稿导回日志）与“一键回滚到导入前”、回滚影响预览（画像增删改与参数差异）+ 回滚确认弹层（逐项差异预览、筛选搜索、差异 CSV 导出、Esc 快捷关闭）、覆盖后者生效提示、按钮禁用态与错误/警告/成功提示态统一

## 配置中心 JSON 示例

### 1) 单画像包（用于“导入为策略画像”）

```json
{
  "version": 1,
  "exportedAt": "2026-02-26T12:00:00.000Z",
  "profile": {
    "id": "exam_month",
    "label": "月考备战策略包",
    "createdAt": "2026-02-20T08:00:00.000Z",
    "updatedAt": "2026-02-26T12:00:00.000Z",
    "bundle": {
      "version": 3,
      "updatedAt": "2026-02-26T12:00:00.000Z",
      "meta": {
        "profileId": "exam_month",
        "profileLabel": "月考备战策略包",
        "storageEngine": "localStorage",
        "aestheticMode": "obsidian_notebooklm"
      },
      "dashboard": {
        "alertPolicy": "strict",
        "riskPreset": "intervene",
        "riskConfig": {
          "dependencyHighThreshold": 42,
          "independentHighThreshold": 53,
          "gainHighThreshold": 58,
          "maxVisibleAlerts": 6,
          "historyLimit": 10,
          "dimensionLimit": 4
        }
      },
      "workspace": {
        "replayPreset": "deep",
        "replayConfig": {
          "maxBookmarks": 24,
          "defaultSpeed": "1x",
          "autoExportSummary": true
        }
      },
      "kb": {
        "chapterPreset": "insight",
        "chapterConfig": {
          "topNodesLimit": 6,
          "trendRowsLimit": 6,
          "defaultSubgraphMode": "focus",
          "defaultTrendSpan": 14
        }
      }
    }
  }
}
```

### 2) 画像仓库包（用于“导入画像仓库”）

```json
{
  "version": 1,
  "exportedAt": "2026-02-26T12:10:00.000Z",
  "store": {
    "version": 1,
    "activeProfileId": "exam_month",
    "profiles": [
      {
        "id": "exam_month",
        "label": "月考备战策略包",
        "createdAt": "2026-02-20T08:00:00.000Z",
        "updatedAt": "2026-02-26T12:00:00.000Z",
        "bundle": {
          "version": 3,
          "updatedAt": "2026-02-26T12:00:00.000Z",
          "meta": {
            "profileId": "exam_month",
            "profileLabel": "月考备战策略包",
            "storageEngine": "localStorage",
            "aestheticMode": "obsidian_notebooklm"
          },
          "dashboard": {
            "alertPolicy": "strict",
            "riskPreset": "intervene",
            "riskConfig": {
              "dependencyHighThreshold": 42,
              "independentHighThreshold": 53,
              "gainHighThreshold": 58,
              "maxVisibleAlerts": 6,
              "historyLimit": 10,
              "dimensionLimit": 4
            }
          },
          "workspace": {
            "replayPreset": "deep",
            "replayConfig": {
              "maxBookmarks": 24,
              "defaultSpeed": "1x",
              "autoExportSummary": true
            }
          },
          "kb": {
            "chapterPreset": "insight",
            "chapterConfig": {
              "topNodesLimit": 6,
              "trendRowsLimit": 6,
              "defaultSubgraphMode": "focus",
              "defaultTrendSpan": 14
            }
          }
        }
      },
      {
        "id": "teaching_week",
        "label": "教学周策略包",
        "createdAt": "2026-02-18T08:00:00.000Z",
        "updatedAt": "2026-02-26T12:05:00.000Z",
        "bundle": {
          "version": 3,
          "updatedAt": "2026-02-26T12:05:00.000Z",
          "meta": {
            "profileId": "teaching_week",
            "profileLabel": "教学周策略包",
            "storageEngine": "localStorage",
            "aestheticMode": "nebula"
          },
          "dashboard": {
            "alertPolicy": "balanced",
            "riskPreset": "balanced",
            "riskConfig": {
              "dependencyHighThreshold": 45,
              "independentHighThreshold": 50,
              "gainHighThreshold": 55,
              "maxVisibleAlerts": 4,
              "historyLimit": 6,
              "dimensionLimit": 4
            }
          },
          "workspace": {
            "replayPreset": "balanced",
            "replayConfig": {
              "maxBookmarks": 16,
              "defaultSpeed": "1x",
              "autoExportSummary": true
            }
          },
          "kb": {
            "chapterPreset": "balanced",
            "chapterConfig": {
              "topNodesLimit": 4,
              "trendRowsLimit": 5,
              "defaultSubgraphMode": "highlight",
              "defaultTrendSpan": 7
            }
          }
        }
      }
    ]
  }
}
```

## 关键文档

- `edu-nexus-ecosystem-web-plan-v2.md`：生态战略与产品方向
- `edu-nexus-prd-requirements-v1.md`：PRD + 页面/模块/接口需求
- `edu-nexus-phase1-delivery-plan.md`：一期执行与验收计划
- `edu-nexus-phase1-taskboard.md`：Sprint 任务板
- `openapi/edu-nexus-phase1.openapi.yaml`：核心接口规范
- `edu-nexus-local-kb-lite-design.md`：本地轻量知识库设计
- `docs/settings-config-center-guide.md`：配置中心 JSON 导入与冲突排查指南

## 项目结构（当前）

```txt
apps/web/    # Next.js Web 应用（一期实现）
openapi/     # 接口规范
vault/       # 本地知识库（Markdown-first）
docs/        # 使用说明与操作指南
*.md         # 方案与规划文档（当前在仓库根目录）
```

其中 `apps/web/src/components/galaxy-ui.tsx` 提供一期视觉基座组件（无需额外三方 UI 依赖），可按页面继续扩展。

## 本地开发（一期）

```bash
pnpm install
pnpm dev
pnpm test
pnpm test:unit
pnpm test:all
```

`pnpm test` 当前执行一期 API 冒烟测试（workspace / kb）。
`pnpm test:unit` 执行 route 单元测试（Vitest）。
`pnpm test:all` 顺序执行 unit + smoke。

访问：
- `http://localhost:3000/`（首页）
- `http://localhost:3000/workspace`（学习工作区）
- `http://localhost:3000/graph`（知识图谱）
- `http://localhost:3000/path`（学习路径）
- `http://localhost:3000/kb`（本地知识库）
- `http://localhost:3000/dashboard`（生态看板）
- `http://localhost:3000/settings`（统一配置中心）

## 已实现的一期接口

- `POST /api/workspace/session`
- `GET /api/workspace/sessions`
- `GET /api/workspace/session/{id}`
- `PATCH /api/workspace/session/{id}`
- `DELETE /api/workspace/session/{id}`
- `POST /api/workspace/socratic/next`
- `POST /api/workspace/socratic/unlock-final`
- `POST /api/workspace/agent/run`
- `POST /api/workspace/agent/stream`
- `GET /api/workspace/session/{id}/stream`
- `POST /api/workspace/note/save`
- `GET /api/graph/view`
- `GET /api/graph/node/{nodeId}`
- `POST /api/path/generate`
- `POST /api/path/replan`
- `GET /api/kb/search?q=...`
- `GET /api/kb/tags`
- `GET /api/kb/backlinks/graph`
- `GET /api/kb/doc/{id}`
- `POST /api/kb/index/rebuild`

## 本地知识库（Vault）

Vault 使用说明请查看：`vault/README.md`。

## 安全说明

- 严禁提交真实 API Key 到仓库。
- 本地使用 `.env`，仓库仅保留 `.env.example`。
- 如曾泄露 token，请先在对应平台失效并重建。
