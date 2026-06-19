import { useEffect, useRef } from 'react';
import { useExamStore } from '../store/examStore';

/**
 * Shared exam wiring for a trainer. Encapsulates the examStore selectors, the
 * record-load on mount, and the auto-advance timer so each trainer only needs:
 *
 *   const { examActive, examFinished, startRun, quitRun, recordAnswer } = useExamRunner('potodds');
 *   // on answer:  if (examActive) recordAnswer(isCorrect, handleNext);
 *   // launcher:   onStart={() => { startRun(); ...enter exercise phase + fetch... }}
 *   // quit:       quitRun(); ...back to intro...
 */
export function useExamRunner(module: string) {
  const active = useExamStore(s => s.active);
  const finished = useExamStore(s => s.finished);
  const start = useExamStore(s => s.start);
  const answer = useExamStore(s => s.answer);
  const quit = useExamStore(s => s.quit);
  const loadRecords = useExamStore(s => s.loadRecords);
  const timer = useRef<number | null>(null);

  useEffect(() => { loadRecords(); }, [loadRecords]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const clearTimer = () => { if (timer.current) { clearTimeout(timer.current); timer.current = null; } };

  /** Record one exam answer; auto-advance via `next` unless the run just ended. Returns true if ended. */
  const recordAnswer = (isCorrect: boolean, next: () => void, delay = 1400, label?: string): boolean => {
    const ended = answer(isCorrect, label);
    if (!ended) timer.current = window.setTimeout(next, delay);
    return ended;
  };

  const startRun = () => { clearTimer(); start(module); };
  const quitRun = () => { clearTimer(); quit(); };

  return { examActive: active, examFinished: finished, startRun, quitRun, recordAnswer };
}
