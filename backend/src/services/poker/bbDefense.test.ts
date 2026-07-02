import { describe, it, expect } from 'vitest';
import { getBBDefenseAction, buildBBDefenseGrid } from './bbDefense';

describe('getBBDefenseAction — BB vs BTN defense chart', () => {
  it('premium pairs (QQ+) always 3-bet for value', () => {
    for (const h of ['AA', 'KK', 'QQ']) {
      const cls = getBBDefenseAction(h);
      expect(cls.action).toBe('3bet');
      expect(cls.kind).toBe('value3bet');
      expect(cls.isMixed).toBe(false);
    }
  });

  it('JJ is a mixed 3bet/call', () => {
    const cls = getBBDefenseAction('JJ');
    expect(cls.action).toBe('3bet');
    expect(cls.alt).toBe('call');
    expect(cls.isMixed).toBe(true);
  });

  it('small pocket pairs (TT-22) always call', () => {
    for (const h of ['TT', '77', '22']) {
      expect(getBBDefenseAction(h).action).toBe('call');
    }
  });

  it('AKs and AKo always 3-bet for value', () => {
    expect(getBBDefenseAction('AKs').action).toBe('3bet');
    expect(getBBDefenseAction('AKo').action).toBe('3bet');
  });

  it('the worst hand (72o) always folds', () => {
    const cls = getBBDefenseAction('72o');
    expect(cls.action).toBe('fold');
    expect(cls.kind).toBe('fold');
  });

  it('low suited aces (A5s-A2s) are bluff 3-bets, not folds', () => {
    for (const h of ['A5s', 'A4s', 'A3s', 'A2s']) {
      const cls = getBBDefenseAction(h);
      expect(cls.kind).toBe('bluff3bet');
    }
  });

  it('every classification has a valid action/alt pair', () => {
    const VALID = new Set(['fold', 'call', '3bet']);
    const ranks = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
    for (const r1 of ranks) {
      for (const r2 of ranks) {
        for (const suffix of r1 === r2 ? [''] : ['s', 'o']) {
          const notation = r1 === r2 ? r1 + r2 : r1 + r2 + suffix;
          const cls = getBBDefenseAction(notation);
          expect(VALID.has(cls.action)).toBe(true);
          expect(VALID.has(cls.alt)).toBe(true);
        }
      }
    }
  });
});

describe('buildBBDefenseGrid', () => {
  it('returns a full 13×13 grid with valid action codes (0/1/3/4)', () => {
    const grid = buildBBDefenseGrid();
    expect(grid).toHaveLength(13);
    for (const row of grid) {
      expect(row).toHaveLength(13);
      for (const code of row) expect([0, 1, 3, 4]).toContain(code);
    }
  });

  it('the AA cell (top-left) is a value 3-bet (code 3)', () => {
    const grid = buildBBDefenseGrid();
    expect(grid[0][0]).toBe(3);
  });
});
