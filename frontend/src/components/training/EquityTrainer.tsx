import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Info, Lightbulb, Trophy } from 'lucide-react';
import { useTrainingStore } from '../../store/trainingStore';
import { Button } from '../ui/Button';
import { SessionStatsBar } from '../ui/SessionStatsBar';
import { VerdictBanner } from '../ui/VerdictBanner';
import { Spinner } from '../ui/Spinner';
import { ExplanationPanel } from '../ui/ExplanationPanel';
import { BeginnerGuide } from '../ui/BeginnerGuide';
import { SpoilableHint } from '../ui/SpoilableHint';
import { TrainerIntro } from '../ui/TrainerIntro';
import { useModeStore } from '../../store/modeStore';
import { useT } from '../../i18n';
import { useLangStore } from '../../store/langStore';
import { useExerciseLock } from '../../hooks/useExerciseLock';
import { useExamRunner } from '../../hooks/useExamRunner';
import { ExamLauncher, ExamHud, ExamResult } from './ExamMode';
import { useShallow } from 'zustand/react/shallow';
import { SourcesFooter } from '../ui/SourcesFooter';
import type { Source } from '../ui/SourcesFooter';

const EQUITY_SOURCES: Source[] = [
  { authors: 'Sklansky, D.', title: 'The Theory of Poker', year: '1994', note: { fr: 'Cotes du pot et équité requise pour appeler', en: 'Pot odds and required equity to call' } },
  { authors: 'Chen, B. & Ankenman, J.', title: 'The Mathematics of Poker', year: '2006', note: { fr: 'Formule de break-even et espérance de valeur', en: 'Break-even formula and expected value' } },
];
const EQUITY_METHODOLOGY = {
  fr: 'Les exercices sont générés aléatoirement à partir de tailles de mises réalistes (1/3 à 1.25x pot) et de pots courants en cash game 6-max. La formule appliquée est : équité requise = appel / (pot + mise + appel).',
  en: 'Exercises are randomly generated from realistic bet sizes (1/3 to 1.25x pot) and common 6-max cash game pots. The formula applied is: required equity = call / (pot + bet + call).',
};

const STREET_COLORS: Record<string, string> = {
  flop:  'bg-green-900/30 text-green-300 border-green-700/50',
  turn:  'bg-blue-900/30 text-blue-300 border-blue-700/50',
  river: 'bg-purple-900/30 text-purple-300 border-purple-700/50',
};
const STREET_LABEL_FR: Record<string, string> = { flop: 'Flop', turn: 'Turn', river: 'River' };
const STREET_LABEL_EN: Record<string, string> = { flop: 'Flop', turn: 'Turn', river: 'River' };

type Phase = 'exercise' | 'result';

// ─── Component ────────────────────────────────────────────────────────────────

export function EquityTrainer() {
  const t    = useT();
  const isEn = useLangStore(s => s.lang) === 'en';
  const { equityExercise, isLoading, error, sessionStats, fetchEquityExercise, recordResult, setTrainerStarted } =
    useTrainingStore(useShallow(s => ({
      equityExercise:    s.equityExercise,
      isLoading:         s.isLoading,
      error:             s.error,
      sessionStats:      s.sessionStats,
      fetchEquityExercise: s.fetchEquityExercise,
      recordResult:      s.recordResult,
      setTrainerStarted: s.setTrainerStarted,
    })));

  const [showIntro, setShowIntro] = useState(true);
  const [phase, setPhase]         = useState<Phase>('exercise');
  const [picked, setPicked]       = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState(false);
  const mode = useModeStore(s => s.mode);

  useEffect(() => {
    if (phase === 'result') window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [phase]);

  useExerciseLock(!showIntro && phase === 'exercise' && !!equityExercise && !isLoading);

  const { examActive, examFinished, startRun, quitRun, recordAnswer } = useExamRunner('equity');

  const handleNext = async () => {
    setPhase('exercise');
    setPicked(null);
    setIsCorrect(false);
    await fetchEquityExercise();
  };

  const handleAnswer = (option: number) => {
    if (!equityExercise || picked !== null) return;
    const correct      = Math.round(equityExercise.requiredEquity);
    const isRight      = option === correct;
    setPicked(option);
    setIsCorrect(isRight);
    setPhase('result');
    recordResult(isRight, isRight ? 15 : 5, 'equity');
    if (examActive) recordAnswer(isRight, handleNext);
  };

  const handleStart = async () => {
    quitRun();
    setShowIntro(false);
    setTrainerStarted(true);
    await fetchEquityExercise();
  };

  const handleStartExam = async () => {
    startRun();
    setShowIntro(false);
    setTrainerStarted(true);
    setPicked(null);
    setIsCorrect(false);
    setPhase('exercise');
    await fetchEquityExercise();
  };

  const handleQuitExam = () => {
    quitRun();
    setShowIntro(true);
    setTrainerStarted(false);
    setPhase('exercise');
  };

  const currentExplanation = equityExercise
    ? (mode === 'beginner' ? equityExercise.explanation : equityExercise.explanationAdvanced)
    : '';

  // ── Intro ──────────────────────────────────────────────────────────────────
  if (showIntro) {
    return (
      <div className="flex flex-col gap-5 max-w-2xl mx-auto">
        <TrainerIntro
          emoji="⚖️"
          title={isEn ? 'Required Equity Trainer' : 'Entraîneur Équité Requise'}
          description={isEn
            ? 'Given a pot size and a villain bet, calculate the minimum equity you need to make a profitable call.'
            : 'Calculez l\'équité minimale nécessaire pour rentabiliser un appel, en fonction du pot et de la mise adverse.'}
          whatTitle={isEn ? 'What is required equity?' : "Qu'est-ce que l'équité requise ?"}
          whatContent={
            <>
              <p className="text-gray-400 text-xs leading-snug mb-2.5">
                {isEn
                  ? 'When villain bets, calling is only profitable if your chance of winning (equity) exceeds the mathematical threshold imposed by the pot odds.'
                  : 'Quand vilain mise, appeler n\'est rentable que si votre chance de gagner (équité) dépasse le seuil mathématique imposé par les cotes du pot.'}
              </p>
              <div className="bg-gray-800/50 rounded-xl p-3 border border-gray-700 font-mono text-sm text-center mb-2">
                <p className="text-gray-400 text-xs mb-1">{isEn ? 'Formula' : 'Formule'}</p>
                <p className="text-white font-bold">
                  {isEn ? 'Equity = Call ÷ (Pot + Bet + Call)' : 'Équité = Appel ÷ (Pot + Mise + Appel)'}
                </p>
              </div>
              <div className="bg-gray-800/30 rounded-lg px-3 py-2 text-xs text-gray-400">
                {isEn
                  ? '→ Example: Pot 15 BB, bet 5 BB → 5 ÷ (15 + 5 + 5) = 5/25 = 20%'
                  : '→ Exemple : Pot 15 BB, mise 5 BB → 5 ÷ (15 + 5 + 5) = 5/25 = 20%'}
              </div>
            </>
          }
          steps={isEn ? [
            '🎯 A street is shown with the pot size and villain\'s bet',
            '🧮 Calculate the minimum equity to call profitably',
            '✅ Choose from 4 percentage options',
            '📊 See the full calculation breakdown with explanation',
          ] : [
            '🎯 Un spot est affiché avec le pot et la mise de vilain',
            '🧮 Calculez l\'équité minimale pour appeler en profit',
            '✅ Choisissez parmi 4 options en pourcentage',
            '📊 Visualisez le calcul complet avec explication',
          ]}
          beginnerHint={isEn ? 'Formula shown step by step' : 'Formule affichée étape par étape'}
          advancedHint={isEn ? 'No formula — calculate mentally' : 'Sans formule — calculez de tête'}
          expertHint={isEn ? 'Tournament bounty — adjusted calculation' : 'Tournoi avec bounty — calcul ajusté'}
          startLabel={isEn ? 'Start training' : "Commencer l'entraînement"}
          onStart={handleStart}
          mode={mode}
          examSlot={mode !== 'beginner' ? <ExamLauncher module="equity" onStart={handleStartExam} /> : undefined}
        />
      </div>
    );
  }

  if (examFinished) {
    return (
      <div className="flex flex-col gap-6 max-w-xl mx-auto pt-4">
        <ExamResult module="equity" onRetry={handleStartExam} onQuit={handleQuitExam} />
      </div>
    );
  }

  const ex = equityExercise;
  const resetKey = ex ? `${ex.potBB}-${ex.betBB}-${ex.street}` : 'loading';
  const correctInt = ex ? Math.round(ex.requiredEquity) : 0;

  return (
    <div className="flex flex-col gap-6 max-w-xl mx-auto">

      {/* Header */}
      {examActive ? (
        <ExamHud onQuit={handleQuitExam} />
      ) : (
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">
              {isEn ? 'Required Equity' : 'Équité Requise'}
            </h2>
            <p className="text-gray-400 text-sm">
              {isEn ? 'What % equity to call villain?' : 'Quelle % d\'équité pour call vilain ?'}
            </p>
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

      {/* Exercise */}
      {phase === 'exercise' && (
        <AnimatePresence mode="wait">
          <motion.div
            key={resetKey}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-5"
          >
            {isLoading ? (
              <Spinner />
            ) : ex ? (
              <>
                {/* Street badge */}
                <div className="flex justify-center">
                  <span className={`px-4 py-1 rounded-full border text-xs font-bold ${STREET_COLORS[ex.street]}`}>
                    {isEn ? STREET_LABEL_EN[ex.street] : STREET_LABEL_FR[ex.street]}
                  </span>
                </div>

                {/* Spot info card */}
                <div className="rounded-2xl border border-gray-700 bg-gray-800/50 divide-y divide-gray-700/60">
                  <div className="flex items-center justify-between px-5 py-3">
                    <span className="text-gray-400 text-sm">{isEn ? 'Pot' : 'Pot'}</span>
                    <span className="font-mono font-bold text-white text-lg">{ex.potBB} BB</span>
                  </div>
                  <div className="flex items-center justify-between px-5 py-3">
                    <span className="text-gray-400 text-sm">
                      {isEn ? `Villain (${ex.villainPosition}) bets` : `Vilain (${ex.villainPosition}) mise`}
                      <span className="ml-2 text-xs text-gray-600">({ex.betFractionLabel})</span>
                    </span>
                    <span className="font-mono font-bold text-amber-400 text-lg">{ex.betBB} BB</span>
                  </div>
                  {/* Expert: bounty */}
                  {ex.hasBounty && (
                    <div className="flex items-center justify-between px-5 py-3 bg-yellow-900/10">
                      <span className="text-yellow-400 text-sm flex items-center gap-1.5">
                        <Trophy size={13} />
                        {isEn ? 'Tournament bounty at stake' : 'Bounty en jeu (tournoi)'}
                      </span>
                      <span className="font-mono font-bold text-yellow-300 text-lg">{ex.bountyBB} BB</span>
                    </div>
                  )}
                </div>

                {/* Question */}
                <p className="text-center text-white font-semibold text-lg">
                  {ex.hasBounty
                    ? (isEn ? 'With this bounty, what minimum equity to call?' : 'Avec ce bounty, quelle équité minimale pour appeler ?')
                    : (isEn ? 'What minimum equity do you need to call?' : 'Quelle équité minimale pour appeler ?')}
                </p>

                {/* 4 option buttons */}
                <div className="grid grid-cols-2 gap-3">
                  {ex.options.map(opt => (
                    <motion.button
                      key={opt}
                      onClick={() => handleAnswer(opt)}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      className="bg-gray-800/80 border-2 border-gray-600 hover:border-purple-500 rounded-xl p-4 text-white font-mono font-bold text-2xl transition-all"
                    >
                      {opt}%
                    </motion.button>
                  ))}
                </div>

                {/* Beginner guide */}
                <BeginnerGuide
                  title={isEn ? 'How to calculate' : 'Comment calculer'}
                  text={isEn
                    ? `Use the pot odds formula:\n**Equity = Call ÷ (Pot + Bet + Call)**\n→ Call = ${ex.betBB} BB (you must match villain's bet)\n→ Total pot = ${ex.potBB} + ${ex.betBB} + ${ex.betBB} = ${ex.potBB + 2 * ex.betBB} BB\n→ Required equity = ${ex.betBB} ÷ ${ex.potBB + 2 * ex.betBB} = **${ex.requiredEquity}%**${ex.hasBounty ? `\n\n🏆 **With bounty:** total value = ${ex.potBB + 2 * ex.betBB} + ${ex.bountyBB} = ${ex.potBB + 2 * ex.betBB + ex.bountyBB} BB\n→ Adjusted equity = ${ex.betBB} ÷ ${ex.potBB + 2 * ex.betBB + ex.bountyBB} = **${ex.requiredEquityBounty}%**` : ''}`
                    : `Utilisez la formule des cotes du pot :\n**Équité = Appel ÷ (Pot + Mise + Appel)**\n→ Appel = ${ex.betBB} BB (vous devez matcher la mise de vilain)\n→ Pot total = ${ex.potBB} + ${ex.betBB} + ${ex.betBB} = ${ex.potBB + 2 * ex.betBB} BB\n→ Équité requise = ${ex.betBB} ÷ ${ex.potBB + 2 * ex.betBB} = **${ex.requiredEquity}%**${ex.hasBounty ? `\n\n🏆 **Avec bounty :** valeur totale = ${ex.potBB + 2 * ex.betBB} + ${ex.bountyBB} = ${ex.potBB + 2 * ex.betBB + ex.bountyBB} BB\n→ Équité ajustée = ${ex.betBB} ÷ ${ex.potBB + 2 * ex.betBB + ex.bountyBB} = **${ex.requiredEquityBounty}%**` : ''}`}
                />

                {/* Spoilable hint */}
                <SpoilableHint resetKey={resetKey} className="w-full">
                  <div className="w-full rounded-xl border border-amber-700/40 bg-amber-950/30 px-4 py-3 flex items-start gap-2 text-left">
                    <Lightbulb size={15} className="text-amber-400 mt-0.5 shrink-0" />
                    <div className="text-xs text-gray-300 leading-relaxed">
                      <p className="font-bold text-amber-300 mb-1">{isEn ? 'Hint' : 'Indice'}</p>
                      <p>• {isEn
                        ? `Call = ${ex.betBB} BB. Total pot if you call = ${ex.potBB + 2 * ex.betBB} BB.`
                        : `Appel = ${ex.betBB} BB. Pot total si vous appelez = ${ex.potBB + 2 * ex.betBB} BB.`}</p>
                      <p>• {isEn ? 'Divide: call ÷ total pot.' : 'Divisez : appel ÷ pot total.'}</p>
                      {ex.hasBounty && (
                        <p>• {isEn
                          ? `Add the bounty (${ex.bountyBB} BB) to the total pot before dividing.`
                          : `Ajoutez le bounty (${ex.bountyBB} BB) au pot total avant de diviser.`}</p>
                      )}
                    </div>
                  </div>
                </SpoilableHint>
              </>
            ) : (
              <div className="flex flex-col items-center gap-4 py-10 text-center">
                <p className="text-gray-400 text-sm">
                  {error || (isEn ? 'Failed to load exercise' : 'Impossible de charger l\'exercice')}
                </p>
                <Button variant="secondary" onClick={fetchEquityExercise}>
                  {isEn ? 'Retry' : 'Réessayer'}
                </Button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Result */}
      {phase === 'result' && ex && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-5">

          <VerdictBanner isCorrect={isCorrect} />

          {/* Calculation breakdown */}
          <div className="rounded-2xl border border-gray-700 bg-gray-800/50 p-5 space-y-4">
            <p className="text-sm font-semibold text-gray-300">
              {isEn ? 'Calculation' : 'Calcul'}
            </p>

            {/* Formula */}
            <div className="bg-gray-900/60 rounded-xl p-4 font-mono text-sm space-y-1.5">
              <p className="text-gray-500 text-xs mb-2">
                {isEn ? 'Required equity = call ÷ (pot + bet + call)' : 'Équité requise = appel ÷ (pot + mise + appel)'}
              </p>
              <p className="text-white">
                = <span className="text-amber-400">{ex.betBB}</span>
                {' '}÷ ({ex.potBB} + {ex.betBB} + {ex.betBB})
              </p>
              <p className="text-white">
                = <span className="text-amber-400">{ex.betBB}</span>
                {' '}÷{' '}
                <span className="text-white">{ex.potBB + 2 * ex.betBB}</span>
              </p>
              <p className="text-green-400 font-bold text-base">
                = {ex.requiredEquity}%
              </p>
            </div>

            {/* Expert bounty breakdown */}
            {ex.hasBounty && (
              <div className="bg-yellow-900/10 border border-yellow-700/30 rounded-xl p-4 font-mono text-sm space-y-1.5">
                <p className="text-yellow-400 text-xs font-semibold mb-2 flex items-center gap-1">
                  <Trophy size={11} />
                  {isEn ? 'With bounty adjustment' : 'Avec ajustement bounty'}
                </p>
                <p className="text-gray-300">
                  {isEn ? 'Effective pot' : 'Pot effectif'} = {ex.potBB + 2 * ex.betBB} + <span className="text-yellow-400">{ex.bountyBB}</span> = {ex.potBB + 2 * ex.betBB + ex.bountyBB} BB
                </p>
                <p className="text-white">
                  = {ex.betBB} ÷ {ex.potBB + 2 * ex.betBB + ex.bountyBB}
                </p>
                <p className="text-yellow-300 font-bold text-base">
                  = {ex.requiredEquityBounty}%
                  <span className="text-xs text-yellow-600 ml-2">
                    ({isEn ? `${(ex.requiredEquity - ex.requiredEquityBounty).toFixed(1)}% saved vs no bounty` : `${(ex.requiredEquity - ex.requiredEquityBounty).toFixed(1)}% économisés vs sans bounty`})
                  </span>
                </p>
              </div>
            )}

            {/* Your answer vs correct */}
            <div className="flex items-center gap-3 text-sm pt-1">
              <span className="text-gray-400">{isEn ? 'Your answer' : 'Votre réponse'} :</span>
              <span className={`font-mono font-bold text-lg ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                {picked}%
              </span>
              {!isCorrect && (
                <>
                  <span className="text-gray-600">→</span>
                  <span className="text-gray-400">{isEn ? 'Correct' : 'Correct'} :</span>
                  <span className="font-mono font-bold text-lg text-green-400">{correctInt}%</span>
                </>
              )}
            </div>
          </div>

          {/* Next + stats */}
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

          {!examActive && <ExplanationPanel text={currentExplanation} />}
        </motion.div>
      )}

      <SourcesFooter isEn={isEn} sources={EQUITY_SOURCES} methodology={EQUITY_METHODOLOGY} />
    </div>
  );
}
