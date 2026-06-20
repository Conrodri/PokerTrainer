import { Card } from '../../types';
import { createDeck, removeCards } from './cards';
import { compareHands } from './handEvaluator';

export interface EquityResult {
  hand1WinPct: number;
  hand2WinPct: number;
  tiePct: number;
  simulations: number;
}

// Monte Carlo equity simulation
export function calculateEquity(
  hand1: [Card, Card],
  hand2: [Card, Card],
  board: Card[] = [],
  simulations = 5000
): EquityResult {
  const knownCards = [...hand1, ...hand2, ...board];
  const remainingBoard = 5 - board.length;

  // River: the board is complete, so equity is deterministic — evaluate once
  // instead of looping identical runouts.
  if (remainingBoard === 0) {
    const r = compareHands([...hand1, ...board], [...hand2, ...board]);
    return {
      hand1WinPct: r === 1 ? 100 : 0,
      hand2WinPct: r === -1 ? 100 : 0,
      tiePct: r === 0 ? 100 : 0,
      simulations: 1,
    };
  }

  // Build the available deck ONCE. Each simulation draws only `remainingBoard`
  // cards via a partial Fisher-Yates (sampling without replacement) instead of
  // rebuilding + fully shuffling a 45+ card deck every iteration.
  const pool = removeCards(createDeck(), knownCards);
  const poolLen = pool.length;

  // Reusable 7-card buffers (hole + board + runout slots) — no per-iteration alloc.
  const cards1: Card[] = [...hand1, ...board];
  const cards2: Card[] = [...hand2, ...board];
  const baseLen = cards1.length;
  for (let k = 0; k < remainingBoard; k++) { cards1.push(pool[0]); cards2.push(pool[0]); }

  let hand1Wins = 0;
  let hand2Wins = 0;
  let ties = 0;

  for (let i = 0; i < simulations; i++) {
    // Partial Fisher-Yates: place `remainingBoard` random distinct cards at the
    // front of the pool, regardless of its current order (still uniform).
    for (let k = 0; k < remainingBoard; k++) {
      const j = k + Math.floor(Math.random() * (poolLen - k));
      const tmp = pool[k]; pool[k] = pool[j]; pool[j] = tmp;
      cards1[baseLen + k] = pool[k];
      cards2[baseLen + k] = pool[k];
    }

    const result = compareHands(cards1, cards2);
    if (result === 1) hand1Wins++;
    else if (result === -1) hand2Wins++;
    else ties++;
  }

  return {
    hand1WinPct: Math.round((hand1Wins / simulations) * 1000) / 10,
    hand2WinPct: Math.round((hand2Wins / simulations) * 1000) / 10,
    tiePct: Math.round((ties / simulations) * 1000) / 10,
    simulations,
  };
}

// Quick approximate equity for common pre-flop matchups (for exercises)
export function approximateEquity(hand1: string, hand2: string): EquityResult {
  const EQUITY_TABLE: Record<string, number> = {
    // AA vs...
    'AA_KK': 82, 'AA_QQ': 83, 'AA_JJ': 84, 'AA_TT': 83, 'AA_99': 84, 'AA_88': 84,
    'AA_AKs': 89, 'AA_AQs': 90, 'AA_AKo': 89, 'AA_KQs': 78,
    // KK vs...
    'KK_QQ': 82, 'KK_JJ': 82, 'KK_TT': 83, 'KK_AKs': 64, 'KK_AKo': 65,
    // QQ vs...
    'QQ_JJ': 81, 'QQ_TT': 81, 'QQ_AKs': 53, 'QQ_AKo': 55,
    // AKs vs...
    'AKs_QQ': 47, 'AKs_JJ': 47, 'AKs_TT': 48, 'AKs_AQs': 75, 'AKs_KQs': 67,
    // Coin flip type matchups
    'JJ_AKo': 55, 'TT_AKo': 55, 'TT_AQo': 57,
  };

  const key1 = `${hand1}_${hand2}`;
  const key2 = `${hand2}_${hand1}`;

  if (EQUITY_TABLE[key1] !== undefined) {
    const pct = EQUITY_TABLE[key1];
    return { hand1WinPct: pct, hand2WinPct: 100 - pct - 1, tiePct: 1, simulations: 0 };
  }
  if (EQUITY_TABLE[key2] !== undefined) {
    const pct = EQUITY_TABLE[key2];
    return { hand1WinPct: 100 - pct - 1, hand2WinPct: pct, tiePct: 1, simulations: 0 };
  }

  // Default for unknown matchups
  return { hand1WinPct: 50, hand2WinPct: 50, tiePct: 0, simulations: 0 };
}
