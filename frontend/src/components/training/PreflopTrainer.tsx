import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronDown, ChevronUp, RotateCcw, Info, Zap, Target, Sliders } from 'lucide-react';
import { rangesApi, profilesApi } from '../../services/api';
import { useTrainingStore } from '../../store/trainingStore';
import { Position, ExerciseResult, BBDefenseExercise } from '../../types/poker';
import { trainingApi } from '../../services/api';
import { RangeMatrix } from '../poker/RangeMatrix';
import { PokerTable } from '../poker/PokerTable';
import { Hand } from '../poker/Card';
import { CardStr } from '../../types/poker';
import { Button } from '../ui/Button';
import { ProgressBar } from '../ui/ProgressBar';
import { SessionStatsBar } from '../ui/SessionStatsBar';
import { Spinner } from '../ui/Spinner';
import { ExplanationPanel } from '../ui/ExplanationPanel';
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

// ─── Shared range matrix collapsible section ──────────────────────────────────

interface RangeSectionProps {
  matrix: number[][] | null;
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

function RangeSection({ matrix, highlightNotation, position, isCustom, resolvedLabel, heroStack, isEn, showRange, setShowRange, t }: RangeSectionProps) {
  if (!matrix) return null;
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
              <span className="text-purple-600 font-normal text-xs">· {heroStack} bb</span>
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
            <RangeMatrix
              matrix={matrix}
              highlightNotation={highlightNotation}
              size="sm"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PreflopTrainer() {
  const t = useT();
  const isMobile = useIsMobile();
  const {
    preflopExercise, lastResult, sessionStats, isLoading,
    fetchPreflopExercise, checkPreflopAnswer, recordResult,
    setIsExercising, setCurrentPosition, setTrainerStarted,
  } = useTrainingStore();

  const [showIntro,        setShowIntro]        = useState(true);
  const [phase,            setPhase]            = useState<Phase>('select_position');
  const [selectedPosition, setSelectedPosition] = useState<Position>('BTN');
  const [lockPosition,     setLockPosition]     = useState(false);
  const [rangeMatrix,      setRangeMatrix]      = useState<number[][] | null>(null);
  const [customMatrix,     setCustomMatrix]     = useState<number[][] | null>(null);
  const [localResult,      setLocalResult]      = useState<ExerciseResult | null>(null);
  const [showRange,        setShowRange]        = useState(true);
  const [heroStack,        setHeroStack]        = useState<number>(() => Math.floor(Math.random() * 96) + 5);
  const [resolvedLabel,    setResolvedLabel]    = useState<string | null>(null);

  // ── BB defense mode ──────────────────────────────────────────────────────────
  const [isBBSession,  setIsBBSession]  = useState(false);
  const [bbExercise,   setBBExercise]   = useState<BBDefenseExercise | null>(null);
  const [bbSelected,   setBBSelected]   = useState<BBAction | null>(null);
  const [bbIsLoading,  setBBIsLoading]  = useState(false);

  const startTime = useRef<number>(Date.now());
  const mode = useModeStore(s => s.mode);
  const { preflopEnabled } = useCustomRangeStore();

  // ─── Sync phase/exercise → store ─────────────────────────────────────────────
  useEffect(() => {
    if (phase === 'result') window.scrollTo({ top: 0, behavior: 'smooth' });

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

  // Reset on unmount (module change)
  useEffect(() => () => { setIsExercising(false); setCurrentPosition(null); }, []);

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  const resetExerciseState = () => {
    setLocalResult(null);
    setCustomMatrix(null);
    setRangeMatrix(null);
    setResolvedLabel(null);
    setBBSelected(null);
    setShowRange(true);
    setHeroStack(Math.floor(Math.random() * 96) + 5);
  };

  // ─── handleStart ──────────────────────────────────────────────────────────────

  const handleStart = async (pos?: Position) => {
    const actualPos = pos ?? selectedPosition;
    resetExerciseState();
    setPhase('exercise');

    if (actualPos === 'BB') {
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
      await fetchPreflopExercise(actualPos);
    }
  };

  // ─── handleAnswer (preflop open) ──────────────────────────────────────────────

  const handleAnswer = async (action: 'raise' | 'fold') => {
    if (!preflopExercise) return;
    const timeTaken = Date.now() - startTime.current;

    if (preflopEnabled) {
      let flat: number[] | null = null;
      let rangeLabel: string | undefined;

      try {
        const resolved = await profilesApi.resolve(preflopExercise.position, heroStack);
        if (resolved?.cells && resolved.cells.length === 169) {
          flat = resolved.cells;
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
          explanation: isEn
            ? `${rangeLabel ? `[${rangeLabel}] ` : ''}Custom range: ${handToDisplay(preflopExercise.notation)} from ${preflopExercise.position} — correct action is ${correctAction}.`
            : `${rangeLabel ? `[${rangeLabel}] ` : ''}Range personnalisée : ${handToDisplay(preflopExercise.notation)} en ${preflopExercise.position} — action correcte : ${correctAction === 'raise' ? 'Raise' : 'Fold'}.`,
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

  // ─── handleAnswerBB ───────────────────────────────────────────────────────────

  const handleAnswerBB = async (action: BBAction) => {
    if (!bbExercise) return;
    const timeTaken = Date.now() - startTime.current;
    setBBSelected(action);

    let isCorrect: boolean;

    if (preflopEnabled) {
      let flat: number[] | null = null;
      let label: string | null = null;

      try {
        const resolved = await profilesApi.resolve('BB', heroStack);
        if (resolved?.cells && resolved.cells.length === 169) {
          flat = resolved.cells;
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
        isCorrect = cellVal > 0 ? action !== 'fold' : action === 'fold';
      } else {
        // No profile/custom range → evaluate against GTO
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
      correctAction: bbExercise.correctAction,
      explanation: bbExercise.explanation,
      xpEarned: xp,
      isMixed: bbExercise.isMixed,
    });
    await recordResult(isCorrect, xp, 'preflop', timeTaken);
    setPhase('result');
  };

  // ─── handleNext ───────────────────────────────────────────────────────────────

  const handleNext = async () => {
    resetExerciseState();
    setPhase('exercise');

    if (isBBSession) {
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
    setIsBBSession(false);
    setBBExercise(null);
    setBBSelected(null);
    setPhase('select_position');
  };

  const isEn = useLangStore(s => s.lang) === 'en';

  // Use localResult (custom range / BB) when available, fall back to GTO lastResult
  const result = localResult ?? lastResult;

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
              <p className="text-gray-400 text-sm leading-relaxed mb-4">
                {isEn
                  ? "Before any community cards are dealt, each player must decide whether to open (raise), fold, or defend based on their 2 hole cards and their position at the table."
                  : "Avant que les cartes communes soient posées, chaque joueur doit décider d'ouvrir, se coucher ou défendre selon ses 2 cartes en main et sa position à la table."}
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  { emoji: '⬅️', label: 'UTG / HJ', desc: isEn ? 'Early — tight' : 'Early — serré' },
                  { emoji: '➡️', label: 'CO / BTN', desc: isEn ? 'Late — wide' : 'Late — large' },
                  { emoji: '🔄', label: 'SB', desc: isEn ? 'vs BB heads-up' : 'vs BB tête-à-tête' },
                  { emoji: '🛡️', label: 'BB', desc: isEn ? 'Defend vs raise' : 'Défendre vs relance' },
                ].map(s => (
                  <div key={s.label} className="bg-gray-800/50 rounded-xl p-3 border border-gray-700 text-center">
                    <div className="text-xl mb-1">{s.emoji}</div>
                    <div className="text-white font-bold text-sm">{s.label}</div>
                    <div className="text-gray-500 text-xs mt-1 leading-tight">{s.desc}</div>
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
                const allPos: Position[] = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
                const random = allPos[Math.floor(Math.random() * allPos.length)];
                setSelectedPosition(random);
                handleStart(random);
              }}
            >
              {t.training.random_pos}
            </Button>
            <Button size="lg" variant="gold" onClick={() => handleStart(selectedPosition)}>
              {selectedPosition === 'BB'
                ? (isEn ? 'Defend as BB' : 'Défendre en BB')
                : `${t.training.play_pos} ${selectedPosition}`}
            </Button>
          </div>
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
                  <div className="w-full max-w-xs sm:max-w-full mx-auto">
                    <PokerTable
                      heroPosition="BB"
                      interactive={false}
                      heroCards={bbExercise.hand as string[]}
                      boardCardSize={isMobile ? 'md' : 'lg'}
                      compact={isMobile}
                      seatInfos={{
                        [bbExercise.opener]: { bet: `${bbExercise.openSize}bb` },
                        ...(preflopEnabled ? { BB: { stack: `${heroStack} bb` } } : {}),
                      } as any}
                    />
                  </div>

                  {/* Mobile: hero cards displayed separately below the table */}
                  {isMobile && (
                    <div className="flex flex-col items-center gap-1.5">
                      <Hand
                        cards={bbExercise.hand as CardStr[]}
                        size="md"
                        gap="gap-3"
                      />
                    </div>
                  )}

                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-2 flex-wrap justify-center"
                  >
                    <span className="text-gray-400 text-sm">BB</span>
                    <PositionInfo position="BB" />
                    <span className="text-gold-400 font-mono font-bold text-lg">
                      {handToDisplay(bbExercise.notation)}
                    </span>
                    <span className="text-gray-500 text-xs">
                      — {bbExercise.opener} {isEn ? 'opens' : 'ouvre à'} {bbExercise.openSize}bb
                    </span>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="flex gap-2 sm:gap-3 w-full sm:w-auto"
                  >
                    <Button size="xl" variant="danger"    onClick={() => handleAnswerBB('fold')}  className="flex-1 sm:flex-none sm:min-w-[110px]">Fold</Button>
                    <Button size="xl" variant="secondary" onClick={() => handleAnswerBB('call')}  className="flex-1 sm:flex-none sm:min-w-[110px]">Call</Button>
                    <Button size="xl" variant="gold"      onClick={() => handleAnswerBB('3bet')}  className="flex-1 sm:flex-none sm:min-w-[110px]">3-Bet</Button>
                  </motion.div>
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
                  <div className="w-full max-w-xs sm:max-w-full mx-auto">
                    <PokerTable
                      heroPosition={preflopExercise.position}
                      interactive={false}
                      heroCards={preflopExercise.hand as string[]}
                      boardCardSize={isMobile ? 'md' : 'lg'}
                      compact={isMobile}
                      seatInfos={preflopEnabled
                        ? { [preflopExercise.position]: { stack: `${heroStack} bb` } } as any
                        : undefined}
                    />
                  </div>

                  {/* Mobile: show hero cards prominently below the table */}
                  {isMobile && (
                    <div className="flex flex-col items-center gap-1.5">
                      <Hand
                        cards={preflopExercise.hand as CardStr[]}
                        size="md"
                        gap="gap-3"
                      />
                      {preflopEnabled && (
                        <span className="text-gold-400 text-xs font-semibold">{heroStack} bb</span>
                      )}
                    </div>
                  )}

                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-2 flex-wrap justify-center"
                  >
                    <span className="text-gray-400 text-sm">{t.training.position_lbl}</span>
                    <span className="font-bold text-white text-lg">{preflopExercise.position}</span>
                    <PositionInfo position={preflopExercise.position} />
                    <span className="text-gold-400 font-mono font-bold text-lg">
                      {handToDisplay(preflopExercise.notation)}
                    </span>
                    <span className="text-gray-500 text-xs">— {t.training.facing}</span>
                  </motion.div>

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
              <VerdictBanner isCorrect={localResult.isCorrect} />

              {/* Custom range badge */}
              {customMatrix && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-900/30 border border-purple-700/50 rounded-lg text-xs text-purple-300 w-full justify-center flex-wrap">
                  <Sliders size={12} />
                  <span>{isEn ? 'Evaluated against your custom range' : 'Évalué selon votre range personnalisée'}</span>
                  <span className="text-purple-400 font-bold">· {heroStack} bb</span>
                </div>
              )}

              {/* Action pills */}
              <div className="flex gap-2 flex-wrap justify-center">
                <span className={`px-3 py-1.5 rounded-full border text-xs font-bold ${BB_ACTION_PILL[bbExercise.correctAction]}`}>
                  {isEn ? 'Recommended' : 'Recommandé'} : <strong>{bbExercise.correctAction}</strong>
                </span>
                {bbExercise.isMixed && bbExercise.altAction && bbExercise.altAction !== bbExercise.correctAction && (
                  <span className={`px-3 py-1.5 rounded-full border text-xs font-bold ${BB_ACTION_PILL[bbExercise.altAction]}`}>
                    {isEn ? 'Also ok' : 'Aussi ok'} : <strong>{bbExercise.altAction}</strong>
                  </span>
                )}
                {bbSelected && (
                  <span className={`px-3 py-1.5 rounded-full border text-xs font-bold ${localResult.isCorrect ? 'border-green-700 text-green-300 bg-green-900/20' : 'border-red-700 text-red-300 bg-red-900/20'}`}>
                    {isEn ? 'Your action' : 'Ton action'} : <strong>{bbSelected}</strong>
                  </span>
                )}
              </div>

              {/* Compact table recap */}
              <div className="flex flex-col sm:flex-row items-center gap-6 w-full">
                <div className="w-full max-w-[280px] shrink-0">
                  <PokerTable
                    heroPosition="BB"
                    compact
                    heroCards={bbExercise.hand as string[]}
                    seatInfos={{
                      [bbExercise.opener]: { bet: `${bbExercise.openSize}bb` },
                      BB: { stack: `${heroStack} bb` },
                    } as any}
                  />
                </div>
                <div className="flex flex-col items-center sm:items-start gap-2">
                  <p className="text-gray-400 text-sm text-center sm:text-left">
                    <span className="text-gold-400 font-mono font-bold text-base">
                      {handToDisplay(bbExercise.notation)}
                    </span>
                    {' — '}
                    <span className="text-white font-bold">BB</span>
                    <span className="text-gray-500 text-xs ml-1">
                      vs {bbExercise.opener} {bbExercise.openSize}bb
                    </span>
                  </p>
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

              {/* Explanation (beginner only) */}
              {localResult.explanation && (
                <ExplanationPanel text={localResult.explanation} plain />
              )}

              {/* Range matrix */}
              <RangeSection
                matrix={(preflopEnabled && customMatrix) ? customMatrix : rangeMatrix}
                highlightNotation={bbExercise.notation}
                position="BB"
                isCustom={!!(preflopEnabled && customMatrix)}
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
              <VerdictBanner isCorrect={result.isCorrect} />

              {/* Custom range active badge */}
              {localResult && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-900/30 border border-purple-700/50 rounded-lg text-xs text-purple-300 w-full justify-center flex-wrap">
                  <Sliders size={12} />
                  <span>
                    {isEn ? 'Evaluated against your custom range' : 'Évalué selon votre range personnalisée'}
                  </span>
                  <span className="text-purple-400 font-bold">· {heroStack} bb</span>
                </div>
              )}

              {/* Compact table recap */}
              <div className="flex flex-col sm:flex-row items-center gap-6 w-full">
                <div className="w-full max-w-[280px] shrink-0">
                  <PokerTable
                    heroPosition={preflopExercise.position}
                    compact
                    heroCards={preflopExercise.hand as string[]}
                    seatInfos={preflopEnabled
                      ? { [preflopExercise.position]: { stack: `${heroStack} bb` } } as any
                      : undefined}
                  />
                </div>
                <div className="flex flex-col items-center sm:items-start gap-2">
                  <p className="text-gray-400 text-sm text-center sm:text-left">
                    <span className="text-gold-400 font-mono font-bold text-base">
                      {handToDisplay(preflopExercise.notation)}
                    </span>
                    {' — '}
                    <span className="text-white font-bold">{preflopExercise.position}</span>
                  </p>
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

              {/* GTO Frequency — only for standard GTO results (not custom range) */}
              {mode === 'beginner' && !localResult && result.frequency !== undefined && (
                <div className="bg-gray-800/80 rounded-xl p-4 border border-gray-700 w-full max-w-sm">
                  <p className="text-sm text-gray-400 mb-2 font-semibold">{t.training.gto_freq}</p>
                  <ProgressBar
                    value={(result.frequency ?? 0) * 100}
                    color={(result.frequency ?? 0) >= 0.5 ? 'green' : 'red'}
                    showValue
                    label="Raise"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    {t.training.gto_explain_a}{' '}
                    <span className="text-gray-300 font-semibold">{Math.round((result.frequency ?? 0) * 100)}%</span>{' '}
                    {t.training.gto_explain_b}
                  </p>
                  {result.isMixed && (
                    <p className="text-xs text-yellow-400 mt-2 flex items-start gap-1">
                      <Info size={12} className="shrink-0 mt-0.5" />
                      {t.training.mixed_hint}
                    </p>
                  )}
                </div>
              )}

              {/* Explanation (beginner only) */}
              <ExplanationPanel text={result.explanation} plain />

              {/* Range matrix */}
              <RangeSection
                matrix={(preflopEnabled && customMatrix) ? customMatrix : rangeMatrix}
                highlightNotation={preflopExercise.notation}
                position={preflopExercise.position}
                isCustom={!!(preflopEnabled && customMatrix)}
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
