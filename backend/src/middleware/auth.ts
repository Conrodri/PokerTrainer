import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';
import { JwtPayload } from '../types';
import { JWT_SECRET } from '../config/secrets';

/** Return true when a subscription boolean is active, respecting the expiry date.
 *  - flag=true, until=null  → perpetual (manually granted, never expires)
 *  - flag=true, until=past  → expired
 *  - flag=false             → not subscribed */
function isActive(flag: boolean, until: Date | null): boolean {
  if (!flag) return false;
  if (until === null) return true;          // no expiry set = perpetual
  return until > new Date();
}

/** Resolve whether the authenticated request belongs to a premium-expert user. */
export async function isRequestPremiumExpert(req: Request): Promise<boolean> {
  if ((req as any).user?.isPremiumExpert === true) return true;
  const userId: string | undefined = (req as any).user?.userId;
  if (!userId) return false;
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isPremiumExpert: true, premiumExpertUntil: true },
    });
    if (isActive(user?.isPremiumExpert ?? false, user?.premiumExpertUntil ?? null)) {
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
