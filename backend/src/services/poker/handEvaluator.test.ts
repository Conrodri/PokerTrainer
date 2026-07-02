import { describe, it, expect } from 'vitest';
import { evaluateBestHand, compareHands, bestScore } from './handEvaluator';
import { HandRank, Card } from '../../types';

describe('evaluateBestHand — hand ranking correctness', () => {
  it('recognizes a royal flush', () => {
    const cards = ['Ah', 'Kh', 'Qh', 'Jh', 'Th', '2c', '3d'] as Card[];
    expect(evaluateBestHand(cards).rank).toBe(HandRank.ROYAL_FLUSH);
  });

  it('recognizes four of a kind over a full house', () => {
    const quads = ['Ah', 'Ad', 'Ac', 'As', 'Kh', 'Kd', '2c'] as Card[];
    expect(evaluateBestHand(quads).rank).toBe(HandRank.FOUR_OF_A_KIND);
  });

  it('recognizes a full house', () => {
    const boat = ['Ah', 'Ad', 'Ac', 'Kh', 'Kd', '2c', '3d'] as Card[];
    expect(evaluateBestHand(boat).rank).toBe(HandRank.FULL_HOUSE);
  });

  it('recognizes a flush over a straight', () => {
    const flush = ['Ah', '9h', '7h', '4h', '2h', 'Kc', '3d'] as Card[];
    expect(evaluateBestHand(flush).rank).toBe(HandRank.FLUSH);
  });

  it('recognizes a straight, including the wheel (A-2-3-4-5)', () => {
    const wheel = ['Ah', '2d', '3c', '4s', '5h', '9c', 'Kd'] as Card[];
    expect(evaluateBestHand(wheel).rank).toBe(HandRank.STRAIGHT);
  });

  it('recognizes two pair, three of a kind, and one pair correctly', () => {
    expect(evaluateBestHand(['Ah', 'Ad', 'Kc', 'Ks', '2h', '3d', '4c'] as Card[]).rank).toBe(HandRank.TWO_PAIR);
    expect(evaluateBestHand(['Ah', 'Ad', 'Ac', 'Ks', '2h', '3d', '4c'] as Card[]).rank).toBe(HandRank.THREE_OF_A_KIND);
    expect(evaluateBestHand(['Ah', 'Ad', 'Kc', 'Qs', '2h', '3d', '4c'] as Card[]).rank).toBe(HandRank.PAIR);
  });

  it('falls back to high card when nothing else is made', () => {
    const nothing = ['Ah', 'Kd', '8c', '5s', '2h', '9d', 'Jc'] as Card[];
    expect(evaluateBestHand(nothing).rank).toBe(HandRank.HIGH_CARD);
  });
});

describe('compareHands', () => {
  it('a flush beats a straight', () => {
    const flushHand   = ['Ah', '9h', '7h', '4h', '2h'] as Card[];
    const straightHand = ['9c', '8d', '7s', '6h', '5c'] as Card[];
    expect(compareHands(flushHand, straightHand)).toBe(1);
    expect(compareHands(straightHand, flushHand)).toBe(-1);
  });

  it('identical hands tie', () => {
    const hand = ['Ah', 'Kh', 'Qh', 'Jh', 'Th'] as Card[];
    expect(compareHands(hand, [...hand])).toBe(0);
  });

  it('higher two pair beats lower two pair', () => {
    const higher = ['Ah', 'Ad', 'Kc', 'Ks', '2h'] as Card[];
    const lower  = ['Qh', 'Qd', 'Jc', 'Js', '2h'] as Card[];
    expect(compareHands(higher, lower)).toBe(1);
  });
});

describe('bestScore', () => {
  it('is monotonic with hand strength (stronger hand → higher score)', () => {
    const pair  = bestScore(['Ah', 'Ad', 'Kc', 'Qs', '2h', '3d', '4c'] as Card[]);
    const trips = bestScore(['Ah', 'Ad', 'Ac', 'Ks', '2h', '3d', '4c'] as Card[]);
    const quads = bestScore(['Ah', 'Ad', 'Ac', 'As', 'Kh', 'Kd', '2c'] as Card[]);
    expect(trips).toBeGreaterThan(pair);
    expect(quads).toBeGreaterThan(trips);
  });
});
