import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronDown, ChevronUp, RotateCcw, Info, Zap, Target, Sliders, Lightbulb, Check, X } from 'lucide-react';
import { rangesApi, profilesApi } from '../../services/api';
import { useTrainingStore } from '../../store/trainingStore';
import { useShallow } from 'zustand/react/shallow';
import { Position, ExerciseResult, BBDefenseExercise } from '../../types/poker';
import { trainingApi } from '../../services/api';
import { RangeMatrix } from '../poker/RangeMatrix';
import { ExpertRangeGrid, EXPERT_ACTIONS, EXPERT_DISPLAY } from '../poker/ExpertRangeEditor';
import { PokerTable } from '../poker/PokerTable';
import { Hand } from '../poker/Card';
import { CardStr } from '../../types/poker';
import { Button } from '../ui/Button';
import { SessionStatsBar } from '../ui/SessionStatsBar';
import { Spinner } from '../ui/Spinner';
import { ExplanationPanel } from '../ui/ExplanationPanel';
import { RichLine } from '../ui/RichText';
import { BeginnerGuide } from '../ui/BeginnerGuide';
import { SpoilableHint } from '../ui/SpoilableHint';
import { handHint } from '../../utils/handHints';
import { TrainerIntro } from '../ui/TrainerIntro';
import { useModeStore } from '../../store/modeStore';
import { VerdictBanner } from '../ui/VerdictBanner';
import { handToDisplay, getMatrixIndices } from '../../utils/pokerUtils';
import { useT } from '../../i18n';
import { useLangStore } from '../../store/langStore';
import { useCustomRangeStore } from '../../store/customRangeStore';
import { useIsMobile } from '../../hooks/useIsMobile';

type Phase    = 'select_position' | 'exercise' | 'result';
type BBAction = 'fold' | 'call' | '3bet';

// ─── BB action display meta ────────────────────────────────────────────────────
const BB_ACTION_PILL: Record<BBAction, string> = {
  fold:   'bg-red-900/40 text-red-300 border-red-700',
  call:   'bg-gray-700/60 text-gray-200 border-gray-500',
  '3bet': 'bg-yellow-900/30 text-yellow-300 border-yellow-700',
};
const BB_ACTION_VARIANT: Record<BBAction, 'danger' | 'secondary' | 'gold'> = {
  fold: 'danger', call: 'secondary', '3bet': 'gold',
};

// Hand-specific coaching hint panel (revealed via SpoilableHint in advanced).
function HandHintPanel({ notation, isEn }: { notation: string; isEn: boolean }) {
  return (
    <div className="w-full rounded-xl border border-amber-700/40 bg-amber-950/30 px-3 py-2 flex items-start gap-2 text-left">
      <Lightbulb size={15} className="text-amber-400 mt-0.5 shrink-0" />
      <div>
        <span className="font-bold text-amber-300 text-xs">{handToDisplay(notation)}</span>
        <span className="text-gray-300 text-xs"> — {handHint(notation, isEn)}</span>
      </div>
    </div>
  );
}

// Cell code → colour for the GTO BB-defense grid.
// Codes: 0=fold, 1=call, 2=thin call, 3=value 3-bet, 4=bluff 3-bet (see backend bbDefense.ts).
const BB_CELL_COLOR = (code: number): string => ({
  0: '#1a202c',
  1: 'rgba(37,99,235,0.70)',
  2: 'rgba(37,99,235,0.32)',
  3: 'rgba(22,130,60,0.85)',
  4: 'rgba(202,138,4,0.82)',
} as Record<number, string>)[code] ?? '#1a202c';

// ─── Shared range matrix collapsible section ──────────────────────────────────

interface RangeSectionProps {
  matrix: number[][] | null;
  /** When set, the range is an expert profile: render the stacked-bar mix grid. */
  mix?: number[] | null;
  highlightNotation: string;
  position: string;
  isCustom: boolean;
  resolvedLabel: string | null;
  heroStack: number;
  isEn: boolean;
  showRange: boolean;
  setShowRange: (fn: (v: boolean) => boolean) => void;
  t: ReturnType<typeof useT>;
}

function RangeSection({ matrix, mix, highlightNotation, position, isCustom, resolvedLabel, heroStack, isEn, showRange, setShowRange, t }: RangeSectionProps) {
  if (!matrix && !mix) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="w-full"
    >
      <button
        onClick={() => setShowRange(v => !v)}
        className="flex items-center justify-between w-full px-4 py-2.5 rounded-xl border transition-colors mb-1
          border-gray-700 bg-gray-800/50 hover:bg-gray-800 text-sm font-semibold"
      >
        <span className="flex items-center gap-1.5 flex-wrap">
          {isCustom ? (
            <>
              <Sliders size={14} className="text-purple-400 shrink-0" />
              <span className="text-purple-300">
                {resolvedLabel ?? (isEn ? 'My range' : 'Ma range')}
              </span>
              <span className="text-purple-500">— {position}</span>
              {/* Stack only matters for stack-tiered profiles (resolvedLabel set). */}
              {resolvedLabel && <span className="text-purple-600 font-normal text-xs">· {heroStack} bb</span>}
            </>
          ) : (
            <>
              <Target size={14} className="text-felt-400 shrink-0" />
              <span className="text-felt-300">
                {position === 'BB'
                  ? (isEn ? 'GTO BB defense range' : 'Range GTO défense BB')
                  : `${t.training.full_range_lbl} — ${position}`}
              </span>
            </>
          )}
        </span>
        {showRange
          ? <ChevronUp   size={16} className="text-gray-400 shrink-0" />
          : <ChevronDown size={16} className="text-gray-400 shrink-0" />
        }
      </button>
      <AnimatePresence initial={false}>
        {showRange && (
          <motion.div
            key="range-matrix"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden flex flex-col items-center gap-3 pt-2"
          >
            {mix ? (
              // Expert profile: render the exact stacked-bar scheme of the editor.
              <ExpertRangeGrid mix={mix} highlightNotation={highlightNotation} isEn={isEn} />
            ) : position === 'BB' && !isCustom ? (
              // GTO BB-defense grid uses action CODES (0-4), not raise frequencies,
              // so it needs the BB-specific colouring/legend (call ≠ raise).
              <RangeMatrix
                matrix={matrix}
                highlightNotation={highlightNotation}
                size="sm"
                cellColor={BB_CELL_COLOR}
                legend={[
                  { color: 'rgba(22,130,60,0.85)', label: t.training.bb_leg_value, tip: { title: t.training.bb_leg_value, text: t.training.bb_tip_value } },
                  { color: 'rgba(202,138,4,0.82)', label: t.training.bb_leg_bluff, tip: { title: t.training.bb_leg_bluff, text: t.training.bb_tip_bluff } },
                  { color: 'rgba(37,99,235,0.70)', label: t.training.bb_leg_call,  tip: { title: t.training.bb_leg_call,  text: t.training.bb_tip_call  } },
                  { color: 'rgba(37,99,235,0.32)', label: t.training.bb_leg_thin,  tip: { title: t.training.bb_leg_thin,  text: t.training.bb_tip_thin  } },
                  { color: '#1a202c',              label: t.training.bb_leg_fold,  tip: { title: t.training.bb_leg_fold,  text: t.training.bb_tip_fold  } },
                ]}
                tooltipValue={(code) => ({
                  0: t.training.bb_leg_fold, 1: t.training.bb_leg_call,
                  2: t.training.bb_leg_thin, 3: t.training.bb_leg_value, 4: t.training.bb_leg_bluff,
                } as Record<number, string>)[code] ?? ''}
              />
            ) : (
              <RangeMatrix
                matrix={matrix}
                highlightNotation={highlightNotation}
                size="sm"
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/** Convert a resolved range into a flat 169 play-frequency array.
 *  - 169-cell ranges (standard) are returned as-is.
 *  - 676-cell ranges (expert mix: [fold, call, raise3x, allin] per hand) are
 *    collapsed to a per-hand "play" frequency = 1 − fold (call+raise3x+allin),
 *    so they score and display like any other range in the preflop trainer. */
function toPlayFrequencies(cells: number[]): number[] | null {
  if (cells.length === 169) return cells;
  if (cells.length === 676) {
    const out: number[] = [];
    for (let i = 0; i < 169; i++) {
      const fold = cells[i * 4] ?? 0;
      out.push(Math.max(0, Math.min(1, 1 - fold)));
    }
    return out;
  }
  return null;
}

/** Frequency presets offered in the expert quiz (covers quarters + thirds). */
const EXPERT_FREQ_CHIPS = [25, 33, 50, 67, 75, 100];

/** Colored pill styles for the open-action verdict (glanceable recap). */
const OPEN_ACTION_PILL: Record<string, string> = {
  raise: 'border-green-600 text-green-300 bg-green-900/30',
  call:  'border-yellow-600 text-yellow-300 bg-yellow-900/30',
  fold:  'border-red-600 text-red-300 bg-red-900/30',
};
const openActionLabel = (a: string) =>
  a === 'raise' ? 'Raise' : a === 'fold' ? 'Fold' : a === 'call' ? 'Call' : a;

/** Nearest preset chip to a stored frequency percentage. */
function nearestChip(pct: number): number {
  return EXPERT_FREQ_CHIPS.reduce((a, b) => (Math.abs(b - pct) < Math.abs(a - pct) ? b : a), EXPERT_FREQ_CHIPS[0]);
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PreflopTrainer() {
  const t = useT();
  const isMobile = useIsMobile();
  const {
    preflopExercise, lastResult, sessionStats, isLoading,
    fetchPreflopExercise, checkPreflopAnswer, recordResult,
    setIsExercising, setCurrentPosition, setTrainerStarted, setSelectingPosition,
  } = useTrainingStore(useShallow(s => ({
    preflopExercise: s.preflopExercise, lastResult: s.lastResult, sessionStats: s.sessionStats, isLoading: s.isLoading,
    fetchPreflopExercise: s.fetchPreflopExercise, checkPreflopAnswer: s.checkPreflopAnswer, recordResult: s.recordResult,
    setIsExercising: s.setIsExercising, setCurrentPosition: s.setCurrentPosition, setTrainerStarted: s.setTrainerStarted, setSelectingPosition: s.setSelectingPosition,
  })));

  const [showIntro,        setShowIntro]        = useState(true);
  const [phase,            setPhase]            = useState<Phase>('select_position');
  const [selectedPosition, setSelectedPosition] = useState<Position>('BTN');
  const [lockPosition,     setLockPosition]     = useState(false);
  const [randomMode,       setRandomMode]       = useState(false);
  const [rangeMatrix,      setRangeMatrix]      = useState<number[][] | null>(null);
  const [customMatrix,     setCustomMatrix]     = useState<number[][] | null>(null);
  /** Raw expert mix (flat 169×4) when the resolved range is an expert profile —
   *  rendered in the recap with the editor's stacked-bar scheme for consistency. */
  const [customMix,        setCustomMix]        = useState<number[] | null>(null);
  const [localResult,      setLocalResult]      = useState<ExerciseResult | null>(null);
  const [openAnswer,       setOpenAnswer]       = useState<'raise' | 'fold' | null>(null);
  /** Expert quiz verdict for the glanceable colored pills. */
  const [expertVerdict,    setExpertVerdict]    = useState<
    { action: number; userFreq: number; targetFreq: number; inRange: boolean; freqMatch: boolean } | null
  >(null);
  /** BB custom range: the resolved 5-category code (0-4) for the quizzed hand. */
  const [bbCustomCode,     setBbCustomCode]     = useState<number | null>(null);
  const [showRange,        setShowRange]        = useState(true);
  const [heroStack,        setHeroStack]        = useState<number>(() => Math.floor(Math.random() * 96) + 5);
  const [resolvedLabel,    setResolvedLabel]    = useState<string | null>(null);

  // ── Expert quiz (mode 'expert' + "Mes ranges" on an expert profile) ───────────
  // 4-frequency mix [fold, call, raise3x, allin] of the current hand, resolved
  // at exercise load; non-null ⇒ render the 2-step action+frequency quiz.
  const [expertTarget,     setExpertTarget]     = useState<number[] | null>(null);
  const [expertActionPick, setExpertActionPick] = useState<number | null>(null);

  // ── BB defense mode ──────────────────────────────────────────────────────────
  const [isBBSession,  setIsBBSession]  = useState(false);
  const [bbExercise,   setBBExercise]   = useState<BBDefenseExercise | null>(null);
  const [bbSelected,   setBBSelected]   = useState<BBAction | null>(null);
  // Advanced BB: 2-step 3-bet refinement (value vs bluff)
  const [bb3betStep,   setBB3betStep]   = useState(false);
  const [bb3betType,   setBB3betType]   = useState<'value' | 'bluff' | null>(null);
  const [bbIsLoading,  setBBIsLoading]  = useState(false);

  const startTime = useRef<number>(Date.now());
  // Caps re-rolls when the active profile excludes 100%-fold hands, so an
  // all-fold tier can never lock the trainer in an infinite skip loop.
  const foldSkipRef = useRef(0);
  const mode = useModeStore(s => s.mode);
  const preflopEnabled = useCustomRangeStore(s => s.preflopEnabled);

  // ─── Sync phase/exercise → store ─────────────────────────────────────────────
  useEffect(() => {
    if (phase === 'result') window.scrollTo({ top: 0, behavior: 'smooth' });
    // The position-selection screen is part of the intro → hide the range toolbar there.
    setSelectingPosition(phase === 'select_position');

    if (isBBSession) {
      if (phase === 'exercise' && bbExercise && !bbIsLoading) startTime.current = Date.now();
      setIsExercising(phase === 'exercise' && !!bbExercise && !bbIsLoading);
      if (bbExercise && (phase === 'exercise' || phase === 'result')) {
        setCurrentPosition('BB');
      }
    } else {
      if (phase === 'exercise' && preflopExercise) startTime.current = Date.now();
      setIsExercising(phase === 'exercise' && !!preflopExercise && !isLoading);
      if (preflopExercise && (phase === 'exercise' || phase === 'result')) {
        setCurrentPosition(preflopExercise.position);
      }
    }
  }, [preflopExercise, bbExercise, phase, isLoading, bbIsLoading, isBBSession]);

  // Sync selectedPosition (select_position phase) → store
  useEffect(() => {
    if (phase === 'select_position') setCurrentPosition(selectedPosition);
  }, [selectedPosition, phase]);

  // Expert quiz: when an exercise loads in expert mode with "Mes ranges" on,
  // resolve the active range. If it's an expert profile (676), keep the full mix
  // for the recap and slice out the current hand's 4-frequency mix for the quiz.
  // Applies to both the open exercise and BB defense.
  useEffect(() => {
    let cancelled = false;
    const notation = isBBSession ? bbExercise?.notation : preflopExercise?.notation;
    const position = isBBSession ? 'BB' : preflopExercise?.position;
    (async () => {
      if (phase !== 'exercise' || mode !== 'expert' || !preflopEnabled || !notation || !position) {
        return;
      }
      try {
        const resolved = await profilesApi.resolve(position, heroStack);
        if (cancelled) return;
        if (resolved?.cells && resolved.cells.length === 676) {
          const [row, col] = getMatrixIndices(notation);
          const idx = row * 13 + col;
          const targetMix = resolved.cells.slice(idx * 4, idx * 4 + 4);
          const pureFold = (targetMix[0] ?? 0) >= 0.999;

          // Profile set to skip 100%-fold hands → re-roll a fresh hand at the
          // same position (capped so an all-fold tier can't loop forever).
          if (resolved.includeFolds === false && pureFold && foldSkipRef.current < 30) {
            foldSkipRef.current += 1;
            if (isBBSession) {
              setBBIsLoading(true);
              try {
                const ex = await trainingApi.getBBDefenseExercise();
                if (!cancelled) setBBExercise(ex);
              } catch { /* ignore */ }
              if (!cancelled) setBBIsLoading(false);
            } else if (preflopExercise) {
              await fetchPreflopExercise(preflopExercise.position);
            }
            return;
          }

          setCustomMix(resolved.cells);
          setExpertTarget(targetMix);
          setResolvedLabel(resolved.profileName
            ? `${resolved.profileName}${resolved.stackRangeLabel ? ` · ${resolved.stackRangeLabel}` : ''}`
            : null);
        } else {
          setExpertTarget(null);
        }
      } catch { if (!cancelled) setExpertTarget(null); }
    })();
    return () => { cancelled = true; };
  }, [phase, isBBSession, mode, preflopEnabled, preflopExercise, bbExercise, heroStack]);

  // Reset on unmount (module change)
  useEffect(() => () => { setIsExercising(false); setCurrentPosition(null); setSelectingPosition(false); }, []);

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  const resetExerciseState = () => {
    setLocalResult(null);
    setOpenAnswer(null);
    setExpertVerdict(null);
    setCustomMatrix(null);
    setCustomMix(null);
    setExpertTarget(null);
    setExpertActionPick(null);
    setBbCustomCode(null);
    setRangeMatrix(null);
    setResolvedLabel(null);
    setBBSelected(null);
    setBB3betStep(false);
    setBB3betType(null);
    setShowRange(true);
    setHeroStack(Math.floor(Math.random() * 96) + 5);
    foldSkipRef.current = 0;
  };

  // ─── pickAndStart — shared routing logic for a given position ─────────────────

  const ALL_POSITIONS: Position[] = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'];

  const pickAndStart = async (pos: Position) => {
    setSelectedPosition(pos);
    if (pos === 'BB') {
      setIsBBSession(true);
      setBBExercise(null);
      setBBIsLoading(true);
      try {
        const ex = await trainingApi.getBBDefenseExercise();
        setBBExercise(ex);
      } catch { /* ignore */ }
      setBBIsLoading(false);
    } else {
      setIsBBSession(false);
      setBBExercise(null);
      await fetchPreflopExercise(pos);
    }
  };

  // ─── handleStart ──────────────────────────────────────────────────────────────

  const handleStart = async (pos?: Position) => {
    resetExerciseState();
    setPhase('exercise');
    await pickAndStart(pos ?? selectedPosition);
  };

  // ─── handleAnswer (preflop open) ──────────────────────────────────────────────

  const handleAnswer = async (action: 'raise' | 'fold') => {
    if (!preflopExercise) return;
    const timeTaken = Date.now() - startTime.current;
    setOpenAnswer(action);

    // Beginner = GTO only. Custom ranges apply from Advanced upward.
    if (preflopEnabled && mode !== 'beginner') {
      let flat: number[] | null = null;
      let rangeLabel: string | undefined;

      try {
        const resolved = await profilesApi.resolve(preflopExercise.position, heroStack, mode !== 'expert');
        const play = resolved?.cells ? toPlayFrequencies(resolved.cells) : null;
        if (play) {
          flat = play;
          setCustomMix(resolved.cells.length === 676 ? resolved.cells : null);
          rangeLabel = resolved.profileName
            ? `${resolved.profileName}${resolved.stackRangeLabel ? ` · ${resolved.stackRangeLabel}` : ''}`
            : undefined;
        }
      } catch { /* ignore */ }

      setResolvedLabel(rangeLabel ?? null);

      if (flat) {
        const grid: number[][] = [];
        for (let r = 0; r < 13; r++) grid.push(flat.slice(r * 13, r * 13 + 13));
        setCustomMatrix(grid);
        const [row, col] = getMatrixIndices(preflopExercise.notation);
        const cellVal = grid[row]?.[col] ?? 0;
        const correctAction: 'raise' | 'fold' = cellVal > 0 ? 'raise' : 'fold';
        const isCorrect = action === correctAction;
        const xp = isCorrect ? 15 : 5;
        setLocalResult({
          isCorrect,
          correctAction,
          // Kept short — the colored action pills convey the verdict at a glance.
          explanation: '',
          xpEarned: xp,
        });
        await recordResult(isCorrect, xp, 'preflop', timeTaken);
      } else {
        await checkPreflopAnswer(action, timeTaken);
        try {
          const data = await trainingApi.getRangeMatrix(preflopExercise.position);
          setRangeMatrix(data.matrix);
        } catch { /* ignore */ }
      }
    } else {
      await checkPreflopAnswer(action, timeTaken);
      try {
        const data = await trainingApi.getRangeMatrix(preflopExercise.position);
        setRangeMatrix(data.matrix);
      } catch { /* ignore */ }
    }
    setPhase('result');
  };

  // ─── handleExpertAnswer (expert 2-step quiz: action + frequency) ──────────────

  const handleExpertAnswer = async (action: number, freqPct: number) => {
    const notation = isBBSession ? bbExercise?.notation : preflopExercise?.notation;
    const position = isBBSession ? 'BB' : preflopExercise?.position;
    if (!notation || !position || !expertTarget) return;
    const timeTaken = Date.now() - startTime.current;

    const storedPct = Math.round((expertTarget[action] ?? 0) * 100);
    const inRange   = storedPct > 0;                       // is this action part of your mix?
    const target    = nearestChip(storedPct);              // the chip closest to your stored freq
    const freqMatch = inRange && freqPct === target;
    const isCorrect = inRange && freqMatch;
    const xp = isCorrect ? 20 : inRange ? 10 : 5;

    const actLabel = (k: number) => (isEn ? EXPERT_ACTIONS[k].labelEn : EXPERT_ACTIONS[k].labelFr);
    // Full mix breakdown, e.g. "Fold 67% · Raise 33%"
    const mixStr = EXPERT_DISPLAY
      .map(a => ({ a, p: Math.round((expertTarget[a.key] ?? 0) * 100) }))
      .filter(x => x.p > 0)
      .map(x => `${actLabel(x.a.key)} ${x.p}%`)
      .join(' · ');

    // The verdict + range are shown visually via the mix bar, so no text panel.
    setLocalResult({
      isCorrect,
      partial: inRange && !freqMatch,   // right action, wrong frequency → orange
      correctAction: actLabel(action),
      explanation: '',
      xpEarned: xp,
    });
    setExpertVerdict({ action, userFreq: freqPct, targetFreq: target, inRange, freqMatch });
    if (isBBSession) setBBSelected(action === 0 ? 'fold' : action === 1 ? 'call' : '3bet');
    await recordResult(isCorrect, xp, 'preflop', timeTaken);
    setPhase('result');
  };

  // ─── handleAnswerBB ───────────────────────────────────────────────────────────

  const handleAnswerBB = async (action: BBAction) => {
    if (!bbExercise) return;
    const timeTaken = Date.now() - startTime.current;
    setBBSelected(action);

    let isCorrect: boolean;
    // Defaults = GTO; overridden below when a custom range is used.
    let resultAction: BBAction = bbExercise.correctAction;
    let resultExplanation = bbExercise.explanation;
    let resultIsMixed = bbExercise.isMixed;

    // Beginner = GTO only. Custom ranges apply from Advanced upward.
    if (preflopEnabled && mode !== 'beginner') {
      let flat: number[] | null = null;
      let label: string | null = null;

      try {
        const resolved = await profilesApi.resolve('BB', heroStack, mode !== 'expert');
        const play = resolved?.cells ? toPlayFrequencies(resolved.cells) : null;
        if (play) {
          flat = play;
          setCustomMix(resolved.cells.length === 676 ? resolved.cells : null);
          label = resolved.profileName
            ? `${resolved.profileName}${resolved.stackRangeLabel ? ` · ${resolved.stackRangeLabel}` : ''}`
            : null;
        }
      } catch { /* ignore */ }

      setResolvedLabel(label);

      if (flat) {
        const grid: number[][] = [];
        for (let r = 0; r < 13; r++) grid.push(flat.slice(r * 13, r * 13 + 13));
        setCustomMatrix(grid);
        const [row, col] = getMatrixIndices(bbExercise.notation);
        const cellVal = grid[row]?.[col] ?? 0;
        // Map your range's 5-category code to the answer group, score by group.
        const code = Math.round(cellVal);
        setBbCustomCode(code);
        const expected: BBAction = code === 0 ? 'fold' : code <= 2 ? 'call' : '3bet';
        isCorrect = action === expected;
        resultAction = expected;
        resultExplanation = '';   // shown via colored pills + your range grid
        resultIsMixed = false;
      } else {
        // No custom range → evaluate against GTO
        isCorrect = action === bbExercise.correctAction
          || (bbExercise.isMixed && action === bbExercise.altAction);
        try {
          const data = await trainingApi.getBBDefenseRange();
          setRangeMatrix(data.grid);
        } catch { /* ignore */ }
      }
    } else {
      isCorrect = action === bbExercise.correctAction
        || (bbExercise.isMixed && action === bbExercise.altAction);
      try {
        const data = await trainingApi.getBBDefenseRange();
        setRangeMatrix(data.grid);
      } catch { /* ignore */ }
    }

    const xp = isCorrect ? 15 : 5;
    setLocalResult({
      isCorrect,
      correctAction: resultAction,
      explanation: resultExplanation,
      xpEarned: xp,
      isMixed: resultIsMixed,
    });
    await recordResult(isCorrect, xp, 'preflop', timeTaken);
    setPhase('result');
  };

  // ─── handleBB3betType (advanced — step 2: value vs bluff) ─────────────────────
  // The value/bluff classification is a GTO-knowledge question, judged against
  // the model's `kind`. A 3-bet hand's kind is always value3bet or bluff3bet.

  const handleBB3betType = async (type: 'value' | 'bluff') => {
    if (!bbExercise) return;
    const timeTaken = Date.now() - startTime.current;
    setBB3betType(type);
    const expectedKind = type === 'value' ? 'value3bet' : 'bluff3bet';
    const isCorrect = bbExercise.kind === expectedKind;
    const xp = isCorrect ? 20 : 5; // 2-step decision is worth a bit more
    try {
      const data = await trainingApi.getBBDefenseRange();
      setRangeMatrix(data.grid);
    } catch { /* ignore */ }
    setLocalResult({
      isCorrect,
      correctAction: bbExercise.correctAction,
      explanation: bbExercise.explanation,
      xpEarned: xp,
      isMixed: bbExercise.isMixed,
    });
    await recordResult(isCorrect, xp, 'preflop', timeTaken);
    setBB3betStep(false);
    setPhase('result');
  };

  // ─── handleNext ───────────────────────────────────────────────────────────────

  const handleNext = async () => {
    resetExerciseState();
    setPhase('exercise');

    if (randomMode) {
      // Re-randomize position every hand — BB included in the rotation
      const nextPos = ALL_POSITIONS[Math.floor(Math.random() * ALL_POSITIONS.length)];
      await pickAndStart(nextPos);
    } else if (isBBSession) {
      // Locked in BB session
      setBBExercise(null);
      setBBIsLoading(true);
      try {
        const ex = await trainingApi.getBBDefenseExercise();
        setBBExercise(ex);
      } catch { /* ignore */ }
      setBBIsLoading(false);
    } else {
      await fetchPreflopExercise(lockPosition ? selectedPosition : undefined);
    }
  };

  // ─── handleChangePosition ─────────────────────────────────────────────────────

  const handleChangePosition = () => {
    setRandomMode(false);
    setIsBBSession(false);
    setBBExercise(null);
    setBBSelected(null);
    setPhase('select_position');
  };

  const isEn = useLangStore(s => s.lang) === 'en';

  // Use localResult (custom range / BB) when available, fall back to GTO lastResult
  const result = localResult ?? lastResult;

  // Expert 2-step quiz active: expert mode + "Mes ranges" on an expert profile.
  const isExpertQuiz = mode === 'expert' && preflopEnabled && !!expertTarget;

  // Visual recap of an expert-quiz verdict: the hand's mix shown as a colored
  // stacked bar (same scheme as "Ta range") + the user's answer marked ✓/✗.
  const renderExpertMixBar = () => {
    if (!expertTarget || !expertVerdict || !result) return null;
    const segs = EXPERT_DISPLAY
      .map(a => ({ a, f: expertTarget[a.key] ?? 0 }))
      .filter(s => s.f > 0);
    const userAct = EXPERT_ACTIONS[expertVerdict.action];
    return (
      <div className="w-full max-w-md rounded-xl border border-gray-700 bg-gray-900/60 p-3 flex flex-col gap-2.5">
        <p className="text-xs font-semibold text-gray-400 flex items-center gap-1.5">
          <Sliders size={12} /> {isEn ? 'Your range for this hand' : 'Ta range pour cette main'}
        </p>
        {/* Stacked mix bar */}
        <div className="flex h-9 w-full rounded-lg overflow-hidden border border-black/40">
          {segs.map(s => (
            <div
              key={s.a.key}
              style={{ width: `${s.f * 100}%`, backgroundColor: s.a.color }}
              className="flex items-center justify-center text-[11px] font-bold text-white whitespace-nowrap overflow-hidden"
            >
              {s.f >= 0.16 ? `${isEn ? s.a.labelEn : s.a.labelFr} ${Math.round(s.f * 100)}%` : ''}
            </div>
          ))}
        </div>
        {/* Legend (covers thin segments) + your answer */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex gap-2.5 flex-wrap">
            {segs.map(s => (
              <span key={s.a.key} className="flex items-center gap-1 text-[11px] text-gray-300">
                <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: s.a.color }} />
                {isEn ? s.a.labelEn : s.a.labelFr} {Math.round(s.f * 100)}%
              </span>
            ))}
          </div>
          <span
            className="flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-full border"
            style={{ color: userAct.accent, borderColor: userAct.accent }}
          >
            {isEn ? 'You' : 'Toi'}: {isEn ? userAct.labelEn : userAct.labelFr} {expertVerdict.userFreq}%
            {result.isCorrect
              ? <Check size={13} className="text-green-400" />
              : <X size={13} className="text-red-400" />}
          </span>
        </div>
      </div>
    );
  };

  // Shared 2-step expert quiz UI (step 1 = action, step 2 = frequency chips).
  const renderExpertQuiz = () => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="flex flex-col items-center gap-3 w-full sm:w-auto"
    >
      {expertActionPick === null ? (
        <>
          <p className="text-sm text-gray-300 font-semibold text-center">
            {isEn ? 'What do you do with this hand?' : 'Que fais-tu avec cette main ?'}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            {EXPERT_DISPLAY.map(a => (
              <button
                key={a.key}
                onClick={() => setExpertActionPick(a.key)}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 font-bold text-sm text-white transition-transform hover:scale-105 sm:min-w-[120px]"
                style={{ borderColor: a.accent, backgroundColor: a.color }}
              >
                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: a.accent }} />
                {isEn ? a.labelEn : a.labelFr}
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-gray-300 font-semibold text-center">
            {isEn ? 'How often do you ' : 'À quelle fréquence joues-tu '}
            <span style={{ color: EXPERT_ACTIONS[expertActionPick].accent }} className="font-bold">
              {isEn ? EXPERT_ACTIONS[expertActionPick].labelEn : EXPERT_ACTIONS[expertActionPick].labelFr}
            </span>
            {isEn ? '?' : ' ?'}
          </p>
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3 max-w-md">
            {EXPERT_FREQ_CHIPS.map(f => (
              <button
                key={f}
                onClick={() => handleExpertAnswer(expertActionPick, f)}
                className="px-4 py-2.5 rounded-xl border-2 border-gray-600 bg-gray-800 hover:bg-gray-700 hover:border-gray-400 font-bold text-white text-sm transition-colors min-w-[64px]"
              >
                {f}%
              </button>
            ))}
          </div>
          <button
            onClick={() => setExpertActionPick(null)}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            {isEn ? '← Back' : '← Retour'}
          </button>
        </>
      )}
    </motion.div>
  );

  if (showIntro) {
    return (
      <div className="flex flex-col gap-5 max-w-2xl mx-auto">
        <TrainerIntro
          emoji="🎯"
          title={isEn ? 'Pre-flop Trainer' : 'Entraîneur Pré-flop'}
          description={isEn
            ? "Master opening decisions and BB defense based on your position and GTO 6-max ranges."
            : "Maîtrisez les décisions d'ouverture et la défense BB selon votre position et les ranges GTO 6-max."}
          whatTitle={isEn ? "What is pre-flop play?" : "Qu'est-ce que le jeu pré-flop ?"}
          whatContent={
            <>
              <p className="text-gray-400 text-xs leading-snug mb-2.5">
                <RichLine text={isEn
                  ? "Before any community cards are dealt, each player must decide whether to open (raise), fold, or defend based on their 2 hole cards and their position at the table."
                  : "Avant que les cartes communes soient posées, chaque joueur doit décider d'ouvrir, se coucher ou défendre selon ses 2 cartes en main et sa position à la table."} />
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  { emoji: '⬅️', label: 'UTG / HJ', desc: isEn ? 'Early — tight' : 'Early — serré' },
                  { emoji: '➡️', label: 'CO / BTN', desc: isEn ? 'Late — wide' : 'Late — large' },
                  { emoji: '🔄', label: 'SB', desc: isEn ? 'vs BB heads-up' : 'vs BB tête-à-tête' },
                  { emoji: '🛡️', label: 'BB', desc: isEn ? 'Defend vs raise' : 'Défendre vs relance' },
                ].map(s => (
                  <div key={s.label} className="bg-gray-800/50 rounded-lg px-2 py-1.5 border border-gray-700 text-center">
                    <div className="text-base mb-0.5">{s.emoji}</div>
                    <div className="text-white font-bold text-xs">{s.label}</div>
                    <div className="text-gray-500 text-[10px] mt-0.5 leading-tight">{s.desc}</div>
                  </div>
                ))}
              </div>
            </>
          }
          steps={isEn ? [
            '🎯 Choose your position on the interactive poker table',
            '🃏 Receive 2 random hole cards',
            '♠️ Open positions: Raise or Fold according to GTO 6-max ranges',
            '🛡️ BB position: Fold, Call or 3-Bet facing a raise',
            '📊 The range matrix shows the correct hands for each position',
          ] : [
            '🎯 Choisissez votre position sur la table de poker interactive',
            '🃏 Recevez 2 cartes en main aléatoires',
            '♠️ Positions ouvertes : Raise ou Fold selon les ranges GTO 6-max',
            '🛡️ Position BB : Fold, Call ou 3-Bet face à une relance',
            '📊 La matrice de ranges vous montre les bonnes mains pour chaque position',
          ]}
          beginnerHint={isEn ? "Shows range frequency & hand context" : "Affiche la fréquence de range & contexte"}
          advancedHint={isEn ? "No hints — play by intuition & memory" : "Sans indices — jouez à l'intuition & mémoire"}
          expertHint={isEn ? "Premium Expert — quizzed on your own ranges (Fold/Call/Raise/All-in mix)" : "Premium Expert — interrogé sur tes propres ranges (mix Fold/Call/Raise/All-in)"}
          startLabel={isEn ? 'Choose a position' : 'Choisir une position'}
          onStart={() => { setShowIntro(false); setTrainerStarted(true); }}
          mode={mode}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 sm:gap-6 max-w-2xl mx-auto">

      {/* ── Persistent header with info button ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-0.5 sm:mb-1">{t.training.preflop_title}</h2>
          <p className="text-gray-400 text-xs sm:text-sm">{t.training.preflop_subtitle}</p>
        </div>
        <button
          onClick={() => { setShowIntro(true); setTrainerStarted(false); }}
          className="text-gray-500 hover:text-gray-300 transition-colors p-1 mt-1 shrink-0"
          title={isEn ? 'Module info' : 'Infos du module'}
        >
          <Info size={14} />
        </button>
      </div>

      {/* ── PHASE: Position selection ── */}
      {phase === 'select_position' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-4 sm:gap-6"
        >

          {/* Interactive poker table — compact on mobile */}
          <div className="w-full max-w-xs sm:max-w-xl">
            <PokerTable
              heroPosition={selectedPosition}
              onPositionChange={pos => setSelectedPosition(pos)}
              interactive
              compact={isMobile}
            />
          </div>

          {/* Current selection indicator */}
          <motion.div
            key={selectedPosition}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-3 px-5 py-2 rounded-full bg-gray-800 border border-gray-600"
          >
            <span className="text-gray-400 text-sm">{t.training.position_lbl}</span>
            <span className="text-white font-bold text-lg">{selectedPosition}</span>
            <PositionInfo position={selectedPosition} />
          </motion.div>

          {/* BB hint */}
          {selectedPosition === 'BB' && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 bg-blue-950/30 border border-blue-900/40 rounded-xl px-4 py-2.5 text-xs text-blue-300 max-w-sm text-center"
            >
              <span>🛡️</span>
              <span>
                {isEn
                  ? 'BB defense mode — you will face raises from different positions and choose Fold / Call / 3-Bet.'
                  : 'Mode défense BB — vous ferez face à des relances de différentes positions et choisirez Fold / Call / 3-Bet.'}
              </span>
            </motion.div>
          )}

          <p className="text-xs text-gray-500 text-center">
            {isEn ? 'Click any seat to select that position' : 'Cliquez une place sur la table pour choisir cette position'}
          </p>

          {/* Start buttons */}
          <div className="flex gap-4 flex-wrap justify-center">
            <Button
              size="lg"
              variant="secondary"
              onClick={() => {
                setRandomMode(true);
                const random = ALL_POSITIONS[Math.floor(Math.random() * ALL_POSITIONS.length)];
                handleStart(random);
              }}
            >
              {t.training.random_pos}
            </Button>
            <Button size="lg" variant="gold" onClick={() => { setRandomMode(false); handleStart(selectedPosition); }}>
              {selectedPosition === 'BB'
                ? (isEn ? 'Defend as BB' : 'Défendre en BB')
                : `${t.training.play_pos} ${selectedPosition}`}
            </Button>
          </div>

          {/* Guidance below the decision — no scrolling needed to choose a seat. */}
          <BeginnerGuide
            title={isEn ? 'What is this screen?' : 'C\'est quoi cet écran ?'}
            text={isEn
              ? `In poker, your **position** is your seat compared to the dealer button (the **D**). It decides the order in which you speak.\nThe later you speak, the more you know about your opponents — so the **more hands you can play**:\n🛡️ **BB** = you defend your blind against a raise.\n👉 Click a seat to pick your position, or hit **Random position** to practice them all.`
              : `Au poker, ta **position** c'est ta place par rapport au bouton du donneur (le **D**). Elle décide dans quel ordre tu parles.\nPlus tu parles **tard**, plus tu as d'infos sur tes adversaires — donc **plus tu peux jouer de mains** :\n🛡️ **BB** = tu défends ta blinde face à une relance.\n👉 Clique une place pour choisir ta position, ou appuie sur **Position aléatoire** pour t'entraîner sur toutes.`}
          >
            <div className="flex flex-col gap-3">
              {/* Early positions — tight */}
              <div className="flex flex-col gap-1.5 rounded-xl border border-blue-800/30 bg-blue-950/30 px-3 py-2.5">
                <p className="text-xs font-semibold text-blue-200">
                  🪑 <strong>UTG / HJ</strong> — {isEn ? 'early, you speak first → only strong hands like:' : 'tôt, tu parles en premier → seulement de bonnes mains comme :'}
                </p>
                <div className="flex items-center gap-3 flex-wrap">
                  <ExampleHand cards={['As', 'Ks']} label="AKs" />
                  <ExampleHand cards={['Ah', 'Ad']} label="AA" />
                  <ExampleHand cards={['Qh', 'Qs']} label="QQ" />
                </div>
              </div>
              {/* Late positions — wide */}
              <div className="flex flex-col gap-1.5 rounded-xl border border-green-800/30 bg-green-950/30 px-3 py-2.5">
                <p className="text-xs font-semibold text-green-200">
                  🪑 <strong>CO / BTN</strong> — {isEn ? 'late, you speak last → many more hands, even:' : 'tard, tu parles en dernier → beaucoup plus de mains, même :'}
                </p>
                <div className="flex items-center gap-3 flex-wrap">
                  <ExampleHand cards={['As', 'Ks']} label="AKs" />
                  <ExampleHand cards={['Ad', '5d']} label="A5s" />
                  <ExampleHand cards={['7c', '6c']} label="76s" />
                  <ExampleHand cards={['Kh', '9c']} label="K9o" />
                </div>
              </div>
            </div>
          </BeginnerGuide>
        </motion.div>
      )}

      {/* ── PHASE: Exercise ── */}
      {phase === 'exercise' && (
        <AnimatePresence mode="wait">
          {isBBSession ? (
            /* ── BB Defense exercise ── */
            <motion.div
              key={bbExercise?.notation ?? 'bb-loading'}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="flex flex-col items-center gap-5"
            >
              {bbIsLoading || !bbExercise ? (
                <Spinner />
              ) : (
                <>
                  <div className="w-full max-w-xs sm:max-w-xl mx-auto">
                    <PokerTable
                      heroPosition="BB"
                      interactive={false}
                      heroCards={bbExercise.hand as string[]}
                      boardCardSize="md"
                      compact={true}
                      seatInfos={{
                        [bbExercise.opener]: { bet: `${bbExercise.openSize}bb` },
                        ...(preflopEnabled && mode === 'expert' ? { BB: { stack: `${heroStack} bb` } } : {}),
                      } as any}
                    />
                  </div>

                  {/* Info block: hand + description in one visual unit */}
                  <div className="w-full max-w-xs sm:max-w-sm rounded-2xl border border-gray-700/60 bg-gray-900/50 px-5 py-4 flex flex-col items-center gap-2">
                    <Hand cards={bbExercise.hand as CardStr[]} size="md" gap="gap-3" animate={false} />
                    <div className="flex items-center gap-2 flex-wrap justify-center">
                      <span className="text-gray-400 text-sm">BB</span>
                      <PositionInfo position="BB" />
                      <span className="text-gold-400 font-mono font-bold text-lg">
                        {handToDisplay(bbExercise.notation)}
                      </span>
                      <span className="text-gray-500 text-xs">
                        — {bbExercise.opener} {isEn ? 'opens' : 'ouvre à'} {bbExercise.openSize}bb
                      </span>
                    </div>
                  </div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="flex flex-col items-center gap-2.5 w-full sm:w-auto"
                  >
                    {isExpertQuiz ? renderExpertQuiz() :
                     mode === 'advanced' && bb3betStep ? (
                      /* Advanced step 2 — classify the 3-bet */
                      <>
                        <p className="text-sm text-gray-300 font-semibold text-center">
                          {isEn ? 'This 3-bet — for value or as a bluff?' : 'Ce 3-bet — pour la valeur ou en bluff ?'}
                        </p>
                        <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
                          <Button size="xl" variant="gold"      onClick={() => handleBB3betType('value')} className="flex-1 sm:flex-none sm:min-w-[130px]">{isEn ? '3-bet value' : '3-bet valeur'}</Button>
                          <Button size="xl" variant="secondary" onClick={() => handleBB3betType('bluff')} className="flex-1 sm:flex-none sm:min-w-[130px]">{isEn ? '3-bet bluff' : '3-bet bluff'}</Button>
                        </div>
                        <button
                          onClick={() => { setBB3betStep(false); setBBSelected(null); }}
                          className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                        >
                          {isEn ? '← Back' : '← Retour'}
                        </button>
                      </>
                    ) : (
                      /* Step 1 — action. Beginner labels the aggressive option "Raise". */
                      <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
                        <Button size="xl" variant="danger"    onClick={() => handleAnswerBB('fold')} className="flex-1 sm:flex-none sm:min-w-[110px]">Fold</Button>
                        <Button size="xl" variant="secondary" onClick={() => handleAnswerBB('call')} className="flex-1 sm:flex-none sm:min-w-[110px]">Call</Button>
                        <Button
                          size="xl" variant="gold"
                          onClick={() => {
                            // Advanced (GTO mode) → ask value/bluff. Beginner or "Mes ranges" → score directly.
                            if (mode === 'advanced' && !preflopEnabled) { setBBSelected('3bet'); setBB3betStep(true); }
                            else handleAnswerBB('3bet');
                          }}
                          className="flex-1 sm:flex-none sm:min-w-[110px]"
                        >
                          {mode === 'beginner' ? 'Raise' : '3-Bet'}
                        </Button>
                      </div>
                    )}
                  </motion.div>

                  {/* Guidance below the buttons — no scrolling needed to answer. */}
                  <BeginnerGuide
                    title={isEn ? 'What you must do' : 'Ce qu\'on te demande'}
                    text={isEn
                      ? `You are in the **big blind (BB)** — you already put 1 chip in the middle without seeing your cards.\n**${bbExercise.opener}** raised to **${bbExercise.openSize}bb** before you. Now it's your turn with **${handToDisplay(bbExercise.notation)}**.\nYou have 3 choices:\n🚫 **Fold** = give up, you lose only your 1 blind.\n✅ **Call** = pay to keep playing and see the flop.\n💰 **3-Bet** = re-raise to show you have a strong hand.\nAsk yourself: is my hand strong enough to keep playing against ${bbExercise.opener}?`
                      : `Tu es à la **grosse blinde (BB)** — tu as déjà mis 1 jeton au milieu sans voir tes cartes.\n**${bbExercise.opener}** a relancé à **${bbExercise.openSize}bb** avant toi. C'est ton tour avec **${handToDisplay(bbExercise.notation)}**.\nTu as 3 choix :\n🚫 **Fold** = tu abandonnes, tu perds seulement ta blinde.\n✅ **Call** = tu paies pour continuer et voir le flop.\n💰 **3-Bet** = tu re-relances pour montrer que ta main est forte.\nPose-toi la question : est-ce que ma main est assez forte pour continuer contre ${bbExercise.opener} ?`}
                  />

                  <SpoilableHint resetKey={bbExercise.notation + bbExercise.opener} className="w-full max-w-md">
                    <HandHintPanel notation={bbExercise.notation} isEn={isEn} />
                  </SpoilableHint>
                </>
              )}
            </motion.div>
          ) : (
            /* ── Standard preflop exercise ── */
            <motion.div
              key={preflopExercise?.notation}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="flex flex-col items-center gap-3 sm:gap-5"
            >
              {isLoading ? (
                <Spinner />
              ) : preflopExercise ? (
                <>
                  <div className="w-full max-w-xs sm:max-w-xl mx-auto">
                    <PokerTable
                      heroPosition={preflopExercise.position}
                      interactive={false}
                      heroCards={preflopExercise.hand as string[]}
                      boardCardSize="md"
                      compact={true}
                      seatInfos={preflopEnabled && mode === 'expert'
                        ? { [preflopExercise.position]: { stack: `${heroStack} bb` } } as any
                        : undefined}
                    />
                  </div>

                  {/* Info block: hand + description in one visual unit */}
                  <div className="w-full max-w-xs sm:max-w-sm rounded-2xl border border-gray-700/60 bg-gray-900/50 px-5 py-4 flex flex-col items-center gap-2">
                    <Hand cards={preflopExercise.hand as CardStr[]} size="md" gap="gap-3" animate={false} />
                    {preflopEnabled && mode === 'expert' && (
                      <span className="text-gold-400 text-xs font-semibold">{heroStack} bb</span>
                    )}
                    <div className="flex items-center gap-2 flex-wrap justify-center">
                      <span className="text-gray-400 text-sm">{t.training.position_lbl}</span>
                      <span className="font-bold text-white text-lg">{preflopExercise.position}</span>
                      <PositionInfo position={preflopExercise.position} />
                      <span className="text-gold-400 font-mono font-bold text-lg">
                        {handToDisplay(preflopExercise.notation)}
                      </span>
                      <span className="text-gray-500 text-xs">— {t.training.facing}</span>
                    </div>
                  </div>

                  {isExpertQuiz ? renderExpertQuiz() : (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="flex gap-3 sm:gap-6 w-full sm:w-auto"
                  >
                    <Button size="xl" variant="danger" onClick={() => handleAnswer('fold')} className="flex-1 sm:flex-none sm:min-w-[140px]">
                      Fold
                    </Button>
                    <Button size="xl" variant="gold" onClick={() => handleAnswer('raise')} className="flex-1 sm:flex-none sm:min-w-[140px]">
                      Raise
                    </Button>
                  </motion.div>
                  )}

                  {/* Guidance below the buttons — no scrolling needed to answer. */}
                  <BeginnerGuide
                    title={isEn ? 'What you must do' : 'Ce qu\'on te demande'}
                    text={isEn
                      ? `Nobody has played yet — it's your turn to open. You are sitting at **${preflopExercise.position}** and you got **${handToDisplay(preflopExercise.notation)}**.\nYou have 2 choices:\n💰 **Raise** = your hand is good enough, you bet to attack.\n🚫 **Fold** = your hand is too weak, you throw it away and wait for a better one.\n👉 Tip: the **earlier** you speak (UTG, HJ), the **stronger** your hand must be. The **later** you speak (CO, BTN), the **more** hands you can play.`
                      : `Personne n'a encore joué — c'est à toi d'ouvrir. Tu es assis en **${preflopExercise.position}** et tu as reçu **${handToDisplay(preflopExercise.notation)}**.\nTu as 2 choix :\n💰 **Raise** = ta main est assez bonne, tu mises pour attaquer.\n🚫 **Fold** = ta main est trop faible, tu la jettes et tu attends mieux.\n👉 Astuce : plus tu parles **tôt** (UTG, HJ), plus ta main doit être **forte**. Plus tu parles **tard** (CO, BTN), plus tu peux jouer de mains.`}
                  />

                  <SpoilableHint resetKey={preflopExercise.notation + preflopExercise.position} className="w-full max-w-md">
                    <HandHintPanel notation={preflopExercise.notation} isEn={isEn} />
                  </SpoilableHint>

                  {!randomMode && (
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-400">
                      <input
                        type="checkbox"
                        checked={lockPosition}
                        onChange={e => {
                          setLockPosition(e.target.checked);
                          if (e.target.checked) setSelectedPosition(preflopExercise.position);
                        }}
                        className="rounded"
                      />
                      {t.training.lock_pos} {preflopExercise.position}
                    </label>
                  )}
                </>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* ── PHASE: Result ── (shared for BB and preflop open) */}
      {phase === 'result' && (
        <>
          {/* ── BB Defense result ── */}
          {isBBSession && localResult && bbExercise && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center gap-5"
            >
              <VerdictBanner isCorrect={localResult.isCorrect} partial={localResult.partial} />

              {/* Action pills. Custom range → verdict from YOUR range; otherwise GTO.
                  Hidden in the expert quiz (shown via the mix bar instead). */}
              {!isExpertQuiz && (
                (preflopEnabled && customMatrix) ? (
                  <div className="flex gap-2 flex-wrap justify-center">
                    {/* Precise 5-category label from your range (3-bet valeur/bluff, Call, Call fin, Fold) */}
                    <span
                      className="px-3 py-1.5 rounded-full border border-black/30 text-xs font-bold text-white"
                      style={{ backgroundColor: BB_CELL_COLOR(bbCustomCode ?? 0) }}
                    >
                      {isEn ? 'Your range' : 'Ta range'} : <strong>{({
                        0: t.training.bb_leg_fold, 1: t.training.bb_leg_call,
                        2: t.training.bb_leg_thin, 3: t.training.bb_leg_value, 4: t.training.bb_leg_bluff,
                      } as Record<number, string>)[bbCustomCode ?? 0]}</strong>
                    </span>
                    {bbSelected && (
                      <span className={`px-3 py-1.5 rounded-full border text-xs font-bold ${localResult.isCorrect ? 'border-green-700 text-green-300 bg-green-900/20' : 'border-red-700 text-red-300 bg-red-900/20'}`}>
                        {isEn ? 'Your action' : 'Ton action'} : <strong>{
                          bbSelected === '3bet' && mode === 'beginner' ? 'Raise' : bbSelected
                        }</strong>
                      </span>
                    )}
                  </div>
                ) : (
                <div className="flex gap-2 flex-wrap justify-center">
                  <span className={`px-3 py-1.5 rounded-full border text-xs font-bold ${BB_ACTION_PILL[bbExercise.correctAction]}`}>
                    {isEn ? 'Recommended' : 'Recommandé'} : <strong>{
                      bbExercise.kind === 'value3bet' ? (isEn ? '3-bet value' : '3-bet valeur')
                        : bbExercise.kind === 'bluff3bet' ? '3-bet bluff'
                        : bbExercise.kind === 'thincall'  ? (isEn ? 'thin call' : 'call fin')
                        : bbExercise.correctAction
                    }</strong>
                  </span>
                  {bbExercise.isMixed && bbExercise.altAction && bbExercise.altAction !== bbExercise.correctAction && (
                    <span className={`px-3 py-1.5 rounded-full border text-xs font-bold ${BB_ACTION_PILL[bbExercise.altAction]}`}>
                      {isEn ? 'Also ok' : 'Aussi ok'} : <strong>{bbExercise.altAction}</strong>
                    </span>
                  )}
                  {bbSelected && (
                    <span className={`px-3 py-1.5 rounded-full border text-xs font-bold ${localResult.isCorrect ? 'border-green-700 text-green-300 bg-green-900/20' : 'border-red-700 text-red-300 bg-red-900/20'}`}>
                      {isEn ? 'Your action' : 'Ton action'} : <strong>{
                        bbSelected === '3bet' && bb3betType ? (bb3betType === 'value' ? (isEn ? '3-bet value' : '3-bet valeur') : '3-bet bluff')
                          : bbSelected === '3bet' && mode === 'beginner' ? 'Raise'
                          : bbSelected
                      }</strong>
                    </span>
                  )}
                </div>
                )
              )}

              {/* Compact table recap */}
              <div className="flex flex-col sm:flex-row items-center gap-6 w-full">
                <div className="w-full max-w-[280px] shrink-0">
                  <PokerTable
                    heroPosition="BB"
                    compact
                    heroCards={bbExercise.hand as string[]}
                    seatInfos={{
                      [bbExercise.opener]: { bet: `${bbExercise.openSize}bb` },
                      ...(resolvedLabel ? { BB: { stack: `${heroStack} bb` } } : {}),
                    } as any}
                  />
                </div>
                <div className="flex flex-col items-center sm:items-start gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Hand cards={bbExercise.hand as CardStr[]} size="sm" gap="gap-1.5" animate={false} />
                    <span className="text-white font-bold">BB</span>
                    <span className="text-gray-500 text-xs">
                      vs {bbExercise.opener} {bbExercise.openSize}bb
                    </span>
                  </div>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="flex items-center gap-2 text-blue-400 text-sm"
                  >
                    <Zap size={14} />
                    <span className="font-bold">+{localResult.xpEarned} XP</span>
                  </motion.div>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex flex-col gap-3 w-full max-w-xs">
                <Button size="lg" variant="gold" onClick={handleNext} fullWidth>
                  {t.training.next_hand} <ChevronRight size={18} className="inline" />
                </Button>
                <Button size="sm" variant="ghost" onClick={handleChangePosition} fullWidth>
                  <RotateCcw size={14} className="inline mr-1" /> {t.training.change_pos}
                </Button>
              </div>

              {/* Recap stats */}
              <SessionStatsBar
                total={sessionStats.total}
                correct={sessionStats.correct}
                streak={sessionStats.streak}
                xp={sessionStats.xp}
              />

              {/* Expert quiz: visual mix bar of your range + your answer */}
              {isExpertQuiz && renderExpertMixBar()}

              {/* Explanation (beginner, or always in the expert quiz) */}
              {localResult.explanation && (
                <ExplanationPanel text={localResult.explanation} plain forceShow={isExpertQuiz} />
              )}

              {/* Custom range active badge */}
              {(customMatrix || customMix) && preflopEnabled && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-900/30 border border-purple-700/50 rounded-lg text-xs text-purple-300 w-full justify-center flex-wrap">
                  <Sliders size={12} />
                  <span>{isEn ? 'Evaluated against your custom range' : 'Évalué selon votre range personnalisée'}</span>
                  {resolvedLabel && <span className="text-purple-400 font-bold">· {heroStack} bb</span>}
                </div>
              )}

              {/* Range matrix */}
              <RangeSection
                matrix={(preflopEnabled && customMatrix) ? customMatrix : rangeMatrix}
                mix={preflopEnabled ? customMix : null}
                highlightNotation={bbExercise.notation}
                position="BB"
                isCustom={!!(preflopEnabled && (customMatrix || customMix))}
                resolvedLabel={resolvedLabel}
                heroStack={heroStack}
                isEn={isEn}
                showRange={showRange}
                setShowRange={setShowRange}
                t={t}
              />
            </motion.div>
          )}

          {/* ── Preflop open result ── */}
          {!isBBSession && result && preflopExercise && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center gap-5"
            >
              <VerdictBanner isCorrect={result.isCorrect} partial={result.partial} />

              {/* Colored verdict pills (non-expert). Expert mix bar is below the stats. */}
              {!isExpertQuiz && (
                <div className="flex gap-2 flex-wrap justify-center">
                  <span className={`px-3 py-1.5 rounded-full border text-sm font-bold ${OPEN_ACTION_PILL[result.correctAction] ?? OPEN_ACTION_PILL.fold}`}>
                    {isEn ? 'Correct' : 'Bon coup'} : <strong>{openActionLabel(result.correctAction)}</strong>
                  </span>
                  {openAnswer && !result.isCorrect && (
                    <span className="px-3 py-1.5 rounded-full border text-sm font-bold border-red-700 text-red-300 bg-red-900/20">
                      {isEn ? 'Your choice' : 'Ton choix'} : <strong>{openActionLabel(openAnswer)}</strong>
                    </span>
                  )}
                </div>
              )}

              {/* Compact table recap */}
              <div className="flex flex-col sm:flex-row items-center gap-6 w-full">
                <div className="w-full max-w-[280px] shrink-0">
                  <PokerTable
                    heroPosition={preflopExercise.position}
                    compact
                    heroCards={preflopExercise.hand as string[]}
                    seatInfos={preflopEnabled && resolvedLabel
                      ? { [preflopExercise.position]: { stack: `${heroStack} bb` } } as any
                      : undefined}
                  />
                </div>
                <div className="flex flex-col items-center sm:items-start gap-2">
                  <div className="flex items-center gap-2">
                    <Hand cards={preflopExercise.hand as CardStr[]} size="sm" gap="gap-1.5" animate={false} />
                    <span className="text-white font-bold">{preflopExercise.position}</span>
                  </div>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="flex items-center gap-2 text-blue-400 text-sm"
                  >
                    <Zap size={14} />
                    <span className="font-bold">+{result.xpEarned} XP</span>
                  </motion.div>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex flex-col gap-3 w-full max-w-xs">
                <Button size="lg" variant="gold" onClick={handleNext} fullWidth>
                  {t.training.next_hand} <ChevronRight size={18} className="inline" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setPhase('select_position')} fullWidth>
                  <RotateCcw size={14} className="inline mr-1" /> {t.training.change_pos}
                </Button>
              </div>

              {/* Recap stats */}
              <SessionStatsBar
                total={sessionStats.total}
                correct={sessionStats.correct}
                streak={sessionStats.streak}
                xp={sessionStats.xp}
              />

              {/* Expert quiz: visual mix bar of your range + your answer */}
              {isExpertQuiz && renderExpertMixBar()}

              {/* Explanation (beginner, or always in the expert quiz) */}
              <ExplanationPanel text={result.explanation} plain forceShow={isExpertQuiz} />

              {/* Custom range active badge */}
              {localResult && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-900/30 border border-purple-700/50 rounded-lg text-xs text-purple-300 w-full justify-center flex-wrap">
                  <Sliders size={12} />
                  <span>
                    {isEn ? 'Evaluated against your custom range' : 'Évalué selon votre range personnalisée'}
                  </span>
                  {resolvedLabel && <span className="text-purple-400 font-bold">· {heroStack} bb</span>}
                </div>
              )}

              {/* Range matrix */}
              <RangeSection
                matrix={(preflopEnabled && customMatrix) ? customMatrix : rangeMatrix}
                mix={preflopEnabled ? customMix : null}
                highlightNotation={preflopExercise.notation}
                position={preflopExercise.position}
                isCustom={!!(preflopEnabled && (customMatrix || customMix))}
                resolvedLabel={resolvedLabel}
                heroStack={heroStack}
                isEn={isEn}
                showRange={showRange}
                setShowRange={setShowRange}
                t={t}
              />
            </motion.div>
          )}
        </>
      )}

    </div>
  );
}

// ─── Example hand (card icons + notation label) ────────────────────────────────
function ExampleHand({ cards, label }: { cards: CardStr[]; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <Hand cards={cards} size="xs" gap="gap-0.5" animate={false} />
      <span className="text-[10px] font-mono font-bold text-gray-300">{label}</span>
    </div>
  );
}

// ─── Position info badge ───────────────────────────────────────────────────────
function PositionInfo({ position }: { position: Position }) {
  const isEn = useLangStore(s => s.lang) === 'en';
  const ranges: Record<Position, string> = {
    UTG: '~15%', HJ: '~20%', CO: '~26%',
    BTN: '~45%', SB: '~35%', BB: isEn ? 'Defend' : 'Défend',
  };
  return (
    <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">
      {ranges[position]}
    </span>
  );
}
