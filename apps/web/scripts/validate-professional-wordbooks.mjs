#!/usr/bin/env node
/**
 * Validate professional wordbook CSV files.
 * 
 * Validates:
 * - vocabulary_source/computer_words_500.csv
 * - vocabulary_source/economics_words_500.csv
 * - vocabulary_source/electrical_words_500.csv
 * - vocabulary_source/medical_words_500.csv
 * 
 * Requirements:
 * - Header: word,definition,phonetic,example (BOM-stripped comparison)
 * - MIN_ROWS = 1 (fail if 0 data rows); warn if < 100
 * - 4 columns per row (quote-aware parser)
 * - Non-empty: word, definition, example
 * - No forbidden annotation markers
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..', '..');

// Files to validate
const FILES = [
  'vocabulary_source/computer_words_500.csv',
  'vocabulary_source/economics_words_500.csv',
  'vocabulary_source/electrical_words_500.csv',
  'vocabulary_source/medical_words_500.csv',
];

// Constants
const MIN_ROWS = 1;
const EXPECTED_HEADER = 'word,definition,phonetic,example';
const FORBIDDEN_PATTERNS = [
  '{{', '}}', '[[', ']]', '【', '】',
  '<', '>', '{tab}', '{newline}',
];

// Quote-aware CSV line parser (RFC4180-ish)
function parseCsvLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        fields.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
  }
  
  fields.push(current.trim());
  return fields;
}

// Strip UTF-8 BOM from string
function stripBOM(str) {
  return str.replace(/^\uFEFF/, '');
}

// Check if line has forbidden annotation markers
function hasForbiddenPatterns(line) {
  return FORBIDDEN_PATTERNS.some(pattern => line.includes(pattern));
}

// Validate a single file
function validateFile(filePath) {
  const errors = [];
  const warnings = [];
  
  let content;
  try {
    content = readFileSync(filePath, 'utf-8');
  } catch (err) {
    errors.push(`Cannot read file: ${err.message}`);
    return { errors, warnings, valid: false };
  }
  
  const lines = content.split(/\r?\n/).filter(line => line.length > 0);
  
  if (lines.length === 0) {
    errors.push('File is empty');
    return { errors, warnings, valid: false };
  }
  
  // Check header (strip BOM before comparison)
  const header = stripBOM(lines[0]);
  if (header !== EXPECTED_HEADER) {
    errors.push(`Header mismatch: expected "${EXPECTED_HEADER}", got "${header}"`);
  }
  
  // Check row count
  const dataRows = lines.length - 1; // exclude header
  if (dataRows < MIN_ROWS) {
    errors.push(`Row count (${dataRows}) is below minimum (${MIN_ROWS})`);
  } else if (dataRows < 100) {
    warnings.push(`Row count (${dataRows}) is below 100`);
  }
  
  // Validate each data row
  for (let i = 1; i < lines.length; i++) {
    const lineNum = i + 1;
    const line = lines[i];
    
    // Check for forbidden patterns (skip quote-aware check for this)
    if (hasForbiddenPatterns(line)) {
      errors.push(`Line ${lineNum}: contains forbidden annotation markers`);
      continue;
    }
    
    // Parse with quote-awareness
    const fields = parseCsvLine(line);
    
    if (fields.length !== 4) {
      errors.push(`Line ${lineNum}: expected 4 columns, got ${fields.length}: "${line}"`);
      continue;
    }
    
    const [word, definition, phonetic, example] = fields;
    
    if (!word || word.length === 0) {
      errors.push(`Line ${lineNum}: empty word field`);
    }
    
    if (!definition || definition.length === 0) {
      errors.push(`Line ${lineNum}: empty definition field`);
    }
    
    if (!example || example.length === 0) {
      errors.push(`Line ${lineNum}: empty example field (non-empty example is required)`);
    }
  }
  
  return {
    errors,
    warnings,
    valid: errors.length === 0,
    dataRows,
  };
}

// Main validation
let allValid = true;

for (const file of FILES) {
  const filePath = resolve(ROOT, file);
  console.log(`\nValidating: ${file}`);
  
  const result = validateFile(filePath);
  
  if (result.valid) {
    console.log(`  ✓ Valid (${result.dataRows} data rows)`);
    if (result.warnings.length > 0) {
      result.warnings.forEach(w => console.log(`  ⚠ ${w}`));
    }
  } else {
    console.log(`  ✗ Invalid`);
    result.errors.forEach(e => console.log(`  ✗ ${e}`));
    allValid = false;
  }
}

console.log('\n' + '='.repeat(50));
if (allValid) {
  console.log('✓ All files passed validation');
  process.exit(0);
} else {
  console.log('✗ Validation failed');
  process.exit(1);
}
