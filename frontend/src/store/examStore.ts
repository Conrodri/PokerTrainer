import { create } from 'zustand';
import { examApi } from '../services/api';

/** A run ends after this many wrong answers. */
export const EXAM_MAX_ERRORS = 3;

interface ExamState {
  active: boolean;
  module: string | null;
  correct: number;        // correct answers this run = the score
  errors: number;         // wrong answers this run (run ends at EXAM_MAX_ERRORS)
  finished: boolean;      // run ended → show result card
  isNewRecord: boolean;   // the finished run beat the stored record
  records: Record<string, number>;  // best correct-count per module (from backend)

  loadRecords: () => Promise<void>;
  start: (module: string) => void;
  /** Record one answer. Returns true if this answer ended the run. */
  answer: (isCorrect: boolean) => boolean;
  /** Abandon the current run (no score saved) and leave exam mode. */
  quit: () => void;
}

export const useExamStore = create<ExamState>((set, get) => ({
  active: false,
  module: null,
  correct: 0,
  errors: 0,
  finished: false,
  isNewRecord: false,
  records: {},

  loadRecords: async () => {
    try {
      const records = await examApi.records();
      set({ records });
    } catch {
      /* not logged in or offline — leave records empty */
    }
  },

  start: (module) => set({
    active: true, module, correct: 0, errors: 0, finished: false, isNewRecord: false,
  }),

  answer: (isCorrect) => {
    const { active, finished, correct, errors, module } = get();
    if (!active || finished) return false;

    if (isCorrect) {
      set({ correct: correct + 1 });
      return false;
    }

    const newErrors = errors + 1;
    if (newErrors < EXAM_MAX_ERRORS) {
      set({ errors: newErrors });
      return false;
    }

    // Third error → run over.
    set({ errors: newErrors, finished: true });
    // Persist the score (correct count) — best-effort, logged-in only.
    if (module) {
      examApi.saveScore(module, correct)
        .then(({ best, isNewRecord }) => set(s => ({
          isNewRecord,
          records: { ...s.records, [module]: best },
        })))
        .catch(() => {/* anonymous / offline — no saved record */});
    }
    return true;
  },

  quit: () => set({ active: false, module: null, correct: 0, errors: 0, finished: false, isNewRecord: false }),
}));
