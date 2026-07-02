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

  // Build the available deck ONCE.
  const pool = removeCards(createDeck(), knownCards);
  const poolLen = pool.length;

  // Turn (one card to come): enumerate every runout exactly — there are only
  // ~47 of them, which is both cheaper than 300 samples AND exact.
  if (remainingBoard === 1) {
    const cards1: Card[] = [...hand1, ...board, pool[0]];
    const cards2: Card[] = [...hand2, ...board, pool[0]];
    const last = cards1.length - 1;
    let w = 0, l = 0, t = 0;
    for (let i = 0; i < poolLen; i++) {
      cards1[last] = pool[i];
      cards2[last] = pool[i];
      const r = compareHands(cards1, cards2);
      if (r === 1) w++; else if (r === -1) l++; else t++;
    }
    return {
      hand1WinPct: Math.round((w / poolLen) * 1000) / 10,
      hand2WinPct: Math.round((l / poolLen) * 1000) / 10,
      tiePct: Math.round((t / poolLen) * 1000) / 10,
      simulations: poolLen,
    };
  }

  // Flop (2+ to come): sample. Each iteration draws only `remainingBoard` cards
  // via a partial Fisher-Yates (sampling without replacement) into reused
  // buffers instead of rebuilding + fully shuffling a 45+ card deck.

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

