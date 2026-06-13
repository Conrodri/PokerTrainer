import prisma from '../config/database';

// ── Daily free-exercise quota for non-premium users ───────────────────────────
//
// Non-premium, logged-in users get a small daily allowance of premium-module
// exercises so they can taste the content. The allowance resets at midnight,
// Europe/Paris time (the app's audience), regardless of server timezone.

export const FREE_LIMIT = 5;
export const FREE_MODULES = ['postflop', 'fullhand', 'betsizing'] as const;
export type FreeModule = (typeof FREE_MODULES)[number];

export function isFreeModule(m: string): m is FreeModule {
  return (FREE_MODULES as readonly string[]).includes(m);
}

/** Today's calendar date (YYYY-MM-DD) in Europe/Paris — defines the reset window. */
export function parisDate(d: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD; timeZone shifts to Paris local day.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

export interface ModuleQuota {
  used: number;
  remaining: number;
  limit: number;
}

/** Current quota for every free module, without consuming anything. */
export async function getQuota(userId: string): Promise<Record<FreeModule, ModuleQuota>> {
  const date = parisDate();
  const rows = await prisma.freeUsage.findMany({ where: { userId, date } });
  const byModule = new Map(rows.map(r => [r.module, r.count]));

  const out = {} as Record<FreeModule, ModuleQuota>;
  for (const m of FREE_MODULES) {
    const used = byModule.get(m) ?? 0;
    out[m] = { used, remaining: Math.max(0, FREE_LIMIT - used), limit: FREE_LIMIT };
  }
  return out;
}

export interface ConsumeResult extends ModuleQuota {
  allowed: boolean;
}

/**
 * Try to spend one free credit for `module` today. Increments the daily counter
 * only when there is room left, so the cap can never be exceeded.
 */
export async function consume(userId: string, module: FreeModule): Promise<ConsumeResult> {
  const date = parisDate();

  // Ensure today's row exists, then read its current count.
  const row = await prisma.freeUsage.upsert({
    where:  { userId_module_date: { userId, module, date } },
    create: { userId, module, date, count: 0 },
    update: {},
  });

  if (row.count >= FREE_LIMIT) {
    return { allowed: false, used: row.count, remaining: 0, limit: FREE_LIMIT };
  }

  const updated = await prisma.freeUsage.update({
    where: { userId_module_date: { userId, module, date } },
    data:  { count: { increment: 1 } },
  });

  return {
    allowed: true,
    used: updated.count,
    remaining: Math.max(0, FREE_LIMIT - updated.count),
    limit: FREE_LIMIT,
  };
}
