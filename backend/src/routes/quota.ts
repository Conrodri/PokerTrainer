import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import prisma from '../config/database';
import { getQuota, consume, isFreeModule, FREE_LIMIT } from '../services/quota';

const router = Router();

async function userIsPremium(req: Request): Promise<boolean> {
  if ((req as any).user?.isPremium === true) return true;
  const userId: string | undefined = (req as any).user?.userId;
  if (!userId) return false;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { isPremium: true } });
  return user?.isPremium === true;
}

/** Current daily free-quota for the authenticated user across all free modules. */
router.get('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId: string = (req as any).user.userId;
    const premium = await userIsPremium(req);
    if (premium) {
      res.json({ success: true, data: { isPremium: true, limit: FREE_LIMIT, modules: null } });
      return;
    }
    const modules = await getQuota(userId);
    res.json({ success: true, data: { isPremium: false, limit: FREE_LIMIT, modules } });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to load quota' });
  }
});

/**
 * Spend one free credit for `module` (used by the client-side bet-sizing module,
 * which has no exercise-fetch endpoint of its own). Premium users never consume.
 */
router.post('/consume', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId: string = (req as any).user.userId;
    const module = String(req.body?.module ?? '');
    if (!isFreeModule(module)) {
      res.status(400).json({ success: false, error: 'Unknown module' });
      return;
    }
    if (await userIsPremium(req)) {
      res.json({ success: true, data: { unlimited: true, remaining: null, limit: FREE_LIMIT } });
      return;
    }
    const result = await consume(userId, module);
    if (result.allowed) {
      res.json({ success: true, data: { unlimited: false, ...result } });
    } else {
      res.status(402).json({
        success: false,
        error: 'quota_exceeded',
        code: 'QUOTA_EXCEEDED',
        remaining: 0,
        limit: result.limit,
      });
    }
  } catch {
    res.status(500).json({ success: false, error: 'Quota consume failed' });
  }
});

export default router;
