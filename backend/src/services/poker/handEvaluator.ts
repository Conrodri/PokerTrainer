import { Card, HandEvalResult, HandRank } from '../../types';
import { parseCard } from './cards';

interface ParsedCard {
  rank: string;
  suit: string;
  value: number;
}

function parse(card: Card): ParsedCard {
  return parseCard(card);
}

function countRanks(cards: ParsedCard[]): Record<number, number> {
  const counts: Record<number, number> = {};
  for (const card of cards) {
    counts[card.value] = (counts[card.value] || 0) + 1;
  }
  return counts;
}

function isFlush(cards: ParsedCard[]): boolean {
  return cards.every(c => c.suit === cards[0].suit);
}

function isStraight(sorted: ParsedCard[]): boolean {
  // Check normal straight
  const normal = sorted.every((c, i) =>
    i === 0 || sorted[i - 1].value - c.value === 1
  );
  if (normal) return true;

  // Check wheel (A-2-3-4-5)
  const values = sorted.map(c => c.value);
  const isWheel =
    values[0] === 14 &&
    values[1] === 5 &&
    values[2] === 4 &&
    values[3] === 3 &&
    values[4] === 2;
  return isWheel;
}

// Numeric score for comparison: handRank * 15^5 + kicker values.
// Precomputed powers of 15 (15^0..15^5) — computeScore runs ~100k×/scenario.
const POW15 = [1, 15, 225, 3375, 50625, 759375];
function computeScore(handRank: HandRank, kickers: number[]): number {
  let score = handRank * POW15[5];
  for (let i = 0; i < kickers.length && i < 5; i++) {
    score += kickers[i] * POW15[4 - i];
  }
  return score;
}

export function evaluate5Cards(cards: Card[]): HandEvalResult {
  const parsed = cards.map(parse).sort((a, b) => b.value - a.value);
  const flush = isFlush(parsed);
  const straight = isStraight(parsed);
  const rankCounts = countRanks(parsed);
  const frequencies = Object.entries(rankCounts)
    .map(([val, count]) => ({ value: parseInt(val), count }))
    .sort((a, b) => b.count - a.count || b.value - a.value);

  // Straight Flush / Royal Flush
  if (flush && straight) {
    const isWheel = parsed[0].value === 14 && parsed[1].value === 5;
    const highCard = isWheel ? 5 : parsed[0].value;
    const isRoyal = parsed[0].value === 14 && parsed[4].value === 10;
    if (isRoyal) {
      return {
        rank: HandRank.ROYAL_FLUSH,
        score: computeScore(HandRank.ROYAL_FLUSH, [14, 13, 12, 11, 10]),
        description: 'Royal Flush',
        bestCards: cards,
      };
    }
    return {
      rank: HandRank.STRAIGHT_FLUSH,
      score: computeScore(HandRank.STRAIGHT_FLUSH, [highCard]),
      description: `Straight Flush (${highCard}-high)`,
      bestCards: cards,
    };
  }

  // Four of a Kind
  if (frequencies[0].count === 4) {
    const quadValue = frequencies[0].value;
    const kickerValue = frequencies[1]?.value || 0;
    return {
      rank: HandRank.FOUR_OF_A_KIND,
      score: computeScore(HandRank.FOUR_OF_A_KIND, [quadValue, quadValue, quadValue, quadValue, kickerValue]),
      description: `Four of a Kind (${quadValue}s)`,
      bestCards: cards,
    };
  }

  // Full House
  if (frequencies[0].count === 3 && frequencies[1]?.count === 2) {
    const tripsValue = frequencies[0].value;
    const pairValue = frequencies[1].value;
    return {
      rank: HandRank.FULL_HOUSE,
      score: computeScore(HandRank.FULL_HOUSE, [tripsValue, tripsValue, tripsValue, pairValue, pairValue]),
      description: `Full House (${tripsValue}s full of ${pairValue}s)`,
      bestCards: cards,
    };
  }

  // Flush
  if (flush) {
    const kickers = parsed.map(c => c.value);
    return {
      rank: HandRank.FLUSH,
      score: computeScore(HandRank.FLUSH, kickers),
      description: `Flush (${parsed[0].rank}-high)`,
      bestCards: cards,
    };
  }

  // Straight
  if (straight) {
    const isWheel = parsed[0].value === 14 && parsed[1].value === 5;
    const highCard = isWheel ? 5 : parsed[0].value;
    return {
      rank: HandRank.STRAIGHT,
      score: computeScore(HandRank.STRAIGHT, [highCard]),
      description: `Straight (${highCard}-high)`,
      bestCards: cards,
    };
  }

  // Three of a Kind
  if (frequencies[0].count === 3) {
    const tripsValue = frequencies[0].value;
    const kickers = frequencies.slice(1).map(f => f.value);
    return {
      rank: HandRank.THREE_OF_A_KIND,
      score: computeScore(HandRank.THREE_OF_A_KIND, [tripsValue, tripsValue, tripsValue, ...kickers]),
      description: `Three of a Kind (${tripsValue}s)`,
      bestCards: cards,
    };
  }

  // Two Pair
  if (frequencies[0].count === 2 && frequencies[1]?.count === 2) {
    const pair1 = frequencies[0].value;
    const pair2 = frequencies[1].value;
    const kicker = frequencies[2]?.value || 0;
    return {
      rank: HandRank.TWO_PAIR,
      score: computeScore(HandRank.TWO_PAIR, [pair1, pair1, pair2, pair2, kicker]),
      description: `Two Pair (${pair1}s and ${pair2}s)`,
      bestCards: cards,
    };
  }

  // Pair
  if (frequencies[0].count === 2) {
    const pairValue = frequencies[0].value;
    const kickers = frequencies.slice(1).map(f => f.value);
    return {
      rank: HandRank.PAIR,
      score: computeScore(HandRank.PAIR, [pairValue, pairValue, ...kickers]),
      description: `Pair of ${pairValue}s`,
      bestCards: cards,
    };
  }

  // High Card
  const kickers = parsed.map(c => c.value);
  return {
    rank: HandRank.HIGH_CARD,
    score: computeScore(HandRank.HIGH_CARD, kickers),
    description: `High Card (${parsed[0].rank})`,
    bestCards: cards,
  };
}

// Cached "choose 5 indices from n" tables (n = 5,6,7 in practice). Avoids the
// recursive, allocation-heavy generic combinations() on the hot path.
const indexComboCache = new Map<number, number[][]>();
function chooseFiveIndices(n: number): number[][] {
  const cached = indexComboCache.get(n);
  if (cached) return cached;
  const out: number[][] = [];
  for (let a = 0; a < n - 4; a++)
    for (let b = a + 1; b < n - 3; b++)
      for (let c = b + 1; c < n - 2; c++)
        for (let d = c + 1; d < n - 1; d++)
          for (let e = d + 1; e < n; e++)
            out.push([a, b, c, d, e]);
  indexComboCache.set(n, out);
  return out;
}

// Find best 5-card hand from 5–7 cards.
export function evaluateBestHand(cards: Card[]): HandEvalResult {
  if (cards.length < 5) throw new Error('Need at least 5 cards');
  if (cards.length === 5) return evaluate5Cards(cards);

  const combos = chooseFiveIndices(cards.length);
  const five: Card[] = [cards[0], cards[1], cards[2], cards[3], cards[4]];
  let best: HandEvalResult | null = null;

  for (let ci = 0; ci < combos.length; ci++) {
    const combo = combos[ci];
    five[0] = cards[combo[0]]; five[1] = cards[combo[1]]; five[2] = cards[combo[2]];
    five[3] = cards[combo[3]]; five[4] = cards[combo[4]];
    const result = evaluate5Cards(five);
    if (!best || result.score > best.score) {
      result.bestCards = five.slice(); // `five` is reused — clone for the winner
      best = result;
    }
  }

  return best!;
}

export function compareHands(cards1: Card[], cards2: Card[]): -1 | 0 | 1 {
  const h1 = evaluateBestHand(cards1);
  const h2 = evaluateBestHand(cards2);
  if (h1.score > h2.score) return 1;
  if (h1.score < h2.score) return -1;
  return 0;
}

export const HAND_RANK_NAMES: Record<HandRank, string> = {
  [HandRank.HIGH_CARD]: 'High Card',
  [HandRank.PAIR]: 'Pair',
  [HandRank.TWO_PAIR]: 'Two Pair',
  [HandRank.THREE_OF_A_KIND]: 'Three of a Kind',
  [HandRank.STRAIGHT]: 'Straight',
  [HandRank.FLUSH]: 'Flush',
  [HandRank.FULL_HOUSE]: 'Full House',
  [HandRank.FOUR_OF_A_KIND]: 'Four of a Kind',
  [HandRank.STRAIGHT_FLUSH]: 'Straight Flush',
  [HandRank.ROYAL_FLUSH]: 'Royal Flush',
};
