import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';
import { JwtPayload } from '../types';
import { consume, isFreeModule, FreeModule } from '../services/quota';

const JWT_SECRET = process.env.JWT_SECRET || 'change_me';

/** Resolve whether the authenticated request belongs to a premium user.
 *  The premium-expert tier implies premium access (OR-clause). */
async function isRequestPremium(req: Request): Promise<boolean> {
  if ((req as any).user?.isPremium === true || (req as any).user?.isPremiumExpert === true) return true;
  const userId: string | undefined = (req as any).user?.userId;
  if (!userId) return false;
  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { isPremium: true, isPremiumExpert: true } });
    if (user?.isPremium === true || user?.isPremiumExpert === true) {
      (req as any).user.isPremium = true;
      if (user?.isPremiumExpert === true) (req as any).user.isPremiumExpert = true;
      return true;
    }
  } catch { /* fall through to non-premium */ }
  return false;
}

/** Resolve whether the authenticated request belongs to a premium-expert user. */
async function isRequestPremiumExpert(req: Request): Promise<boolean> {
  if ((req as any).user?.isPremiumExpert === true) return true;
  const userId: string | undefined = (req as any).user?.userId;
  if (!userId) return false;
  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { isPremiumExpert: true } });
    if (user?.isPremiumExpert === true) {
      (req as any).user.isPremiumExpert = true;
      return true;
    }
  } catch { /* fall through */ }
  return false;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    (req as any).user = payload;
    next();
  } catch {
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
}

export async function requirePremium(req: Request, res: Response, next: NextFunction): Promise<void> {
  // Premium OR premium-expert (expert implies premium) — see isRequestPremium.
  try {
    if (await isRequestPremium(req)) {
      next();
    } else {
      res.status(403).json({ success: false, error: 'Premium subscription required' });
    }
  } catch {
    res.status(403).json({ success: false, error: 'Premium subscription required' });
  }
}

/** Gate a route to premium-EXPERT tier users only. Must run after requireAuth. */
export async function requirePremiumExpert(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (await isRequestPremiumExpert(req)) {
      next();
    } else {
      res.status(403).json({ success: false, error: 'Premium Expert tier required' });
    }
  } catch {
    res.status(403).json({ success: false, error: 'Premium Expert tier required' });
  }
}

/**
 * Gate a premium-module endpoint for both premium users and non-premium users
 * with daily free credits left. Premium users pass through untouched; everyone
 * else spends one free credit for `module` (capped per day). When the daily
 * allowance is exhausted, responds 402 with a quota_exceeded error so the
 * frontend can show the Premium upsell. Must run after `requireAuth`.
 */
export function premiumOrFreeQuota(module: FreeModule) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (await isRequestPremium(req)) {
      next();
      return;
    }
    const userId: string | undefined = (req as any).user?.userId;
    if (!userId || !isFreeModule(module)) {
      res.status(403).json({ success: false, error: 'Premium subscription required' });
      return;
    }
    try {
      const result = await consume(userId, module);
      if (result.allowed) {
        res.setHeader('X-Free-Remaining', String(result.remaining));
        next();
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
      res.status(500).json({ success: false, error: 'Quota check failed' });
    }
  };
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      const payload = jwt.verify(header.slice(7), JWT_SECRET) as JwtPayload;
      (req as any).user = payload;
    } catch {
      // Ignore invalid tokens for optional auth
    }
  }
  next();
}
