import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** Difficulty level — controls exercise complexity and content. */
export type TrainingMode = 'basic' | 'advanced' | 'expert';

/** Hint visibility within a level. */
export type HintsMode = 'easy' | 'hard';

interface ModeState {
  mode: TrainingMode;
  hints: HintsMode;
  setMode: (mode: TrainingMode) => void;
  setHints: (hints: HintsMode) => void;
}

export const useModeStore = create<ModeState>()(
  persist(
    (set) => ({
      mode: 'basic',
      hints: 'easy',
      setMode: (mode) => set({ mode }),
      setHints: (hints) => set({ hints }),
    }),
    { name: 'poker-mode' }
  )
);
