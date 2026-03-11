/**
 * 文档大纲提取工具
 * 从 HTML 内容中提取标题结构
 */

export interface OutlineItem {
  id: string;
  level: number;
  text: string;
  children: OutlineItem[];
}

/**
 * 从 HTML 内容中提取大纲
 */
export function extractOutline(htmlContent: string): OutlineItem[] {
  if (!htmlContent) return [];

  // 创建临时 DOM 元素
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlContent;

  // 查找所有标题元素
  const headings = tempDiv.querySelectorAll('h1, h2, h3, h4, h5, h6');

  const outline: OutlineItem[] = [];
  const stack: OutlineItem[] = [];

  headings.forEach((heading, index) => {
    const level = parseInt(heading.tagName.substring(1));
    const text = heading.textContent || '';
    const id = `heading-${index}`;

    const item: OutlineItem = {
      id,
      level,
      text,
      children: [],
    };

    // 找到合适的父节点
    while (stack.length > 0 && stack[stack.length - 1].level >= level) {
      stack.pop();
    }

    if (stack.length === 0) {
      outline.push(item);
    } else {
      stack[stack.length - 1].children.push(item);
    }

    stack.push(item);
  });

  return outline;
}

/**
 * 将大纲转换为扁平列表（用于导航）
 */
export function flattenOutline(outline: OutlineItem[]): OutlineItem[] {
  const result: OutlineItem[] = [];

  function traverse(items: OutlineItem[]) {
    items.forEach(item => {
      result.push(item);
      if (item.children.length > 0) {
        traverse(item.children);
      }
    });
  }

  traverse(outline);
  return result;
}
