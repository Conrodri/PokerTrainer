/**
 * Offline pre-generation script.
 *
 * - Loads any existing pregenerated.json
 * - Deduplicates by exact card set (hero + board / both hands + board)
 * - Generates additional exercises until each pool hits TARGET
 * - Saves the result back to backend/data/pregenerated.json
 *
 * Usage:  npx ts-node src/scripts/pregenerate.ts
 */

import * as fs   from 'fs';
import * as path from 'path';
import { buildFlopExercise, buildExpertFlopExercise } from '../controllers/postflopController';
import { generateEquityExercise } from '../services/trainingService';

const OUT_FILE = path.resolve(__dirname, '../../data/pregenerated.json');

// ─── Targets ──────────────────────────────────────────────────────────────────
const TARGETS = {
  flop:       1500,
  expertFlop:  400,
  equityFr:    800,
  equityEn:    800,
};

// ─── Dedup helpers ────────────────────────────────────────────────────────────
// Cards are stored as strings ("2h", "Td", etc.) — no need to decompose them.

/** Unique key for a flop exercise: sorted union of hero cards + board cards. */
function flopKey(ex: any): string {
  return [...ex.heroHand, ...ex.board].sort().join(',');
}

/** Unique key for an equity exercise: sorted union of both hands + board. */
function equityKey(ex: any): string {
  return [...ex.hand1, ...ex.hand2, ...ex.board].sort().join(',');
}

function dedupe<T>(exercises: T[], keyFn: (ex: T) => string): { unique: T[]; dupes: number } {
  const seen = new Set<string>();
  const unique: T[] = [];
  let dupes = 0;
  for (const ex of exercises) {
    const k = keyFn(ex);
    if (seen.has(k)) { dupes++; continue; }
    seen.add(k);
    unique.push(ex);
  }
  return { unique, dupes };
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function bar(done: number, total: number, width = 30) {
  const filled = Math.round((done / total) * width);
  return '[' + '█'.repeat(filled) + '░'.repeat(width - filled) + `] ${done}/${total}`;
}

// ─── Generator ────────────────────────────────────────────────────────────────

function topUp<T>(
  label:  string,
  pool:   T[],
  target: number,
  keyFn:  (ex: T) => string,
  build:  () => T,
): T[] {
  const seen = new Set(pool.map(keyFn));
  const result = [...pool];
  let attempts = 0;
  const t0 = Date.now();

  while (result.length < target) {
    attempts++;
    const ex = build();
    const k = keyFn(ex);
    if (seen.has(k)) continue;  // skip duplicate
    seen.add(k);
    result.push(ex);
    process.stdout.write(`\r  ${label.padEnd(22)} ${bar(result.length, target)}`);
    if (attempts > target * 10) break;  // safety valve (shouldn't happen)
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  const added   = result.length - pool.length;
  process.stdout.write(`  +${added} new  (${attempts} attempts, ${elapsed}s)\n`);
  return result;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🃏  PokerPeak — exercise pre-generation (with dedup)\n');

  // Load existing
  let existing = { flop: [] as any[], expertFlop: [] as any[], equityFr: [] as any[], equityEn: [] as any[] };
  try {
    const raw = JSON.parse(fs.readFileSync(OUT_FILE, 'utf8'));
    existing = { flop: raw.flop ?? [], expertFlop: raw.expertFlop ?? [], equityFr: raw.equityFr ?? [], equityEn: raw.equityEn ?? [] };
    console.log(`  Loaded from file: flop=${existing.flop.length} expertFlop=${existing.expertFlop.length} equityFr=${existing.equityFr.length} equityEn=${existing.equityEn.length}`);
  } catch {
    console.log('  No existing file — starting from scratch.');
  }

  // Deduplicate existing
  const { unique: flop0,       dupes: d1 } = dedupe(existing.flop,       flopKey);
  const { unique: expertFlop0, dupes: d2 } = dedupe(existing.expertFlop,  flopKey);
  const { unique: equityFr0,   dupes: d3 } = dedupe(existing.equityFr,    equityKey);
  const { unique: equityEn0,   dupes: d4 } = dedupe(existing.equityEn,    equityKey);
  const totalDupes = d1 + d2 + d3 + d4;
  if (totalDupes > 0) console.log(`  Removed ${totalDupes} duplicate(s) from existing data.\n`);
  else console.log('  No duplicates found in existing data.\n');

  // Top up to target
  const flop       = topUp('Flop (non-expert)',  flop0,       TARGETS.flop,       flopKey,    buildFlopExercise);
  const expertFlop = topUp('Flop (expert)',       expertFlop0, TARGETS.expertFlop, flopKey,    buildExpertFlopExercise);
  const equityFr   = topUp('Equity FR',           equityFr0,   TARGETS.equityFr,   equityKey,  () => generateEquityExercise('fr', 'beginner'));
  const equityEn   = topUp('Equity EN',           equityEn0,   TARGETS.equityEn,   equityKey,  () => generateEquityExercise('en', 'beginner'));

  // Save
  const data = { flop, expertFlop, equityFr, equityEn, generatedAt: new Date().toISOString() };
  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(data));

  const kb    = Math.round(fs.statSync(OUT_FILE).size / 1024);
  const total = flop.length + expertFlop.length + equityFr.length + equityEn.length;
  console.log(`\n✅  ${total} unique exercises saved → ${OUT_FILE} (${kb} KB)`);
  console.log(`    flop=${flop.length}  expertFlop=${expertFlop.length}  equityFr=${equityFr.length}  equityEn=${equityEn.length}\n`);
}

main().catch(err => { console.error(err); process.exit(1); });
