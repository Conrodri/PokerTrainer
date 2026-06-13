import { create } from 'zustand';
import { quotaApi } from '../services/api';

export type QuotaModule = 'postflop' | 'fullhand' | 'betsizing';
const DEFAULT_LIMIT = 5;

interface QuotaState {
  limit: number;
  /** Remaining free exercises today, per module (for non-premium users). */
  remaining: Record<QuotaModule, number>;
  loaded: boolean;
  loading: boolean;
  /** Pull the latest counts from the server. No-op while a fetch is in flight. */
  refresh: () => Promise<void>;
  /** Optimistically subtract one credit (server already consumed it). */
  decrement: (module: QuotaModule) => void;
  /** Set an exact remaining count (e.g. from a consume response). */
  set: (module: QuotaModule, n: number) => void;
}

export const useQuotaStore = create<QuotaState>((set, get) => ({
  limit: DEFAULT_LIMIT,
  remaining: { postflop: DEFAULT_LIMIT, fullhand: DEFAULT_LIMIT, betsizing: DEFAULT_LIMIT },
  loaded: false,
  loading: false,

  refresh: async () => {
    if (get().loading) return;
    set({ loading: true });
    try {
      const data = await quotaApi.get();
      // Premium users have no per-module limits — leave counts at the (unused) default.
      if (data?.isPremium || !data?.modules) {
        set({ limit: data?.limit ?? DEFAULT_LIMIT, loaded: true, loading: false });
        return;
      }
      set({
        limit: data.limit ?? DEFAULT_LIMIT,
        remaining: {
          postflop:  data.modules.postflop?.remaining  ?? 0,
          fullhand:  data.modules.fullhand?.remaining  ?? 0,
          betsizing: data.modules.betsizing?.remaining ?? 0,
        },
        loaded: true,
        loading: false,
      });
    } catch {
      set({ loading: false, loaded: true });
    }
  },

  decrement: (module) =>
    set(s => ({ remaining: { ...s.remaining, [module]: Math.max(0, s.remaining[module] - 1) } })),

  set: (module, n) =>
    set(s => ({ remaining: { ...s.remaining, [module]: Math.max(0, n) } })),
}));
