import { Request, Response } from 'express';
import prisma from '../config/database';

const MODULES = [
  'preflop', 'preflop-mtt',
  'preflop8', 'preflop8-mtt',
  'preflop-3max', 'preflop-mtt-3max',
  'preflop-hu', 'preflop-mtt-hu',
  'potodds', 'equity', 'outs', 'postflop', 'fullhand', 'betsizing',
];
const MODES   = ['beginner', 'advanced', 'expert'];

function uid(req: Request): string {
  return (req as any).user?.userId as string;
}

// GET /exam/records  →  { success, data: { [module]: { advanced: best, expert: best } } }
export async function getExamRecords(req: Request, res: Response): Promise<void> {
  try {
    const userId = uid(req);
    const rows = await prisma.examRecord.findMany({ where: { userId } });
    const data: Record<string, { advanced: number; expert: number }> = {};
    for (const r of rows) {
      if (!data[r.module]) data[r.module] = { advanced: 0, expert: 0 };
      if (r.mode === 'expert')   data[r.module].expert   = r.best;
      else                       data[r.module].advanced = r.best;
    }
    res.json({ success: true, data });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to get exam records' });
  }
}

// POST /exam/record  body: { module, score, mode? }
export async function saveExamScore(req: Request, res: Response): Promise<void> {
  try {
    const userId = uid(req);
    const { module, score, mode = 'advanced' } = req.body ?? {};
    if (typeof module !== 'string' || !MODULES.includes(module)) {
      res.status(400).json({ success: false, error: 'invalid module' }); return;
    }
    if (typeof score !== 'number' || !Number.isInteger(score) || score < 0 || score > 100000) {
      res.status(400).json({ success: false, error: 'score must be a non-negative integer' }); return;
    }
    if (!MODES.includes(mode)) {
      res.status(400).json({ success: false, error: 'invalid mode' }); return;
    }

    await prisma.examRun.create({ data: { userId, module, mode, score } });

    const existing = await prisma.examRecord.findUnique({
      where: { userId_module_mode: { userId, module, mode } },
    });
    const prevBest   = existing?.best ?? 0;
    const isNewRecord = score > prevBest;
    const best        = Math.max(prevBest, score);

    if (isNewRecord) {
      await prisma.examRecord.upsert({
        where:  { userId_module_mode: { userId, module, mode } },
        create: { userId, module, mode, best: score },
        update: { best: score },
      });
    }

    const runs = await prisma.examRun.findMany({
      where:   { userId, module, mode },
      orderBy: { createdAt: 'desc' },
      take: 8,
    });
    const history = runs.map(r => ({ score: r.score, createdAt: r.createdAt }));
    res.json({ success: true, data: { best, isNewRecord, history } });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to save exam score' });
  }
}
