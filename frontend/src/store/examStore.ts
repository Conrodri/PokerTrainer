import { create } from 'zustand';
import { examApi } from '../services/api';

/** A run ends after this many wrong answers. */
export const EXAM_MAX_ERRORS = 3;

export interface SprintMistake {
  label: string;  // e.g. "AKs — BTN"
}

interface ExamState {
  active: boolean;
  module: string | null;
  correct: number;        // correct answers this run = the score
  errors: number;         // wrong answers this run (run ends at EXAM_MAX_ERRORS)
  finished: boolean;      // run ended → show result card
  isNewRecord: boolean;   // the finished run beat the stored record
  isForfeited: boolean;   // run was stopped early (no score saved)
  mistakes: SprintMistake[];           // wrong answers with optional label
  records: Record<string, number>;  // best correct-count per module (from backend)
  history: { score: number; createdAt: string }[];  // recent runs for the last-played module

  loadRecords: () => Promise<void>;
  start: (module: string) => void;
  /** Record one answer. Returns true if this answer ended the run. */
  answer: (isCorrect: boolean, label?: string) => boolean;
  /** Stop early — shows the recap card without saving the score. */
  forfeit: () => void;
  /** Fully exit exam mode (called from the recap card's Quit button). */
  quit: () => void;
}

export const useExamStore = create<ExamState>((set, get) => ({
  active: false,
  module: null,
  correct: 0,
  errors: 0,
  finished: false,
  isNewRecord: false,
  isForfeited: false,
  mistakes: [],
  records: {},
  history: [],

  loadRecords: async () => {
    try {
      const records = await examApi.records();
      set({ records });
    } catch {
      /* not logged in or offline — leave records empty */
    }
  },

  start: (module) => set({
    active: true, module, correct: 0, errors: 0, finished: false,
    isNewRecord: false, isForfeited: false, mistakes: [], history: [],
  }),

  answer: (isCorrect, label) => {
    const { active, finished, correct, errors, mistakes, module } = get();
    if (!active || finished) return false;

    if (isCorrect) {
      set({ correct: correct + 1 });
      return false;
    }

    const newMistakes = label ? [...mistakes, { label }] : mistakes;
    const newErrors = errors + 1;
    if (newErrors < EXAM_MAX_ERRORS) {
      set({ errors: newErrors, mistakes: newMistakes });
      return false;
    }

    // Third error → run over.
    set({ errors: newErrors, mistakes: newMistakes, finished: true });
    // Persist the score (correct count) — best-effort, logged-in only.
    if (module) {
      examApi.saveScore(module, correct)
        .then(({ best, isNewRecord, history }) => set(s => ({
          isNewRecord,
          records: { ...s.records, [module]: best },
          history,
        })))
        .catch(() => {/* anonymous / offline — no saved record */});
    }
    return true;
  },

  forfeit: () => set({ finished: true, isForfeited: true }),

  quit: () => set({ active: false, module: null, correct: 0, errors: 0, finished: false, isNewRecord: false, isForfeited: false, mistakes: [], history: [] }),
}));
