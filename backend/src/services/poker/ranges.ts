import { Position, Action } from '../../types';

// 13x13 range matrix. Index 0=A, 1=K, ..., 12=2
// matrix[i][j]:
//   i === j  → pocket pair (RANKS[i]+RANKS[i])
//   i < j    → suited  (RANKS[i]+RANKS[j]+'s')  [upper triangle]
//   i > j    → offsuit (RANKS[j]+RANKS[i]+'o')  [lower triangle]
// Value: 0=fold, 1=raise (binary — no mixed frequencies)

export const RANKS_DISPLAY = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];

type RangeMatrix = number[][];

// Open raise ranges by position (6-max, 100bb effective) — binary 0/1 only
export const OPEN_RAISE: Record<Position, RangeMatrix> = {
  UTG: [
    //  A  K  Q  J  T  9  8  7  6  5  4  3  2
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], // A
    [1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0], // K
    [1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0], // Q
    [1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0], // J
    [1, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0], // T
    [0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0], // 9
    [0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0], // 8
    [0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0], // 7
    [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0], // 6
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0], // 5
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 4
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 3
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 2
  ],
  HJ: [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], // A
    [1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0], // K
    [1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0], // Q
    [1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0], // J
    [1, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0], // T
    [0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0], // 9
    [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0], // 8
    [0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0], // 7
    [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0], // 6
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0], // 5
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0], // 4
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0], // 3
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], // 2
  ],
  CO: [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], // A
    [1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0], // K
    [1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0], // Q
    [1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0], // J
    [1, 1, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0], // T
    [1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0], // 9
    [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0], // 8
    [0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0], // 7
    [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0], // 6
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0], // 5
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1], // 4
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1], // 3
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], // 2
  ],
  BTN: [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], // A
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0], // K
    [1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0], // Q
    [1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0], // J
    [1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0], // T
    [1, 1, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0], // 9
    [1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0], // 8
    [0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0], // 7
    [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0], // 6
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1], // 5
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1], // 4
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1], // 3
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], // 2
  ],
  SB: [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], // A
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0], // K
    [1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0], // Q
    [1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0], // J
    [1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0], // T
    [1, 1, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0], // 9
    [1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0], // 8
    [0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0], // 7
    [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0], // 6
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1], // 5
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1], // 4
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1], // 3
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], // 2
  ],
  BB: [
    // BB defend vs BTN open (approximate) — binary
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], // A
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], // K
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0], // Q
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0], // J
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0], // T
    [1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0], // 9
    [1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1], // 8
    [0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1], // 7
    [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1], // 6
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1], // 5
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1], // 4
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1], // 3
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], // 2
  ],
};

export function getHandNotation(card1Rank: string, card2Rank: string, suited: boolean): string {
  const r1Idx = RANKS_DISPLAY.indexOf(card1Rank);
  const r2Idx = RANKS_DISPLAY.indexOf(card2Rank);

  if (r1Idx === r2Idx) return `${card1Rank}${card2Rank}`; // pair

  // Higher rank first
  const hi = r1Idx < r2Idx ? card1Rank : card2Rank;
  const lo = r1Idx < r2Idx ? card2Rank : card1Rank;
  return `${hi}${lo}${suited ? 's' : 'o'}`;
}

export function getMatrixIndices(notation: string): [number, number] {
  if (notation.length === 2) {
    // Pair: AA, KK...
    const idx = RANKS_DISPLAY.indexOf(notation[0]);
    return [idx, idx];
  }
  const r1 = notation[0];
  const r2 = notation[1];
  const suited = notation[2] === 's';
  const r1Idx = RANKS_DISPLAY.indexOf(r1);
  const r2Idx = RANKS_DISPLAY.indexOf(r2);

  if (suited) {
    return [r1Idx, r2Idx]; // upper triangle
  } else {
    return [r2Idx, r1Idx]; // lower triangle (higher rank in col)
  }
}

export function getRangeFrequency(position: Position, notation: string): number {
  const [row, col] = getMatrixIndices(notation);
  const matrix = OPEN_RAISE[position];
  if (!matrix || row < 0 || col < 0) return 0;
  return matrix[row][col];
}

export function shouldPlay(position: Position, notation: string): boolean {
  const freq = getRangeFrequency(position, notation);
  return Math.random() < freq;
}

export function getCorrectAction(position: Position, notation: string): {
  action: 'raise' | 'fold';
  frequency: number;
  isMixed: boolean;
} {
  const freq = getRangeFrequency(position, notation);
  const action = freq >= 1 ? 'raise' : 'fold';
  return { action, frequency: freq, isMixed: false };
}

export function getRangeMatrix(position: Position): RangeMatrix {
  return OPEN_RAISE[position] || OPEN_RAISE.HJ;
}

export function getRangePercentage(position: Position): number {
  const matrix = OPEN_RAISE[position];
  let total = 0;
  let inRange = 0;
  for (let i = 0; i < 13; i++) {
    for (let j = 0; j < 13; j++) {
      const freq = matrix[i][j];
      // Each cell represents different number of combos
      const combos = i === j ? 6 : 16; // pairs=6, non-pairs=16 (4 suited + 12 offsuit)
      const suitedCombos = 4;
      const offsuitCombos = 12;

      if (i === j) {
        total += 6;
        inRange += freq * 6;
      } else if (i < j) {
        // suited
        total += suitedCombos;
        inRange += freq * suitedCombos;
      } else {
        // offsuit
        total += offsuitCombos;
        inRange += freq * offsuitCombos;
      }
    }
  }
  return Math.round((inRange / total) * 100 * 10) / 10;
}
