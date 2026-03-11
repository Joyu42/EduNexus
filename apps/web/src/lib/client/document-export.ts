/**
 * 文档导出功能
 * 支持导出为 Markdown、HTML、PDF
 */

import { KBDocument } from "./kb-storage";

/**
 * 导出为 Markdown
 */
export function exportAsMarkdown(doc: KBDocument): void {
  const content = `# ${doc.title}\n\n${doc.content}\n\n---\n\n标签: ${doc.tags.join(", ")}\n创建时间: ${doc.createdAt.toLocaleString()}\n更新时间: ${doc.updatedAt.toLocaleString()}`;

  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  downloadBlob(blob, `${doc.title}.md`);
}

/**
 * 导出为 HTML
 */
export function exportAsHTML(doc: KBDocument): void {
  // 简单的 Markdown 到 HTML 转换
  const htmlContent = convertMarkdownToHTML(doc.content);

  const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${doc.title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      color: #333;
    }
    h1, h2, h3, h4, h5, h6 {
      margin-top: 24px;
      margin-bottom: 16px;
      font-weight: 600;
      line-height: 1.25;
    }
    h1 { font-size: 2em; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
    h2 { font-size: 1.5em; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
    h3 { font-size: 1.25em; }
    code {
      background-color: #f6f8fa;
      padding: 0.2em 0.4em;
      border-radius: 3px;
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
      font-size: 85%;
    }
    pre {
      background-color: #f6f8fa;
      padding: 16px;
      border-radius: 6px;
      overflow: auto;
    }
    pre code {
      background-color: transparent;
      padding: 0;
    }
    blockquote {
      border-left: 4px solid #dfe2e5;
      padding-left: 16px;
      color: #6a737d;
      margin: 0;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 16px 0;
    }
    table th, table td {
      border: 1px solid #dfe2e5;
      padding: 8px 12px;
    }
    table th {
      background-color: #f6f8fa;
      font-weight: 600;
    }
    .metadata {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #eaecef;
      color: #6a737d;
      font-size: 0.9em;
    }
    .tags {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 8px;
    }
    .tag {
      background-color: #f1f8ff;
      color: #0366d6;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 0.85em;
    }
  </style>
</head>
<body>
  <h1>${doc.title}</h1>
  ${htmlContent}
  <div class="metadata">
    <div><strong>创建时间:</strong> ${doc.createdAt.toLocaleString()}</div>
    <div><strong>更新时间:</strong> ${doc.updatedAt.toLocaleString()}</div>
    ${
      doc.tags.length > 0
        ? `
    <div><strong>标签:</strong></div>
    <div class="tags">
      ${doc.tags.map((tag) => `<span class="tag">${tag}</span>`).join("")}
    </div>
    `
        : ""
    }
  </div>
</body>
</html>
  `.trim();

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  downloadBlob(blob, `${doc.title}.html`);
}

/**
 * 导出为 PDF (使用浏览器打印功能)
 */
export function exportAsPDF(doc: KBDocument): void {
  // 创建临时窗口
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("请允许弹出窗口以导出 PDF");
    return;
  }

  const htmlContent = convertMarkdownToHTML(doc.content);

  const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>${doc.title}</title>
  <style>
    @media print {
      body { margin: 0; }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      color: #333;
    }
    h1, h2, h3, h4, h5, h6 {
      margin-top: 24px;
      margin-bottom: 16px;
      font-weight: 600;
      line-height: 1.25;
      page-break-after: avoid;
    }
    h1 { font-size: 2em; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
    h2 { font-size: 1.5em; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
    h3 { font-size: 1.25em; }
    code {
      background-color: #f6f8fa;
      padding: 0.2em 0.4em;
      border-radius: 3px;
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
      font-size: 85%;
    }
    pre {
      background-color: #f6f8fa;
      padding: 16px;
      border-radius: 6px;
      overflow: auto;
      page-break-inside: avoid;
    }
    pre code {
      background-color: transparent;
      padding: 0;
    }
    blockquote {
      border-left: 4px solid #dfe2e5;
      padding-left: 16px;
      color: #6a737d;
      margin: 0;
      page-break-inside: avoid;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 16px 0;
      page-break-inside: avoid;
    }
    table th, table td {
      border: 1px solid #dfe2e5;
      padding: 8px 12px;
    }
    table th {
      background-color: #f6f8fa;
      font-weight: 600;
    }
    .metadata {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #eaecef;
      color: #6a737d;
      font-size: 0.9em;
      page-break-before: avoid;
    }
  </style>
</head>
<body>
  <h1>${doc.title}</h1>
  ${htmlContent}
  <div class="metadata">
    <div><strong>创建时间:</strong> ${doc.createdAt.toLocaleString()}</div>
    <div><strong>更新时间:</strong> ${doc.updatedAt.toLocaleString()}</div>
    ${doc.tags.length > 0 ? `<div><strong>标签:</strong> ${doc.tags.join(", ")}</div>` : ""}
  </div>
  <script>
    window.onload = function() {
      window.print();
    };
  </script>
</body>
</html>
  `.trim();

  printWindow.document.write(html);
  printWindow.document.close();
}

/**
 * 简单的 Markdown 到 HTML 转换
 */
function convertMarkdownToHTML(markdown: string): string {
  let html = markdown;

  // 代码块
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre><code class="language-${lang || "text"}">${escapeHtml(code.trim())}</code></pre>`;
  });

  // 行内代码
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // 标题
  html = html.replace(/^### (.*$)/gim, "<h3>$1</h3>");
  html = html.replace(/^## (.*$)/gim, "<h2>$1</h2>");
  html = html.replace(/^# (.*$)/gim, "<h1>$1</h1>");

  // 粗体
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

  // 斜体
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");

  // 删除线
  html = html.replace(/~~([^~]+)~~/g, "<del>$1</del>");

  // 链接
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // 图片
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');

  // 引用
  html = html.replace(/^> (.*$)/gim, "<blockquote>$1</blockquote>");

  // 无序列表
  html = html.replace(/^\* (.*$)/gim, "<li>$1</li>");
  html = html.replace(/(<li>.*<\/li>)/s, "<ul>$1</ul>");

  // 有序列表
  html = html.replace(/^\d+\. (.*$)/gim, "<li>$1</li>");

  // 段落
  html = html.replace(/\n\n/g, "</p><p>");
  html = `<p>${html}</p>`;

  // 换行
  html = html.replace(/\n/g, "<br>");

  return html;
}

/**
 * HTML 转义
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * 下载 Blob
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 批量导出文档
 */
export async function exportMultipleDocuments(
  docs: KBDocument[],
  format: "markdown" | "html"
): Promise<void> {
  // 这里可以使用 JSZip 库来创建 ZIP 文件
  // 简化版：逐个导出
  for (const doc of docs) {
    if (format === "markdown") {
      exportAsMarkdown(doc);
    } else {
      exportAsHTML(doc);
    }
    // 添加延迟避免浏览器阻止多个下载
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}
