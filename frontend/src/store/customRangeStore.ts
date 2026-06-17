import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CustomRangeState {
  /** Whether to use the user's saved custom range / active profile in the Preflop trainer (includes BB defense). */
  preflopEnabled: boolean;
  togglePreflopEnabled: () => void;
  setPreflopEnabled: (v: boolean) => void;
}

export const useCustomRangeStore = create<CustomRangeState>()(
  persist(
    (set) => ({
      preflopEnabled: false,
      togglePreflopEnabled: () => set(s => ({ preflopEnabled: !s.preflopEnabled })),
      setPreflopEnabled: (preflopEnabled) => set({ preflopEnabled }),
    }),
    { name: 'poker-custom-ranges' },
  ),
);
