import { create } from 'zustand';
import { authApi } from '../services/api';
import { analytics } from '../lib/analytics';

interface User {
  id: string;
  username: string;
  email: string;
  isPremium?: boolean;
  isPremiumExpert?: boolean;
  tutorialDone?: boolean;
  avatarUrl?: string | null;
  premiumSince?: string | null;
  premiumUntil?: string | null;
  premiumExpertSince?: string | null;
  premiumExpertUntil?: string | null;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  verificationPending: string | null; // email waiting for verification
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  loginWithToken: (token: string) => Promise<void>;
  setUser: (user: User) => void;
  logout: () => void;
  fetchMe: () => Promise<void>;
  dismissTutorial: () => Promise<void>;
  deleteAccount: (password: string) => Promise<void>;
  clearVerificationPending: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  isLoading: false,
  error: null,
  verificationPending: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const data = await authApi.login({ email, password });
      localStorage.setItem('token', data.token);
      analytics.login('email');
      set({ user: data.user, token: data.token, isLoading: false, verificationPending: null });
    } catch (err: any) {
      const apiError = err.response?.data?.error;
      if (apiError === 'EMAIL_NOT_VERIFIED') {
        const pendingEmail = err.response?.data?.data?.email ?? email;
        set({ verificationPending: pendingEmail, error: null, isLoading: false });
      } else {
        set({ error: apiError || 'Connexion échouée', isLoading: false });
      }
      throw err;
    }
  },

  register: async (username, email, password) => {
    set({ isLoading: true, error: null });
    try {
      const data = await authApi.register({ username, email, password });
      if (data?.needsVerification) {
        analytics.signup();
        set({ verificationPending: data.email ?? email, isLoading: false });
      } else {
        // Fallback: old behavior if emailVerified is skipped
        localStorage.setItem('token', data.token);
        set({ user: data.user, token: data.token, isLoading: false });
      }
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Inscription échouée', isLoading: false });
      throw err;
    }
  },

  setUser: (user: User) => set({ user }),

  clearVerificationPending: () => set({ verificationPending: null }),

  loginWithToken: async (token: string) => {
    localStorage.setItem('token', token);
    set({ token, isLoading: true });
    try {
      const data = await authApi.me();
      analytics.login('google');
      set({ user: data, isLoading: false });
    } catch {
      localStorage.removeItem('token');
      set({ user: null, token: null, isLoading: false });
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
