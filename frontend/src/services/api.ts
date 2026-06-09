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

  updateProfile: (data: { username?: string }) =>
    api.put('/auth/profile', data).then(r => r.data.data),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.put('/auth/password', data).then(r => r.data),

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

  getPotOddsExercise: () =>
    api.get('/training/potodds/exercise').then(r => r.data.data),
  checkPotOddsAnswer: (payload: {
    potSize: number; betSize: number; heroEquity: number;
    userAction: string; timeTaken: number; sessionId: string;
  }) => api.post('/training/potodds/check', payload).then(r => r.data.data),

  getEquityExercise: () => {
    const mode = localStorage.getItem('poker-equity-mode') || 'beginner';
    return api.get('/training/equity/exercise', { params: { mode } }).then(r => r.data.data);
  },

  getOutsExercise: () =>
    api.get('/training/outs/exercise').then(r => r.data.data),

  getBBDefenseExercise: () =>
    api.get('/training/bbdefense/exercise').then(r => r.data.data),
  getBBDefenseRange: () =>
    api.get('/training/bbdefense/range').then(r => r.data.data),

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
  isActive: boolean;
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
}

export const profilesApi = {
  list: () =>
    api.get('/profiles').then(r => r.data.data) as Promise<RangeProfile[]>,

  create: (name: string) =>
    api.post('/profiles', { name }).then(r => r.data.data) as Promise<RangeProfile>,

  update: (id: string, name: string) =>
    api.put(`/profiles/${id}`, { name }).then(r => r.data.data) as Promise<RangeProfile>,

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

  /** Returns the 169-cell array for the active profile at the given stack & position. */
  resolve: (position: string, stack: number) =>
    api.get('/profiles/resolve', { params: { position, stack } })
      .then(r => r.data.data) as Promise<ResolveResult>,
};

// Postflop trainer (premium)
export const postflopApi = {
  getExercise: (street?: string) =>
    api.get('/postflop/exercise', { params: street ? { street } : {} }).then(r => r.data.data),
  getFullHandScenario: () =>
    api.get('/postflop/full-hand').then(r => r.data.data),
};

// Stats
export const statsApi = {
  getMyStats: () => api.get('/stats/me').then(r => r.data.data),
  getLeaderboard: (limit = 10) =>
    api.get('/stats/leaderboard', { params: { limit } }).then(r => r.data.data),
  getHistory: (days = 30) =>
    api.get('/stats/history', { params: { days } }).then(r => r.data.data),
};

/** Fire-and-forget ping to wake up the Render backend (free tier spins down after inactivity). */
export function pingBackend(): void {
  const base = import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}/api`
    : '/api';
  fetch(`${base}/health`, { method: 'GET' }).catch(() => {/* ignore */});
}

export default api;
