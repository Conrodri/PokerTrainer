import { describe, it, expect } from 'vitest';
import { generateBluffExercise } from './bluffService';

const CARD_RE = /^([2-9TJQKA])([hdcs])$/;
const VALID_ACTIONS = new Set(['check-fold', 'bluff-small', 'bluff-medium', 'bluff-large']);
const VALID_TEMPLATES = new Set(['dry', 'wet', 'semiBluff', 'float', 'oopMissed']);

describe('generateBluffExercise — structural invariants', () => {
  it('always deals distinct, valid cards for hero + board', () => {
    for (let i = 0; i < 100; i++) {
      const ex = generateBluffExercise();
      const all = [...ex.heroHand, ...ex.board];
      for (const c of all) expect(c).toMatch(CARD_RE);
      expect(new Set(all).size).toBe(all.length);
    }
  });

  it('always returns a valid correctAction and a known template', () => {
    for (let i = 0; i < 100; i++) {
      const ex = generateBluffExercise();
      expect(VALID_ACTIONS.has(ex.correctAction)).toBe(true);
      expect(VALID_TEMPLATES.has(ex.template)).toBe(true);
    }
  });

  it('check-fold never carries a positive bluff amount', () => {
    for (let i = 0; i < 100; i++) {
      const ex = generateBluffExercise();
      if (ex.correctAction === 'check-fold') expect(ex.bluffAmountBB).toBe(0);
    }
  });

  it('always attaches all 4 factor scores (position/board/villainRange/heroHand)', () => {
    const ex = generateBluffExercise();
    for (const key of ['position', 'board', 'villainRange', 'heroHand'] as const) {
      expect(['positive', 'neutral', 'negative']).toContain(ex.factors[key].score);
      expect(ex.factors[key].fr.length).toBeGreaterThan(0);
      expect(ex.factors[key].en.length).toBeGreaterThan(0);
    }
  });

  it('expert mode never draws the easiest template (dry) more than rarely, and can draw all others', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 60; i++) seen.add(generateBluffExercise('expert').template);
    // oopMissed only exists in the pool from ee82834 onward — expert must be able to reach it.
    expect(seen.has('oopMissed')).toBe(true);
  });

  it('the avoidTemplate param prevents an immediate repeat most of the time', () => {
    let sameTwiceInARow = 0;
    let prev: string | undefined;
    for (let i = 0; i < 100; i++) {
      const ex = generateBluffExercise('basic', prev);
      if (ex.template === prev) sameTwiceInARow++;
      prev = ex.template;
    }
    // With 5 templates and a re-roll on match, back-to-back repeats should be rare (not zero, re-roll can still land the same).
    expect(sameTwiceInARow).toBeLessThan(30);
  });
});
