import axios from 'axios';
import { Position } from '../types/poker';

// In dev, VITE_API_URL is undefined → proxy in vite.config.ts handles /api
// In production, VITE_API_URL=https://your-backend.onrender.com
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}/api`
    : '/api',
  timeout: 35000,   // 35s — enough for Render free-tier cold start (~25s) + computation
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT + lang automatically
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;

  // Read language from persisted Zustand store (saved under 'poker-lang')
  try {
    const raw = localStorage.getItem('poker-lang');
    const lang = raw ? (JSON.parse(raw)?.state?.lang ?? 'fr') : 'fr';
    config.params = { ...config.params, lang };
  } catch {
    config.params = { ...config.params, lang: 'fr' };
  }

  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.dispatchEvent(new Event('auth:logout'));
    }
    return Promise.reject(err);
  }
);

// Auth — unwrap the inner `data` field from { success, data }
export const authApi = {
  register: (data: { username: string; email: string; password: string }) =>
    api.post('/auth/register', data).then(r => r.data.data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data).then(r => r.data.data),
  me: () => api.get('/auth/me').then(r => r.data.data),

  dismissTutorial: () =>
    api.patch('/auth/dismiss-tutorial').then(r => r.data),

  updateProfile: (data: { username?: string }) =>
    api.put('/auth/profile', data).then(r => r.data.data),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.put('/auth/password', data).then(r => r.data),

  verifyEmail: (token: string) =>
    api.get('/auth/verify-email', { params: { token } }).then(r => r.data.data),

  resendVerification: (email: string) =>
    api.post('/auth/resend-verify', { email }).then(r => r.data),

  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }).then(r => r.data),

  resetPassword: (token: string, password: string) =>
    api.post('/auth/reset-password', { token, password }).then(r => r.data.data),

  deleteAccount: (data: { password: string }) =>
    api.delete('/auth/account', { data }).then(r => r.data),
};

// Training
export const trainingApi = {
  startSession: (module: string) =>
    api.post('/training/session/start', { module }).then(r => r.data.data),

  getPreflopExercise: (position?: Position) =>
    api.get('/training/preflop/exercise', { params: { position } }).then(r => r.data.data),
  checkPreflopAnswer: (payload: {
    notation: string; position: Position; userAction: string; timeTaken: number; sessionId: string;
  }) => api.post('/training/preflop/check', payload).then(r => r.data.data),
  getRangeMatrix: (position: Position) =>
    api.get(`/training/preflop/range/${position}`).then(r => r.data.data),

  getPotOddsExercise: (difficulty?: string) =>
    api.get('/training/potodds/exercise', { params: difficulty ? { difficulty } : {} }).then(r => r.data.data),
  checkPotOddsAnswer: (payload: {
    potSize: number; betSize: number; heroEquity: number;
    userAction: string; timeTaken: number; sessionId: string;
  }) => api.post('/training/potodds/check', payload).then(r => r.data.data),

  getEquityExercise: (difficulty?: string) => {
    const mode = localStorage.getItem('poker-equity-mode') || 'beginner';
    return api.get('/training/equity/exercise', { params: { mode, ...(difficulty ? { difficulty } : {}) } }).then(r => r.data.data);
  },

  getOutsExercise: (difficulty?: string) =>
    api.get('/training/outs/exercise', { params: difficulty ? { difficulty } : {} }).then(r => r.data.data),

  getBBDefenseExercise: () =>
    api.get('/training/bbdefense/exercise').then(r => r.data.data),
  getBBDefenseRange: () =>
    api.get('/training/bbdefense/range').then(r => r.data.data),

  getBluffExercise: () =>
    api.get('/training/bluff/exercise').then(r => r.data.data),

  recordResult: (payload: { module: string; isCorrect: boolean; xpEarned: number; timeTaken?: number; sessionId: string }) =>
    api.post('/training/record', payload).then(r => r.data.data).catch(() => null),
};

// Custom ranges (premium)
export const rangesApi = {
  get: (position: string) => api.get(`/ranges/${position}`).then(r => r.data.data),
  save: (position: string, cells: number[]) => api.put(`/ranges/${position}`, { cells }).then(r => r.data),
  delete: (position: string) => api.delete(`/ranges/${position}`).then(r => r.data),
  getDefaults: () => api.get('/ranges/defaults').then(r => r.data.data) as Promise<Record<string, number[][]>>,
};

export interface RangePreset {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  stackMin: number | null;
  stackMax: number | null;
  data: Record<string, number[][]>;
  createdAt: string;
  updatedAt: string;
}

export interface PresetInput {
  name: string;
  description?: string;
  stackMin?: number | null;
  stackMax?: number | null;
  data: Record<string, number[][]>;
}

// Range presets (premium)
export const presetsApi = {
  list: () => api.get('/ranges/presets').then(r => r.data.data) as Promise<RangePreset[]>,
  getActive: () => api.get('/ranges/presets/active').then(r => r.data.data) as Promise<RangePreset | null>,
  create: (input: PresetInput) => api.post('/ranges/presets', input).then(r => r.data.data) as Promise<RangePreset>,
  update: (id: string, patch: Partial<PresetInput>) => api.put(`/ranges/presets/${id}`, patch).then(r => r.data.data) as Promise<RangePreset>,
  delete: (id: string) => api.delete(`/ranges/presets/${id}`).then(r => r.data),
  activate: (id: string) => api.post(`/ranges/presets/${id}/activate`).then(r => r.data),
  deactivate: () => api.post('/ranges/presets/none/activate').then(r => r.data),
};

// ── Range Profiles (premium) ──────────────────────────────────────────────────

export interface RangeStackRange {
  id: string;
  profileId: string;
  label: string;
  stackMin: number;
  stackMax: number | null;
  sortOrder: number;
  data: Record<string, number[]>;   // flat 169-element array per Position key
  createdAt: string;
  updatedAt: string;
}

export interface RangeProfile {
  id: string;
  name: string;
  mode?: 'standard' | 'expert';
  isActive: boolean;
  includeFolds?: boolean;   // expert training: quiz 100%-fold hands or skip them
  sortOrder: number;
  stackRanges: RangeStackRange[];
  createdAt: string;
  updatedAt: string;
}

export interface ResolveResult {
  cells: number[] | null;           // flat 169, null = no range saved
  source: 'profile' | 'custom';
  profileName?: string;
  stackRangeLabel?: string;
  includeFolds?: boolean;           // active profile setting (profile source only)
}

export const profilesApi = {
  list: () =>
    api.get('/profiles').then(r => r.data.data) as Promise<RangeProfile[]>,

  create: (name: string, mode: 'standard' | 'expert' = 'standard') =>
    api.post('/profiles', { name, mode }).then(r => r.data.data) as Promise<RangeProfile>,

  update: (id: string, name: string) =>
    api.put(`/profiles/${id}`, { name }).then(r => r.data.data) as Promise<RangeProfile>,

  setIncludeFolds: (id: string, includeFolds: boolean) =>
    api.put(`/profiles/${id}`, { includeFolds }).then(r => r.data.data) as Promise<RangeProfile>,

  delete: (id: string) =>
    api.delete(`/profiles/${id}`).then(r => r.data),

  activate: (id: string) =>
    api.post(`/profiles/${id}/activate`).then(r => r.data),

  deactivate: () =>
    api.post('/profiles/none/activate').then(r => r.data),

  createStackRange: (profileId: string, label: string, stackMin: number, stackMax: number | null) =>
    api.post(`/profiles/${profileId}/ranges`, { label, stackMin, stackMax })
      .then(r => r.data.data) as Promise<RangeStackRange>,

  updateStackRange: (
    profileId: string, rangeId: string,
    patch: { label?: string; stackMin?: number; stackMax?: number | null; position?: string; cells?: number[] }
  ) =>
    api.put(`/profiles/${profileId}/ranges/${rangeId}`, patch)
      .then(r => r.data.data) as Promise<RangeStackRange>,

  deleteStackRange: (profileId: string, rangeId: string) =>
    api.delete(`/profiles/${profileId}/ranges/${rangeId}`).then(r => r.data),

  /** Returns the cells for the active profile at the given stack & position.
   *  Pass simpleOnly to skip complex profiles and resolve the simple range only. */
  resolve: (position: string, stack: number, simpleOnly = false) =>
    api.get('/profiles/resolve', { params: { position, stack, ...(simpleOnly && { simpleOnly: true }) } })
      .then(r => r.data.data) as Promise<ResolveResult>,
};

// Postflop trainer (premium)
export const postflopApi = {
  getExercise: (street?: string, difficulty?: string) => {
    const params: Record<string, string> = {};
    if (street) params.street = street;
    if (difficulty) params.difficulty = difficulty;
    return api.get('/postflop/exercise', { params }).then(r => r.data.data);
  },
  getFullHandScenario: () =>
    api.get('/postflop/full-hand').then(r => r.data.data),
};

// Expert multi-action ranges (premium-expert tier). mix = flat 169×4 floats.
export const expertRangesApi = {
  get: (position: string) =>
    api.get(`/expert-ranges/${position}`).then(r => r.data.data as number[] | null),
  save: (position: string, mix: number[]) =>
    api.put(`/expert-ranges/${position}`, { mix }).then(r => r.data),
  delete: (position: string) =>
    api.delete(`/expert-ranges/${position}`).then(r => r.data),
};

// Exam mode best scores (per module, account-scoped)
export const examApi = {
  /** All exam best scores: { [module]: { advanced: best, expert: best } }. */
  records: () => api.get('/exam/records').then(r => r.data.data as Record<string, { advanced: number; expert: number }>),
  /** Submit a run's score; returns the (possibly updated) best, whether it beat
   *  the record, and the module's recent run history. */
  saveScore: (module: string, score: number, mode: 'beginner' | 'advanced' | 'expert' = 'advanced') =>
    api.post('/exam/record', { module, score, mode }).then(r => r.data.data as {
      best: number; isNewRecord: boolean; history: { score: number; createdAt: string }[];
    }),
};

// Daily free-quota for non-premium users on premium modules
export const quotaApi = {
  /** { isPremium, limit, modules: { postflop:{used,remaining,limit}, ... } | null } */
  get: () => api.get('/quota').then(r => r.data.data),
  /** Spend one credit. Resolves with { unlimited, remaining, limit } or rejects with a 402. */
  consume: (module: string) =>
    api.post('/quota/consume', { module }).then(r => r.data.data),
};

// Subscription management
export interface SubscriptionInfo {
  tier: 'free' | 'premium' | 'expert';
  isPremium: boolean;
  isPremiumExpert: boolean;
  premiumSince: string | null;
  premiumUntil: string | null;
  premiumExpertSince: string | null;
  premiumExpertUntil: string | null;
}

export const subscriptionApi = {
  get: () => api.get('/subscription').then(r => r.data.data as SubscriptionInfo),
  downgrade: () => api.post('/subscription/downgrade').then(r => r.data),
  cancel: () => api.post('/subscription/cancel').then(r => r.data),
};

// Stats
export const statsApi = {
  getMyStats: () => api.get('/stats/me').then(r => r.data.data),
  getLeaderboard: (limit = 10) =>
    api.get('/stats/leaderboard', { params: { limit } }).then(r => r.data.data),
  getHistory: (days = 30) =>
    api.get('/stats/history', { params: { days } }).then(r => r.data.data),
  getUserStats: (username: string) =>
    api.get(`/stats/user/${encodeURIComponent(username)}`).then(r => r.data.data),
};

/** Fire-and-forget ping to wake up the Render backend (free tier spins down after inactivity). */
export function pingBackend(): void {
  const base = import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}/api`
    : '/api';
  fetch(`${base}/health`, { method: 'GET' }).catch(() => {/* ignore */});
}

export default api;
