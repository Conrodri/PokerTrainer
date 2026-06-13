import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type TrainingMode = 'beginner' | 'advanced' | 'expert';

interface ModeState {
  mode: TrainingMode;
  setMode: (mode: TrainingMode) => void;
}

export const useModeStore = create<ModeState>()(
  persist(
    (set) => ({
      mode: 'beginner',
      setMode: (mode) => set({ mode }),
    }),
    { name: 'poker-mode' }
  )
);

// ── Mode helpers ──────────────────────────────────────────────────────────────
// Keep the three-way logic in one place so trainers never branch on each mode.

/** Hints + how-to guidance are shown outright (beginner only). */
export const showHints = (mode: TrainingMode): boolean => mode === 'beginner';

/** Hints exist but are hidden behind a "reveal" (spoil) button (advanced only).
 *  Expert shows no hints at all. */
export const hintsAvailable = (mode: TrainingMode): boolean => mode === 'advanced';
