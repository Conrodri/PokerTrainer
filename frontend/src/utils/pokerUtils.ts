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

export function isRedSuit(suit: Suit): boolean {
  return suit === 'h' || suit === 'd';
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

// Number of combos for a hand
export function combosCount(notation: string): number {
  if (notation.length === 2) return 6; // pairs
  if (notation.endsWith('s')) return 4; // suited
  return 12; // offsuit
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

export function accuracyColor(accuracy: number): string {
  if (accuracy >= 80) return 'text-green-400';
  if (accuracy >= 60) return 'text-yellow-400';
  return 'text-red-400';
}

export function formatAccuracy(correct: number, total: number): string {
  if (total === 0) return '—';
  return `${Math.round((correct / total) * 100)}%`;
}

// Frequency color for range matrix cell
export function frequencyColor(freq: number): string {
  if (freq === 0) return 'bg-gray-800 hover:bg-gray-700';
  if (freq < 0.4) return 'bg-yellow-700 hover:bg-yellow-600';
  if (freq < 0.8) return 'bg-yellow-500 hover:bg-yellow-400';
  return 'bg-green-700 hover:bg-green-600';
}

export function frequencyBg(freq: number): string {
  if (freq === 0) return '#1a202c';
  if (freq < 0.4) return `rgba(180,120,0,${0.4 + freq * 0.6})`;
  if (freq < 0.8) return `rgba(200,150,20,${0.5 + freq * 0.5})`;
  return `rgba(22,130,60,${0.5 + freq * 0.5})`;
}

/**
 * Simplified 3-action colouring for range matrices: Raise / Call / Fold.
 *  - freq === 0      → Fold  (dark)
 *  - 0 < freq < 0.5  → Call  (blue)
 *  - freq >= 0.5     → Raise (green)
 */
export function actionBg(freq: number): string {
  if (freq === 0)   return '#1a202c';              // Fold
  if (freq < 0.5)   return 'rgba(37,99,235,0.80)'; // Call
  return 'rgba(22,130,60,0.85)';                   // Raise
}

/** Label for the simplified Raise / Call / Fold scheme. */
export function actionLabel(freq: number, isEn = false): string {
  if (freq === 0) return isEn ? 'Fold' : 'Fold';
  if (freq < 0.5) return isEn ? 'Call' : 'Call';
  return isEn ? 'Raise' : 'Raise';
}
