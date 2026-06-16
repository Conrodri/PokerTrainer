import { Request, Response } from 'express';
import prisma from '../config/database';

// Exam mode: per (user, module), the best number of correct answers reached in a
// single looped run (run ends after 3 errors). Replaces the old streak record.

const MODULES = ['preflop', 'potodds', 'equity', 'outs', 'postflop', 'fullhand', 'betsizing'];

function uid(req: Request): string {
  return (req as any).user?.userId as string;
}

// GET /exam/records  →  { success, data: { [module]: best } }
export async function getExamRecords(req: Request, res: Response): Promise<void> {
  try {
    const userId = uid(req);
    const rows = await prisma.examRecord.findMany({ where: { userId } });
    const data: Record<string, number> = {};
    for (const r of rows) data[r.module] = r.best;
    res.json({ success: true, data });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to get exam records' });
  }
}

// POST /exam/record  body: { module, score }  →  { success, data: { best, isNewRecord } }
export async function saveExamScore(req: Request, res: Response): Promise<void> {
  try {
    const userId = uid(req);
    const { module, score } = req.body ?? {};
    if (typeof module !== 'string' || !MODULES.includes(module)) {
      res.status(400).json({ success: false, error: 'invalid module' });
      return;
    }
    if (typeof score !== 'number' || !Number.isInteger(score) || score < 0 || score > 100000) {
      res.status(400).json({ success: false, error: 'score must be a non-negative integer' });
      return;
    }
    const existing = await prisma.examRecord.findUnique({
      where: { userId_module: { userId, module } },
    });
    const prevBest = existing?.best ?? 0;
    const isNewRecord = score > prevBest;
    const best = Math.max(prevBest, score);
    if (isNewRecord) {
      await prisma.examRecord.upsert({
        where: { userId_module: { userId, module } },
        create: { userId, module, best: score },
        update: { best: score },
      });
    }
    res.json({ success: true, data: { best, isNewRecord } });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to save exam score' });
  }
}
