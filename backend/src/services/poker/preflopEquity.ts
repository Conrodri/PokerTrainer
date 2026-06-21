import { Card } from '../../types';
import { toHandNotation } from './cards';
import { notationToIndex, N_TYPES } from './preflopCanonical';
import { EquityResult } from './equity';
import { PREFLOP_WIN, PREFLOP_TIE } from './preflopEquity.generated';

/**
 * O(1) preflop (no board) equity from the precomputed hand-type table.
 * Replaces a 3000-sim Monte Carlo with a lookup (~microseconds). Accuracy is at
 * the hand-type level; suit-overlap effects (<1-2%) are averaged in by the
 * generator, which is more than enough for the equity exercise.
 */
export function preflopEquityResult(hand1: [Card, Card], hand2: [Card, Card]): EquityResult {
  const i = notationToIndex(toHandNotation(hand1[0], hand1[1]));
  const j = notationToIndex(toHandNotation(hand2[0], hand2[1]));
  const idx = i * N_TYPES + j;
  const win = PREFLOP_WIN[idx];
  const tie = PREFLOP_TIE[idx];
  return {
    hand1WinPct: win,
    hand2WinPct: Math.round((100 - win - tie) * 10) / 10,
    tiePct: tie,
    simulations: 0, // table lookup, not simulated
  };
}
