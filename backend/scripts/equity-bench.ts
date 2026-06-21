/* Correctness + speed harness for the Monte-Carlo equity engine.
 * Run with: npx ts-node scripts/equity-bench.ts
 *
 * Correctness:
 *  - deterministic 7-card evaluator checks (exact, must always hold)
 *  - known pre-flop matchup equities at high sim count (statistical, ±tolerance)
 * Speed:
 *  - replicates the postflop "8 villains × 300 runouts" pattern and times it.
 */
import { Card } from '../src/types';
import { calculateEquity } from '../src/services/poker/equity';
import { evaluateBestHand, compareHands, bestScore } from '../src/services/poker/handEvaluator';
import { createDeck, removeCards, shuffleDeck } from '../src/services/poker/cards';
import { preflopEquityResult } from '../src/services/poker/preflopEquity';

let failures = 0;
function check(name: string, cond: boolean, extra = '') {
  console.log(`${cond ? '  ✅' : '  ❌'} ${name}${extra ? ' — ' + extra : ''}`);
  if (!cond) failures++;
}

// ── Deterministic evaluator checks ───────────────────────────────────────────
console.log('Deterministic evaluator:');
{
  const royal = evaluateBestHand(['Ah','Kh','Qh','Jh','Th','2c','3d'] as Card[]);
  check('royal flush detected', royal.description.includes('Royal'), royal.description);

  const quads = evaluateBestHand(['9h','9d','9c','9s','Kh','2c','3d'] as Card[]);
  check('four of a kind detected', quads.description.includes('Four'), quads.description);

  const boat = evaluateBestHand(['Kh','Kd','Kc','2s','2h','7c','8d'] as Card[]);
  check('full house detected', boat.description.includes('Full'), boat.description);

  const wheel = evaluateBestHand(['Ah','2d','3c','4s','5h','Kc','Qd'] as Card[]);
  check('wheel straight detected', wheel.description.includes('Straight'), wheel.description);

  // Straight flush beats four of a kind
  const sf = ['8h','7h','6h','5h','4h','Ac','Ad'] as Card[];
  const fk = ['Ac','Ad','As','Ah','Kd','2c','3d'] as Card[];
  check('straight flush > quads', compareHands(sf, fk) === 1);

  // Identical best hand (both play the board) → tie
  const t1 = ['2c','3d','Ah','Kh','Qh','Jh','Th'] as Card[];
  const t2 = ['4c','5d','Ah','Kh','Qh','Jh','Th'] as Card[];
  check('shared royal board → tie', compareHands(t1, t2) === 0);
}

// ── Fuzz: lean scorer must match the rich evaluator exactly ──────────────────
console.log('\nFuzz: bestScore() === evaluateBestHand().score (200k random 7-card hands):');
{
  const fullDeck = createDeck();
  let mismatches = 0;
  for (let n = 0; n < 200000; n++) {
    const seven = shuffleDeck(fullDeck).slice(0, 7);
    const lean = bestScore(seven);
    const rich = evaluateBestHand(seven).score;
    if (lean !== rich) {
      mismatches++;
      if (mismatches <= 5) console.log(`     mismatch: ${seven.join(' ')} lean=${lean} rich=${rich}`);
    }
  }
  check('200k hands score-identical (lean vs rich)', mismatches === 0, `${mismatches} mismatch(es)`);
}

// ── Statistical equity checks (high sim count) ───────────────────────────────
console.log('\nKnown pre-flop equities (50k sims, ±2%):');
function eqWithin(name: string, h1: [Card,Card], h2: [Card,Card], expected: number, tol = 2) {
  const r = calculateEquity(h1, h2, [], 50000);
  const got = r.hand1WinPct + r.tiePct / 2;
  check(`${name} ≈ ${expected}%`, Math.abs(got - expected) <= tol, `got ${got.toFixed(1)}%`);
}
eqWithin('AA vs KK', ['Ah','Ad'], ['Kh','Kd'], 82);
eqWithin('AKs vs QQ', ['Ah','Kh'], ['Qd','Qc'], 46);
eqWithin('AKo vs JJ', ['Ah','Kd'], ['Jh','Jc'], 43); // pair is ~57/43 favorite
eqWithin('72o vs AKo', ['7h','2d'], ['Ac','Kd'], 33);

// ── Preflop hard-coded table: accuracy vs MC + lookup speed ──────────────────
console.log('\nPreflop table — lookup vs 50k MC (±2%):');
function tableVsMC(name: string, h1: [Card, Card], h2: [Card, Card], tol = 2) {
  const tb = preflopEquityResult(h1, h2);
  const tEq = tb.hand1WinPct + tb.tiePct / 2;
  const mc = calculateEquity(h1, h2, [], 50000);
  const mEq = mc.hand1WinPct + mc.tiePct / 2;
  check(name, Math.abs(tEq - mEq) <= tol, `table ${tEq.toFixed(1)}% vs MC ${mEq.toFixed(1)}%`);
}
tableVsMC('AA vs KK', ['Ah', 'Ad'], ['Kh', 'Kd']);
tableVsMC('AKs vs QQ', ['Ah', 'Kh'], ['Qd', 'Qc']);
tableVsMC('AKo vs JJ', ['Ah', 'Kd'], ['Jh', 'Jc']);
tableVsMC('72o vs AKo', ['7h', '2d'], ['Ac', 'Kd']);
tableVsMC('JTs vs 99', ['Jh', 'Th'], ['9d', '9c']);
tableVsMC('A5s vs KQo', ['Ah', '5h'], ['Kd', 'Qc']);
{
  const pairs: [[Card, Card], [Card, Card]][] = [
    [['Ah', 'Kh'], ['Qd', 'Qc']], [['7h', '2d'], ['Ac', 'Kd']], [['Jh', 'Th'], ['9d', '9c']],
  ];
  const ITER = 2_000_000;
  let acc = 0;
  const t0 = performance.now();
  for (let n = 0; n < ITER; n++) { const p = pairs[n % 3]; acc += preflopEquityResult(p[0], p[1]).hand1WinPct; }
  const us = ((performance.now() - t0) / ITER) * 1000;
  console.log(`  lookup: ${us.toFixed(4)} µs/call (${ITER.toLocaleString()} calls)`);
}

// ── Speed: postflop "8 × 300" pattern, per street ────────────────────────────
console.log('\nSpeed — postflop pattern (8 villains × 300 runouts):');
function benchPostflop(board: Card[], scenarios: number): number {
  const hero: [Card, Card] = ['Ah', 'Kh'];
  const t0 = performance.now();
  for (let s = 0; s < scenarios; s++) {
    const used = [...hero, ...board];
    let winSum = 0, tieSum = 0;
    for (let i = 0; i < 8; i++) {
      const deck = shuffleDeck(removeCards(createDeck(), used));
      const villain: [Card, Card] = [deck[0], deck[1]];
      const eq = calculateEquity(hero, villain, board, 300);
      winSum += eq.hand1WinPct; tieSum += eq.tiePct;
    }
    void (winSum + tieSum);
  }
  return performance.now() - t0;
}
const N = 50;
const streets: [string, Card[]][] = [
  ['flop ', ['Qh', '7d', '2c']],
  ['turn ', ['Qh', '7d', '2c', '9s']],
  ['river', ['Qh', '7d', '2c', '9s', '4h']],
];
for (const [label, board] of streets) {
  benchPostflop(board, 3); // warmup
  const ms = benchPostflop(board, N);
  console.log(`  ${label}: ${N} scenarios in ${ms.toFixed(0)} ms → ${(ms / N).toFixed(2)} ms/scenario`);
}

console.log(`\n${failures === 0 ? '✅ ALL CORRECT' : `❌ ${failures} FAILURE(S)`}`);
process.exit(failures === 0 ? 0 : 1);
