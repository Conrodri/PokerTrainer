import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronDown, ChevronUp, Info, Zap, Lightbulb, Play, GraduationCap, Sliders } from 'lucide-react';
import { useTrainingStore } from '../../store/trainingStore';
import { PokerTable, SeatInfo } from '../poker/PokerTable';
import { Button } from '../ui/Button';
import { ProgressBar } from '../ui/ProgressBar';
import { SessionStatsBar } from '../ui/SessionStatsBar';
import { useModeStore } from '../../store/modeStore';
import { VerdictBanner } from '../ui/VerdictBanner';
import { RichText, RichLine } from '../ui/RichText';
import { RangeMatrix } from '../poker/RangeMatrix';
import { CardStr, Position } from '../../types/poker';
import { trainingApi, rangesApi, profilesApi } from '../../services/api';
import { handToDisplay, getMatrixIndices } from '../../utils/pokerUtils';
import { useT } from '../../i18n';
import { useLangStore } from '../../store/langStore';
import { useCustomRangeStore } from '../../store/customRangeStore';

// ─── BB Defense range colour mapping ─────────────────────────────────────────
// Grid values: 0=fold  1=call  2=thin-call  3=value-3bet  4=bluff-3bet
const BB_CELL_COLOR = (code: number): string => ({
  0: '#1a202c',
  1: 'rgba(37,99,235,0.70)',
  2: 'rgba(37,99,235,0.32)',
  3: 'rgba(22,130,60,0.85)',
  4: 'rgba(202,138,4,0.82)',
} as Record<number, string>)[code] ?? '#1a202c';

type Phase    = 'exercise' | 'result';
type BBAction = 'fold' | 'call' | '3bet';

const ACTION_META: Record<BBAction, { variant: 'danger' | 'secondary' | 'gold'; pill: string; label: (t: ReturnType<typeof useT>) => string }> = {
  fold:   { variant: 'danger',    pill: 'bg-red-900/40 text-red-300 border-red-700',     label: () => 'Fold' },
  call:   { variant: 'secondary', pill: 'bg-gray-700/60 text-gray-200 border-gray-500',  label: () => 'Call' },
  '3bet': { variant: 'gold',      pill: 'bg-gold-900/30 text-gold-300 border-gold-700',  label: (t) => t.training.bb_3bet },
};

// ─── Intro panel ──────────────────────────────────────────────────────────────

function IntroPanel({ isEn, mode, onStart }: { isEn: boolean; mode: 'beginner' | 'advanced'; onStart: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-5 max-w-xl mx-auto"
    >
      <div className="text-center">
        <div className="text-5xl mb-3">🛡️</div>
        <h2 className="text-2xl font-black text-white mb-2">
          {isEn ? 'BB Defense Trainer' : 'Entraîneur Défense BB'}
        </h2>
        <p className="text-gray-400 text-sm leading-relaxed">
          <RichLine text={isEn
            ? 'Master the big blind defense strategy — when to fold, call, or 3-bet facing a raise.'
            : 'Maîtrisez la stratégie de défense en grosse blind — quand se coucher, appeler ou 3-better face à une relance.'} />
        </p>
      </div>

      <div className="bg-gray-900/60 rounded-2xl p-5 border border-gray-700">
        <h3 className="text-white font-bold mb-3 flex items-center gap-2">
          <span>📖</span>
          {isEn ? 'The BB context' : 'Le contexte en BB'}
        </h3>
        <p className="text-gray-400 text-sm leading-relaxed mb-4">
          <RichLine text={isEn
            ? 'You are in the big blind. A player has raised from a specific position (BTN, CO, HJ...). You must choose the best response with your 2 hole cards.'
            : 'Vous êtes en grosse blind. Un joueur a relancé depuis une position adverse (BTN, CO, HJ...). Vous devez choisir la meilleure réponse avec vos 2 cartes en main.'} />
        </p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { emoji: '❌', label: 'Fold', desc: isEn ? 'Give up — too weak to defend' : 'Abandonner — main trop faible' },
            { emoji: '✅', label: 'Call', desc: isEn ? 'Defend — good pot odds or playability' : 'Défendre — bons pot odds ou jouabilité' },
            { emoji: '🔥', label: '3-Bet', desc: isEn ? 'Re-raise — strong hand or bluff' : 'Re-relancer — main forte ou bluff' },
          ].map(s => (
            <div key={s.label} className="bg-gray-800/50 rounded-xl p-3 border border-gray-700 text-center">
              <div className="text-xl mb-1">{s.emoji}</div>
              <div className="text-white font-bold text-sm">{s.label}</div>
              <div className="text-gray-500 text-xs mt-1 leading-tight"><RichLine text={s.desc} /></div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gray-900/60 rounded-2xl p-5 border border-gray-700">
        <h3 className="text-white font-bold mb-3 flex items-center gap-2">
          <span>⚡</span>
          {isEn ? 'How the exercises work' : 'Comment fonctionnent les exercices ?'}
        </h3>
        <ul className="space-y-2 text-sm text-gray-400">
          {(isEn ? [
            '🛡️ You are in BB facing a raise from a specific position',
            '🃏 You receive 2 random hole cards',
            '♟️ Choose: Fold, Call, or 3-bet according to GTO ranges',
            '📊 The BB defense range matrix shows the correct decisions',
            '💡 Explanation of the decision and range frequency',
          ] : [
            '🛡️ Vous êtes en BB face à une relance d\'une position spécifique',
            '🃏 Vous recevez 2 cartes en main aléatoires',
            '♟️ Choisissez : Fold, Call ou 3-bet selon les ranges GTO',
            '📊 La matrice de défense BB vous montre les bonnes décisions',
            '💡 Explication de la décision et fréquence de la range',
          ]).map((item, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="shrink-0 mt-0.5">{item.split(' ')[0]}</span>
              <span><RichLine text={item.slice(item.indexOf(' ') + 1)} /></span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex gap-3">
        <div className={`flex-1 rounded-xl p-3 border text-center text-xs ${mode === 'beginner' ? 'bg-blue-900/30 border-blue-700' : 'bg-gray-800/40 border-gray-700'}`}>
          <GraduationCap size={16} className="mx-auto mb-1 text-blue-400" />
          <div className="font-bold text-white">{isEn ? 'Beginner' : 'Débutant'}</div>
          <div className="text-gray-500 mt-0.5">{isEn ? 'Shows range hints & frequency info' : 'Affiche les indices de range & fréquence'}</div>
        </div>
        <div className={`flex-1 rounded-xl p-3 border text-center text-xs ${mode === 'advanced' ? 'bg-yellow-900/30 border-yellow-700' : 'bg-gray-800/40 border-gray-700'}`}>
          <Zap size={16} className="mx-auto mb-1 text-yellow-400" />
          <div className="font-bold text-white">{isEn ? 'Advanced' : 'Avancé'}</div>
          <div className="text-gray-500 mt-0.5">{isEn ? 'No hints — for experienced defenders' : 'Sans indices — pour défenseurs confirmés'}</div>
        </div>
      </div>

      <Button size="lg" variant="gold" onClick={onStart} fullWidth>
        <Play size={16} className="inline mr-2" />
        {isEn ? 'Start training' : 'Commencer l\'entraînement'}
      </Button>
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function BBDefenseTrainer() {
  const t      = useT();
  const isEn   = useLangStore(s => s.lang) === 'en';
  const { bbDefenseExercise, isLoading, sessionStats, fetchBBDefenseExercise, recordResult, setIsExercising } = useTrainingStore();

  const [showIntro, setShowIntro]             = useState(true);
  const [phase, setPhase]                     = useState<Phase>('exercise');
  const [selected, setSelected]               = useState<BBAction | null>(null);
  const [xpEarned, setXpEarned]               = useState(0);
  const [grid, setGrid]                       = useState<number[][] | null>(null);
  /** Custom range matrix fetched from API when bbDefenseEnabled. */
  const [customMatrix, setCustomMatrix]       = useState<number[][] | null>(null);
  /** Set when custom range is active — overrides the standard GTO correctness check. */
  const [isCorrectOverride, setIsCorrectOverride] = useState<boolean | null>(null);
  /** Whether the range matrix is expanded at the bottom of the result phase. */
  const [showRange, setShowRange]             = useState(true);
  /** Stack depth randomised per exercise (5–100 bb). Used to match a profile sub-range. */
  const [heroStack, setHeroStack]             = useState<number>(() => Math.floor(Math.random() * 96) + 5);
  /** Label of the resolved profile + stack range (e.g. "MTT 6 Max · 20-50bb"), null = simple custom range */
  const [resolvedLabel, setResolvedLabel]     = useState<string | null>(null);
  const mode = useModeStore(s => s.mode);
  const { preflopEnabled: bbDefenseEnabled } = useCustomRangeStore();

  const ex = bbDefenseExercise;

  useEffect(() => {
    if (phase === 'result') window.scrollTo({ top: 0, behavior: 'smooth' });
    setIsExercising(phase === 'exercise' && !!ex && !isLoading);
  }, [phase, ex, isLoading]);

  useEffect(() => () => { setIsExercising(false); }, []);

  const ensureGrid = async () => {
    if (!grid) {
      try { const data = await trainingApi.getBBDefenseRange(); setGrid(data.grid); } catch {/* ignore */}
    }
  };

  const handleAnswer = async (action: BBAction) => {
    if (!ex) return;
    setSelected(action);

    let ok: boolean;
    if (bbDefenseEnabled) {
      // ── Custom range path ────────────────────────────────────────────────────
      // Backend resolve handles priority:
      //   1. Active profile → matches heroStack to the right sub-range
      //   2. No active profile → simple custom BB range
      //   3. cells=null → fall back to GTO
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
      } catch {/* ignore */}
      setResolvedLabel(label);

      if (flat) {
        const cGrid: number[][] = [];
        for (let r = 0; r < 13; r++) cGrid.push(flat.slice(r * 13, r * 13 + 13));
        setCustomMatrix(cGrid);
        const [row, col] = getMatrixIndices(ex.notation);
        const cellVal = cGrid[row]?.[col] ?? 0;
        ok = cellVal > 0 ? action !== 'fold' : action === 'fold';
        setIsCorrectOverride(ok);
      } else {
        // cells=null → fall back to GTO
        ok = action === ex.correctAction || (ex.isMixed && action === ex.altAction);
        setIsCorrectOverride(null);
      }
    } else {
      // ── GTO path ─────────────────────────────────────────────────────────────
      ok = action === ex.correctAction || (ex.isMixed && action === ex.altAction);
      setIsCorrectOverride(null);
    }

    const xp = ok ? 15 : 5;
    setXpEarned(xp);
    recordResult(ok, xp, 'bbdefense');
    await ensureGrid();
    setPhase('result');
  };

  const handleStart = async () => {
    setShowIntro(false);
    await fetchBBDefenseExercise();
  };

  const handleNext = async () => {
    setPhase('exercise');
    setSelected(null);
    setIsCorrectOverride(null);
    setCustomMatrix(null);
    setResolvedLabel(null);
    setShowRange(true);
    setHeroStack(Math.floor(Math.random() * 96) + 5); // new random stack 5–100 bb
    await fetchBBDefenseExercise();
  };

  // Use override when custom range was active, otherwise standard GTO check
  const isCorrect = isCorrectOverride !== null
    ? isCorrectOverride
    : (!!ex && selected !== null && (selected === ex.correctAction || (ex.isMixed && selected === ex.altAction)));

  // Derive whether the custom range says "defend" (true) or "fold" (false)
  const customIsDefend: boolean | null = (isCorrectOverride !== null && customMatrix && ex)
    ? (() => {
        const [row, col] = getMatrixIndices(ex.notation);
        return (customMatrix[row]?.[col] ?? 0) > 0;
      })()
    : null;

  if (showIntro) {
    return (
      <div className="flex flex-col gap-5 max-w-2xl mx-auto">
        <IntroPanel isEn={isEn} mode={mode} onStart={handleStart} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">

      {/* ── PHASE: Exercise ── */}
      {phase === 'exercise' && (
        <AnimatePresence mode="wait">
          <motion.div
            key={ex?.notation}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="flex flex-col items-center gap-5"
          >
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-1">{t.training.bb_title}</h2>
              <p className="text-gray-400 text-sm">{t.training.bb_subtitle}</p>
            </div>

            {isLoading || !ex ? (
              <div className="h-48 flex items-center justify-center">
                <div className="animate-spin h-10 w-10 border-2 border-felt-500 border-t-transparent rounded-full" />
              </div>
            ) : (
              <>
                {/* Full table — hero in BB vs opener, villain's open shown as bet chip */}
                <div className="w-full">
                  <PokerTable
                    heroPosition="BB"
                    interactive={false}
                    activePlayers={['BB', ex.opener as Position]}
                    heroCards={ex.hand as string[]}
                    boardCardSize="lg"
                    seatInfos={{
                      [ex.opener]: { bet: `${ex.openSize}bb` },
                      ...(bbDefenseEnabled ? { BB: { stack: `${heroStack} bb` } } : {}),
                    } as Partial<Record<Position, SeatInfo>>}
                  />
                </div>

                {/* Scenario + hand notation */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-wrap items-center justify-center gap-2"
                >
                  <span className="text-white font-bold text-lg">{ex.opener}</span>
                  <span className="text-gray-400 text-sm">{t.training.bb_scenario}</span>
                  <span className="text-red-400 font-bold text-lg">{ex.openSize}bb</span>
                  <span className="text-xs text-gold-400 bg-gold-900/20 border border-gold-800 px-2 py-0.5 rounded-full">
                    {t.training.bb_action_on_you}
                  </span>
                  <span className="text-gold-400 font-mono font-bold text-lg">
                    {handToDisplay(ex.notation)}
                  </span>
                </motion.div>

                {/* Action buttons */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="flex gap-4 flex-wrap justify-center"
                >
                  <Button size="xl" variant="danger"    onClick={() => handleAnswer('fold')} className="min-w-[120px]">Fold</Button>
                  <Button size="xl" variant="secondary" onClick={() => handleAnswer('call')} className="min-w-[120px]">Call</Button>
                  <Button size="xl" variant="gold"      onClick={() => handleAnswer('3bet')} className="min-w-[120px]">{t.training.bb_3bet}</Button>
                </motion.div>

                {/* Why defend wide — beginner only */}
                {mode === 'beginner' && (
                  <div className="bg-felt-900/40 border border-felt-800/50 rounded-xl px-4 py-2.5 text-xs text-felt-200 flex items-start gap-2 w-full">
                    <Lightbulb size={14} className="shrink-0 mt-0.5 text-gold-400" />
                    <span>{t.training.bb_why_wide}</span>
                  </div>
                )}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      )}

      {/* ── PHASE: Result ── */}
      {phase === 'result' && ex && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-5"
        >
          <VerdictBanner
            isCorrect={isCorrect}
            correctText={t.training.correct}
            incorrectText={t.training.incorrect}
          />

          {/* Custom range active badge — shows stack used */}
          {isCorrectOverride !== null && (
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
                heroPosition="BB"
                compact
                heroCards={ex.hand as string[]}
                activePlayers={['BB', ex.opener as Position]}
                seatInfos={{
                  [ex.opener]: { bet: `${ex.openSize}bb` },
                  ...(bbDefenseEnabled ? { BB: { stack: `${heroStack} bb` } } : {}),
                } as Partial<Record<Position, SeatInfo>>}
              />
            </div>
            <div className="flex flex-col items-center sm:items-start gap-2">
              <p className="text-gray-400 text-sm text-center sm:text-left">
                <span className="text-gold-400 font-mono font-bold text-base">{handToDisplay(ex.notation)}</span>
                {' — '}
                <span className="text-white font-bold">BB</span>
                {' vs '}
                <span className="text-white font-bold">{ex.opener}</span>
              </p>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex items-center gap-2 text-blue-400 text-sm"
              >
                <Zap size={14} /><span className="font-bold">+{xpEarned} XP</span>
              </motion.div>
            </div>
          </div>

          {/* Action recap pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs">

            {/* Custom range recommendation — shown when custom range was active */}
            {isCorrectOverride !== null && customIsDefend !== null ? (
              <span className="px-2.5 py-1 rounded-full border bg-purple-900/30 text-purple-300 border-purple-700">
                <Sliders size={10} className="inline mr-1" />
                {isEn ? 'Custom' : 'Range perso'}: <strong>{customIsDefend ? (isEn ? 'Defend' : 'Défendre') : 'Fold'}</strong>
              </span>
            ) : (
              /* Standard GTO recommendation */
              <>
                <span className={`px-2.5 py-1 rounded-full border ${ACTION_META[ex.correctAction].pill}`}>
                  {t.training.bb_recommended}: <strong>{ACTION_META[ex.correctAction].label(t)}</strong>
                </span>
                {ex.isMixed && ex.altAction !== ex.correctAction && (
                  <span className={`px-2.5 py-1 rounded-full border ${ACTION_META[ex.altAction].pill}`}>
                    {t.training.bb_also_ok}: <strong>{ACTION_META[ex.altAction].label(t)}</strong>
                  </span>
                )}
              </>
            )}

            {/* Your action pill — always shown */}
            {selected && (
              <span className={`px-2.5 py-1 rounded-full border bg-gray-900/60 ${isCorrect ? 'border-green-700 text-green-300' : 'border-red-700 text-red-300'}`}>
                {t.training.bb_your_action}: <strong>{ACTION_META[selected].label(t)}</strong>
              </span>
            )}
          </div>

          {/* Navigation */}
          <div className="w-full max-w-xs">
            <Button size="lg" variant="gold" onClick={handleNext} fullWidth>
              {t.training.next_ex} <ChevronRight size={18} className="inline" />
            </Button>
          </div>

          {/* Recap stats */}
          <SessionStatsBar
            total={sessionStats.total}
            correct={sessionStats.correct}
            streak={sessionStats.streak}
            xp={sessionStats.xp}
            labels={{ accuracy: t.training.accuracy_lbl, streak: t.training.streak_lbl, xp: t.training.xp_lbl }}
          />

          {/* Explanation — beginner only */}
          {mode === 'beginner' && (
            <div className="bg-gray-800/60 rounded-xl p-4 border border-gray-700 w-full">
              <p className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-1">
                <Info size={14} /> {t.training.explanation_lbl}
              </p>
              <RichText text={ex.explanation} />
            </div>
          )}

          {/* Range at bottom — collapsible toggle section */}
          {(() => {
            // Custom matrix takes priority; fall back to GTO grid
            const displayMatrix = (bbDefenseEnabled && customMatrix) ? customMatrix : grid;
            const isCustomDisplay = !!(bbDefenseEnabled && customMatrix);
            if (!displayMatrix) return null;
            return (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="w-full"
              >
                {/* Toggle header — click to show/hide the matrix */}
                <button
                  onClick={() => setShowRange(v => !v)}
                  className="flex items-center justify-between w-full px-4 py-2.5 rounded-xl border transition-colors mb-1
                    border-gray-700 bg-gray-800/50 hover:bg-gray-800 text-sm font-semibold"
                >
                  <span className="flex items-center gap-1.5 flex-wrap">
                    {isCustomDisplay ? (
                      <>
                        <Sliders size={14} className="text-purple-400 shrink-0" />
                        <span className="text-purple-300">
                          {resolvedLabel ? resolvedLabel : (isEn ? 'My range' : 'Ma range')}
                        </span>
                        <span className="text-purple-500">— BB</span>
                        <span className="text-purple-600 font-normal text-xs">· {heroStack} bb</span>
                      </>
                    ) : (
                      <span className="text-felt-300">
                        {t.training.bb_range_title}
                      </span>
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
                      key="bb-range-matrix"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden flex flex-col items-center gap-3 pt-2"
                    >
                      {isCustomDisplay ? (
                        <RangeMatrix
                          matrix={displayMatrix}
                          highlightNotation={ex.notation}
                          size="sm"
                        />
                      ) : (
                        <RangeMatrix
                          matrix={displayMatrix}
                          highlightNotation={ex.notation}
                          cellColor={BB_CELL_COLOR}
                          title={t.training.bb_range_title}
                          legend={[
                            { color: 'rgba(22,130,60,0.85)',  label: t.training.bb_leg_value, tip: { title: t.training.bb_leg_value, text: t.training.bb_tip_value } },
                            { color: 'rgba(202,138,4,0.82)',  label: t.training.bb_leg_bluff, tip: { title: t.training.bb_leg_bluff, text: t.training.bb_tip_bluff } },
                            { color: 'rgba(37,99,235,0.70)',  label: t.training.bb_leg_call,  tip: { title: t.training.bb_leg_call,  text: t.training.bb_tip_call  } },
                            { color: 'rgba(37,99,235,0.32)',  label: t.training.bb_leg_thin,  tip: { title: t.training.bb_leg_thin,  text: t.training.bb_tip_thin  } },
                            { color: '#1a202c',               label: t.training.bb_leg_fold,  tip: { title: t.training.bb_leg_fold,  text: t.training.bb_tip_fold  } },
                          ]}
                          tooltipValue={(code) => ({
                            0: t.training.bb_leg_fold, 1: t.training.bb_leg_call,
                            2: t.training.bb_leg_thin, 3: t.training.bb_leg_value,
                            4: t.training.bb_leg_bluff,
                          } as Record<number, string>)[code] ?? ''}
                        />
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })()}
        </motion.div>
      )}

    </div>
  );
}
