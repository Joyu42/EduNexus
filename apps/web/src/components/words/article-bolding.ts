const BOLD_SPAN_RE = /\*\*[\s\S]+?\*\*/g;

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function compareTerms(a: string, b: string) {
  if (b.length !== a.length) return b.length - a.length;
  return a.localeCompare(b, "en");
}

function isEnglishWord(term: string) {
  return /^[A-Za-z0-9_]+$/.test(term);
}

function boldPlainText(text: string, learnedWords: string[]) {
  if (!text || learnedWords.length === 0) return text;

  const sorted = [...new Set(learnedWords.map((word) => word.trim()).filter(Boolean))].sort(compareTerms);
  if (sorted.length === 0) return text;

  const occupied = new Array<boolean>(text.length).fill(false);
  const ranges: Array<{ start: number; end: number }> = [];

  for (const term of sorted) {
    if (isEnglishWord(term)) {
      const pattern = new RegExp(`(?<![\\p{L}\\p{N}_])${escapeRegExp(term)}(?![\\p{L}\\p{N}_])`, "giu");
      for (const match of text.matchAll(pattern)) {
        const start = match.index ?? -1;
        if (start < 0) continue;
        const end = start + match[0].length;
        if (occupied.slice(start, end).some(Boolean)) continue;
        for (let i = start; i < end; i += 1) occupied[i] = true;
        ranges.push({ start, end });
      }
      continue;
    }

    let start = 0;
    while (start < text.length) {
      const index = text.indexOf(term, start);
      if (index === -1) break;
      const end = index + term.length;
      if (!occupied.slice(index, end).some(Boolean)) {
        for (let i = index; i < end; i += 1) occupied[i] = true;
        ranges.push({ start: index, end });
      }
      start = index + Math.max(1, term.length);
    }
  }

  if (ranges.length === 0) return text;

  ranges.sort((a, b) => a.start - b.start || a.end - b.end);

  let result = "";
  let cursor = 0;

  for (const range of ranges) {
    if (range.start < cursor) continue;
    result += text.slice(cursor, range.start);
    result += `**${text.slice(range.start, range.end)}**`;
    cursor = range.end;
  }

  result += text.slice(cursor);
  return result;
}

export function boldLearnedWords(content: string, learnedWords: string[]) {
  if (!content || learnedWords.length === 0) return content;

  let result = "";
  let lastIndex = 0;

  for (const match of content.matchAll(BOLD_SPAN_RE)) {
    const start = match.index ?? 0;
    const end = start + match[0].length;
    result += boldPlainText(content.slice(lastIndex, start), learnedWords);
    result += match[0];
    lastIndex = end;
  }

  result += boldPlainText(content.slice(lastIndex), learnedWords);
  return result;
}
