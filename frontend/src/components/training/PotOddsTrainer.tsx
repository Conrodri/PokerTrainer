import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Info, Calculator, TrendingUp, Target, Scale, GraduationCap, Lightbulb } from 'lucide-react';
import { SourcesFooter } from '../ui/SourcesFooter';
import type { Source } from '../ui/SourcesFooter';

const POTODDS_SOURCES: Source[] = [
  { authors: 'Sklansky, D.', title: 'The Theory of Poker', year: '1994', note: { fr: 'Théorie fondamentale des pot odds et du principe fondamental du poker', en: 'Pot odds theory and the fundamental theorem of poker' } },
  { authors: 'Chen, B. & Ankenman, J.', title: 'The Mathematics of Poker', year: '2006', note: { fr: 'Cadre EV, appel par rapport aux pot odds et fréquences d\'équilibre', en: 'EV framework, calling vs pot odds and equilibrium calling frequencies' } },
  { authors: 'Harrington, D.', title: 'Harrington on Hold\'em Vol. 1', year: '2004', note: { fr: 'Application pratique des pot odds et de l\'équité implicite', en: 'Practical application of pot odds and implied equity' } },
  { authors: 'GTO Wizard', title: 'Calling frequency equilibria', year: '2023', note: { fr: 'Fréquences d\'appel GTO par spot et texture de board', en: 'GTO calling frequencies by spot and board texture' }, url: 'https://gtowizard.com' },
];
const POTODDS_METHODOLOGY = {
  fr: 'Chaque exercice calcule les pot odds exacts (mise / (pot + mise)) et les compare à l\'équité du héros. L\'action correcte suit le critère EV : appeler si équité ≥ pot odds requis, sinon fold. Les valeurs d\'équité sont issues de calculs par énumération complète.',
  en: 'Each exercise computes exact pot odds (bet / (pot + bet)) and compares them to hero\'s equity. The correct action follows the EV criterion: call if equity ≥ required pot odds, else fold. Equity values are derived from full enumeration calculations.',
};
import { useTrainingStore } from '../../store/trainingStore';
import { Button } from '../ui/Button';
import { ProgressBar } from '../ui/ProgressBar';
import { SessionStatsBar } from '../ui/SessionStatsBar';
import { VerdictBanner } from '../ui/VerdictBanner';
import { RichText, RichLine } from '../ui/RichText';
import { Spinner } from '../ui/Spinner';
import { ExplanationPanel } from '../ui/ExplanationPanel';
import { BeginnerGuide } from '../ui/BeginnerGuide';
import { SpoilableHint } from '../ui/SpoilableHint';
import { potOddsHint } from '../../utils/coachHints';
import { TrainerIntro } from '../ui/TrainerIntro';
import { useModeStore } from '../../store/modeStore';
import { Hand } from '../poker/Card';
import { CardStr } from '../../types/poker';
import { useT } from '../../i18n';
import { useLangStore } from '../../store/langStore';
import { useExerciseLock } from '../../hooks/useExerciseLock';
import { useShallow } from 'zustand/react/shallow';
import { useExamRunner } from '../../hooks/useExamRunner';
import { SprintTimer } from '../ui/SprintTimer';
import { ExamLauncher, ExamHud, ExamResult } from './ExamMode';

type Phase = 'exercise' | 'result';

// ─── Component ────────────────────────────────────────────────────────────────

export function PotOddsTrainer() {
  const t = useT();
  const isEn = useLangStore(s => s.lang) === 'en';
  const { potOddsExercise, lastResult, sessionStats, isLoading, fetchPotOddsExercise, checkPotOddsAnswer, setTrainerStarted } = useTrainingStore(
    useShallow(s => ({ potOddsExercise: s.potOddsExercise, lastResult: s.lastResult, sessionStats: s.sessionStats, isLoading: s.isLoading, fetchPotOddsExercise: s.fetchPotOddsExercise, checkPotOddsAnswer: s.checkPotOddsAnswer, setTrainerStarted: s.setTrainerStarted }))
  );
  const [showIntro, setShowIntro] = useState(true);
  const [phase, setPhase] = useState<Phase>('exercise');
  const [showFormula, setShowFormula] = useState(false);
  const [showEv, setShowEv] = useState(false);
  const mode = useModeStore(s => s.mode);
  const startTime = useRef<number>(Date.now());

  useEffect(() => { if (phase === 'exercise') startTime.current = Date.now(); }, [phase, potOddsExercise]);
  useEffect(() => { if (phase === 'result') window.scrollTo({ top: 0, behavior: 'smooth' }); }, [phase]);

  // Lock mode switching while a question is on screen.
  useExerciseLock(!showIntro && phase === 'exercise' && !!potOddsExercise && !isLoading);

  // Exam mode (advanced/expert): loop exercises until 3 errors; score = correct.
  const { examActive, examFinished, startRun, quitRun, recordAnswer } = useExamRunner('potodds');

  const handleNext = async () => {
    setPhase('exercise');
    setShowFormula(false);
    setShowEv(false);
    await fetchPotOddsExercise();
  };

  const handleAnswer = async (action: 'call' | 'fold') => {
    if (!potOddsExercise) return;
    const r = await checkPotOddsAnswer(action, Date.now() - startTime.current);
    setPhase('result');
    if (examActive) recordAnswer(r.isCorrect, handleNext);
  };

  // Expert sprint: no decision within 5s → submit the wrong action (a miss).
  const handleTimeout = () => {
    if (!potOddsExercise || phase !== 'exercise') return;
    handleAnswer(potOddsExercise.correctAction === 'call' ? 'fold' : 'call');
  };

  const handleStart = async () => {
    quitRun();              // clear any leftover exam state — normal mode never shows the lives HUD / auto-advance
    setShowIntro(false);
    setTrainerStarted(true);
    await fetchPotOddsExercise();
  };

  const handleStartExam = async () => {
    startRun();
    setShowIntro(false);
    setTrainerStarted(true);
    setShowFormula(false);
    setShowEv(false);
    setPhase('exercise');
    await fetchPotOddsExercise();
  };

  const handleQuitExam = () => {
    quitRun();
    setShowIntro(true);
    setTrainerStarted(false);
    setPhase('exercise');
  };

  const ex = potOddsExercise;
  const ev = lastResult?.ev ?? 0;
  // Beginner gets the simple text; advanced AND expert get the detailed variant.
  const equityText = ex ? (mode === 'beginner' ? ex.equityExplanation : ex.equityExplanationAdvanced) : '';
  const thresholdText = ex ? (mode === 'beginner' ? ex.thresholdExplanation : ex.thresholdExplanationAdvanced) : '';

  if (showIntro) {
    return (
      <div className="flex flex-col gap-5 max-w-2xl mx-auto">
        <TrainerIntro
          emoji="📐"
          title={isEn ? 'Pot Odds Trainer' : 'Entraîneur Pot Odds'}
          description={isEn
            ? "Learn to calculate whether a call is profitable based on pot odds and your hand equity."
            : "Apprenez à calculer si un appel est rentable selon les pot odds et l'équité de votre main."}
          whatTitle={isEn ? "What are pot odds?" : "Qu'est-ce que les pot odds ?"}
          whatContent={
            <>
              <p className="text-gray-400 text-sm leading-relaxed mb-4">
                <RichLine text={isEn
                  ? "The ratio between the cost of a call and the total pot size. If your equity exceeds this threshold, calling is profitable in the long run."
                  : "Le ratio entre le coût de l'appel et la taille totale du pot. Si votre équité dépasse ce seuil, l'appel est rentable à long terme."} />
              </p>
              <div className="bg-gray-800/60 rounded-xl p-3 border border-gray-700 text-center">
                <div className="text-gold-400 font-mono font-bold text-sm">
                  {isEn ? 'Pot Odds = Call ÷ (Pot + Call)' : 'Pot Odds = Mise ÷ (Pot + Mise)'}
                </div>
                <div className="text-gray-500 text-xs mt-1">
                  <RichLine text={isEn ? 'If your equity > pot odds → Call is +EV' : 'Si votre équité > pot odds → Appeler est +EV'} />
                </div>
              </div>
            </>
          }
          steps={isEn ? [
            '🎯 You see the pot size, the call amount, and your hand',
            '📐 Calculate the pot odds and estimate your equity',
            '♟️ Decide: Call or Fold',
            '📊 The EV (expected value) is calculated and explained step by step',
            '💡 In Beginner mode, the formula and equity threshold are shown',
          ] : [
            '🎯 Vous voyez la taille du pot, le montant à appeler et votre main',
            '📐 Calculez les pot odds et estimez votre équité',
            '♟️ Décidez : Call ou Fold',
            "📊 L'EV (valeur espérée) est calculée et expliquée étape par étape",
            '💡 En mode Débutant, la formule et le seuil d\'équité sont affichés',
          ]}
          beginnerHint={isEn ? "Shows formula, equity hints & EV breakdown" : "Affiche formule, équité & décomposition EV"}
          advancedHint={isEn ? 'No hints — calculate on your own' : 'Sans indices — calculez par vous-même'}
          expertHint={isEn ? 'Premium Expert — the most demanding level, zero help' : 'Premium Expert — le niveau le plus exigeant, aucune aide'}
          startLabel={isEn ? 'Start training' : "Commencer l'entraînement"}
          onStart={handleStart}
          mode={mode}
          examSlot={mode !== 'beginner' ? <ExamLauncher module="potodds" onStart={handleStartExam} /> : undefined}
        />
      </div>
    );
  }

  if (examFinished) {
    return (
      <div className="flex flex-col gap-5 max-w-xl mx-auto pt-4">
        <ExamResult module="potodds" onRetry={handleStartExam} onQuit={handleQuitExam} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 max-w-xl mx-auto">
      {/* Header — replaced by the lives HUD during an exam */}
      {examActive ? (
        <ExamHud onQuit={handleQuitExam} />
      ) : (
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">{t.training.potodds_title}</h2>
            <p className="text-gray-400 text-sm">{t.training.potodds_subtitle}</p>
          </div>
          <button
            onClick={() => { setShowIntro(true); setTrainerStarted(false); }}
            className="text-gray-500 hover:text-gray-300 transition-colors p-1 mt-1 shrink-0"
            title={isEn ? 'Module info' : 'Infos du module'}
          >
            <Info size={14} />
          </button>
        </div>
      )}

      {/* Expert sprint countdown */}
      {phase === 'exercise' && (
        <SprintTimer
          active={examActive && mode === 'expert' && !!ex && !isLoading}
          resetKey={`${ex?.potSize}-${ex?.betSize}-${ex?.heroEquity}`}
          onTimeout={handleTimeout}
        />
      )}

      {/* ── Exercise ── */}
      {phase === 'exercise' && (
        <AnimatePresence mode="wait">
          <motion.div
            key={`${ex?.potSize}-${ex?.betSize}-${ex?.heroEquity}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="flex flex-col gap-4"
          >
            {isLoading ? (
              <Spinner />
            ) : ex ? (
              <>
                {/* Cards display */}
                <CardDisplay heroCards={ex.heroCards as [CardStr, CardStr]} board={ex.board as CardStr[]} street={ex.street} isEn={isEn} />

                {/* Numbers — expert hides equity to force mental outs calculation */}
                {mode === 'expert' ? (
                  <div className="grid grid-cols-2 gap-2">
                    <NumberCard label={t.training.pot_lbl} value={`${ex.potSize}bb`} color="text-white"   icon="🏆" />
                    <NumberCard label={t.training.bet_lbl} value={`${ex.betSize}bb`} color="text-red-400" icon="🎯" />
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    <NumberCard label={t.training.pot_lbl}    value={`${ex.potSize}bb`}   color="text-white"    icon="🏆" />
                    <NumberCard label={t.training.bet_lbl}    value={`${ex.betSize}bb`}   color="text-red-400"  icon="🎯" />
                    <NumberCard label={t.training.equity_lbl} value={`${ex.heroEquity}%`} color="text-blue-400" icon="📊" />
                  </div>
                )}

                {/* Question */}
                <div className="text-center bg-gray-900/60 rounded-xl py-4 border border-gray-700">
                  <p className="text-lg text-white font-semibold">{t.training.profitable_q}</p>
                  <p className="text-sm text-gray-400 mt-1">
                    {t.training.call_costs}<span className="text-white font-bold">{ex.betSize}bb</span>
                  </p>
                </div>

                {/* Action buttons */}
                <div className="flex gap-4">
                  <Button size="xl" variant="danger"  onClick={() => handleAnswer('fold')} fullWidth>Fold</Button>
                  <Button size="xl" variant="primary" onClick={() => handleAnswer('call')} fullWidth>Call</Button>
                </div>

                {/* Guidance below the decision — no scrolling needed to answer. */}
                <BeginnerGuide
                  title={isEn ? 'What you must do' : 'Ce qu\'on te demande'}
                  text={isEn
                    ? `There are already **${ex.potSize}bb** in the middle (the pot). Your opponent bets **${ex.betSize}bb**.\nTo keep playing you must pay these **${ex.betSize}bb** — that's a **Call**. If you don't want to pay, you **Fold**.\n🎲 Your **equity** (${ex.heroEquity}%) is your chance of winning the hand.\n👉 The question: do you win **often enough** to make paying worth it? If your chance to win is bigger than the price you pay, **Call**. If not, **Fold**.`
                    : `Il y a déjà **${ex.potSize}bb** au milieu (le pot). Ton adversaire mise **${ex.betSize}bb**.\nPour continuer à jouer tu dois payer ces **${ex.betSize}bb** — c'est un **Call**. Si tu ne veux pas payer, tu fais **Fold**.\n🎲 Ton **équité** (${ex.heroEquity}%) c'est ta chance de gagner la main.\n👉 La question : est-ce que tu gagnes **assez souvent** pour que ça vaille le coup de payer ? Si ta chance de gagner est plus grande que le prix à payer, fais **Call**. Sinon, fais **Fold**.`}
                />

                {/* Formula + EV reminders — beginner shows them; advanced reveals
                    behind a streak-breaking spoiler; expert hides them. */}
                <SpoilableHint resetKey={`${ex.potSize}-${ex.betSize}-${ex.heroEquity}`} className="w-full">
                  <div className="flex flex-col gap-3 w-full">
                    {/* Concrete coaching hint — this spot's numbers */}
                    <div className="w-full rounded-xl border border-amber-700/40 bg-amber-950/30 px-4 py-3 flex items-start gap-2 text-left">
                      <Lightbulb size={15} className="text-amber-400 mt-0.5 shrink-0" />
                      <div className="text-xs text-gray-300 leading-relaxed">
                        <p className="font-bold text-amber-300 mb-1">{isEn ? 'Hint' : 'Indice'}</p>
                        <p>{potOddsHint(ex.potSize, ex.betSize, ex.heroEquity, isEn)}</p>
                      </div>
                    </div>

                    {/* Formula reminder */}
                    <div className="bg-blue-950/30 border border-blue-900/40 rounded-xl p-3 text-sm text-blue-300 cursor-pointer w-full" onClick={() => setShowFormula(v => !v)}>
                      <div className="flex items-center gap-2 font-semibold">
                        <Calculator size={14} />
                        {t.training.formula_hint} {showFormula ? '▲' : '▼'}
                      </div>
                      <AnimatePresence>
                        {showFormula && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="mt-3 space-y-1 font-mono text-xs border-t border-blue-800/40 pt-3">
                              <p>{t.training.formula1}</p>
                              <p>{t.training.formula2}</p>
                              <p>{t.training.formula3}</p>
                              <p className="text-blue-400 mt-1">{t.training.formula4}</p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* EV explainer */}
                    <div className="bg-purple-950/25 border border-purple-900/40 rounded-xl p-3 text-sm text-purple-200 cursor-pointer w-full" onClick={() => setShowEv(v => !v)}>
                      <div className="flex items-center gap-2 font-semibold">
                        <TrendingUp size={14} />
                        {t.training.ev_how} {showEv ? '▲' : '▼'}
                      </div>
                      <AnimatePresence>
                        {showEv && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="mt-3 space-y-2 text-xs border-t border-purple-800/40 pt-3 leading-relaxed">
                              <p>{t.training.ev_intro}</p>
                              <p className="font-mono text-purple-300 bg-black/20 rounded px-2 py-1.5">{t.training.formula4}</p>
                              <p>• {t.training.ev_win}</p>
                              <p>• {t.training.ev_lose}</p>
                              <p className="text-green-300">✓ {t.training.ev_pos}</p>
                              <p className="text-red-300">✗ {t.training.ev_neg}</p>
                              <p className="text-purple-400/80 italic">{t.training.ev_note}</p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </SpoilableHint>
              </>
            ) : null}
          </motion.div>
        </AnimatePresence>
      )}

      {/* ── Result ── */}
      {phase === 'result' && lastResult && ex && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-5">

          <VerdictBanner isCorrect={lastResult.isCorrect} />

          {/* Cards recap */}
          <CardDisplay heroCards={ex.heroCards as [CardStr, CardStr]} board={ex.board as CardStr[]} street={ex.street} isEn={isEn} dimmed />

          {/* Next button + session stats — hidden during an exam (auto-advances) */}
          {!examActive && (
            <>
              <Button size="lg" variant="gold" onClick={handleNext} fullWidth>
                {t.training.next_ex} <ChevronRight size={18} className="inline" />
              </Button>
              <SessionStatsBar
                total={sessionStats.total}
                correct={sessionStats.correct}
                xp={sessionStats.xp}
              />
            </>
          )}

          {/* Beginner banner */}
          {mode === 'beginner' && (
            <div className="bg-blue-950/30 border border-blue-900/50 rounded-xl px-4 py-2.5 text-xs text-blue-300 flex items-center gap-2">
              <GraduationCap size={13} className="shrink-0" />
              <span>
                {t.training.mode_beginner_banner}{' '}
              </span>
            </div>
          )}

          {/* Step 1 — Equity (beginner only) */}
          {mode === 'beginner' && (
            <StepPanel icon={<Target size={14} className="text-blue-400" />} title={t.training.equity_calc_how} accent="blue">
              <RichText text={equityText} />
            </StepPanel>
          )}

          {/* Step 2 — Threshold (beginner only) */}
          {mode === 'beginner' && (
            <StepPanel icon={<Scale size={14} className="text-yellow-400" />} title={t.training.threshold_how} accent="yellow">
              <RichText text={thresholdText} />
            </StepPanel>
          )}

          {/* Step 3 — Decision — beginner only */}
          {mode === 'beginner' && <StepPanel icon={<Info size={14} className="text-green-400" />} title={t.training.decision_how} accent="green">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-900/60 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-500 mb-1">{t.training.req_equity}</p>
                <p className="text-2xl font-black font-mono text-yellow-400">{lastResult.requiredEquity}%</p>
              </div>
              <div className="bg-gray-900/60 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-500 mb-1">{t.training.equity_lbl}</p>
                <p className={`text-2xl font-black font-mono ${(ex.heroEquity ?? 0) >= (lastResult.requiredEquity ?? 0) ? 'text-green-400' : 'text-red-400'}`}>
                  {ex.heroEquity}%
                </p>
              </div>
            </div>

            <div className="relative mt-4">
              <ProgressBar value={ex.heroEquity} color={(ex.heroEquity ?? 0) >= (lastResult.requiredEquity ?? 0) ? 'green' : 'red'} showValue label={t.training.equity_lbl} size="md" />
              <div className="absolute top-5 h-4 w-0.5 bg-yellow-400" style={{ left: `${lastResult.requiredEquity}%` }} />
              <p className="text-xs text-yellow-400 mt-1" style={{ marginLeft: `${Math.max(0, (lastResult.requiredEquity ?? 0) - 10)}%` }}>
                ▲ {t.training.threshold} ({lastResult.requiredEquity}%)
              </p>
            </div>

            <div className={`mt-4 p-3 rounded-xl text-sm font-bold text-center border ${
              ev >= 0 ? 'bg-green-900/30 text-green-300 border-green-800' : 'bg-red-900/30 text-red-300 border-red-800'
            }`}>
              EV = {ev >= 0 ? '+' : ''}{ev.toFixed(2)}bb {ev >= 0 ? '✓' : '✗'}
            </div>

            {mode === 'beginner' && (
              <div className="mt-3 bg-purple-950/25 border border-purple-900/40 rounded-xl p-3">
                <p className="text-xs font-semibold text-purple-300 flex items-center gap-1.5 mb-1">
                  <TrendingUp size={12} /> {t.training.ev_means}
                </p>
                <p className="text-xs text-gray-300 leading-relaxed">
                  {ev >= 0 ? t.training.ev_gain_txt : t.training.ev_loss_txt}{' '}
                  <span className={`font-bold font-mono ${ev >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {Math.abs(ev).toFixed(2)}bb
                  </span>{' '}
                  {t.training.ev_per_hand}
                </p>
              </div>
            )}
          </StepPanel>}

          {/* Expert result: full calculation breakdown so the user can verify their reasoning */}
          {mode === 'expert' && lastResult && (
            <div className="bg-gray-900/50 rounded-2xl p-4 border border-purple-900/30 space-y-2 font-mono text-sm">
              <p className="text-purple-300 font-semibold font-sans text-xs uppercase tracking-wide">
                {isEn ? 'Calculation' : 'Calcul'}
              </p>
              <p className="text-gray-300">
                {isEn ? 'Equity' : 'Équité'} : {ex.outs} × {ex.street === 'flop' ? 4 : 2} = <span className="text-blue-400 font-bold">{ex.heroEquity}%</span>
              </p>
              <p className="text-gray-300">
                {isEn ? 'Required' : 'Seuil'} : {ex.betSize} ÷ ({ex.potSize}+{ex.betSize * 2}) = <span className="text-yellow-400 font-bold">{lastResult.requiredEquity}%</span>
              </p>
              <div className={`p-2 rounded-lg text-center font-bold ${ev >= 0 ? 'text-green-400 bg-green-900/20' : 'text-red-400 bg-red-900/20'}`}>
                EV = {ev >= 0 ? '+' : ''}{ev.toFixed(2)}bb {ev >= 0 ? '✅' : '❌'}
              </div>
            </div>
          )}

          {/* Explanation — handled by StepPanels above for PotOdds; no ExplanationPanel needed */}

        </motion.div>
      )}
      <SourcesFooter isEn={isEn} sources={POTODDS_SOURCES} methodology={POTODDS_METHODOLOGY} />
    </div>
  );
}

// ─── Step panel ───────────────────────────────────────────────────────────────

function StepPanel({ icon, title, accent, children }: {
  icon: React.ReactNode; title: string; accent: 'blue' | 'yellow' | 'green'; children: React.ReactNode;
}) {
  const border = { blue: 'border-blue-900/40', yellow: 'border-yellow-900/40', green: 'border-green-900/40' }[accent];
  return (
    <div className={`bg-gray-900/50 rounded-2xl p-5 border ${border}`}>
      <p className="text-sm font-bold text-gray-200 flex items-center gap-1.5 mb-3">
        {icon} {title}
      </p>
      {children}
    </div>
  );
}

// ─── Card display ─────────────────────────────────────────────────────────────

function CardDisplay({ heroCards, board, street, isEn, dimmed = false }: {
  heroCards?: [CardStr, CardStr]; board?: CardStr[]; street?: string; isEn: boolean; dimmed?: boolean;
}) {
  if (!heroCards) return null;
  const streetLabel = { flop: 'Flop', turn: 'Turn', river: 'River' }[street ?? ''] ?? '';
  const handLabel = board && board.length > 0
    ? (isEn ? 'Your hand' : 'Votre main')
    : (isEn ? 'Your hand (pre-flop)' : 'Votre main (pré-flop)');

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: dimmed ? 0.7 : 1, y: 0 }}
      className="rounded-2xl border p-4"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, #1a4a2e44, #0d231888)', borderColor: 'rgba(26,74,46,0.4)' }}
    >
      <div className="flex flex-col items-center gap-4">
        {board && board.length > 0 && (
          <>
            <div className="flex flex-col items-center gap-2">
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">{streetLabel}</p>
              <div className="p-3 rounded-xl border" style={{ background: 'rgba(10,53,32,0.6)', borderColor: 'rgba(26,74,46,0.3)' }}>
                <Hand cards={board} size="md" gap="gap-2" />
              </div>
            </div>
            <div className="w-full border-t border-white/5" />
          </>
        )}
        <div className="flex flex-col items-center gap-2">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">{handLabel}</p>
          <div className="p-3 bg-gray-900/60 rounded-xl border border-gray-700/50">
            <Hand cards={heroCards} size="md" gap="gap-2" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Number card ──────────────────────────────────────────────────────────────

function NumberCard({ label, value, color, icon }: { label: string; value: string; color: string; icon: string }) {
  return (
    <div className="bg-gray-800/80 rounded-xl p-3 border border-gray-700 text-center">
      <p className="text-lg mb-1">{icon}</p>
      <p className={`text-xl font-bold font-mono ${color}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}
