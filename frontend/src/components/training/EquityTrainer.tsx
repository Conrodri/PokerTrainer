import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Info } from 'lucide-react';
import { useTrainingStore } from '../../store/trainingStore';
import { Hand } from '../poker/Card';
import { Button } from '../ui/Button';
import { ProgressBar } from '../ui/ProgressBar';
import { SessionStatsBar } from '../ui/SessionStatsBar';
import { VerdictBanner } from '../ui/VerdictBanner';
import { Spinner } from '../ui/Spinner';
import { ExplanationPanel } from '../ui/ExplanationPanel';
import { RichLine } from '../ui/RichText';
import { BeginnerGuide } from '../ui/BeginnerGuide';
import { TrainerIntro } from '../ui/TrainerIntro';
import { useModeStore } from '../../store/modeStore';
import { handToDisplay } from '../../utils/pokerUtils';
import { useT } from '../../i18n';
import { useLangStore } from '../../store/langStore';

type Phase = 'exercise' | 'result';

// ─── Component ────────────────────────────────────────────────────────────────

export function EquityTrainer() {
  const t = useT();
  const isEn = useLangStore(s => s.lang) === 'en';
  const { equityExercise, isLoading, sessionStats, fetchEquityExercise, recordResult, setTrainerStarted } = useTrainingStore();

  const [showIntro, setShowIntro] = useState(true);
  const [phase, setPhase] = useState<Phase>('exercise');
  const [userAnswer, setUserAnswer] = useState<1 | 2 | null>(null);
  const [isCorrect, setIsCorrect] = useState(false);
  const mode = useModeStore(s => s.mode);

  useEffect(() => {
    if (phase === 'result') window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [phase]);

  const handleAnswer = (hand: 1 | 2) => {
    if (!equityExercise) return;
    const winner = equityExercise.hand1Equity > equityExercise.hand2Equity ? 1 : 2;
    const correct = hand === winner;
    setUserAnswer(hand);
    setIsCorrect(correct);
    setPhase('result');
    recordResult(correct, correct ? 15 : 5, 'equity');
  };

  const handleStart = async () => {
    setShowIntro(false);
    setTrainerStarted(true);
    await fetchEquityExercise();
  };

  const handleNext = async () => {
    setPhase('exercise');
    setUserAnswer(null);
    setIsCorrect(false);
    await fetchEquityExercise();
  };

  // Beginner gets the simple explanation; advanced AND expert get the detailed one.
  const currentExplanation = equityExercise
    ? (mode === 'beginner' ? equityExercise.explanation : equityExercise.explanationAdvanced)
    : '';

  if (showIntro) {
    return (
      <div className="flex flex-col gap-5 max-w-2xl mx-auto">
        <TrainerIntro
          emoji="⚖️"
          title={isEn ? 'Equity Trainer' : 'Entraîneur Équité'}
          description={isEn
            ? 'Compare two hands and identify which has the higher equity before the showdown.'
            : 'Comparez deux mains et identifiez celle qui a la plus forte équité avant le showdown.'}
          whatTitle={isEn ? 'What is equity?' : "Qu'est-ce que l'équité ?"}
          whatContent={
            <>
              <p className="text-gray-400 text-xs leading-snug mb-2.5">
                <RichLine text={isEn
                  ? 'Your percentage chance of winning the pot at showdown. Two hands can be close (55/45) or very unbalanced (80/20) depending on the board and card combinations.'
                  : 'Le pourcentage de chances de gagner le pot au showdown. Deux mains peuvent être proches (55/45) ou très déséquilibrées (80/20) selon le board et les combinaisons de cartes.'} />
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { emoji: '🔴', label: isEn ? 'Dominated hand' : 'Main dominée', desc: isEn ? 'e.g. A♠K♦ vs A♣K♣ — 30/70' : 'ex. A♠K♦ vs A♣K♣ — 30/70' },
                  { emoji: '🟡', label: isEn ? 'Coin flip' : 'Coin flip', desc: isEn ? 'e.g. J♠J♦ vs A♠K♠ — 53/47' : 'ex. V♠V♦ vs A♠K♠ — 53/47' },
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
            '🎯 Two hands are displayed (with or without a board)',
            '⚖️ Choose which hand has the higher equity',
            '📊 Monte Carlo simulation (5,000 iterations) gives the exact result',
            '💡 Analysis of key factors: raw strength, blockers, board texture',
          ] : [
            '🎯 Deux mains sont affichées (avec ou sans board)',
            '⚖️ Choisissez laquelle a la plus forte équité',
            '📊 Simulation Monte Carlo (5 000 itérations) donne le résultat exact',
            '💡 Analyse des facteurs clés : force brute, blockers, texture du board',
          ]}
          beginnerHint={isEn ? "Shows hand strengths & equity hints" : "Affiche la force des mains & l'équité"}
          advancedHint={isEn ? 'No hints — trust your read' : 'Sans indices — faites confiance à votre lecture'}
          startLabel={isEn ? 'Start training' : "Commencer l'entraînement"}
          onStart={handleStart}
          mode={mode}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">{t.training.equity_title}</h2>
          <p className="text-gray-400 text-sm">{t.training.equity_subtitle}</p>
        </div>
        <button
          onClick={() => { setShowIntro(true); setTrainerStarted(false); }}
          className="text-gray-500 hover:text-gray-300 transition-colors p-1 mt-1 shrink-0"
          title={isEn ? 'Module info' : 'Infos du module'}
        >
          <Info size={14} />
        </button>
      </div>

      {/* ── Exercise ── */}
      {phase === 'exercise' && (
        <AnimatePresence mode="wait">
          <motion.div
            key={equityExercise?.hand1Notation}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col gap-5"
          >
            {isLoading ? (
              <Spinner />
            ) : equityExercise ? (
              <>
                {/* Beginner explanation of the exercise — collapsed by default */}
                <BeginnerGuide
                  title={isEn ? 'What you must do' : 'Ce qu\'on te demande'}
                  text={isEn
                    ? `Two players show their cards. ${equityExercise.board.length > 0 ? 'Some shared cards (the board) are already on the table.' : 'No shared card yet — this is pre-flop.'}\n**Equity** = the chance a hand has to win if we go all the way to the end.\n👉 Your job: just guess **which of the two hands is more likely to win**. Tap on Hand 1 or Hand 2.\n💡 A bigger pair, two high cards, or cards that fit the board usually win more often.`
                    : `Deux joueurs montrent leurs cartes. ${equityExercise.board.length > 0 ? 'Des cartes communes (le board) sont déjà sur la table.' : 'Aucune carte commune encore — on est pré-flop.'}\nL'**équité** = la chance qu'a une main de gagner si on va jusqu'au bout.\n👉 Ton travail : devine simplement **quelle main a le plus de chances de gagner**. Clique sur Main 1 ou Main 2.\n💡 Une plus grosse paire, deux grosses cartes, ou des cartes qui collent au board gagnent plus souvent.`}
                />

                {/* Board */}
                {equityExercise.board.length > 0 && (
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center gap-2">
                      <div className="h-px flex-1 bg-gray-800" />
                      <p className="text-gray-500 text-xs uppercase tracking-wider font-semibold">
                        {equityExercise.board.length === 3 ? 'Flop' : equityExercise.board.length === 4 ? 'Turn' : 'River'}
                      </p>
                      <div className="h-px flex-1 bg-gray-800" />
                    </div>
                    <div className="p-3 rounded-xl border border-felt-800/40" style={{ background: 'rgba(10,53,32,0.5)' }}>
                      <Hand cards={equityExercise.board} size="md" />
                    </div>
                  </div>
                )}

                {/* Question */}
                <p className="text-center text-white font-semibold text-lg">
                  {isEn ? 'Which hand has more equity?' : "Quelle main a le plus d'equity ?"}
                </p>

                {/* Hand buttons */}
                <div className="grid grid-cols-2 gap-4">
                  {([1, 2] as const).map(handNum => {
                    const hand = handNum === 1 ? equityExercise.hand1 : equityExercise.hand2;
                    const notation = handNum === 1 ? equityExercise.hand1Notation : equityExercise.hand2Notation;
                    return (
                      <motion.button
                        key={handNum}
                        onClick={() => handleAnswer(handNum)}
                        whileHover={{ scale: 1.03, borderColor: '#a78bfa' }}
                        whileTap={{ scale: 0.97 }}
                        className="bg-gray-800/80 border-2 border-gray-600 rounded-2xl p-5 flex flex-col items-center gap-3 cursor-pointer transition-all group"
                      >
                        <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide">
                          {t.training.hand_lbl} {handNum}
                        </p>
                        <Hand cards={hand} size="md" />
                        <p className="text-gold-400 font-mono font-bold text-lg">{handToDisplay(notation)}</p>
                        <p className="text-purple-400 text-xs font-semibold group-hover:text-purple-300">
                          {t.training.select_hand}
                        </p>
                      </motion.button>
                    );
                  })}
                </div>

                <p className="text-center text-gray-500 text-xs">
                  {equityExercise.board.length === 0
                    ? (isEn ? 'Pre-flop equity' : 'Equity pré-flop')
                    : `${isEn ? 'Board with' : 'Board à'} ${equityExercise.board.length} ${isEn ? 'cards' : 'cartes'}`}
                </p>
              </>
            ) : null}
          </motion.div>
        </AnimatePresence>
      )}

      {/* ── Result ── */}
      {phase === 'result' && equityExercise && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-5">

          {/* Verdict */}
          <VerdictBanner isCorrect={isCorrect} />

          {/* Equity comparison */}
          <div className="bg-gray-800/60 rounded-2xl p-5 border border-gray-700 space-y-4">
            <p className="font-semibold text-gray-300 text-sm flex items-center gap-1.5">
              <Info size={14} /> {t.training.real_equity}
            </p>

            {([1, 2] as const).map(handNum => {
              const notation = handNum === 1 ? equityExercise.hand1Notation : equityExercise.hand2Notation;
              const hand     = handNum === 1 ? equityExercise.hand1 : equityExercise.hand2;
              const equity   = handNum === 1 ? equityExercise.hand1Equity : equityExercise.hand2Equity;
              const isWinner = handNum === (equityExercise.hand1Equity > equityExercise.hand2Equity ? 1 : 2);
              const wasSelected = userAnswer === handNum;

              return (
                <div key={handNum} className={`p-3 rounded-xl border ${isWinner ? 'border-green-600/50 bg-green-900/15' : 'border-gray-700 bg-gray-900/40'}`}>
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <Hand cards={hand} size="sm" animate={false} />
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-gold-400 font-bold">{handToDisplay(notation)}</span>
                      {wasSelected && (
                        <span className="text-xs bg-blue-900/60 text-blue-300 px-2 py-0.5 rounded-full border border-blue-800">
                          {t.training.your_choice}
                        </span>
                      )}
                      {isWinner && (
                        <span className="text-xs bg-green-900/60 text-green-300 px-2 py-0.5 rounded-full border border-green-800">
                          {t.training.winner_lbl}
                        </span>
                      )}
                    </div>
                    <span className={`ml-auto font-mono font-black text-xl ${isWinner ? 'text-green-400' : 'text-gray-400'}`}>
                      {equity}%
                    </span>
                  </div>
                  <ProgressBar value={equity} color={isWinner ? 'green' : 'red'} size="sm" />
                </div>
              );
            })}

            {equityExercise.hand1Equity + equityExercise.hand2Equity < 99 && (
              <p className="text-xs text-gray-500 text-center">
                {t.training.draw_lbl} {(100 - equityExercise.hand1Equity - equityExercise.hand2Equity).toFixed(1)}%
              </p>
            )}

            {equityExercise.board.length > 0 && (
              <div className="flex flex-col items-center gap-1.5 pt-2 border-t border-gray-700">
                <p className="text-xs text-gray-500 uppercase tracking-wide">{t.training.board_lbl}</p>
                <Hand cards={equityExercise.board} size="sm" animate={false} />
              </div>
            )}
          </div>

          {/* Next button */}
          <Button size="lg" variant="gold" onClick={handleNext} fullWidth>
            {t.training.next_ex} <ChevronRight size={18} className="inline" />
          </Button>

          {/* Session stats */}
          <SessionStatsBar
            total={sessionStats.total}
            correct={sessionStats.correct}
            streak={sessionStats.streak}
            xp={sessionStats.xp}
          />

          {/* Explanation — beginner only */}
          <ExplanationPanel text={currentExplanation} />
        </motion.div>
      )}
    </div>
  );
}
