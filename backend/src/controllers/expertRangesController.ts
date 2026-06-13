import { Request, Response } from 'express';
import prisma from '../config/database';

// Expert ranges: per (user, position), a flat 169×4 float array.
// Each hand cell = [fold, call, raise3x, allin], summing to ~1.0.

const EXPERT_CELLS = 169 * 4; // 676

function uid(req: Request): string {
  return (req as any).user?.userId as string;
}

function validateMix(mix: unknown): { ok: true; value: number[] } | { ok: false; error: string } {
  if (!Array.isArray(mix) || mix.length !== EXPERT_CELLS) {
    return { ok: false, error: `mix must be a ${EXPERT_CELLS}-element array` };
  }
  for (let i = 0; i < mix.length; i++) {
    const v = mix[i];
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 1) {
      return { ok: false, error: `mix[${i}] must be a number in [0, 1]` };
    }
  }
  // Each group of 4 (one hand) must sum to ~1.0
  for (let c = 0; c < 169; c++) {
    const sum = mix[c * 4] + mix[c * 4 + 1] + mix[c * 4 + 2] + mix[c * 4 + 3];
    if (sum < 0.99 || sum > 1.01) {
      return { ok: false, error: `hand ${c} frequencies must sum to 100% (got ${Math.round(sum * 100)}%)` };
    }
  }
  return { ok: true, value: mix as number[] };
}

// GET /expert-ranges/:position
export async function getExpertRange(req: Request, res: Response): Promise<void> {
  try {
    const userId = uid(req);
    const { position } = req.params;
    const row = await prisma.expertRange.findUnique({
      where: { userId_position: { userId, position } },
    });
    res.json({ success: true, data: row ? JSON.parse(row.mix) : null });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to get expert range' });
  }
}

// PUT /expert-ranges/:position   body: { mix: number[] }  (676 floats)
export async function saveExpertRange(req: Request, res: Response): Promise<void> {
  try {
    const userId = uid(req);
    const { position } = req.params;
    const check = validateMix(req.body?.mix);
    if (!check.ok) {
      res.status(400).json({ success: false, error: check.error });
      return;
    }
    await prisma.expertRange.upsert({
      where: { userId_position: { userId, position } },
      create: { userId, position, mix: JSON.stringify(check.value) },
      update: { mix: JSON.stringify(check.value) },
    });
    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to save expert range' });
  }
}

// DELETE /expert-ranges/:position
export async function deleteExpertRange(req: Request, res: Response): Promise<void> {
  try {
    const userId = uid(req);
    const { position } = req.params;
    await prisma.expertRange.deleteMany({ where: { userId, position } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to delete expert range' });
  }
}
