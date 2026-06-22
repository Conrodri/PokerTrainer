import { CardStr, Rank, Suit } from '../types/poker';

export const RANKS_ORDER = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];

export function parseCard(card: CardStr): { rank: Rank; suit: Suit } {
  return { rank: card[0] as Rank, suit: card[1] as Suit };
}

export function getRankDisplay(rank: string): string {
  return rank === 'T' ? '10' : rank;
}

// The trailing ︎ (variation selector-15) forces *text* presentation of the
// suit glyphs. Without it, some OS/browsers (notably Windows) render ♠ ♥ ♦ ♣ as
// colour emoji with inconsistent widths — or fail to render ♠/♣ at all.
export function getSuitSymbol(suit: Suit): string {
  return { h: '♥︎', d: '♦︎', c: '♣︎', s: '♠︎' }[suit];
}

// Convert hand notation to display string
export function handToDisplay(notation: string): string {
  if (notation.length === 2) return `${notation[0]}${notation[0]}`; // pair
  const r1 = getRankDisplay(notation[0]);
  const r2 = getRankDisplay(notation[1]);
  const suffix = notation[2] === 's' ? 's' : 'o';
  return `${r1}${r2}${suffix}`;
}

// Get matrix indices [row, col] for a hand notation in the 13x13 grid
export function getMatrixIndices(notation: string): [number, number] {
  if (notation.length === 2) {
    const idx = RANKS_ORDER.indexOf(notation[0]);
    return [idx, idx];
  }
  const r1Idx = RANKS_ORDER.indexOf(notation[0]);
  const r2Idx = RANKS_ORDER.indexOf(notation[1]);
  const suited = notation[2] === 's';
  return suited ? [r1Idx, r2Idx] : [r2Idx, r1Idx];
}

// Get notation from matrix position
export function getNotationFromIndices(row: number, col: number): string {
  const r1 = RANKS_ORDER[row];
  const r2 = RANKS_ORDER[col];
  if (row === col) return `${r1}${r2}`; // pair
  if (row < col) return `${r1}${r2}s`; // suited (upper triangle)
  return `${r2}${r1}o`; // offsuit (lower triangle, col is higher rank)
}

export function xpToLevel(xp: number): { level: number; progressPct: number; nextLevelXp: number } {
  // Level thresholds: each level requires more XP
  const thresholds = [0, 100, 250, 500, 900, 1500, 2500, 4000, 6500, 10000, 15000];
  let level = 1;
  for (let i = 1; i < thresholds.length; i++) {
    if (xp >= thresholds[i]) level = i + 1;
    else {
      const prev = thresholds[i - 1];
      const next = thresholds[i];
      const progressPct = Math.round(((xp - prev) / (next - prev)) * 100);
      return { level, progressPct, nextLevelXp: next - xp };
    }
  }
  return { level, progressPct: 100, nextLevelXp: 0 };
}

export function frequencyBg(freq: number): string {
  if (freq === 0) return '#1a202c';
  if (freq < 0.4) return `rgba(180,120,0,${0.4 + freq * 0.6})`;
  if (freq < 0.8) return `rgba(200,150,20,${0.5 + freq * 0.5})`;
  return `rgba(22,130,60,${0.5 + freq * 0.5})`;
}

/**
 * Simplified 3-action colouring for range matrices: Raise / Call / Fold.
 * Uses the SAME >0.5 threshold as the backend's getCorrectAction (ranges.ts), so
 * the grid colour always agrees with the exercise's correct answer:
 *  - freq === 0          → Fold  (dark)
 *  - 0 < freq <= 0.5     → Call  (yellow) — 50/50 or less: call
 *  - freq > 0.5          → Raise (green)  — raised more than half the time
 */
export function actionBg(freq: number): string {
  if (freq <= 0) return '#1a202c';                // Fold
  if (freq > 0.5) return 'rgba(22,130,60,0.85)';   // Raise
  return 'rgba(202,138,4,0.9)';                    // Call
}

/** Cell background colour for the BB-defense grid (codes 0–4, code 2 = legacy alias for call). */
export function bbCellColor(code: number): string {
  return ({
    0: '#1a202c',
    1: 'rgba(37,99,235,0.70)',
    2: 'rgba(37,99,235,0.70)',
    3: 'rgba(22,130,60,0.85)',
    4: 'rgba(202,138,4,0.82)',
  } as Record<number, string>)[code] ?? '#1a202c';
}

/** Label for the simplified Raise / Call / Fold scheme (matches getCorrectAction). */
export function actionLabel(freq: number, _isEn = false): string {
  if (freq <= 0) return 'Fold';
  if (freq > 0.5) return 'Raise';
  return 'Call';
}
