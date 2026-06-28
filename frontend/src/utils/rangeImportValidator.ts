/**
 * Security-hardened validator for PokerTrainer range import files.
 *
 * Defence layers:
 *  1. File size + extension check before any parsing
 *  2. Prototype-pollution scan on raw text before JSON.parse
 *  3. Strict structural validation (type guards at every level)
 *  4. String sanitization  — control chars stripped, length capped
 *  5. Numeric validation   — finite, within sensible bounds, no NaN / ±Infinity
 *  6. Cell array validation — exactly 169 values, each in [0, 1]
 *  7. Position key allowlist — only the 6 known positions accepted
 *  8. Depth / count limits  — can't have 10 000 stack ranges
 *  9. Output built into fresh Object.create(null) maps to avoid prototype pollution
 */

// ─── Constants ────────────────────────────────────────────────────────────────

export const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB hard cap
const CELLS_COUNT      = 169;                         // 13×13 range matrix, flattened
const MAX_STACK_RANGES = 10;                          // per profile
const MAX_STR_NAME     = 80;
const MAX_STR_LABEL    = 60;
const MAX_STACK_BB     = 5_000;                       // absurd upper bound in big blinds

const VALID_POSITIONS  = new Set([
  'UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB',
  // 8-max custom-range storage keys (format-namespaced, independent from 6-max).
  '8max:UTG', '8max:UTG1', '8max:LJ', '8max:HJ', '8max:CO', '8max:BTN', '8max:SB',
]);
const RESERVED_KEYS    = new Set(['__proto__', 'constructor', 'prototype']);

// ─── Exported validated shapes ────────────────────────────────────────────────

export interface ValidatedStackRange {
  label:    string;
  stackMin: number;
  stackMax: number | null;
  data:     Record<string, number[]>; // position → 169-cell flat array
}

export interface ValidatedProfile {
  name:        string;
  mode:        'standard' | 'expert';
  stackRanges: ValidatedStackRange[];
}

export interface ValidatedSimpleRange {
  data: Record<string, number[]>;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function assertNoReservedKeys(obj: Record<string, unknown>, context: string): void {
  for (const key of Object.keys(obj)) {
    if (RESERVED_KEYS.has(key))
      throw new Error(`${context}: forbidden key "${key}"`);
  }
}

function sanitizeStr(value: unknown, field: string, maxLen: number): string {
  if (typeof value !== 'string')
    throw new Error(`${field}: expected a string, got ${typeof value}`);

  // Strip null bytes and ASCII control characters (except \t \n \r which are harmless)
  const cleaned = value
    .replace(/\x00/g, '')                      // null bytes
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // other control chars
    .trim();

  if (cleaned.length === 0)
    throw new Error(`${field}: must not be empty after sanitization`);
  if (cleaned.length > maxLen)
    throw new Error(`${field}: too long (${cleaned.length} chars, max ${maxLen})`);

  return cleaned;
}

function validateFiniteNumber(
  value: unknown, field: string, min: number, max: number,
): number {
  if (typeof value !== 'number')
    throw new Error(`${field}: expected a number, got ${typeof value}`);
  if (!Number.isFinite(value))
    throw new Error(`${field}: must be a finite number (got ${value})`);
  if (value < min || value > max)
    throw new Error(`${field}: ${value} is out of range [${min}, ${max}]`);
  return value;
}

// `maxVal` is 1 for frequency ranges (open positions / profiles) and 4 for
// simple ranges, whose BB position stores defense category codes (0-4).
// `count` is 169 for standard ranges and 676 (169×4) for expert frequency mixes.
function validateCells(value: unknown, field: string, maxVal = 1, count = CELLS_COUNT): number[] {
  if (!Array.isArray(value))
    throw new Error(`${field}: expected an array`);
  if (value.length !== count)
    throw new Error(`${field}: expected exactly ${count} values, got ${value.length}`);

  // Validate every cell in [0, maxVal] — no NaN, no Infinity
  return value.map((v, i) => validateFiniteNumber(v, `${field}[${i}]`, 0, maxVal));
}

function validatePositionData(value: unknown, field: string, maxVal = 1, count = CELLS_COUNT): Record<string, number[]> {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    throw new Error(`${field}: expected a plain object`);

  const obj = value as Record<string, unknown>;
  assertNoReservedKeys(obj, field);

  const result: Record<string, number[]> = Object.create(null);

  for (const [pos, cells] of Object.entries(obj)) {
    if (!VALID_POSITIONS.has(pos))
      throw new Error(`${field}: unknown position "${pos}" — allowed: ${[...VALID_POSITIONS].join(', ')}`);
    result[pos] = validateCells(cells, `${field}.${pos}`, maxVal, count);
  }

  return result;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Step 1 — call this BEFORE reading the file content.
 * Throws a user-friendly error if the file is too large or has the wrong extension.
 */
export function validateFileMeta(file: File): void {
  if (file.size > MAX_FILE_SIZE_BYTES)
    throw new Error(
      `File is too large (${(file.size / 1024).toFixed(0)} KB). Maximum allowed: ${MAX_FILE_SIZE_BYTES / 1024} KB.`,
    );

  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext !== 'json')
    throw new Error(`Invalid file extension ".${ext ?? ''}". Only .json files are accepted.`);
}

/**
 * Step 2 — safe JSON.parse.
 * Rejects the raw text if it contains prototype-pollution patterns before parsing.
 */
export function safeJsonParse(text: string): unknown {
  // Fast regex scan before handing to JSON.parse
  if (/"\s*__proto__\s*"\s*:/i.test(text))
    throw new Error('Forbidden pattern "__proto__" detected in file.');
  if (/"\s*constructor\s*"\s*:/i.test(text))
    throw new Error('Forbidden pattern "constructor" detected in file.');
  if (/"\s*prototype\s*"\s*:/i.test(text))
    throw new Error('Forbidden pattern "prototype" detected in file.');

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('File is not valid JSON.');
  }
  return parsed;
}

/**
 * Step 3a — validate a profile export.
 * Returns a sanitized, type-safe object ready to send to the API.
 */
export function validateProfileImport(raw: unknown): ValidatedProfile {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw))
    throw new Error('Root: expected a JSON object.');

  const obj = raw as Record<string, unknown>;
  assertNoReservedKeys(obj, 'root');

  if (obj.type !== 'pokertrainer-profile')
    throw new Error(`type: expected "pokertrainer-profile", got "${String(obj.type)}".`);
  if (obj.version !== 1)
    throw new Error(`version: only version 1 is supported (got ${String(obj.version)}).`);

  const name = sanitizeStr(obj.name, 'name', MAX_STR_NAME);
  const mode: 'standard' | 'expert' = obj.mode === 'expert' ? 'expert' : 'standard';
  const cellCount = mode === 'expert' ? CELLS_COUNT * 4 : CELLS_COUNT; // 676 vs 169
  // Expert mixes are frequencies (0-1); standard cells may carry BB defense codes (0-4).
  const maxVal = mode === 'expert' ? 1 : 4;

  if (!Array.isArray(obj.stackRanges))
    throw new Error('stackRanges: expected an array.');
  if (obj.stackRanges.length === 0)
    throw new Error('stackRanges: must contain at least one range.');
  if (obj.stackRanges.length > MAX_STACK_RANGES)
    throw new Error(`stackRanges: too many entries (${obj.stackRanges.length}, max ${MAX_STACK_RANGES}).`);

  const stackRanges: ValidatedStackRange[] = obj.stackRanges.map(
    (sr: unknown, i: number) => {
      if (typeof sr !== 'object' || sr === null || Array.isArray(sr))
        throw new Error(`stackRanges[${i}]: expected an object.`);

      const srObj = sr as Record<string, unknown>;
      assertNoReservedKeys(srObj, `stackRanges[${i}]`);

      const label    = sanitizeStr(srObj.label, `stackRanges[${i}].label`, MAX_STR_LABEL);
      const stackMin = validateFiniteNumber(srObj.stackMin, `stackRanges[${i}].stackMin`, 0, MAX_STACK_BB);
      const stackMax = srObj.stackMax === null
        ? null
        : validateFiniteNumber(srObj.stackMax, `stackRanges[${i}].stackMax`, 0, MAX_STACK_BB);

      if (stackMax !== null && stackMax <= stackMin)
        throw new Error(`stackRanges[${i}]: stackMax (${stackMax}) must be greater than stackMin (${stackMin}).`);

      const data = validatePositionData(srObj.data, `stackRanges[${i}].data`, maxVal, cellCount);

      return { label, stackMin, stackMax, data };
    },
  );

  return { name, mode, stackRanges };
}

/**
 * Step 3b — validate a simple-range export.
 * Returns a sanitized, type-safe object ready to send to the API.
 */
export function validateSimpleRangeImport(raw: unknown): ValidatedSimpleRange {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw))
    throw new Error('Root: expected a JSON object.');

  const obj = raw as Record<string, unknown>;
  assertNoReservedKeys(obj, 'root');

  if (obj.type !== 'pokertrainer-simple-range')
    throw new Error(`type: expected "pokertrainer-simple-range", got "${String(obj.type)}".`);
  if (obj.version !== 1)
    throw new Error(`version: only version 1 is supported (got ${String(obj.version)}).`);

  const data = validatePositionData(obj.data, 'data', 4); // BB uses category codes 0-4

  if (Object.keys(data).length === 0)
    throw new Error('data: must contain at least one position.');

  return { data };
}

/**
 * Step 3c — validate an import for the COMPLEX (profiles) module.
 * Accepts a profile export OR a simple-range export (converted to a one-tier
 * standard profile). A simple range may be imported into the complex module,
 * but NOT the reverse — the simple module only accepts simple-range files.
 */
export function validateComplexImport(raw: unknown): ValidatedProfile {
  const isObj = typeof raw === 'object' && raw !== null && !Array.isArray(raw);
  if (isObj && (raw as Record<string, unknown>).type === 'pokertrainer-simple-range') {
    const simple = validateSimpleRangeImport(raw);
    return {
      name: 'Range simple',
      mode: 'standard',
      stackRanges: [{ label: 'Tous', stackMin: 0, stackMax: null, data: simple.data }],
    };
  }
  return validateProfileImport(raw);
}
