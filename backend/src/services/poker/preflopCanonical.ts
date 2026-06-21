import { Card } from '../../types';

// Canonical 13x13 hand-type grid, shared by the preflop-equity generator and the
// runtime lookup so both agree on the index of every hand type.
//
// Layout (row r, col c), ranks A..2 high→low:
//   r === c        → pocket pair          (index r*13 + r)
//   r <  c         → suited, higher first (index r*13 + c)   e.g. AKs
//   r >  c         → offsuit, higher first (index r*13 + c)  e.g. AKo
// 169 cells, index 0..168.

export const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
export const SUITS = ['h', 'd', 'c', 's'];
export const N_TYPES = 169;

const rankIndex: Record<string, number> = {};
RANKS.forEach((r, i) => { rankIndex[r] = i; });

/** Hand-type notation (e.g. "AA", "AKs", "AKo") for grid cell (r, c). */
export function notationAt(r: number, c: number): string {
  if (r === c) return RANKS[r] + RANKS[c];
  if (r < c) return RANKS[r] + RANKS[c] + 's';
  return RANKS[c] + RANKS[r] + 'o';
}

/** All 169 hand-type notations, indexed 0..168. */
export const ALL_NOTATIONS: string[] = (() => {
  const out: string[] = [];
  for (let r = 0; r < 13; r++) for (let c = 0; c < 13; c++) out.push(notationAt(r, c));
  return out;
})();

/** Map a hand-type notation back to its 0..168 grid index. */
export function notationToIndex(notation: string): number {
  if (notation.length === 2) {
    const i = rankIndex[notation[0]];
    return i * 13 + i;
  }
  const a = rankIndex[notation[0]]; // higher rank (smaller index)
  const b = rankIndex[notation[1]]; // lower rank
  // suited → upper triangle (a<b); offsuit → lower triangle (b*13+a)
  return notation.endsWith('s') ? a * 13 + b : b * 13 + a;
}

/** Every concrete 2-card combo for a hand type (e.g. "AKs" → 4, "AKo" → 12, "AA" → 6). */
export function combosOf(notation: string): [Card, Card][] {
  const out: [Card, Card][] = [];
  if (notation.length === 2) {
    const r = notation[0];
    for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++)
      out.push([(r + SUITS[i]) as Card, (r + SUITS[j]) as Card]);
  } else if (notation.endsWith('s')) {
    const r1 = notation[0], r2 = notation[1];
    for (const s of SUITS) out.push([(r1 + s) as Card, (r2 + s) as Card]);
  } else {
    const r1 = notation[0], r2 = notation[1];
    for (const s1 of SUITS) for (const s2 of SUITS) if (s1 !== s2)
      out.push([(r1 + s1) as Card, (r2 + s2) as Card]);
  }
  return out;
}
