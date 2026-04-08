export interface OutlineItem {
  id: string;
  level: number;
  text: string;
  children: OutlineItem[];
}

export function generateHeadingIdFromText(text: string, index: number): string {
  // 移除特殊字符，转换为小写，用连字符连接
  const slug = text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s\u4e00-\u9fa5]/g, '') // 保留字母、数字、空格和中文
    .replace(/\s+/g, '-') // 空格转连字符
    .substring(0, 50); // 限制长度

  return slug ? `heading-${slug}-${index}` : `heading-${index}`;
}

function extractOutlineFromMarkdown(markdownContent: string): OutlineItem[] {
  const outline: OutlineItem[] = [];
  const stack: OutlineItem[] = [];
  let headingIndex = 0;
  let inCodeBlock = false;

  markdownContent.split(/\r?\n/).forEach((line) => {
    const trimmedLine = line.trim();

    if (/^(```|~~~)/.test(trimmedLine)) {
      inCodeBlock = !inCodeBlock;
      return;
    }

    if (inCodeBlock) {
      return;
    }

    const match = /^(#{1,6})\s+(.+?)\s*#*$/.exec(trimmedLine);
    if (!match) {
      return;
    }

    const level = match[1].length;
    const text = match[2].trim();
    const item: OutlineItem = {
      id: generateHeadingIdFromText(text, headingIndex++),
      level,
      text,
      children: [],
    };

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

function extractOutlineFromHtml(htmlContent: string): OutlineItem[] {
  const outline: OutlineItem[] = [];
  const stack: OutlineItem[] = [];
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlContent;

  const headings = tempDiv.querySelectorAll('h1, h2, h3, h4, h5, h6');

  headings.forEach((heading, index) => {
    const level = parseInt(heading.tagName.substring(1));
    const text = heading.textContent || '';
    const id = heading.getAttribute('id') || generateHeadingIdFromText(text, index);

    const item: OutlineItem = {
      id,
      level,
      text,
      children: [],
    };

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

function looksLikeHtml(content: string): boolean {
  return /<\s*h[1-6]\b/i.test(content) || /^\s*</.test(content.trim());
}

export function extractOutline(content: string): OutlineItem[] {
  if (!content) return [];

  if (looksLikeHtml(content)) {
    return extractOutlineFromHtml(content);
  }

  return extractOutlineFromMarkdown(content);
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
