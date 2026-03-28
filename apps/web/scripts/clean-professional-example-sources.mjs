import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const VOCAB_SOURCE = resolve(dirname(fileURLToPath(import.meta.url)), '../../../vocabulary_source');
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const EVIDENCE_DIR = resolve(REPO_ROOT, '.sisyphus/evidence');

const SOURCES = [
  { file: 'computer.csv', book: 'computer', outputKey: 'computer' },
  { file: 'economy.csv', book: 'economics', outputKey: 'economics' },
  { file: 'electrical.csv', book: 'electrical', outputKey: 'electrical' },
  { file: 'medical.csv', book: 'medical', outputKey: 'medical' },
];

const ANNOTATION_MARKERS = ['（重复校验删除，替换为）', '（医学替换为）', '（重复最终替换为）'];
const CHINESE_REGEX = /[\u4e00-\u9fff]/;

function parseCsvLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  if (fields.length > 0) {
    fields[0] = fields[0].replace(/^\uFEFF/, '');
  }
  return fields;
}

function splitFirstThreeCommas(line) {
  const parts = [];
  let current = '';
  let inQuotes = false;
  let splitCount = 0;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === ',' && !inQuotes && splitCount < 3) {
      parts.push(current.trim());
      current = '';
      splitCount += 1;
      continue;
    }

    current += ch;
  }

  parts.push(current.trim());
  return parts;
}

function normalizeField(value) {
  let text = (value ?? '').trim();
  if (text.startsWith('"') && text.endsWith('"') && text.length >= 2) {
    text = text.slice(1, -1);
  }
  return text.replace(/""/g, '"').trim();
}

function csvEscape(value) {
  const raw = value ?? '';
  if (raw.includes('"') || raw.includes(',') || raw.includes('\n') || raw.includes('\r')) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

function normalizeWordKey(word) {
  return word.toLowerCase().trim().replace(/_(\d+)$/, '');
}

function previewLine(line, max = 180) {
  const compact = line.replace(/\s+/g, ' ').trim();
  return compact.length > max ? `${compact.slice(0, max)}...` : compact;
}

function processSource(source) {
  const sourcePath = resolve(VOCAB_SOURCE, source.file);
  const raw = readFileSync(sourcePath, 'utf8');
  const lines = raw.split(/\r\n|\n|\r/);
  const nonEmptyLines = lines.filter((line) => line.trim().length > 0);

  if (nonEmptyLines.length === 0) {
    throw new Error(`Empty source file: ${source.file}`);
  }

  const headerFields = parseCsvLine(nonEmptyLines[0]);
  if (headerFields.length < 4) {
    throw new Error(`Invalid header in ${source.file}: ${nonEmptyLines[0]}`);
  }
  const header = 'Word,Pronunciation,Chinese Definition,Example Sentence';

  const cleanedRows = [];
  const lookup = {};
  const dropReasons = {
    annotation_marker: 0,
    empty_word: 0,
    chinese_in_word: 0,
    parse_error: 0,
  };
  const sampleDropped = [];

  for (let i = 1; i < nonEmptyLines.length; i++) {
    const line = nonEmptyLines[i];
    const lineNumber = i + 1;

    let reason = null;
    if (ANNOTATION_MARKERS.some((marker) => line.includes(marker))) {
      reason = 'annotation_marker';
    }

    if (!reason) {
      const parts = splitFirstThreeCommas(line);
      if (parts.length < 4) {
        reason = 'parse_error';
      } else {
        const word = normalizeField(parts[0]).replace(/^\uFEFF/, '');
        const pronunciation = normalizeField(parts[1]);
        const definition = normalizeField(parts[2]);
        const example = normalizeField(parts[3]);

        if (!word) {
          reason = 'empty_word';
        } else if (CHINESE_REGEX.test(word)) {
          reason = 'chinese_in_word';
        } else {
          cleanedRows.push([word, pronunciation, definition, example]);
          if (example) {
            lookup[normalizeWordKey(word)] = example;
          }
        }
      }
    }

    if (reason) {
      dropReasons[reason] = (dropReasons[reason] ?? 0) + 1;
      if (sampleDropped.length < 10) {
        sampleDropped.push({
          line: lineNumber,
          reason,
          preview: previewLine(line),
        });
      }
    }
  }

  const dropReasonsCompact = Object.fromEntries(
    Object.entries(dropReasons).filter(([, count]) => count > 0)
  );

  const rewritten = [
    header,
    ...cleanedRows.map((row) => row.map((field) => csvEscape(field)).join(',')),
  ].join('\n');

  writeFileSync(sourcePath, `${rewritten}\n`, 'utf8');

  const lookupPath = resolve(EVIDENCE_DIR, `professional-examples-${source.outputKey}.json`);
  writeFileSync(lookupPath, `${JSON.stringify(lookup, null, 2)}\n`, 'utf8');

  return {
    file: source.file,
    totalRows: nonEmptyLines.length - 1,
    validRows: cleanedRows.length,
    droppedRows: (nonEmptyLines.length - 1) - cleanedRows.length,
    dropReasons: dropReasonsCompact,
    sampleDropped,
  };
}

function main() {
  mkdirSync(EVIDENCE_DIR, { recursive: true });

  const report = {
    sources: [],
  };

  let totalDropped = 0;
  for (const source of SOURCES) {
    const result = processSource(source);
    report.sources.push(result);
    totalDropped += result.droppedRows;

    console.log(
      `[clean] ${source.file}: total=${result.totalRows}, valid=${result.validRows}, dropped=${result.droppedRows}`
    );
  }

  const reportPath = resolve(EVIDENCE_DIR, 'task-2-cleaning-report.json');
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  console.log(`[clean] total dropped rows: ${totalDropped}`);
  console.log(`[clean] report: ${reportPath}`);
}

main();
