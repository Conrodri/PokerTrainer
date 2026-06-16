import { motion } from 'framer-motion';
import { useShallow } from 'zustand/react/shallow';
import { Heart, Trophy, RotateCcw, X, Target } from 'lucide-react';
import { useExamStore, EXAM_MAX_ERRORS } from '../../store/examStore';
import { useLangStore } from '../../store/langStore';
import { Button } from '../ui/Button';

/**
 * Exam mode = loop exercises until EXAM_MAX_ERRORS wrong answers; score = correct
 * answers. These three pieces are shared by every trainer:
 *   <ExamLauncher>  — start button shown in the advanced/expert intro
 *   <ExamHud>       — lives + live score, shown during a run
 *   <ExamResult>    — end card after the run
 * All mobile-first / responsive.
 */

// ── Launcher (intro CTA) — compact so it sits next to the practice button ───────
export function ExamLauncher({ module, onStart }: { module: string; onStart: () => void }) {
  const isEn = useLangStore(s => s.lang) === 'en';
  const record = useExamStore(s => s.records[module] ?? 0);

  return (
    <div className="w-full flex flex-col items-center gap-1">
      <Button
        variant="secondary" size="lg" fullWidth onClick={onStart}
        className="flex items-center justify-center gap-2 border border-gold-700/50 text-gold-200"
      >
        <Target size={16} className="text-gold-400" />
        {isEn ? 'Start an exam' : "Lancer l'examen"}
        {record > 0 && (
          <span className="text-xs font-normal text-gold-400/90">· {isEn ? 'best' : 'record'} {record}</span>
        )}
      </Button>
      <p className="text-[11px] text-gray-500 text-center leading-snug">
        {isEn
          ? `Chain exercises until ${EXAM_MAX_ERRORS} mistakes — score = correct answers`
          : `Enchaîne les exercices jusqu'à ${EXAM_MAX_ERRORS} erreurs — score = bonnes réponses`}
      </p>
    </div>
  );
}

// ── Lives + live score (during a run) ───────────────────────────────────────────
export function ExamHud() {
  const isEn = useLangStore(s => s.lang) === 'en';
  const { correct, errors } = useExamStore(useShallow(s => ({ correct: s.correct, errors: s.errors })));
  const lives = Math.max(0, EXAM_MAX_ERRORS - errors);

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between gap-3 bg-gray-900/70 rounded-xl px-4 py-2.5 border border-gold-700/40"
    >
      <div className="flex items-center gap-1.5">
        <Target size={15} className="text-gold-400 shrink-0" />
        <span className="text-sm font-bold text-white">{correct}</span>
        <span className="text-xs text-gray-400">{isEn ? 'correct' : 'réussis'}</span>
      </div>
      <div className="flex items-center gap-1" aria-label={`${lives} lives left`}>
        {Array.from({ length: EXAM_MAX_ERRORS }).map((_, i) => (
          <Heart
            key={i}
            size={16}
            className={i < lives ? 'text-red-500 fill-red-500' : 'text-gray-700'}
          />
        ))}
      </div>
    </motion.div>
  );
}

// ── End card ────────────────────────────────────────────────────────────────────
export function ExamResult({ module, onRetry, onQuit }: { module: string; onRetry: () => void; onQuit: () => void }) {
  const isEn = useLangStore(s => s.lang) === 'en';
  const { correct, isNewRecord, record, history } = useExamStore(useShallow(s => ({
    correct: s.correct, isNewRecord: s.isNewRecord, record: s.records[module] ?? 0, history: s.history,
  })));
  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString(isEn ? 'en-US' : 'fr-FR', { day: '2-digit', month: '2-digit' });

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-md mx-auto rounded-2xl border border-gray-700 bg-gray-900/80 p-5 sm:p-6 flex flex-col items-center gap-3 text-center"
    >
      <div className="text-3xl">{isNewRecord ? '🏆' : '🎯'}</div>
      <h3 className="text-lg font-bold text-white">{isEn ? 'Exam over' : 'Examen terminé'}</h3>
      <div className="flex flex-col items-center">
        <span className="text-4xl font-black text-gold-400 leading-none">{correct}</span>
        <span className="text-xs text-gray-400 mt-1">{isEn ? 'correct answers' : 'bonnes réponses'}</span>
      </div>
      {isNewRecord ? (
        <div className="flex items-center gap-1.5 text-sm font-bold text-gold-300">
          <Trophy size={15} /> {isEn ? 'New record!' : 'Nouveau record !'}
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <Trophy size={13} /> {isEn ? 'Record' : 'Record'} : {record}
        </div>
      )}
      {history.length > 0 && (
        <div className="w-full mt-1">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5 text-center">
            {isEn ? 'Recent exams' : 'Examens récents'}
          </p>
          <ul className="flex flex-col gap-1 max-h-32 overflow-y-auto">
            {history.map((h, i) => (
              <li key={i} className="flex items-center justify-between text-xs bg-gray-800/50 rounded-lg px-3 py-1.5">
                <span className="text-gray-400">{fmtDate(h.createdAt)}</span>
                <span className="font-bold text-gold-300">
                  {h.score} <span className="font-normal text-gray-500">{isEn ? 'correct' : 'réussis'}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex flex-col sm:flex-row gap-2 w-full mt-1">
        <Button variant="gold" size="md" fullWidth onClick={onRetry} className="flex items-center justify-center gap-2">
          <RotateCcw size={15} /> {isEn ? 'Try again' : 'Recommencer'}
        </Button>
        <Button variant="ghost" size="md" fullWidth onClick={onQuit} className="flex items-center justify-center gap-2">
          <X size={15} /> {isEn ? 'Quit' : 'Quitter'}
        </Button>
      </div>
    </motion.div>
  );
}
