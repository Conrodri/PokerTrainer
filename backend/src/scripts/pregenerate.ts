/**
 * Offline pre-generation script.
 *
 * - Loads any existing pregenerated.json
 * - Deduplicates by exact card set (hero + board)
 * - Generates additional exercises until each pool hits TARGET
 * - Saves the result back to backend/data/pregenerated.json
 *
 * Only covers the pools actually read back at runtime by
 * postflopController.ts's loadPregen() — flop, expertFlop, fullHand. Equity
 * and Preflop exercises are cheap enough (<0.01ms) to generate live, so they
 * aren't precomputed here.
 *
 * Usage:  npx ts-node src/scripts/pregenerate.ts
 */

import * as fs   from 'fs';
import * as path from 'path';
import { buildFlopExercise, buildExpertFlopExercise, buildFullHandExercise } from '../controllers/postflopController';

const OUT_FILE = path.resolve(__dirname, '../../data/pregenerated.json');

// ─── Targets ──────────────────────────────────────────────────────────────────
const TARGETS = {
  flop:        1500,
  expertFlop:   800,
  fullHand:     600,
};

// Save a checkpoint every N additions to a single pool — a crash mid-run (this
// script has hit rare native crashes on long unattended Windows runs) loses at
// most CHECKPOINT_EVERY exercises instead of the whole session.
const CHECKPOINT_EVERY = 10;

// ─── Dedup helpers ────────────────────────────────────────────────────────────
// Cards are stored as strings ("2h", "Td", etc.) — no need to decompose them.

/** Unique key for a flop exercise: sorted union of hero cards + board cards. */
function flopKey(ex: any): string {
  return [...ex.heroHand, ...ex.board].sort().join(',');
}

/** Unique key for a full-hand exercise: sorted hero + villain + community cards. */
function fullHandKey(ex: any): string {
  return [...ex.heroHand, ...ex.villainHand, ...ex.flop, ex.turn, ex.river].sort().join(',');
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

async function topUp<T>(
  label:     string,
  pool:      T[],
  target:    number,
  keyFn:     (ex: T) => string,
  build:     () => T,
  onProgress?: (result: T[]) => void,
): Promise<T[]> {
  const seen = new Set(pool.map(keyFn));
  const result = [...pool];
  let attempts = 0;
  let sinceCheckpoint = 0;
  const t0 = Date.now();

  while (result.length < target) {
    attempts++;
    const ex = build();
    const k = keyFn(ex);
    if (seen.has(k)) continue;  // skip duplicate
    seen.add(k);
    result.push(ex);
    sinceCheckpoint++;
    process.stdout.write(`\r  ${label.padEnd(22)} ${bar(result.length, target)}`);
    // Yield to the event loop periodically — mirrors the live server's pool
    // refill (setImmediate between generations). A long unbroken synchronous
    // Monte Carlo loop was correlated with rare native crashes on Windows.
    if (attempts % 20 === 0) await new Promise(resolve => setImmediate(resolve));
    if (onProgress && sinceCheckpoint >= CHECKPOINT_EVERY) {
      sinceCheckpoint = 0;
      onProgress(result);
    }
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
  let existing = {
    flop: [] as any[], expertFlop: [] as any[], fullHand: [] as any[],
  };
  try {
    const raw = JSON.parse(fs.readFileSync(OUT_FILE, 'utf8'));
    existing = {
      flop:       raw.flop       ?? [],
      expertFlop: raw.expertFlop ?? [],
      fullHand:   raw.fullHand   ?? [],
    };
    console.log(`  Loaded: flop=${existing.flop.length} expertFlop=${existing.expertFlop.length} fullHand=${existing.fullHand.length}`);
  } catch {
    console.log('  No existing file — starting from scratch.');
  }

  // Deduplicate existing
  const { unique: flop0,       dupes: d1 } = dedupe(existing.flop,       flopKey);
  const { unique: expertFlop0, dupes: d2 } = dedupe(existing.expertFlop, flopKey);
  const { unique: fullHand0,   dupes: d3 } = dedupe(existing.fullHand,   fullHandKey);
  const totalDupes = d1 + d2 + d3;
  if (totalDupes > 0) console.log(`  Removed ${totalDupes} duplicate(s) from existing data.\n`);
  else console.log('  No duplicates found in existing data.\n');

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });

  // Checkpoint state — saved to disk periodically so a mid-run crash loses at
  // most CHECKPOINT_EVERY exercises from the pool being generated, not the
  // whole session's progress.
  const checkpoint = { flop: flop0, expertFlop: expertFlop0, fullHand: fullHand0 };
  function save() {
    fs.writeFileSync(OUT_FILE, JSON.stringify({ ...checkpoint, generatedAt: new Date().toISOString() }));
  }

  // Top up to target
  checkpoint.flop       = await topUp('Flop (non-expert)', flop0,       TARGETS.flop,       flopKey,     buildFlopExercise,
    (result) => { checkpoint.flop = result; save(); });
  checkpoint.expertFlop = await topUp('Flop (expert)',      expertFlop0, TARGETS.expertFlop, flopKey,     buildExpertFlopExercise,
    (result) => { checkpoint.expertFlop = result; save(); });
  checkpoint.fullHand    = await topUp('Full Hand',          fullHand0,   TARGETS.fullHand,   fullHandKey, buildFullHandExercise,
    (result) => { checkpoint.fullHand = result; save(); });

  // Final save
  save();

  const kb    = Math.round(fs.statSync(OUT_FILE).size / 1024);
  const total = checkpoint.flop.length + checkpoint.expertFlop.length + checkpoint.fullHand.length;
  console.log(`\n✅  ${total} unique exercises saved → ${OUT_FILE} (${kb} KB)`);
  console.log(`    flop=${checkpoint.flop.length}  expertFlop=${checkpoint.expertFlop.length}  fullHand=${checkpoint.fullHand.length}\n`);
}

main().catch(err => { console.error(err); process.exit(1); });
