import { Request, Response } from 'express';
import prisma from '../config/database';
import { ApiResponse } from '../types';
import {
  computeAchievements, getBestTitle, buildLeaderboardInput, AchievementInput,
} from '../utils/achievements';

export async function getMyStats(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' } as ApiResponse);
      return;
    }

    const stats = await prisma.playerStats.findUnique({ where: { userId } });
    const recentSessions = await prisma.trainingSession.findMany({
      where: { userId },
      include: { exercises: { select: { isCorrect: true, exerciseType: true, createdAt: true } } },
      orderBy: { startedAt: 'desc' },
      take: 10,
    });

    // Calculate accuracy per module from recent sessions
    const moduleStats: Record<string, { total: number; correct: number }> = {};
    for (const session of recentSessions) {
      for (const ex of session.exercises) {
        if (!moduleStats[ex.exerciseType]) {
          moduleStats[ex.exerciseType] = { total: 0, correct: 0 };
        }
        moduleStats[ex.exerciseType].total++;
        if (ex.isCorrect) moduleStats[ex.exerciseType].correct++;
      }
    }

    res.json({
      success: true,
      data: { stats, moduleStats, recentSessions },
    } as ApiResponse);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get stats' } as ApiResponse);
  }
}

function buildSprintMap(examRecords: { userId: string; module: string; mode: string; best: number }[]) {
  const map: Record<string, Record<string, { advanced: number; expert: number }>> = {};
  for (const r of examRecords) {
    if (!map[r.userId]) map[r.userId] = {};
    if (!map[r.userId][r.module]) map[r.userId][r.module] = { advanced: 0, expert: 0 };
    if (r.mode === 'expert') map[r.userId][r.module].expert   = r.best;
    else                     map[r.userId][r.module].advanced = r.best;
  }
  return map;
}

export async function getLeaderboard(req: Request, res: Response): Promise<void> {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

    const leaders = await prisma.playerStats.findMany({
      where: { user: { OR: [{ isPremium: true }, { isPremiumExpert: true }] } },
      orderBy: { xp: 'desc' },
      take: limit,
      include: { user: { select: { username: true, isPremium: true, isPremiumExpert: true } } },
    });

    const userIds = leaders.map(l => l.userId);
    const examRecords = await prisma.examRecord.findMany({ where: { userId: { in: userIds } } });
    const sprintMap = buildSprintMap(examRecords);
    const sb = (userId: string, mod: string) => sprintMap[userId]?.[mod] ?? { advanced: 0, expert: 0 };

    const acc = (correct: number, total: number) =>
      total > 0 ? Math.round((correct / total) * 100) : null;

    const formatted = leaders.map((l, i) => {
      const userSprints = sprintMap[l.userId] ?? {};
      const achievInput = buildLeaderboardInput(l.totalExercises, l.totalCorrect, userSprints);
      const achievResults = computeAchievements(achievInput);
      const bestTitleFr = getBestTitle(achievResults, 'fr');
      const bestTitleEn = getBestTitle(achievResults, 'en');

      return {
        rank: i + 1,
        username: l.user.username,
        isPremiumExpert: l.user.isPremiumExpert,
        xp: l.xp,
        level: l.level,
        totalExercises: l.totalExercises,
        accuracy: l.totalExercises > 0 ? Math.round((l.totalCorrect / l.totalExercises) * 100) : 0,
        title: bestTitleFr
          ? { fr: bestTitleFr.title, en: bestTitleEn!.title, tier: bestTitleFr.tier, icon: bestTitleFr.icon }
          : null,
        modules: {
          preflop:             { accuracy: acc(l.preflopCorrect,  l.preflopTotal),  total: l.preflopTotal,  ...sb(l.userId, 'preflop')  },
          // Variants share preflop accuracy; only their sprint records differ.
          preflop8:            { accuracy: null, total: 0, ...sb(l.userId, 'preflop8')         },
          'preflop-mtt':       { accuracy: null, total: 0, ...sb(l.userId, 'preflop-mtt')      },
          'preflop8-mtt':      { accuracy: null, total: 0, ...sb(l.userId, 'preflop8-mtt')     },
          'preflop-3max':      { accuracy: null, total: 0, ...sb(l.userId, 'preflop-3max')     },
          'preflop-mtt-3max':  { accuracy: null, total: 0, ...sb(l.userId, 'preflop-mtt-3max') },
          'preflop-hu':        { accuracy: null, total: 0, ...sb(l.userId, 'preflop-hu')       },
          'preflop-mtt-hu':    { accuracy: null, total: 0, ...sb(l.userId, 'preflop-mtt-hu')   },
          potodds:  { accuracy: acc(l.potoddsCorrect,  l.potoddsTotal),  total: l.potoddsTotal,  ...sb(l.userId, 'potodds')  },
          equity:   { accuracy: acc(l.equityCorrect,   l.equityTotal),   total: l.equityTotal,   ...sb(l.userId, 'equity')   },
          outs:     { accuracy: acc(l.outsCorrect,     l.outsTotal),     total: l.outsTotal,     ...sb(l.userId, 'outs')     },
          postflop: { accuracy: acc(l.postflopCorrect, l.postflopTotal), total: l.postflopTotal, ...sb(l.userId, 'postflop') },
          fullhand: { accuracy: acc(l.fullhandCorrect, l.fullhandTotal), total: l.fullhandTotal, ...sb(l.userId, 'fullhand') },
        },
      };
    });

    res.json({ success: true, data: formatted } as ApiResponse);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get leaderboard' } as ApiResponse);
  }
}

export async function getUserStats(req: Request, res: Response): Promise<void> {
  try {
    const { username } = req.params;
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) { res.status(404).json({ success: false, error: 'User not found' }); return; }

    const [stats, examRecords, history] = await Promise.all([
      prisma.playerStats.findUnique({ where: { userId: user.id } }),
      prisma.examRecord.findMany({ where: { userId: user.id } }),
      prisma.sessionExercise.findMany({
        where: { session: { userId: user.id }, createdAt: { gte: new Date(Date.now() - 730 * 86400000) } },
        orderBy: { createdAt: 'asc' },
        select: { exerciseType: true, isCorrect: true, xpEarned: true, createdAt: true },
      }),
    ]);

    const sprintRecords: Record<string, { advanced: number; expert: number }> = {};
    for (const r of examRecords) {
      if (!sprintRecords[r.module]) sprintRecords[r.module] = { advanced: 0, expert: 0 };
      if (r.mode === 'expert') sprintRecords[r.module].expert   = r.best;
      else                     sprintRecords[r.module].advanced = r.best;
    }

    const byDay: Record<string, { total: number; correct: number }> = {};
    for (const ex of history) {
      const day = ex.createdAt.toISOString().split('T')[0];
      if (!byDay[day]) byDay[day] = { total: 0, correct: 0 };
      byDay[day].total++;
      if (ex.isCorrect) byDay[day].correct++;
    }

    // Compute achievements from all available data
    const daysPlayed         = Object.keys(byDay).length;
    const bestSprintAdvanced = Object.values(sprintRecords).reduce((m, v) => Math.max(m, v.advanced), 0);
    const bestSprintExpert   = Object.values(sprintRecords).reduce((m, v) => Math.max(m, v.expert),   0);
    const bestDayExercises   = Object.values(byDay).reduce((m, v) => Math.max(m, v.total),   0);
    const bestDayCorrect     = Object.values(byDay).reduce((m, v) => Math.max(m, v.correct), 0);
    const bestDayAccuracy    = Object.values(byDay).reduce((m, v) => {
      if (v.total < 10) return m;
      return Math.max(m, Math.round((v.correct / v.total) * 100));
    }, 0);
    const totalEx  = stats?.totalExercises ?? 0;
    const totalCor = stats?.totalCorrect   ?? 0;
    const accuracy = totalEx > 0 ? Math.round((totalCor / totalEx) * 100) : 0;

    const achievInput: AchievementInput = {
      totalExercises: totalEx, accuracy, daysPlayed,
      bestSprintAdvanced, bestSprintExpert,
      bestDayExercises, bestDayCorrect, bestDayAccuracy,
    };
    const achievements = computeAchievements(achievInput);

    res.json({ success: true, data: { username, stats, sprintRecords, byDay, achievements } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get user stats' });
  }
}

export async function getProgressHistory(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' } as ApiResponse);
      return;
    }

    const days = parseInt(req.query.days as string) || 30;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const exercises = await prisma.sessionExercise.findMany({
      where: {
        session: { userId },
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'asc' },
      select: {
        exerciseType: true,
        isCorrect: true,
        xpEarned: true,
        timeTaken: true,
        createdAt: true,
      },
    });

    // Group by day
    const byDay: Record<string, { total: number; correct: number; xp: number }> = {};
    for (const ex of exercises) {
      const day = ex.createdAt.toISOString().split('T')[0];
      if (!byDay[day]) byDay[day] = { total: 0, correct: 0, xp: 0 };
      byDay[day].total++;
      if (ex.isCorrect) byDay[day].correct++;
      byDay[day].xp += ex.xpEarned;
    }

    res.json({ success: true, data: { byDay, exercises } } as ApiResponse);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get history' } as ApiResponse);
  }
}
