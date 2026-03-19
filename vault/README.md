# EduNexus 本地知识库（Vault）

本目录是 EduNexus 的本地轻量知识库（Local-first、Markdown-first）。

## 目录约定

```txt
vault/
  notes/             # 学习笔记
  sources/           # 来源材料
  playbooks/         # 可复用方法论
  skills/            # 能力单元（类似 SKILL.md）
  daily/             # 每日复盘
  graph/             # 图谱快照导出
  index/             # 本地索引（fts/backlinks/tags）
  templates/         # 模板
```

## 使用规则

1. 所有文档均为 Markdown，包含 frontmatter。
2. 新增笔记优先使用 `templates/note-template.md`。
3. 高复用流程沉淀到 `skills/`，按 `SKILL.md` 模板编写。
4. 不要将 API 密钥或敏感个人信息写入 vault 文档。

