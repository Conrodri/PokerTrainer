import { create } from 'zustand';
import { TrainingModule, Position, PreflopExercise, PotOddsExercise, EquityExercise, OutsExercise, BBDefenseExercise, ExerciseResult } from '../types/poker';
import { trainingApi } from '../services/api';

interface SessionStats {
  total: number;
  correct: number;
  xp: number;
  streak: number;
}

interface TrainingState {
  module: TrainingModule;
  sessionId: string | null;
  sessionStats: SessionStats;
  isLoading: boolean;
  error: string | null;

  // Current exercises
  preflopExercise: PreflopExercise | null;
  potOddsExercise: PotOddsExercise | null;
  equityExercise: EquityExercise | null;
  outsExercise: OutsExercise | null;
  bbDefenseExercise: BBDefenseExercise | null;
  lastResult: ExerciseResult | null;

  /** True while the user has an active question on screen (blocks range panel access). */
  isExercising: boolean;
  setIsExercising: (v: boolean) => void;

  /** True once the user has dismissed the trainer intro screen (tabs hidden while active). */
  trainerStarted: boolean;
  setTrainerStarted: (v: boolean) => void;

  /** The position currently selected or active in the Preflop trainer (used to pre-select the right tab in MyRangesPanel). */
  currentPosition: Position | null;
  setCurrentPosition: (pos: Position | null) => void;

  /** Set when the user revealed a hint ("spoil") on the current exercise: the
   *  next recorded answer won't count toward the streak (and the streak was
   *  already reset to 0 on reveal). One-shot — cleared after the next record. */
  assistedPending: boolean;
  /** Reveal-hint penalty: reset the current streak now and mark the pending
   *  answer as assisted so it can't grow the streak. */
  breakStreak: () => void;

  // Actions
  setModule: (module: TrainingModule) => void;
  startSession: (module: TrainingModule) => Promise<void>;
  fetchPreflopExercise: (position?: Position) => Promise<void>;
  checkPreflopAnswer: (action: string, timeTaken: number) => Promise<ExerciseResult>;
  fetchPotOddsExercise: () => Promise<void>;
  checkPotOddsAnswer: (action: string, timeTaken: number) => Promise<ExerciseResult>;
  fetchEquityExercise: () => Promise<void>;
  fetchOutsExercise: () => Promise<void>;
  fetchBBDefenseExercise: () => Promise<void>;
  /** Record a client-scored result: updates local stats AND persists to backend if logged in. */
  recordResult: (isCorrect: boolean, xpEarned: number, module: string, timeTaken?: number) => Promise<void>;
  /** @deprecated Use recordResult instead */
  recordLocalResult: (isCorrect: boolean) => void;
  resetSession: () => void;
}

const emptyStats = (): SessionStats => ({ total: 0, correct: 0, xp: 0, streak: 0 });

export const useTrainingStore = create<TrainingState>((set, get) => ({
  module: 'preflop',
  sessionId: null,
  sessionStats: emptyStats(),
  isLoading: false,
  isExercising: false,
  setIsExercising: (v) => set({ isExercising: v }),
  trainerStarted: false,
  setTrainerStarted: (v) => set({ trainerStarted: v }),
  currentPosition: null,
  setCurrentPosition: (pos) => set({ currentPosition: pos }),
  assistedPending: false,
  breakStreak: () => set(s => ({ assistedPending: true, sessionStats: { ...s.sessionStats, streak: 0 } })),
  error: null,
  preflopExercise: null,
  potOddsExercise: null,
  equityExercise: null,
  outsExercise: null,
  bbDefenseExercise: null,
  lastResult: null,

  setModule: (module) => set({ module }),

  startSession: async (module) => {
    try {
      const session = await trainingApi.startSession(module);
      set({ sessionId: session.sessionId, module, sessionStats: emptyStats(), lastResult: null });
    } catch {
      set({ sessionId: `guest_${Date.now()}` });
    }
  },

  fetchPreflopExercise: async (position) => {
    set({ isLoading: true, error: null, lastResult: null });
    try {
      const exercise = await trainingApi.getPreflopExercise(position);
      set({ preflopExercise: exercise, isLoading: false });
    } catch {
      set({ error: 'Impossible de charger l\'exercice', isLoading: false });
    }
  },

  checkPreflopAnswer: async (userAction, timeTaken) => {
    const { preflopExercise, sessionId, sessionStats } = get();
    if (!preflopExercise) throw new Error('No exercise loaded');

    const result = await trainingApi.checkPreflopAnswer({
      notation: preflopExercise.notation,
      position: preflopExercise.position,
      userAction,
      timeTaken,
      sessionId: sessionId || `guest_${Date.now()}`,
    });

    const exerciseResult: ExerciseResult = {
      isCorrect: result.isCorrect,
      correctAction: result.correctAction,
      explanation: preflopExercise.explanation,
      xpEarned: result.xpEarned,
      frequency: result.frequency,
      isMixed: result.isMixed,
    };

    set({
      lastResult: exerciseResult,
      assistedPending: false,
      sessionStats: {
        total: sessionStats.total + 1,
        correct: sessionStats.correct + (result.isCorrect ? 1 : 0),
        xp: sessionStats.xp + result.xpEarned,
        streak: get().assistedPending ? 0 : (result.isCorrect ? sessionStats.streak + 1 : 0),
      },
    });

    return exerciseResult;
  },

  fetchPotOddsExercise: async () => {
    set({ isLoading: true, error: null, lastResult: null });
    try {
      const exercise = await trainingApi.getPotOddsExercise();
      set({ potOddsExercise: exercise, isLoading: false });
    } catch {
      set({ error: 'Impossible de charger l\'exercice', isLoading: false });
    }
  },

  checkPotOddsAnswer: async (userAction, timeTaken) => {
    const { potOddsExercise, sessionId, sessionStats } = get();
    if (!potOddsExercise) throw new Error('No exercise loaded');

    const result = await trainingApi.checkPotOddsAnswer({
      potSize: potOddsExercise.potSize,
      betSize: potOddsExercise.betSize,
      heroEquity: potOddsExercise.heroEquity,
      userAction,
      timeTaken,
      sessionId: sessionId || `guest_${Date.now()}`,
    });

    const exerciseResult: ExerciseResult = {
      isCorrect: result.isCorrect,
      correctAction: result.correctAction,
      explanation: result.reasoning,
      xpEarned: result.xpEarned,
      potOdds: result.potOdds,
      potOddsPct: result.potOddsPct,
      requiredEquity: result.requiredEquity,
      ev: result.ev,
    };

    set({
      lastResult: exerciseResult,
      assistedPending: false,
      sessionStats: {
        total: sessionStats.total + 1,
        correct: sessionStats.correct + (result.isCorrect ? 1 : 0),
        xp: sessionStats.xp + result.xpEarned,
        streak: get().assistedPending ? 0 : (result.isCorrect ? sessionStats.streak + 1 : 0),
      },
    });

    return exerciseResult;
  },

  fetchEquityExercise: async () => {
    set({ isLoading: true, error: null, lastResult: null });
    try {
      const exercise = await trainingApi.getEquityExercise();
      set({ equityExercise: exercise, isLoading: false });
    } catch {
      set({ error: 'Impossible de charger l\'exercice', isLoading: false });
    }
  },

  fetchOutsExercise: async () => {
    set({ isLoading: true, error: null, lastResult: null });
    try {
      const exercise = await trainingApi.getOutsExercise();
      set({ outsExercise: exercise, isLoading: false });
    } catch {
      set({ error: 'Impossible de charger l\'exercice', isLoading: false });
    }
  },

  fetchBBDefenseExercise: async () => {
    set({ isLoading: true, error: null, lastResult: null });
    try {
      const exercise = await trainingApi.getBBDefenseExercise();
      set({ bbDefenseExercise: exercise, isLoading: false });
    } catch {
      set({ error: 'Impossible de charger l\'exercice', isLoading: false });
    }
  },

  recordResult: async (isCorrect, xpEarned, module, timeTaken = 0) => {
    const { sessionStats, sessionId, assistedPending } = get();
    // Update local session stats immediately
    set({
      assistedPending: false,
      sessionStats: {
        total: sessionStats.total + 1,
        correct: sessionStats.correct + (isCorrect ? 1 : 0),
        xp: sessionStats.xp + xpEarned,
        streak: assistedPending ? 0 : (isCorrect ? sessionStats.streak + 1 : 0),
      },
    });
    // Persist to backend (fire-and-forget, non-blocking)
    trainingApi.recordResult({
      module,
      isCorrect,
      xpEarned,
      timeTaken,
      sessionId: sessionId || `guest_${Date.now()}`,
    }).catch(() => {/* ignore */});
  },

  // Legacy shim — components that haven't been updated yet still use this
  recordLocalResult: (isCorrect) => {
    const { sessionStats, assistedPending } = get();
    set({
      assistedPending: false,
      sessionStats: {
        total: sessionStats.total + 1,
        correct: sessionStats.correct + (isCorrect ? 1 : 0),
        xp: sessionStats.xp + (isCorrect ? 15 : 5),
        streak: assistedPending ? 0 : (isCorrect ? sessionStats.streak + 1 : 0),
      },
    });
  },

  resetSession: () => set({ sessionStats: emptyStats(), lastResult: null, sessionId: null, trainerStarted: false, assistedPending: false }),
}));
