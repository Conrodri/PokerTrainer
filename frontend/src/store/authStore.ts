import { create } from 'zustand';
import { authApi } from '../services/api';

interface User {
  id: string;
  username: string;
  email: string;
  isPremium?: boolean;
  isPremiumExpert?: boolean;
  tutorialDone?: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  fetchMe: () => Promise<void>;
  dismissTutorial: () => Promise<void>;
  deleteAccount: (password: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const data = await authApi.login({ email, password });
      localStorage.setItem('token', data.token);
      set({ user: data.user, token: data.token, isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Connexion échouée', isLoading: false });
      throw err;
    }
  },

  register: async (username, email, password) => {
    set({ isLoading: true, error: null });
    try {
      const data = await authApi.register({ username, email, password });
      localStorage.setItem('token', data.token);
      set({ user: data.user, token: data.token, isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Inscription échouée', isLoading: false });
      throw err;
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null });
  },

  dismissTutorial: async () => {
    // Persist to DB (fire-and-forget, non-blocking)
    authApi.dismissTutorial().catch(() => {/* ignore if offline/unauthenticated */});
    // Always update local state so the tutorial won't show again this session
    set(state => ({ user: state.user ? { ...state.user, tutorialDone: true } : null }));
  },

  deleteAccount: async (password: string) => {
    set({ isLoading: true, error: null });
    try {
      await authApi.deleteAccount({ password });
      localStorage.removeItem('token');
      set({ user: null, token: null, isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Suppression échouée', isLoading: false });
      throw err;
    }
  },

  fetchMe: async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const data = await authApi.me();
      set({ user: data });
    } catch {
      localStorage.removeItem('token');
      set({ user: null, token: null });
    }
  },
}));
