import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronDown, ChevronUp, RotateCcw, Zap, Target, Sliders, Lightbulb, Check, X, BookOpen, Shield, TrendingUp, Crown, Flame } from 'lucide-react';
import { SourcesFooter } from '../ui/SourcesFooter';
import type { Source } from '../ui/SourcesFooter';

const PREFLOP_SOURCES: Source[] = [
  { authors: 'Sklansky, D. & Malmuth, M.', title: "Hold'em Poker for Advanced Players", year: '1999', note: { fr: `Classification des mains par position, fondements des ranges d'ouverture`, en: 'Hand grouping by position, open-raise range foundations' } },
  { authors: 'Chen, B. & Ankenman, J.', title: 'The Mathematics of Poker', year: '2006', note: { fr: `Théorie GTO en heads-up et construction des ranges d'équilibre`, en: 'GTO theory in HU and equilibrium range construction' } },
  { authors: 'Acevedo, M.', title: 'Modern Poker Theory', year: '2019', note: { fr: `Ranges GTO 6-max dérivées de solveurs, fréquences d'ouverture par position`, en: 'Solver-derived 6-max GTO ranges, open frequencies by position' } },
  { authors: 'GTO Wizard', title: 'Preflop solver solutions database', year: '2023', note: { fr: `Fréquences d'ouverture, 3-bet et défense par position — 100bb cash game 6-max`, en: 'Open, 3-bet and defense frequencies by position — 100bb 6-max cash game' }, url: 'https://gtowizard.com' },
  { authors: 'PioSolver', title: 'GTO preflop equilibria', year: '2015–', note: { fr: `Calcul des ranges d'équilibre Nash pré-flop`, en: 'Nash equilibrium preflop range computation' }, url: 'https://piosolver.com' },
];
const PREFLOP_METHODOLOGY = {
  fr: `Les mains et fréquences correctes sont calibrées sur des solutions de solveurs GTO (PioSolver, GTO Wizard) pour du cash game 6-max à 100bb effectifs. Les ranges d'ouverture reflètent les fréquences d'équilibre Nash ; les spots mixtes (fréquence > 0 et < 1) sont signalés explicitement.`,
  en: 'Correct hands and frequencies are calibrated from GTO solver solutions (PioSolver, GTO Wizard) for 6-max cash games at 100bb effective stacks. Open ranges reflect Nash equilibrium frequencies; mixed spots (frequency > 0 and < 1) are explicitly flagged.',
};
import { rangesApi, profilesApi, type RangeProfile } from '../../services/api';
import { useTrainingStore } from '../../store/trainingStore';
import { useShallow } from 'zustand/react/shallow';
import { useExamRunner } from '../../hooks/useExamRunner';
import { ExamLauncher, ExamHud, ExamResult } from './ExamMode';
import { Position, Position8, TableFormat, ExerciseResult, BBDefenseExercise } from '../../types/poker';
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
import { handToDisplay, getMatrixIndices, frequencyBg, bbCellColor } from '../../utils/pokerUtils';
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
  const sectionRef = useRef<HTMLDivElement>(null);

  // BB-defense legend + tooltip, stabilized (t is a stable per-language object)
  // so the memoized RangeMatrix isn't re-rendered on every parent update.
  const bbLegend = useMemo(() => [
    { color: 'rgba(22,130,60,0.85)', label: t.training.bb_leg_value, tip: { title: t.training.bb_leg_value, text: t.training.bb_tip_value } },
    { color: 'rgba(202,138,4,0.82)', label: t.training.bb_leg_bluff, tip: { title: t.training.bb_leg_bluff, text: t.training.bb_tip_bluff } },
    { color: 'rgba(37,99,235,0.70)', label: t.training.bb_leg_call,  tip: { title: t.training.bb_leg_call,  text: t.training.bb_tip_call  } },
    { color: '#1a202c',              label: t.training.bb_leg_fold,  tip: { title: t.training.bb_leg_fold,  text: t.training.bb_tip_fold  } },
  ], [t]);
  const bbTooltipValue = useCallback((code: number) => ({
    0: t.training.bb_leg_fold, 1: t.training.bb_leg_call,
    2: t.training.bb_leg_call, 3: t.training.bb_leg_value, 4: t.training.bb_leg_bluff,
  } as Record<number, string>)[code] ?? '', [t]);

  if (!matrix && !mix) return null;
  return (
    <motion.div
      ref={sectionRef}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="w-full"
    >
      <button
        onClick={() => {
          setShowRange(v => {
            if (!v) {
              // Opening: scroll to top of page so the range grid is visible
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
            return !v;
          });
        }}
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
                cellColor={bbCellColor}
                legend={bbLegend}
                tooltipValue={bbTooltipValue}
              />
            ) : (
              <RangeMatrix
                matrix={matrix}
                highlightNotation={highlightNotation}
                size="sm"
                cellColor={frequencyBg}
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

// ─── Advanced range picker (GTO vs simple custom ranges) ─────────────────────

function AdvancedRangePicker({
  isEn,
  onPick,
  onClose,
}: {
  isEn: boolean;
  onPick: (useCustom: boolean) => void;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full rounded-2xl border border-gray-700 bg-gray-900/95 backdrop-blur-sm p-5 flex flex-col gap-4"
    >
      <h3 className="text-white font-bold text-base text-center">
        {isEn ? 'Train with which range?' : "S'entraîner avec quelle range ?"}
      </h3>
      <div className="flex flex-col gap-3">
        <button
          onClick={() => onPick(false)}
          className="flex items-center gap-4 px-5 py-4 rounded-xl border-2 border-felt-700 bg-felt-900/30 hover:bg-felt-800/50 text-left transition-colors"
        >
          <Target size={22} className="text-felt-400 shrink-0" />
          <div>
            <p className="text-felt-200 font-bold text-sm">GTO</p>
            <p className="text-felt-400/70 text-xs mt-0.5">
              {isEn ? 'Solver-calibrated reference ranges' : 'Ranges de référence calibrées sur solveur'}
            </p>
          </div>
        </button>
        <button
          onClick={() => onPick(true)}
          className="flex items-center gap-4 px-5 py-4 rounded-xl border-2 border-purple-700 bg-purple-900/30 hover:bg-purple-800/50 text-left transition-colors"
        >
          <Sliders size={22} className="text-purple-400 shrink-0" />
          <div>
            <p className="text-purple-200 font-bold text-sm">{isEn ? 'My Ranges' : 'Mes ranges'}</p>
            <p className="text-purple-400/70 text-xs mt-0.5">
              {isEn ? 'Train on your own custom ranges' : 'Entraîne-toi sur tes propres ranges'}
            </p>
          </div>
        </button>
      </div>
      <button
        onClick={onClose}
        className="text-xs text-gray-500 hover:text-gray-300 text-center transition-colors"
      >
        {isEn ? 'Cancel' : 'Annuler'}
      </button>
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PreflopTrainer() {
  const t = useT();
  const isMobile = useIsMobile();
  // Table format and game type chosen inside the module.
  const [format, setFormat] = useState<TableFormat>('6max');
  const [gameType, setGameType] = useState<import('../../types/poker').GameType>('cashgame');
  const is8    = format === '8max';
  const is3max = format === '3max';
  const isHU   = format === 'hu';
  const isMTT  = gameType === 'mtt';
  // Custom-range storage key — namespaced by format and game type.
  const rangeKey = (pos: string) => {
    const prefix = isMTT ? 'mtt:' : '';
    if (is8)    return `${prefix}8max:${pos}`;
    if (is3max) return `${prefix}3max:${pos}`;
    if (isHU)   return `${prefix}hu:${pos}`;
    return `${prefix}${pos}`;
  };
  const {
    preflopExercise, lastResult, sessionStats, isLoading, storeError,
    fetchPreflopExercise, checkPreflopAnswer, recordResult,
    setIsExercising, setCurrentPosition, setTrainerStarted, setSelectingPosition,
  } = useTrainingStore(useShallow(s => ({
    preflopExercise: s.preflopExercise, lastResult: s.lastResult, sessionStats: s.sessionStats, isLoading: s.isLoading, storeError: s.error,
    fetchPreflopExercise: s.fetchPreflopExercise, checkPreflopAnswer: s.checkPreflopAnswer, recordResult: s.recordResult,
    setIsExercising: s.setIsExercising, setCurrentPosition: s.setCurrentPosition, setTrainerStarted: s.setTrainerStarted, setSelectingPosition: s.setSelectingPosition,
  })));

  const [showIntro,        setShowIntro]        = useState(true);
  const [phase,            setPhase]            = useState<Phase>('select_position');
  const [selectedPosition, setSelectedPosition] = useState<Position8>('BTN');
  const [lockPosition,     setLockPosition]     = useState(false);
  const [randomMode,       setRandomMode]       = useState(false);
  const [rangeMatrix,      setRangeMatrix]      = useState<number[][] | null>(null);
  const [customMatrix,     setCustomMatrix]     = useState<number[][] | null>(null);
  /** Raw expert mix (flat 169×4) when the resolved range is an expert profile —
   *  rendered in the recap with the editor's stacked-bar scheme for consistency. */
  const [customMix,        setCustomMix]        = useState<number[] | null>(null);
  const [localResult,      setLocalResult]      = useState<ExerciseResult | null>(null);
  const [openAnswer,       setOpenAnswer]       = useState<'raise' | 'call' | 'fold' | null>(null);
  /** Exact action of the active custom simple range for the current open hand
   *  (raise/call/fold). null = no custom range → GTO 2-button (Fold/Raise) path. */
  const [openCustomAction, setOpenCustomAction] = useState<'raise' | 'call' | 'fold' | null>(null);
  /** Expert quiz verdict for the glanceable colored pills. */
  const [expertVerdict,    setExpertVerdict]    = useState<
    { action: number; userFreq: number; targetFreq: number; inRange: boolean; freqMatch: boolean } | null
  >(null);
  /** BB custom range: the resolved 5-category code (0-4) for the quizzed hand. */
  const [bbCustomCode,     setBbCustomCode]     = useState<number | null>(null);
  const [showRange,        setShowRange]        = useState(false);
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
  const isPremium = true;
  const preflopEnabled = useCustomRangeStore(s => s.preflopEnabled);
  const setPreflopEnabled = useCustomRangeStore(s => s.setPreflopEnabled);

  // Expert exam: the user must pick which complex (expert) profile to be quizzed
  // on before the run can start — a GTO-only expert exam has no point.
  const [examPickerOpen,    setExamPickerOpen]    = useState(false);
  const [examProfiles,      setExamProfiles]      = useState<RangeProfile[] | null>(null);

  // Advanced+premium: before starting, pick GTO or custom ranges.
  const [rangePickerOpen,   setRangePickerOpen]   = useState(false);

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

  // Expert quiz: when an exercise loads in expert mode, try to resolve an active
  // custom expert profile ("Mes ranges" on) for the full 4-action mix + recap.
  // Falls back to a synthesized Fold/Raise-only mix from the standard GTO open
  // frequency when no custom profile is active — so Expert always gets the
  // action+frequency quiz, not just when the user configured custom ranges.
  // Applies to both the open exercise and BB defense (custom-profile path only).
  useEffect(() => {
    let cancelled = false;
    const notation = isBBSession ? bbExercise?.notation : preflopExercise?.notation;
    const position = isBBSession ? 'BB' : preflopExercise?.position;
    (async () => {
      if (phase !== 'exercise' || mode !== 'expert' || !notation || !position) {
        return;
      }
      if (preflopEnabled) {
        try {
          const resolved = await profilesApi.resolve(rangeKey(position), heroStack);
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
            return;
          }
        } catch { /* fall through to the default GTO mix below */ }
        if (cancelled) return;
      }
      // Default: no custom expert profile active — quiz on the standard GTO
      // open frequency instead (Fold/Raise only; Call/All-in stay at 0%).
      if (!isBBSession && preflopExercise) {
        const freq = preflopExercise.correctFrequency ?? (preflopExercise.correctAction === 'raise' ? 1 : 0);
        setCustomMix(null);
        setExpertTarget([Math.max(0, 1 - freq), 0, freq, 0]);
        setResolvedLabel(null);
      } else {
        setExpertTarget(null);
      }
    })();
    return () => { cancelled = true; };
  }, [phase, isBBSession, mode, preflopEnabled, preflopExercise, bbExercise, heroStack]);

  // Advanced + custom simple range active: resolve the active OPEN range for the
  // current hand so the decision UI can offer the EXACT action (Fold/Call/Raise) —
  // "the range is king". null → no custom range, fall back to GTO Fold/Raise.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (phase !== 'exercise' || isBBSession || mode !== 'advanced' || !preflopEnabled || !preflopExercise) {
        setOpenCustomAction(null);
        return;
      }
      try {
        const resolved = await profilesApi.resolve(rangeKey(preflopExercise.position), heroStack, true);
        const play = resolved?.cells ? toPlayFrequencies(resolved.cells) : null;
        if (cancelled) return;
        if (!play) { setOpenCustomAction(null); return; }
        const [row, col] = getMatrixIndices(preflopExercise.notation);
        const v = play[row * 13 + col] ?? 0;
        // Same thresholds as the simple RangeEditor: ≥0.8 Raise, 0<v<0.8 Call, ≤0 Fold.
        setOpenCustomAction(v >= 0.8 ? 'raise' : v <= 0 ? 'fold' : 'call');
      } catch { if (!cancelled) setOpenCustomAction(null); }
    })();
    return () => { cancelled = true; };
  }, [phase, isBBSession, mode, preflopEnabled, preflopExercise, heroStack]);

  // Reset on unmount (module change)
  useEffect(() => () => { setIsExercising(false); setCurrentPosition(null); setSelectingPosition(false); }, []);

  // Fixed back bar (from TrainingPage) dispatches 'training:back' while exercising
  useEffect(() => {
    const onBack = () => { setShowIntro(true); setTrainerStarted(false); };
    window.addEventListener('training:back', onBack);
    return () => window.removeEventListener('training:back', onBack);
  }, []);

  // Exam (sprint) mode: random-position loop until 3 errors; score = correct.
  // Each of the 4 combos (CG/MTT × 6-max/8-max) has its own exam record.
  const examModule = isHU
    ? (isMTT ? 'preflop-mtt-hu'   : 'preflop-hu')
    : is3max
    ? (isMTT ? 'preflop-mtt-3max' : 'preflop-3max')
    : is8
    ? (isMTT ? 'preflop8-mtt'     : 'preflop8')
    : (isMTT ? 'preflop-mtt'      : 'preflop');
  const { examActive, examFinished, startRun, quitRun, recordAnswer } = useExamRunner(examModule);

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

  const ALL_POSITIONS: Position8[] = isHU
    ? ['BTN', 'BB']
    : is3max
    ? ['BTN', 'SB', 'BB']
    : is8
    ? ['UTG', 'UTG1', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB']
    : ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'];

  const pickAndStart = async (pos: Position8) => {
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
      await fetchPreflopExercise(pos, format, gameType);
    }
  };

  // ─── handleStart ──────────────────────────────────────────────────────────────

  const handleStart = async (pos?: Position8) => {
    quitRun();              // clear any leftover exam state — normal mode never shows the lives HUD / auto-advance
    resetExerciseState();
    setPhase('exercise');
    await pickAndStart(pos ?? selectedPosition);
  };

  const handleStartExam = async () => {
    startRun();
    resetExerciseState();
    setShowIntro(false);
    setTrainerStarted(true);
    setRandomMode(true);   // rotate every position (BB included) across the run
    setPhase('exercise');
    await pickAndStart(ALL_POSITIONS[Math.floor(Math.random() * ALL_POSITIONS.length)]);
  };

  const handleQuitExam = () => {
    quitRun();
    setRandomMode(false);
    setIsBBSession(false);
    setExamPickerOpen(false);
    setShowIntro(true);
    setTrainerStarted(false);
    setPhase('select_position');
  };

  // Exam launch entry point (from the intro). In expert mode the user must first
  // pick a complex range profile; other modes start straight away.
  const requestExam = async () => {
    if (mode !== 'expert') { handleStartExam(); return; }
    setExamProfiles(null);          // null = loading
    setExamPickerOpen(true);
    try {
      const all = await profilesApi.list();
      setExamProfiles(all.filter(p => p.mode === 'expert'));
    } catch {
      setExamProfiles([]);
    }
  };

  // Start an expert exam quizzed on the chosen complex profile.
  const startExamWithProfile = async (profileId: string) => {
    try { await profilesApi.activate(profileId); } catch { /* ignore */ }
    setPreflopEnabled(true);        // the run must score against the chosen range
    setExamPickerOpen(false);
    handleStartExam();
  };

  // ─── handleAnswer (preflop open) ──────────────────────────────────────────────

  const handleAnswer = async (action: 'raise' | 'call' | 'fold') => {
    if (!preflopExercise) return;
    const timeTaken = Date.now() - startTime.current;
    setOpenAnswer(action);
    let openCorrect: boolean | null = null;

    // Beginner = GTO only. Custom ranges apply from Advanced upward.
    if (preflopEnabled && mode !== 'basic') {
      let flat: number[] | null = null;
      let rangeLabel: string | undefined;

      try {
        const resolved = await profilesApi.resolve(rangeKey(preflopExercise.position), heroStack, mode !== 'expert');
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
        // The range is king: ≥0.8 = Raise, 0<v<0.8 = Call (limp), ≤0 = Fold.
        // The exact action is the ONLY correct answer — no mixed acceptance.
        const correctAction: 'raise' | 'call' | 'fold' =
          cellVal >= 0.8 ? 'raise' : cellVal <= 0 ? 'fold' : 'call';
        const isCorrect = action === correctAction;
        openCorrect = isCorrect;
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
        const r = await checkPreflopAnswer(action, timeTaken, format, gameType);
        openCorrect = r.isCorrect;
        try {
          const data = await trainingApi.getRangeMatrix(preflopExercise.position, format, gameType);
          setRangeMatrix(data.matrix);
        } catch { /* ignore */ }
      }
    } else {
      const r = await checkPreflopAnswer(action, timeTaken, format, gameType);
      openCorrect = r.isCorrect;
      try {
        const data = await trainingApi.getRangeMatrix(preflopExercise.position, format, gameType);
        setRangeMatrix(data.matrix);
      } catch { /* ignore */ }
    }
    setPhase('result');
    if (examActive && openCorrect !== null)
      recordAnswer(openCorrect, handleNext, 1400, `${preflopExercise.notation} — ${preflopExercise.position}`);
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
    if (examActive) recordAnswer(isCorrect, handleNext, 1400, `${notation} — ${position}`);
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
    if (preflopEnabled && mode !== 'basic') {
      let flat: number[] | null = null;
      let label: string | null = null;

      try {
        const resolved = await profilesApi.resolve(rangeKey('BB'), heroStack, mode !== 'expert');
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
    if (examActive) recordAnswer(isCorrect, handleNext, 1400, `${bbExercise.notation} — BB`);
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
    if (examActive) recordAnswer(isCorrect, handleNext, 1400, `${bbExercise.notation} — BB`);
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
      await fetchPreflopExercise(lockPosition ? selectedPosition : undefined, format, gameType);
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

  // Expert 2-step quiz active: expert mode + a target mix resolved — a custom
  // expert profile for BB defense (only path there), or for the open exercise
  // either a custom profile ("Mes ranges" on) or the default GTO fallback mix.
  const isExpertQuiz = mode === 'expert' && !!expertTarget;

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

  // Deux pills côte à côte : type de jeu | nombre de joueurs.
  const renderFormatToggle = () => (
    <div className="flex items-center gap-2 flex-wrap justify-center">
      {/* Pill 1 — Type de jeu */}
      <div className="flex items-center gap-1 p-1 rounded-xl border border-gray-700 bg-gray-900/60">
        <button
          title={isEn ? 'Cash game — no antes, pure chip EV, 100bb effective' : 'Cash game — sans antes, EV chips pure, 100bb effectifs'}
          onClick={() => setGameType('cashgame')}
          className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors ${
            gameType === 'cashgame'
              ? 'bg-felt-700 text-white shadow-glow-green border border-felt-500'
              : 'text-gray-400 hover:text-white hover:bg-gray-800'
          }`}
        >
          Cash Game
        </button>
        <button
          title={isEn ? 'Tournament — antes ~12.5%, ICM pressure, wider ranges' : 'Tournoi — antes ~12.5%, pression ICM, ranges plus larges'}
          onClick={() => setGameType('mtt')}
          className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors ${
            gameType === 'mtt'
              ? 'bg-amber-700 text-white shadow border border-amber-600'
              : 'text-gray-400 hover:text-white hover:bg-gray-800'
          }`}
        >
          MTT
        </button>
      </div>
      {/* Pill 2 — Nombre de joueurs */}
      <div className="flex items-center gap-1 p-1 rounded-xl border border-gray-700 bg-gray-900/60">
        {([
          { f: '6max' as TableFormat, label: '6-max', title: isEn ? '6 players at the table' : '6 joueurs à la table',                                                    activeCls: 'bg-blue-700 text-white border border-blue-500' },
          { f: '8max' as TableFormat, label: '8-max', title: isEn ? '8 players — full-ring (UTG, UTG+1, LJ added)' : '8 joueurs — full-ring (UTG, UTG+1, LJ ajoutés)',    activeCls: 'bg-violet-700 text-white border border-violet-500' },
          { f: '3max' as TableFormat, label: '3-max', title: isEn ? '3 players — BTN, SB, BB only' : '3 joueurs — BTN, SB, BB uniquement',                                activeCls: 'bg-amber-600 text-white border border-amber-500' },
          { f: 'hu'   as TableFormat, label: 'HU',    title: isEn ? 'Heads-up — BTN vs BB' : 'Têtes-à-têtes — BTN vs BB',                                                 activeCls: 'bg-rose-700 text-white border border-rose-500' },
        ] as const).map(({ f, label, title, activeCls }) => (
          <button
            key={f}
            title={title}
            onClick={() => {
              setFormat(f);
              const validPositions: Record<TableFormat, string[]> = {
                '6max': ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'],
                '8max': ['UTG', 'UTG1', 'LJ', 'HJ', 'CO', 'BTN', 'SB'],
                '3max': ['BTN', 'SB', 'BB'],
                'hu':   ['BTN', 'BB'],
              };
              if (!validPositions[f].includes(selectedPosition)) setSelectedPosition('BTN');
            }}
            className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${
              format === f
                ? activeCls
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );

  if (showIntro) {
    const startTraining = () => { setShowIntro(false); setTrainerStarted(true); };
    const handleStartClick = () => {
      // Advanced + premium: pick GTO vs custom ranges before starting (both formats).
      if (mode === 'advanced' && isPremium) {
        setRangePickerOpen(true);
      } else {
        startTraining();
      }
    };

    return (
      <div className="flex flex-col gap-3 sm:gap-4 max-w-2xl mx-auto">
        <TrainerIntro
          emoji="🎯"
          title={(() => {
            const gt = isMTT ? 'MTT' : 'Cash Game';
            const fmt = isHU ? 'HU' : is3max ? '3-max' : is8 ? '8-max' : '6-max';
            return isEn
              ? `Pre-flop Trainer — GTO ${gt} ${fmt}`
              : `Entraîneur Pré-flop — GTO ${gt} ${fmt}`;
          })()}
          description={(() => {
            if (isHU)   return isEn
              ? `Master heads-up opening decisions based on GTO ${isMTT ? 'MTT' : 'Cash Game'} HU ranges (100bb${isMTT ? ', antes' : ', no antes'}).`
              : `Maîtrisez les décisions d'ouverture en tête-à-tête selon les ranges GTO ${isMTT ? 'MTT' : 'Cash Game'} HU (100bb${isMTT ? ', antes' : ', sans antes'}).`;
            if (is3max) return isEn
              ? `Master opening decisions in 3-handed play based on GTO ${isMTT ? 'MTT' : 'Cash Game'} 3-max ranges (100bb${isMTT ? ', antes' : ', no antes'}).`
              : `Maîtrisez les décisions d'ouverture en jeu 3-max selon les ranges GTO ${isMTT ? 'MTT' : 'Cash Game'} 3-max (100bb${isMTT ? ', antes' : ', sans antes'}).`;
            if (is8)    return isEn
              ? `Master opening decisions for an 8-handed table (UTG, UTG+1, LJ added) based on GTO Wizard ${isMTT ? 'MTT' : 'Cash Game'} 8-max ranges (100bb${isMTT ? ', antes' : ', no antes'}).`
              : `Maîtrisez les décisions d'ouverture sur une table 8 joueurs (UTG, UTG+1, LJ ajoutés) selon les ranges GTO Wizard ${isMTT ? 'MTT' : 'Cash Game'} 8-max (100bb${isMTT ? ', antes' : ', sans antes'}).`;
            return isEn
              ? `Master opening decisions and BB defense based on GTO Wizard ${isMTT ? 'MTT' : 'Cash Game'} 6-max ranges (100bb${isMTT ? ', antes ~12.5%' : ', no antes'}).`
              : `Maîtrisez les décisions d'ouverture et la défense BB selon les ranges GTO Wizard ${isMTT ? 'MTT' : 'Cash Game'} 6-max (100bb${isMTT ? ', antes ~12.5%' : ', sans antes'}).`;
          })()}
          whatTitle={isEn ? "What is pre-flop play?" : "Qu'est-ce que le jeu pré-flop ?"}
          whatContent={(() => {
            const m = isMTT ? 5 : 0;
            const gridCls = is3max ? 'grid grid-cols-3 gap-1.5' : 'grid grid-cols-2 gap-1.5';
            const cards = isHU ? [
              { icon: <Zap size={11}/>, iconBg:'bg-green-900/40 text-green-400', border:'border-green-900/50', bg:'bg-green-950/20',
                label:'BTN', sub:isEn?'Act first':'Agir en premier',
                desc:isEn?`Very wide — ${55+m}–${65+m}%`:`Très large — ${55+m}–${65+m}%`, pct:60+m, bar:'bg-green-500' },
              { icon: <Shield size={11}/>, iconBg:'bg-blue-900/40 text-blue-400', border:'border-blue-900/50', bg:'bg-blue-950/20',
                label:'BB', sub:isEn?'Defend wide':'Défense large',
                desc:isEn?`Defend — ${42+m}–${60+m}%`:`Défense — ${42+m}–${60+m}%`, pct:52+m, bar:'bg-blue-500' },
            ] : is3max ? [
              { icon: <Zap size={11}/>, iconBg:'bg-green-900/40 text-green-400', border:'border-green-900/50', bg:'bg-green-950/20',
                label:'BTN', sub:isEn?'Steal wide':'Steal large',
                desc:`${45+m}–${55+m}%`, pct:50+m, bar:'bg-green-500' },
              { icon: <TrendingUp size={11}/>, iconBg:'bg-yellow-900/40 text-yellow-400', border:'border-yellow-900/50', bg:'bg-yellow-950/20',
                label:'SB', sub:isEn?'Steal or fold':'Steal ou fold',
                desc:`${35+m}–${45+m}%`, pct:40+m, bar:'bg-yellow-500' },
              { icon: <Shield size={11}/>, iconBg:'bg-blue-900/40 text-blue-400', border:'border-blue-900/50', bg:'bg-blue-950/20',
                label:'BB', sub:isEn?'Wide defense':'Défense large',
                desc:`${45+m}–${62+m}%`, pct:53+m, bar:'bg-blue-500' },
            ] : is8 ? [
              { icon: <Target size={11}/>, iconBg:'bg-red-900/40 text-red-400', border:'border-red-900/50', bg:'bg-red-950/20',
                label:'UTG · UTG1 · LJ', sub:isEn?'Early — very tight':'Early — très serré',
                desc:`${12+m}–${18+m}%`, pct:15+m, bar:'bg-red-500' },
              { icon: <Zap size={11}/>, iconBg:'bg-orange-900/40 text-orange-400', border:'border-orange-900/50', bg:'bg-orange-950/20',
                label:'HJ · CO', sub:isEn?'Mid/Late':'Mi-position',
                desc:`${22+m}–${35+m}%`, pct:28+m, bar:'bg-orange-500' },
              { icon: <TrendingUp size={11}/>, iconBg:'bg-green-900/40 text-green-400', border:'border-green-900/50', bg:'bg-green-950/20',
                label:'BTN', sub:isEn?'Best position':'Meilleure pos.',
                desc:`${45+m}–${55+m}%`, pct:50+m, bar:'bg-green-500' },
              { icon: <Shield size={11}/>, iconBg:'bg-blue-900/40 text-blue-400', border:'border-blue-900/50', bg:'bg-blue-950/20',
                label:'SB · BB', sub:isEn?'Blinds':'Blindes',
                desc:`${28+m}–${50+m}%`, pct:38+m, bar:'bg-blue-500' },
            ] : [
              { icon: <Target size={11}/>, iconBg:'bg-red-900/40 text-red-400', border:'border-red-900/50', bg:'bg-red-950/20',
                label:'UTG · HJ', sub:isEn?'Early — tight':'Early — serré',
                desc:`${15+m}–${22+m}%`, pct:20+m, bar:'bg-red-500' },
              { icon: <Zap size={11}/>, iconBg:'bg-green-900/40 text-green-400', border:'border-green-900/50', bg:'bg-green-950/20',
                label:'CO · BTN', sub:isEn?'Late — wide':'Late — large',
                desc:`${30+m}–${55+m}%`, pct:45+m, bar:'bg-green-500' },
              { icon: <TrendingUp size={11}/>, iconBg:'bg-yellow-900/40 text-yellow-400', border:'border-yellow-900/50', bg:'bg-yellow-950/20',
                label:'SB', sub:isEn?'Steal or fold':'Steal ou fold',
                desc:`${25+m}–${35+m}%`, pct:30+m, bar:'bg-yellow-500' },
              { icon: <Shield size={11}/>, iconBg:'bg-blue-900/40 text-blue-400', border:'border-blue-900/50', bg:'bg-blue-950/20',
                label:'BB', sub:isEn?'Wide defense':'Défense large',
                desc:`${40+m}–${55+m}%`, pct:50+m, bar:'bg-blue-500' },
            ];
            return (
              <>
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                    {isHU ? 'Heads-Up' : is3max ? '3-max' : is8 ? '8-max' : '6-max'}
                  </span>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${isMTT ? 'bg-purple-900/40 text-purple-300' : 'bg-yellow-900/40 text-yellow-300'}`}>
                    {isMTT ? 'MTT' : 'Cash Game'}
                  </span>
                  {isMTT && <span className="text-[9px] text-gray-500">{isEn ? '· antes widen ranges' : '· antes élargissent les ranges'}</span>}
                </div>
                <div className={gridCls}>
                  {cards.map(p => (
                    <div key={p.label} className={`rounded-lg border px-1.5 py-1 overflow-hidden flex flex-col justify-between ${p.border} ${p.bg}`} style={{ height: '52px' }}>
                      <div className="flex items-center gap-1">
                        <span className={`grid place-items-center w-4 h-4 rounded ${p.iconBg} shrink-0`}>{p.icon}</span>
                        <div className="min-w-0">
                          <div className="text-white font-bold text-[10px] leading-none truncate">{p.label}</div>
                          <div className="text-gray-500 text-[9px] leading-none mt-0.5 truncate">{p.sub}</div>
                        </div>
                      </div>
                      <div className="text-[9px] text-gray-400 leading-none truncate">{p.desc}</div>
                      <div className="h-0.5 bg-gray-800 rounded-full overflow-hidden">
                        <div className={`h-full ${p.bar} rounded-full opacity-80`} style={{ width: `${Math.min(p.pct, 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            );
          })()}
          steps={(() => {
            const gt = isMTT ? 'MTT' : 'Cash Game';
            if (isHU)   return isEn ? [
              '🎯 Choose BTN or BB in heads-up',
              '🃏 Receive 2 random hole cards',
              `♠️ Raise or Fold according to GTO ${gt} HU ranges`,
              '📊 The range matrix shows the correct hands',
            ] : [
              '🎯 Choisissez BTN ou BB en têtes-à-têtes',
              '🃏 Recevez 2 cartes en main aléatoires',
              `♠️ Raise ou Fold selon les ranges GTO ${gt} HU`,
              '📊 La matrice de ranges vous montre les bonnes mains',
            ];
            if (is3max) return isEn ? [
              '🎯 Choose your seat on the 3-handed table (BTN, SB, BB)',
              '🃏 Receive 2 random hole cards',
              `♠️ Raise or Fold according to GTO ${gt} 3-max ranges`,
              '📊 The range matrix shows the correct hands for each position',
            ] : [
              '🎯 Choisissez votre place sur la table 3-max (BTN, SB, BB)',
              '🃏 Recevez 2 cartes en main aléatoires',
              `♠️ Raise ou Fold selon les ranges GTO ${gt} 3-max`,
              '📊 La matrice de ranges vous montre les bonnes mains pour chaque position',
            ];
            if (is8)    return isEn ? [
              '🎯 Choose your seat on the 8-handed table (UTG → BB)',
              '🃏 Receive 2 random hole cards',
              `♠️ Raise or Fold according to GTO Wizard ${gt} 8-max ranges`,
              '📊 The range matrix shows the correct hands for each position',
            ] : [
              '🎯 Choisissez votre place sur la table 8 joueurs (UTG → BB)',
              '🃏 Recevez 2 cartes en main aléatoires',
              `♠️ Raise ou Fold selon les ranges GTO Wizard ${gt} 8-max`,
              '📊 La matrice de ranges vous montre les bonnes mains pour chaque position',
            ];
            return isEn ? [
              '🎯 Choose your position on the interactive poker table',
              '🃏 Receive 2 random hole cards',
              `♠️ Open positions: Raise or Fold according to GTO Wizard ${gt} 6-max ranges`,
              '🛡️ BB position: Fold, Call or 3-Bet facing a raise',
              '📊 The range matrix shows the correct hands for each position',
            ] : [
              '🎯 Choisissez votre position sur la table de poker interactive',
              '🃏 Recevez 2 cartes en main aléatoires',
              `♠️ Positions ouvertes : Raise ou Fold selon les ranges GTO Wizard ${gt} 6-max`,
              '🛡️ Position BB : Fold, Call ou 3-Bet face à une relance',
              '📊 La matrice de ranges vous montre les bonnes mains pour chaque position',
            ];
          })()}
          beginnerHint={isEn ? "Shows range frequency & hand context" : "Affiche la fréquence de range & contexte"}
          advancedHint={isEn ? "No hints — play by intuition & memory. Your simple ranges from My Ranges are used if enabled." : "Sans indices — jouez à l'intuition & mémoire. Vos ranges simples de Mes Ranges sont utilisées si activées."}
          expertHint={isEn ? "Quizzed on your complex ranges from My Ranges: pick the action (Fold/Call/Raise/All-in) then its exact frequency. No hints, no time to think." : "Interrogé sur tes ranges complexes de Mes Ranges : choisis l'action (Fold/Call/Raise/All-in) puis sa fréquence exacte. Aucun indice, pas le temps de réfléchir."}
          startLabel={isEn ? 'Start Training' : "Commencer l'entraînement"}
          onStart={handleStartClick}
          mode={mode}
          aboveActionsSlot={renderFormatToggle()}
          examSlot={mode !== 'basic' ? <ExamLauncher module={examModule} onStart={requestExam} /> : undefined}
          bottomSlot={
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('training:open-ranges', { detail: { format, gameType } }))}
              className="flex items-center gap-2 w-full px-4 py-2.5 rounded-xl border border-purple-800/50 bg-purple-950/20 hover:bg-purple-900/30 text-purple-300 hover:text-purple-200 font-semibold text-xs transition-colors"
            >
              <BookOpen size={13} className="text-purple-400 shrink-0" />
              {isEn ? 'My Ranges' : 'Mes ranges'}
            </button>
          }
        />
        {examPickerOpen && (
          <ExpertExamProfilePicker
            profiles={examProfiles}
            isEn={isEn}
            onPick={startExamWithProfile}
            onClose={() => setExamPickerOpen(false)}
            onCreate={() => { setExamPickerOpen(false); window.dispatchEvent(new CustomEvent('training:open-ranges', { detail: { format, gameType } })); }}
          />
        )}
        {rangePickerOpen && (
          <AdvancedRangePicker
            isEn={isEn}
            onPick={(useCustom) => {
              setPreflopEnabled(useCustom);
              setRangePickerOpen(false);
              startTraining();
            }}
            onClose={() => setRangePickerOpen(false)}
          />
        )}
      </div>
    );
  }

  if (examFinished) {
    return (
      <div className="flex flex-col gap-6 max-w-2xl mx-auto pt-4">
        <ExamResult module={examModule} onRetry={handleStartExam} onQuit={handleQuitExam} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 sm:gap-3 max-w-2xl mx-auto">

      {/* ── Persistent header (lives HUD during an exam) ── */}
      {examActive ? <ExamHud onQuit={handleQuitExam} /> : phase === 'select_position' ? (
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-0.5 sm:mb-1">{t.training.preflop_title}</h2>
        <p className="text-gray-400 text-xs sm:text-sm">{t.training.preflop_subtitle}</p>
      </div>
      ) : null}

      {/* ── PHASE: Position selection ── */}
      {phase === 'select_position' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-4 sm:gap-6"
        >

          {/* 6-max / 8-max selector */}
          {renderFormatToggle()}

          {/* Interactive poker table — compact on mobile */}
          <div className="w-full max-w-xs sm:max-w-xl">
            <PokerTable
              heroPosition={selectedPosition}
              format={format}
              onPositionChange={pos => { if (is8 && pos === 'BB') return; setSelectedPosition(pos); }}
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
            <PositionInfo position={selectedPosition} format={format} />
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
              className="flex flex-col items-center gap-2 sm:gap-3"
            >
              {bbIsLoading || !bbExercise ? (
                <Spinner />
              ) : (
                <>
                  <div className="w-full max-w-[260px] sm:max-w-sm mx-auto">
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
                  <div className="w-full max-w-xs sm:max-w-sm rounded-2xl border border-gray-700/60 bg-gray-900/50 px-4 py-2 flex flex-col items-center gap-1">
                    <Hand cards={bbExercise.hand as CardStr[]} size="sm" gap="gap-3" animate={false} />
                    <div className="flex items-center gap-2 flex-wrap justify-center">
                      <span className="text-gray-400 text-sm">BB</span>
                      <PositionInfo position="BB" format={format} />
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
                          {mode === 'basic' ? 'Raise' : '3-Bet'}
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
              className="flex flex-col items-center gap-2 sm:gap-3"
            >
              {isLoading ? (
                <Spinner />
              ) : !preflopExercise ? (
                <div className="flex flex-col items-center gap-4 py-8 text-center">
                  <p className="text-red-400 text-sm">{storeError ?? (isEn ? 'Failed to load exercise' : 'Impossible de charger l\'exercice')}</p>
                  <Button variant="secondary" onClick={() => fetchPreflopExercise(selectedPosition, format)}>
                    {isEn ? 'Retry' : 'Réessayer'}
                  </Button>
                </div>
              ) : (
                <>
                  <div className="w-full max-w-[260px] sm:max-w-sm mx-auto">
                    <PokerTable
                      heroPosition={preflopExercise.position}
                      format={format}
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
                  <div className="w-full max-w-xs sm:max-w-sm rounded-2xl border border-gray-700/60 bg-gray-900/50 px-4 py-2 flex flex-col items-center gap-1">
                    <Hand cards={preflopExercise.hand as CardStr[]} size="sm" gap="gap-3" animate={false} />
                    {preflopEnabled && mode === 'expert' && (
                      <span className="text-gold-400 text-xs font-semibold">{heroStack} bb</span>
                    )}
                    <div className="flex items-center gap-2 flex-wrap justify-center">
                      <span className="text-gray-400 text-sm">{t.training.position_lbl}</span>
                      <span className="font-bold text-white text-lg">{preflopExercise.position}</span>
                      <PositionInfo position={preflopExercise.position} format={format} />
                      <span className="text-gold-400 font-mono font-bold text-lg">
                        {handToDisplay(preflopExercise.notation)}
                      </span>
                      <span className="text-gray-500 text-xs">— {t.training.facing}</span>
                    </div>
                  </div>

                  {isExpertQuiz ? renderExpertQuiz() : openCustomAction !== null ? (
                  // Custom simple range active → offer the exact 3 actions; colors
                  // match the verdict pills (Raise green · Call gold · Fold red).
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="flex gap-2 sm:gap-4 w-full sm:w-auto"
                  >
                    <Button size="xl" variant="danger" onClick={() => handleAnswer('fold')} className="flex-1 sm:flex-none sm:min-w-[110px]">
                      Fold
                    </Button>
                    <Button size="xl" variant="gold" onClick={() => handleAnswer('call')} className="flex-1 sm:flex-none sm:min-w-[110px]">
                      Call
                    </Button>
                    <Button size="xl" variant="primary" onClick={() => handleAnswer('raise')} className="flex-1 sm:flex-none sm:min-w-[110px]">
                      Raise
                    </Button>
                  </motion.div>
                  ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="flex gap-2 sm:gap-4 w-full sm:w-auto"
                  >
                    <Button size="xl" variant="danger" onClick={() => handleAnswer('fold')} className="flex-1 sm:flex-none sm:min-w-[110px]">
                      Fold
                    </Button>
                    <Button size="xl" variant="gold" onClick={() => handleAnswer('call')} className="flex-1 sm:flex-none sm:min-w-[110px]">
                      Call
                    </Button>
                    <Button size="xl" variant="primary" onClick={() => handleAnswer('raise')} className="flex-1 sm:flex-none sm:min-w-[110px]">
                      Raise
                    </Button>
                  </motion.div>
                  )}

                  {/* Guidance below the buttons — no scrolling needed to answer. */}
                  <BeginnerGuide
                    title={isEn ? 'What you must do' : 'Ce qu\'on te demande'}
                    text={isEn
                      ? `Nobody has played yet — it's your turn to open. You are sitting at **${preflopExercise.position}** and you got **${handToDisplay(preflopExercise.notation)}**.\nYou have 3 choices:\n🚀 **Raise** = strong hand, you open with a raise.\n📞 **Call** = borderline hand, you limp in (mixed play).\n🚫 **Fold** = weak hand, you throw it away.\n👉 Tip: the **earlier** you speak (UTG, HJ), the **stronger** your hand must be. The **later** you speak (CO, BTN), the **more** hands you can play.`
                      : `Personne n'a encore joué — c'est à toi d'ouvrir. Tu es assis en **${preflopExercise.position}** et tu as reçu **${handToDisplay(preflopExercise.notation)}**.\nTu as 3 choix :\n🚀 **Raise** = main forte, tu ouvres avec une mise.\n📞 **Call** = main limite, tu entres passivement (jeu mixte).\n🚫 **Fold** = main trop faible, tu la jettes.\n👉 Astuce : plus tu parles **tôt** (UTG, HJ), plus ta main doit être **forte**. Plus tu parles **tard** (CO, BTN), plus tu peux jouer de mains.`}
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
              )}
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
                    <span
                      className="px-3 py-1.5 rounded-full border border-black/30 text-xs font-bold text-white"
                      style={{ backgroundColor: bbCellColor(bbCustomCode ?? 0) }}
                    >
                      {isEn ? 'Your range' : 'Ta range'} : <strong>{({
                        0: t.training.bb_leg_fold, 1: t.training.bb_leg_call,
                        2: t.training.bb_leg_call, 3: t.training.bb_leg_value, 4: t.training.bb_leg_bluff,
                      } as Record<number, string>)[bbCustomCode ?? 0]}</strong>
                    </span>
                    {bbSelected && (
                      <span className={`px-3 py-1.5 rounded-full border text-xs font-bold ${localResult.isCorrect ? 'border-green-700 text-green-300 bg-green-900/20' : 'border-red-700 text-red-300 bg-red-900/20'}`}>
                        {isEn ? 'Your action' : 'Ton action'} : <strong>{
                          bbSelected === '3bet' && mode === 'basic' ? 'Raise' : bbSelected
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
                          : bbSelected === '3bet' && mode === 'basic' ? 'Raise'
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

              {/* Navigation + stats — hidden during an exam (auto-advances) */}
              {!examActive && (<>
              <div className="flex flex-col gap-3 w-full max-w-xs">
                <Button size="lg" variant="gold" onClick={handleNext} fullWidth>
                  {t.training.next_hand} <ChevronRight size={18} className="inline" />
                </Button>
                <Button size="sm" variant="ghost" onClick={handleChangePosition} fullWidth>
                  <RotateCcw size={14} className="inline mr-1" /> {t.training.change_pos}
                </Button>
              </div>
              <SessionStatsBar
                total={sessionStats.total}
                correct={sessionStats.correct}
                xp={sessionStats.xp}
              />
              </>)}

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
              {!isExpertQuiz && (() => {
                // Mixed-frequency hand (e.g. QJo @ HJ): GTO splits between raise & fold,
                // so BOTH answers score as correct. Make that explicit instead of just
                // showing "Bon coup : Raise" (which looks wrong after a correct Fold).
                const raisePct = Math.round((result.frequency ?? 0) * 100);
                const foldPct = 100 - raisePct;
                return (
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="flex gap-2 flex-wrap justify-center">
                      {result.isMixed ? (
                        <span className="px-3 py-1.5 rounded-full border text-sm font-bold border-amber-600 text-amber-200 bg-amber-900/25">
                          {isEn ? 'Mixed hand' : 'Main mixte'} : <strong>Raise {raisePct}%</strong> · <strong>Fold {foldPct}%</strong>
                        </span>
                      ) : (
                        <span className={`px-3 py-1.5 rounded-full border text-sm font-bold ${OPEN_ACTION_PILL[result.correctAction] ?? OPEN_ACTION_PILL.fold}`}>
                          {isEn ? 'Correct' : 'Bon coup'} : <strong>{openActionLabel(result.correctAction)}</strong>
                        </span>
                      )}
                      {openAnswer && !result.isCorrect && (
                        <span className="px-3 py-1.5 rounded-full border text-sm font-bold border-red-700 text-red-300 bg-red-900/20">
                          {isEn ? 'Your choice' : 'Ton choix'} : <strong>{openActionLabel(openAnswer)}</strong>
                        </span>
                      )}
                    </div>
                    {result.isMixed && (
                      <p className="text-[11px] text-amber-300/80 text-center max-w-xs leading-snug">
                        {isEn
                          ? 'This hand is played at a split frequency — both Raise and Fold are acceptable here.'
                          : 'Cette main se joue à fréquence mixte — Raise et Fold sont tous deux acceptables ici.'}
                      </p>
                    )}
                  </div>
                );
              })()}

              {/* Compact table recap */}
              <div className="flex flex-col sm:flex-row items-center gap-6 w-full">
                <div className="w-full max-w-[280px] shrink-0">
                  <PokerTable
                    heroPosition={preflopExercise.position}
                    format={format}
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

              {/* Navigation + stats — hidden during an exam (auto-advances) */}
              {!examActive && (<>
              <div className="flex flex-col gap-3 w-full max-w-xs">
                <Button size="lg" variant="gold" onClick={handleNext} fullWidth>
                  {t.training.next_hand} <ChevronRight size={18} className="inline" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setPhase('select_position')} fullWidth>
                  <RotateCcw size={14} className="inline mr-1" /> {t.training.change_pos}
                </Button>
              </div>
              <SessionStatsBar
                total={sessionStats.total}
                correct={sessionStats.correct}
                xp={sessionStats.xp}
              />
              </>)}

              {/* Expert quiz: visual mix bar of your range + your answer */}
              {isExpertQuiz && renderExpertMixBar()}

              {/* Explanation (beginner, or always in the expert quiz) */}
              <ExplanationPanel text={result.explanation} plain forceShow={isExpertQuiz} />

              {/* Range evaluation badge — custom profile vs default GTO fallback */}
              {isExpertQuiz && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-900/30 border border-purple-700/50 rounded-lg text-xs text-purple-300 w-full justify-center flex-wrap">
                  <Sliders size={12} />
                  <span>
                    {customMix
                      ? (isEn ? 'Evaluated against your custom range' : 'Évalué selon votre range personnalisée')
                      : (isEn ? 'Evaluated against the standard GTO frequency' : 'Évalué selon la fréquence GTO standard')}
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

      <SourcesFooter isEn={isEn} sources={PREFLOP_SOURCES} methodology={PREFLOP_METHODOLOGY} />
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

// ─── Expert exam: complex-range profile picker ────────────────────────────────
// Expert exams quiz the user on one of THEIR complex ranges — they must choose
// which profile before the run can start (a GTO-only expert exam is pointless).
function ExpertExamProfilePicker({ profiles, isEn, onPick, onClose, onCreate }: {
  profiles: RangeProfile[] | null;
  isEn: boolean;
  onPick: (id: string) => void;
  onClose: () => void;
  onCreate: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-gray-700 bg-gray-900 p-5 flex flex-col gap-4 max-h-[85vh]"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sliders size={18} className="text-purple-400 shrink-0" />
            <div>
              <h3 className="text-base font-bold text-white">
                {isEn ? 'Choose your complex range' : 'Choisis ta range complexe'}
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {isEn
                  ? 'The expert exam quizzes you on this range.'
                  : 'Le sprint expert t’interroge sur cette range.'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-1 shrink-0">
            <X size={18} />
          </button>
        </div>

        {profiles === null ? (
          <div className="flex items-center justify-center py-10">
            <div className="animate-spin h-6 w-6 border-2 border-purple-500 border-t-transparent rounded-full" />
          </div>
        ) : profiles.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <p className="text-sm text-gray-300">
              {isEn
                ? 'You have no complex range yet. Create one in My Ranges (Complex ranges) to start an expert exam.'
                : 'Tu n’as pas encore de range complexe. Crée-en une dans Mes Ranges (Ranges complexes) pour lancer un sprint expert.'}
            </p>
            <Button variant="gold" size="md" onClick={onCreate} className="flex items-center gap-2">
              <Sliders size={15} />
              {isEn ? 'Open My Ranges' : 'Ouvrir Mes Ranges'}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2 overflow-y-auto">
            {profiles.map(p => (
              <button
                key={p.id}
                onClick={() => onPick(p.id)}
                className="group flex items-center justify-between gap-3 rounded-xl border border-gray-700 bg-gray-800/50 px-4 py-3 hover:border-purple-600/70 hover:bg-gray-800 transition-colors text-left"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm truncate">{p.name}</span>
                    {p.isActive && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-900/40 text-green-300 border border-green-700/50 shrink-0">
                        {isEn ? 'Active' : 'Active'}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    {p.stackRanges.length} {isEn
                      ? `stack range${p.stackRanges.length > 1 ? 's' : ''}`
                      : `plage${p.stackRanges.length > 1 ? 's' : ''} de stack`}
                  </p>
                </div>
                <span className="flex items-center gap-1 text-xs font-bold text-purple-300 group-hover:text-purple-200 shrink-0">
                  <Target size={14} /> {isEn ? 'Start' : 'Lancer'}
                </span>
              </button>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── Position info badge ───────────────────────────────────────────────────────
function PositionInfo({ position, format = '6max' }: { position: Position8; format?: TableFormat }) {
  const isEn = useLangStore(s => s.lang) === 'en';
  const def = isEn ? 'Defend' : 'Défend';
  const ranges: Record<string, Partial<Record<Position8, string>>> = {
    '6max': { UTG: '~12%', HJ: '~20%', CO: '~26%', BTN: '~45%', SB: '~35%', BB: def },
    '8max': { UTG: '~11%', UTG1: '~13%', LJ: '~16%', HJ: '~18%', CO: '~26%', BTN: '~45%', SB: '~35%', BB: def },
    '3max': { BTN: '~75%', SB: '~58%', BB: def },
    'hu':   { BTN: '~83%', BB: def },
  };
  const label = ranges[format]?.[position] ?? '';
  return (
    <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">
      {label}
    </span>
  );
}
