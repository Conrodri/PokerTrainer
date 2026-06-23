import prisma from '../config/database';

// ── Daily free-exercise quota for non-premium users ───────────────────────────
//
// Non-premium, logged-in users get a small daily allowance of premium-module
// exercises so they can taste the content. The allowance resets at midnight,
// Europe/Paris time (the app's audience), regardless of server timezone.

export const FREE_LIMIT = 3;
export const FREE_MODULES = ['postflop', 'fullhand', 'betsizing', 'bluff'] as const;
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
  const key = { userId_module_date: { userId, module, date } };

  // Make sure today's row exists (count starts at 0).
  await prisma.freeUsage.upsert({
    where:  key,
    create: { userId, module, date, count: 0 },
    update: {},
  });

  // Atomic conditional increment: the `count < FREE_LIMIT` guard lives in the
  // UPDATE's WHERE clause, so concurrent requests can never both push past the
  // cap (no read-then-write race). updateMany reports how many rows it touched.
  const result = await prisma.freeUsage.updateMany({
    where: { userId, module, date, count: { lt: FREE_LIMIT } },
    data:  { count: { increment: 1 } },
  });

  const row = await prisma.freeUsage.findUnique({ where: key });
  const used = row?.count ?? FREE_LIMIT;

  if (result.count === 0) {
    // Already at the cap — nothing was incremented.
    return { allowed: false, used, remaining: 0, limit: FREE_LIMIT };
  }

  return {
    allowed: true,
    used,
    remaining: Math.max(0, FREE_LIMIT - used),
    limit: FREE_LIMIT,
  };
}
