import { useState } from 'react';
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

// Per-module "Sprint" name shown on the launcher / result (replaces "exam").
const SPRINT_NAMES: Record<string, { fr: string; en: string }> = {
  preflop:   { fr: 'Sprint de Préflop',      en: 'Preflop Sprint' },
  outs:      { fr: "Sprint d'Outs",          en: 'Outs Sprint' },
  equity:    { fr: "Sprint d'Équité",        en: 'Equity Sprint' },
  potodds:   { fr: 'Sprint de Pot Odds',     en: 'Pot Odds Sprint' },
  postflop:  { fr: 'Sprint de Post-flop',    en: 'Post-flop Sprint' },
  fullhand:  { fr: 'Sprint de Main complète', en: 'Full Hand Sprint' },
  betsizing: { fr: 'Sprint de Bet Sizing',   en: 'Bet Sizing Sprint' },
};
export const sprintName = (module: string, isEn: boolean) =>
  isEn ? (SPRINT_NAMES[module]?.en ?? 'Sprint') : (SPRINT_NAMES[module]?.fr ?? 'Sprint');

// ── Launcher (intro CTA) — compact inline button on the same row as start ────────
export function ExamLauncher({ module, onStart }: { module: string; onStart: () => void }) {
  const isEn = useLangStore(s => s.lang) === 'en';
  const record = useExamStore(s => s.records[module] ?? 0);

  return (
    <Button
      variant="secondary" size="lg" onClick={onStart}
      className="flex items-center justify-center gap-2 bg-indigo-900/60 hover:bg-indigo-800/70 border border-indigo-700/60 text-indigo-200 hover:text-indigo-100 whitespace-nowrap shrink-0"
      title={isEn
        ? `Chain exercises until ${EXAM_MAX_ERRORS} mistakes — score = correct answers`
        : `Enchaîne les exercices jusqu'à ${EXAM_MAX_ERRORS} erreurs — score = bonnes réponses`}
    >
      <Target size={16} className="text-indigo-400" />
      {sprintName(module, isEn)}
      {record > 0 && (
        <span className="text-xs font-normal opacity-60">· {record}</span>
      )}
    </Button>
  );
}

// ── Lives + live score (during a run) ───────────────────────────────────────────
// `onQuit` is kept for API compatibility but no longer called; stop now shows
// the recap card via forfeit() instead of immediately exiting.
export function ExamHud({ onQuit: _onQuit }: { onQuit?: () => void }) {
  const isEn = useLangStore(s => s.lang) === 'en';
  const { correct, errors } = useExamStore(useShallow(s => ({ correct: s.correct, errors: s.errors })));
  const forfeit = useExamStore(s => s.forfeit);
  const lives = Math.max(0, EXAM_MAX_ERRORS - errors);
  const [confirmQuit, setConfirmQuit] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between gap-2 bg-gray-900/70 rounded-xl px-3 sm:px-4 py-2.5 border border-gold-700/40"
    >
      <div className="flex items-center gap-1.5">
        <Target size={15} className="text-gold-400 shrink-0" />
        <span className="text-sm font-bold text-white">{correct}</span>
        <span className="text-xs text-gray-400">{isEn ? 'correct' : 'réussis'}</span>
      </div>
      <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-1" aria-label={`${lives} lives left`}>
          {Array.from({ length: EXAM_MAX_ERRORS }).map((_, i) => (
            <Heart
              key={i}
              size={16}
              className={i < lives ? 'text-red-500 fill-red-500' : 'text-gray-700'}
            />
          ))}
        </div>
        {(
          confirmQuit ? (
            <div className="flex items-center gap-1">
              <button
                onClick={forfeit}
                className="text-[11px] font-bold px-2 py-1 rounded-lg bg-red-700 hover:bg-red-600 text-white transition-colors"
              >
                {isEn ? 'Stop?' : 'Arrêter ?'}
              </button>
              <button
                onClick={() => setConfirmQuit(false)}
                className="text-gray-500 hover:text-gray-300 transition-colors p-1"
                aria-label={isEn ? 'Cancel' : 'Annuler'}
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmQuit(true)}
              className="flex items-center gap-1 text-xs font-semibold text-gray-400 hover:text-red-300 border border-gray-700 hover:border-red-700/60 rounded-lg px-2 py-1 transition-colors"
              title={isEn ? 'Stop the sprint (breaks the chain)' : 'Arrêter le sprint (brise la série)'}
            >
              <X size={13} />
              <span className="hidden sm:inline">{isEn ? 'Stop' : 'Arrêter'}</span>
            </button>
          )
        )}
      </div>
    </motion.div>
  );
}

// ── End card ────────────────────────────────────────────────────────────────────
export function ExamResult({ module, onRetry, onQuit }: { module: string; onRetry: () => void; onQuit: () => void }) {
  const isEn = useLangStore(s => s.lang) === 'en';
  const { correct, errors, isNewRecord, isForfeited, mistakes, record, history } = useExamStore(useShallow(s => ({
    correct: s.correct, errors: s.errors, isNewRecord: s.isNewRecord,
    isForfeited: s.isForfeited, mistakes: s.mistakes,
    record: s.records[module] ?? 0, history: s.history,
  })));
  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString(isEn ? 'en-US' : 'fr-FR', { day: '2-digit', month: '2-digit' });

  const total = correct + errors;
  const pct   = total > 0 ? Math.round((correct / total) * 100) : 0;
  const correctPct = total > 0 ? (correct / total) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-md mx-auto rounded-2xl border border-gray-700 bg-gray-900/80 p-5 sm:p-6 flex flex-col items-center gap-4 text-center"
    >
      <div className="text-3xl">{isForfeited ? '⏹️' : isNewRecord ? '🏆' : '🎯'}</div>
      <h3 className="text-lg font-bold text-white">
        {sprintName(module, isEn)}{' '}
        {isForfeited
          ? (isEn ? '— stopped early' : '— arrêté en cours')
          : (isEn ? '— over' : '— terminé')}
      </h3>

      {/* Score + accuracy */}
      <div className="flex items-end justify-center gap-4">
        <div className="flex flex-col items-center">
          <span className="text-4xl font-black text-gold-400 leading-none">{correct}</span>
          <span className="text-xs text-gray-400 mt-1">{isEn ? 'correct' : 'réussis'}</span>
        </div>
        <div className="flex flex-col items-center pb-0.5">
          <span className="text-2xl font-black text-white/70 leading-none">{pct}%</span>
          <span className="text-xs text-gray-500 mt-1">{isEn ? 'accuracy' : 'précision'}</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-4xl font-black text-red-400/80 leading-none">{errors}</span>
          <span className="text-xs text-gray-400 mt-1">{isEn ? 'errors' : 'erreurs'}</span>
        </div>
      </div>

      {/* Visual bar */}
      <div className="w-full flex flex-col gap-1">
        <div className="w-full h-2.5 rounded-full overflow-hidden bg-gray-800 flex">
          <div
            className="h-full bg-gold-500 transition-all duration-700"
            style={{ width: `${correctPct}%` }}
          />
          <div className="h-full bg-red-600/70 flex-1" />
        </div>
        <div className="flex justify-between text-[10px] text-gray-600 px-0.5">
          <span>{total} {isEn ? 'questions' : 'questions'}</span>
          <span>{isEn ? `${EXAM_MAX_ERRORS} errors max` : `${EXAM_MAX_ERRORS} erreurs max`}</span>
        </div>
      </div>

      {/* Record — hidden for forfeited runs (score not saved) */}
      {isForfeited ? (
        <p className="text-xs text-gray-500 italic">
          {isEn ? 'Score not saved — sprint abandoned' : 'Score non sauvegardé — sprint abandonné'}
        </p>
      ) : isNewRecord ? (
        <div className="flex items-center gap-1.5 text-sm font-bold text-gold-300">
          <Trophy size={15} /> {isEn ? 'New record!' : 'Nouveau record !'}
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <Trophy size={13} /> {isEn ? 'Record' : 'Record'} : {record}
        </div>
      )}

      {/* History — hidden for forfeited runs */}
      {!isForfeited && history.length > 0 && (
        <div className="w-full">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5 text-center">
            {isEn ? 'Recent sprints' : 'Sprints récents'}
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

      {/* Mistakes breakdown — shown when labels are available (e.g. preflop: notation + position) */}
      {mistakes.length > 0 && (
        <div className="w-full">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5 text-center">
            {isEn ? 'Missed hands' : 'Mains ratées'}
          </p>
          <div className="flex flex-wrap gap-1.5 justify-center">
            {mistakes.map((m, i) => (
              <span key={i} className="px-2 py-0.5 rounded-md bg-red-900/40 border border-red-800/50 text-red-300 text-xs font-semibold">
                {m.label}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2 w-full">
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
