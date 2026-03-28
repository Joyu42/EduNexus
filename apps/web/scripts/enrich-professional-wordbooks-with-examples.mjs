import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const VOCAB_SOURCE = resolve(SCRIPT_DIR, '../../../vocabulary_source');
const EVIDENCE_DIR = resolve(SCRIPT_DIR, '../../../.sisyphus/evidence');

const BOOKS = [
  { csv: 'computer_words_500.csv', lookup: 'professional-examples-computer.json', key: 'computer' },
  { csv: 'economics_words_500.csv', lookup: 'professional-examples-economics.json', key: 'economics' },
  { csv: 'electrical_words_500.csv', lookup: 'professional-examples-electrical.json', key: 'electrical' },
  { csv: 'medical_words_500.csv', lookup: 'professional-examples-medical.json', key: 'medical' },
];

function csvField(value) {
  if (value == null) return '';
  const str = String(value);
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function csvLine(fields) {
  return fields.map(csvField).join(',') + '\n';
}

function splitFirstThreeCommas(line) {
  const parts = [];
  let current = '';
  let splitCount = 0;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === ',' && splitCount < 3) {
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
  return (value ?? '').replace(/^\uFEFF/, '').trim();
}

function normalizeWordKey(word) {
  return word.toLowerCase().trim().replace(/_(\d+)$/, '');
}

function processBook(book) {
  const csvPath = resolve(VOCAB_SOURCE, book.csv);
  const lookupPath = resolve(EVIDENCE_DIR, book.lookup);

  const csvRaw = readFileSync(csvPath, 'utf8');
  const lookup = JSON.parse(readFileSync(lookupPath, 'utf8'));

  const lines = csvRaw.split(/\r\n|\n|\r/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) {
    throw new Error(`Empty CSV: ${book.csv}`);
  }

  const headerNormalized = lines[0].replace(/^\uFEFF/, '').trim().toLowerCase();
  if (!headerNormalized.startsWith('word,definition,phonetic')) {
    throw new Error(`Unexpected header in ${book.csv}: ${lines[0]}`);
  }

  let examplesFilledCount = 0;
  let examplesMissingCount = 0;
  const dataRows = [];

  for (let i = 1; i < lines.length; i++) {
    const parts = splitFirstThreeCommas(lines[i]);
    if (parts.length < 3) {
      throw new Error(`Invalid row in ${book.csv} at line ${i + 1}: ${lines[i]}`);
    }

    const word = normalizeField(parts[0]);
    const definition = normalizeField(parts[1]);
    const phonetic = normalizeField(parts[2]);

    const normalizedKey = normalizeWordKey(word);
    const example = lookup[normalizedKey] ?? '';

    if (example) {
      examplesFilledCount += 1;
    } else {
      examplesMissingCount += 1;
    }

    dataRows.push([word, definition, phonetic, example]);
  }

  let rewritten = '';
  rewritten += csvLine(['word', 'definition', 'phonetic', 'example']);
  for (const row of dataRows) {
    rewritten += csvLine(row);
  }

  writeFileSync(csvPath, rewritten, 'utf8');

  return {
    key: book.key,
    baseRowCount: dataRows.length,
    examplesFilledCount,
    examplesMissingCount,
  };
}

function main() {
  mkdirSync(EVIDENCE_DIR, { recursive: true });

  const coverage = { books: [] };
  for (const book of BOOKS) {
    const result = processBook(book);
    coverage.books.push(result);
    console.log(
      `[enrich] ${book.key}: rows=${result.baseRowCount}, filled=${result.examplesFilledCount}, missing=${result.examplesMissingCount}`
    );
  }

  const coveragePath = resolve(EVIDENCE_DIR, 'task-3-enrich-coverage.json');
  writeFileSync(coveragePath, `${JSON.stringify(coverage, null, 2)}\n`, 'utf8');
  console.log(`[enrich] coverage: ${coveragePath}`);
}

main();
