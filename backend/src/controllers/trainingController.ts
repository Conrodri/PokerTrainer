import { Request, Response } from 'express';
import * as fs   from 'fs';
import * as path from 'path';
import { generatePreflopExercise, generatePotOddsExercise, generateEquityExercise, generateOutsExercise, generateBBDefenseExercise, calculateExerciseXP } from '../services/trainingService';
import { calculatePotOdds } from '../services/poker/potOdds';
import { getRangeMatrix, getRangeFrequency, getRangePercentage, getCorrectAction } from '../services/poker/ranges';
import { buildBBDefenseGrid } from '../services/poker/bbDefense';
import { Position, ApiResponse } from '../types';
import prisma from '../config/database';

const PREGEN_FILE = path.resolve(__dirname, '../../data/pregenerated.json');

function loadPregenEquity(): { equityFr: object[]; equityEn: object[] } {
  try {
    const raw = JSON.parse(fs.readFileSync(PREGEN_FILE, 'utf8'));
    return { equityFr: raw.equityFr ?? [], equityEn: raw.equityEn ?? [] };
  } catch {
    return { equityFr: [], equityEn: [] };
  }
}

type Lang = 'fr' | 'en';

// ─── Equity exercise pool ─────────────────────────────────────────────────────
// Pre-generates beginner equity exercises (non-expert) to avoid the ~20ms
// Monte Carlo wait when a board is dealt (50% of cases).
// Two separate pools for FR and EN since explanation text is language-specific.

const EQUITY_POOL_TARGET    = 15;
const EQUITY_POOL_THRESHOLD = 4;
const equityPoolFr: object[] = [];
const equityPoolEn: object[] = [];
let   equityRefilling        = false;

async function refillEquityPool(): Promise<void> {
  if (equityRefilling) return;
  equityRefilling = true;
  try {
    while (equityPoolFr.length < EQUITY_POOL_TARGET || equityPoolEn.length < EQUITY_POOL_TARGET) {
      if (equityPoolFr.length < EQUITY_POOL_TARGET) {
        equityPoolFr.push(generateEquityExercise('fr', 'beginner'));
        await new Promise(resolve => setImmediate(resolve));
      }
      if (equityPoolEn.length < EQUITY_POOL_TARGET) {
        equityPoolEn.push(generateEquityExercise('en', 'beginner'));
        await new Promise(resolve => setImmediate(resolve));
      }
    }
  } finally {
    equityRefilling = false;
  }
}

/** Call once from server.ts after startup to warm the equity exercise pool. */
export function initEquityPool(): void {
  const { equityFr, equityEn } = loadPregenEquity();
  if (equityFr.length > 0) {
    equityPoolFr.push(...equityFr.slice(0, EQUITY_POOL_TARGET));
    console.log(`[equityPool] loaded ${equityPoolFr.length} FR + ${Math.min(equityEn.length, EQUITY_POOL_TARGET)} EN from file`);
  }
  if (equityEn.length > 0) {
    equityPoolEn.push(...equityEn.slice(0, EQUITY_POOL_TARGET));
  }
  if (equityPoolFr.length < EQUITY_POOL_TARGET || equityPoolEn.length < EQUITY_POOL_TARGET) {
    refillEquityPool().catch(err => console.error('[equityPool] init error:', err));
  }
}

function getLang(req: Request): Lang {
  const q = req.query.lang as string;
  return q === 'en' ? 'en' : 'fr';
}

export async function getPreflopExercise(req: Request, res: Response): Promise<void> {
  try {
    const position = req.query.position as Position | undefined;
    const lang = getLang(req);
    const exercise = generatePreflopExercise(position, lang);
    res.json({ success: true, data: exercise } as ApiResponse);
  } catch {
    res.status(500).json({ success: false, error: 'Failed to generate exercise' } as ApiResponse);
  }
}

export async function checkPreflopAnswer(req: Request, res: Response): Promise<void> {
  try {
    const { notation, position, userAction, timeTaken, sessionId } = req.body;
    const lang = getLang(req);

    if (!notation || !position || !userAction) {
      res.status(400).json({ success: false, error: 'Missing required fields' } as ApiResponse);
      return;
    }

    const { action: correctAction, frequency } = getCorrectAction(position as Position, notation);
    const isCorrect = userAction === correctAction;
    const xpEarned = calculateExerciseXP(isCorrect, timeTaken || 10000, false);

    const userId = (req as any).user?.userId;
    if (userId && sessionId) {
      await recordExercise(sessionId, 'preflop', JSON.stringify({ notation, position }), userAction, correctAction, isCorrect, timeTaken || 0, xpEarned, userId, position);
    }

    res.json({ success: true, data: { isCorrect, correctAction, frequency, isMixed: false, xpEarned } } as ApiResponse);
  } catch {
    res.status(500).json({ success: false, error: 'Failed to check answer' } as ApiResponse);
  }
}

export async function getPotOddsExercise(req: Request, res: Response): Promise<void> {
  try {
    const lang = getLang(req);
    const difficulty = req.query.difficulty === 'expert' ? 'expert' : undefined;
    const exercise = generatePotOddsExercise(lang, difficulty);
    res.json({ success: true, data: exercise } as ApiResponse);
  } catch {
    res.status(500).json({ success: false, error: 'Failed to generate exercise' } as ApiResponse);
  }
}

export async function checkPotOddsAnswer(req: Request, res: Response): Promise<void> {
  try {
    const { potSize, betSize, heroEquity, userAction, timeTaken, sessionId } = req.body;
    const lang = getLang(req);

    if (potSize === undefined || betSize === undefined || heroEquity === undefined || !userAction) {
      res.status(400).json({ success: false, error: 'Missing required fields' } as ApiResponse);
      return;
    }

    const result = calculatePotOdds(potSize, betSize, heroEquity, lang);
    const correctAction = result.isProfitable ? 'call' : 'fold';
    const isCorrect = userAction === correctAction;
    const xpEarned = calculateExerciseXP(isCorrect, timeTaken || 10000, false);

    const userId = (req as any).user?.userId;
    if (userId && sessionId) {
      await recordExercise(sessionId, 'potodds', JSON.stringify({ potSize, betSize, heroEquity }), userAction, correctAction, isCorrect, timeTaken || 0, xpEarned, userId);
    }

    res.json({
      success: true,
      data: {
        isCorrect, correctAction,
        potOdds: result.potOdds, potOddsPct: result.potOddsPct,
        requiredEquity: result.requiredEquity, ev: result.ev,
        reasoning: result.reasoning, xpEarned,
      },
    } as ApiResponse);
  } catch {
    res.status(500).json({ success: false, error: 'Failed to check answer' } as ApiResponse);
  }
}

export async function getEquityExercise(req: Request, res: Response): Promise<void> {
  try {
    const lang       = getLang(req);
    const mode       = (req.query.mode === 'advanced' ? 'advanced' : 'beginner') as 'beginner' | 'advanced';
    const difficulty = req.query.difficulty === 'expert' ? 'expert' : undefined;

    // Serve from pool for the most common case: beginner, non-expert
    if (mode === 'beginner' && !difficulty) {
      const pool = lang === 'en' ? equityPoolEn : equityPoolFr;
      if (pool.length > 0) {
        const data = pool.shift()!;
        if (equityPoolFr.length < EQUITY_POOL_THRESHOLD || equityPoolEn.length < EQUITY_POOL_THRESHOLD) {
          refillEquityPool().catch(err => console.error('[equityPool] refill error:', err));
        }
        return void res.json({ success: true, data } as ApiResponse);
      }
    }

    const exercise = generateEquityExercise(lang, mode, difficulty);
    res.json({ success: true, data: exercise } as ApiResponse);
  } catch {
    res.status(500).json({ success: false, error: 'Failed to generate exercise' } as ApiResponse);
  }
}

export async function getOutsExercise(req: Request, res: Response): Promise<void> {
  try {
    const lang = getLang(req);
    const difficulty = req.query.difficulty === 'expert' ? 'expert' : undefined;
    const exercise = generateOutsExercise(lang, difficulty);
    res.json({ success: true, data: exercise } as ApiResponse);
  } catch {
    res.status(500).json({ success: false, error: 'Failed to generate exercise' } as ApiResponse);
  }
}

export async function getBBDefenseExercise(req: Request, res: Response): Promise<void> {
  try {
    const lang = getLang(req);
    const exercise = generateBBDefenseExercise(lang);
    res.json({ success: true, data: exercise } as ApiResponse);
  } catch {
    res.status(500).json({ success: false, error: 'Failed to generate exercise' } as ApiResponse);
  }
}

export async function getBBDefenseRange(_req: Request, res: Response): Promise<void> {
  try {
    const grid = buildBBDefenseGrid();
    res.json({ success: true, data: { grid } } as ApiResponse);
  } catch {
    res.status(500).json({ success: false, error: 'Failed to build range' } as ApiResponse);
  }
}

export async function getRangeData(req: Request, res: Response): Promise<void> {
  try {
    const { position } = req.params;
    const matrix = getRangeMatrix(position as Position);
    const percentage = getRangePercentage(position as Position);
    res.json({ success: true, data: { matrix, percentage, position } } as ApiResponse);
  } catch {
    res.status(500).json({ success: false, error: 'Failed to get range data' } as ApiResponse);
  }
}

export async function recordClientResult(req: Request, res: Response): Promise<void> {
  try {
    const { module, isCorrect, xpEarned, timeTaken, sessionId } = req.body;
    const userId = (req as any).user?.userId;
    if (userId && sessionId) {
      const xp = typeof xpEarned === 'number' ? xpEarned : (isCorrect ? 15 : 5);
      await recordExercise(sessionId, module, '{}', isCorrect ? 'correct' : 'incorrect', 'correct', isCorrect, timeTaken || 0, xp, userId);
    }
    res.json({ success: true, data: { recorded: !!userId } } as ApiResponse);
  } catch {
    res.status(500).json({ success: false, error: 'Failed to record result' } as ApiResponse);
  }
}

export async function startSession(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.userId;
    const { module } = req.body;

    if (!userId) {
      res.json({ success: true, data: { sessionId: `guest_${Date.now()}` } } as ApiResponse);
      return;
    }

    const session = await prisma.trainingSession.create({
      data: { userId, module: module || 'preflop' },
    });
    res.json({ success: true, data: { sessionId: session.id } } as ApiResponse);
  } catch {
    res.status(500).json({ success: false, error: 'Failed to start session' } as ApiResponse);
  }
}

async function recordExercise(
  sessionId: string, exerciseType: string, question: string,
  userAnswer: string, correctAnswer: string, isCorrect: boolean,
  timeTaken: number, xpEarned: number, userId: string, position?: string
): Promise<void> {
  if (sessionId.startsWith('guest_')) return;
  try {
    // The exercise insert and the stats read are independent — run them together
    // so the hot answer-submission path costs one round-trip instead of two.
    const [, stats] = await Promise.all([
      prisma.sessionExercise.create({
        data: { sessionId, exerciseType, question, userAnswer, correctAnswer, isCorrect, timeTaken, xpEarned, hint: null },
      }),
      prisma.playerStats.findUnique({ where: { userId } }),
    ]);
    await updatePlayerStats(userId, exerciseType, isCorrect, xpEarned, position, stats);
  } catch {/* non-blocking */}
}

function computeLevelFromXp(xp: number): number {
  const thresholds = [0, 100, 250, 500, 900, 1500, 2500, 4000, 6500, 10000, 15000];
  let level = 1;
  for (let i = 1; i < thresholds.length; i++) {
    if (xp >= thresholds[i]) level = i + 1;
    else break;
  }
  return level;
}

async function updatePlayerStats(
  userId: string, module: string, isCorrect: boolean, xpEarned: number,
  position?: string, preStats?: Awaited<ReturnType<typeof prisma.playerStats.findUnique>>
): Promise<void> {
  // Reuse the stats row already fetched by the caller when available; otherwise
  // fetch it. Create on first-ever exercise.
  let stats = preStats ?? await prisma.playerStats.findUnique({ where: { userId } });
  if (!stats) stats = await prisma.playerStats.create({ data: { userId } });

  const newStreak = isCorrect ? stats.streak + 1 : 0;
  const newLongestStreak = Math.max(stats.longestStreak, newStreak);
  const newXp = stats.xp + xpEarned;
  const newLevel = computeLevelFromXp(newXp);

  const data: Record<string, any> = {
    totalExercises: { increment: 1 },
    xp: { increment: xpEarned },
    streak: newStreak,
    longestStreak: newLongestStreak,
    level: newLevel,
  };
  if (isCorrect) data.totalCorrect = { increment: 1 };

  // Per-module counters + accuracy
  const moduleMap: Record<string, [string, string, string | null]> = {
    preflop:   ['preflopTotal',   'preflopCorrect',   'preflopAccuracy'],
    potodds:   ['potoddsTotal',   'potoddsCorrect',   'potOddsAccuracy'],
    equity:    ['equityTotal',    'equityCorrect',    'equityAccuracy'],
    outs:      ['outsTotal',      'outsCorrect',      null],
    bbdefense: ['bbdefenseTotal', 'bbdefenseCorrect', null],
  };
  const mFields = moduleMap[module];
  if (mFields) {
    const [tKey, cKey, aKey] = mFields;
    const newT = ((stats as any)[tKey] ?? 0) + 1;
    const newC = ((stats as any)[cKey] ?? 0) + (isCorrect ? 1 : 0);
    data[tKey] = newT;
    data[cKey] = newC;
    if (aKey) data[aKey] = newC / newT;
  }

  // Post-flop — overall counter + per-street counter
  if (module.startsWith('postflop_')) {
    const newPFT = ((stats as any).postflopTotal   ?? 0) + 1;
    const newPFC = ((stats as any).postflopCorrect ?? 0) + (isCorrect ? 1 : 0);
    data.postflopTotal   = newPFT;
    data.postflopCorrect = newPFC;
    data.postflopAccuracy = newPFC / newPFT;

    const pfStreetMap: Record<string, [string, string]> = {
      postflop_flop:  ['postflopFlopTotal',  'postflopFlopCorrect'],
      postflop_turn:  ['postflopTurnTotal',  'postflopTurnCorrect'],
      postflop_river: ['postflopRiverTotal', 'postflopRiverCorrect'],
    };
    const pfFields = pfStreetMap[module];
    if (pfFields) {
      const [tKey, cKey] = pfFields;
      data[tKey] = ((stats as any)[tKey] ?? 0) + 1;
      data[cKey] = ((stats as any)[cKey] ?? 0) + (isCorrect ? 1 : 0);
    }
  }

  // Full hand — overall counter + per-street counter
  if (module.startsWith('fullhand')) {
    const newFHT = ((stats as any).fullhandTotal  ?? 0) + 1;
    const newFHC = ((stats as any).fullhandCorrect ?? 0) + (isCorrect ? 1 : 0);
    data.fullhandTotal   = newFHT;
    data.fullhandCorrect = newFHC;

    const streetMap: Record<string, [string, string]> = {
      fullhand_preflop: ['fullhandPreflopTotal', 'fullhandPreflopCorrect'],
      fullhand_flop:    ['fullhandFlopTotal',    'fullhandFlopCorrect'],
      fullhand_turn:    ['fullhandTurnTotal',    'fullhandTurnCorrect'],
      fullhand_river:   ['fullhandRiverTotal',   'fullhandRiverCorrect'],
    };
    const sFields = streetMap[module];
    if (sFields) {
      const [tKey, cKey] = sFields;
      data[tKey] = ((stats as any)[tKey] ?? 0) + 1;
      data[cKey] = ((stats as any)[cKey] ?? 0) + (isCorrect ? 1 : 0);
    }
  }

  // Per-module streak tracking
  {
    const moduleStreakMap: Record<string, [string, string]> = {
      preflop:   ['preflopStreak',   'preflopBest'],
      potodds:   ['potoddsStreak',   'potoddssBest'],
      equity:    ['equityStreak',    'equityBest'],
      outs:      ['outsStreak',      'outsBest'],
      bbdefense: ['bbdefenseStreak', 'bbdefenseBest'],
    };
    let streakKey: string | null = null;
    let bestKey: string | null = null;
    if (moduleStreakMap[module]) {
      [streakKey, bestKey] = moduleStreakMap[module];
    } else if (module.startsWith('postflop')) {
      streakKey = 'postflopStreak'; bestKey = 'postflopBest';
    } else if (module.startsWith('fullhand')) {
      streakKey = 'fullhandStreak'; bestKey = 'fullhandBest';
    }
    if (streakKey && bestKey) {
      const cur  = ((stats as any)[streakKey] ?? 0) as number;
      const newS = isCorrect ? cur + 1 : 0;
      data[streakKey] = newS;
      data[bestKey]   = Math.max(((stats as any)[bestKey] ?? 0) as number, newS);
    }
  }

  // Per-position counters + accuracy (preflop only)
  if (module === 'preflop' && position) {
    const posMap: Record<string, [string, string, string]> = {
      UTG: ['utgTotal', 'utgCorrect', 'utgAccuracy'],
      HJ:  ['hjTotal',  'hjCorrect',  'hjAccuracy'],
      CO:  ['coTotal',  'coCorrect',  'coAccuracy'],
      BTN: ['btnTotal', 'btnCorrect', 'btnAccuracy'],
      SB:  ['sbTotal',  'sbCorrect',  'sbAccuracy'],
    };
    const pFields = posMap[position.toUpperCase()];
    if (pFields) {
      const [tKey, cKey, aKey] = pFields;
      const newT = ((stats as any)[tKey] ?? 0) + 1;
      const newC = ((stats as any)[cKey] ?? 0) + (isCorrect ? 1 : 0);
      data[tKey] = newT;
      data[cKey] = newC;
      data[aKey] = newC / newT;
    }
  }

  await prisma.playerStats.update({ where: { userId }, data });
}
