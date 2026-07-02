import { describe, it, expect } from 'vitest';
import { buildFlopExercise, buildExpertFlopExercise, buildFullHandExercise } from './postflopController';

const CARD_RE = /^([2-9TJQKA])([hdcs])$/;

function expectDistinctValidCards(cards: string[]) {
  for (const c of cards) expect(c).toMatch(CARD_RE);
  expect(new Set(cards).size).toBe(cards.length);
}

// buildDecision/buildExpertFlopExercise run a real Monte Carlo equity pass
// (~10-46ms measured) — keep iteration counts modest so this suite stays fast.

describe('buildFlopExercise — non-expert postflop generation', () => {
  it('deals distinct valid cards and a heroEquity within 0-100', () => {
    for (let i = 0; i < 20; i++) {
      const ex: any = buildFlopExercise();
      expectDistinctValidCards([...ex.heroHand, ...ex.board]);
      expect(ex.heroEquity).toBeGreaterThanOrEqual(0);
      expect(ex.heroEquity).toBeLessThanOrEqual(100);
    }
  });

  it('correctAction is always one of the offered options', () => {
    for (let i = 0; i < 20; i++) {
      const ex: any = buildFlopExercise();
      expect(ex.options.some((o: any) => o.key === ex.correctAction)).toBe(true);
    }
  });

  it('villainBetSize is only set when villain actually bet', () => {
    for (let i = 0; i < 20; i++) {
      const ex: any = buildFlopExercise();
      if (ex.villainAction === 'check') expect(ex.villainBetSize).toBe(0);
      else expect(ex.villainBetSize).toBeGreaterThan(0);
    }
  });
});

describe('buildExpertFlopExercise — expert postflop generation', () => {
  it('deals distinct valid cards and a heroEquity within 0-100', () => {
    for (let i = 0; i < 15; i++) {
      const ex: any = buildExpertFlopExercise();
      expectDistinctValidCards([...ex.heroHand, ...ex.board]);
      expect(ex.heroEquity).toBeGreaterThanOrEqual(0);
      expect(ex.heroEquity).toBeLessThanOrEqual(100);
    }
  });

  it('when villain checks and the correct play is to bet, offers 3 concrete sizing options', () => {
    let sawSizingChoice = false;
    for (let i = 0; i < 30; i++) {
      const ex: any = buildExpertFlopExercise();
      if (ex.villainAction === 'check' && String(ex.correctAction).startsWith('bet_')) {
        sawSizingChoice = true;
        const keys = ex.options.map((o: any) => o.key);
        expect(keys).toEqual(expect.arrayContaining(['check', 'bet_33', 'bet_67', 'bet_100']));
      }
    }
    expect(sawSizingChoice).toBe(true);
  });
});

describe('buildFullHandExercise — multi-street scenario generation', () => {
  it('deals a fully distinct, valid card set across hero + villain + board', () => {
    for (let i = 0; i < 15; i++) {
      const ex: any = buildFullHandExercise();
      const all = [...ex.heroHand, ...(ex.flop ?? []), ex.turn, ex.river].filter(Boolean);
      expectDistinctValidCards(all);
    }
  });
});
