import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Target, Lightbulb, Info } from 'lucide-react';
import { useTrainingStore } from '../../store/trainingStore';
import { Hand } from '../poker/Card';
import { Button } from '../ui/Button';
import { SessionStatsBar } from '../ui/SessionStatsBar';
import { VerdictBanner } from '../ui/VerdictBanner';
import { Spinner } from '../ui/Spinner';
import { ExplanationPanel } from '../ui/ExplanationPanel';
import { BeginnerGuide } from '../ui/BeginnerGuide';
import { SpoilableHint } from '../ui/SpoilableHint';
import { TrainerIntro } from '../ui/TrainerIntro';
import { useModeStore } from '../../store/modeStore';
import { CardStr } from '../../types/poker';
import { RichLine } from '../ui/RichText';
import { useT } from '../../i18n';
import { useLangStore } from '../../store/langStore';
import { useExerciseLock } from '../../hooks/useExerciseLock';
import { useShallow } from 'zustand/react/shallow';
import { useExamRunner } from '../../hooks/useExamRunner';
import { ExamLauncher, ExamHud, ExamResult } from './ExamMode';

type Phase = 'exercise' | 'result';

// ─── Component ────────────────────────────────────────────────────────────────

export function OutsTrainer() {
  const t = useT();
  const isEn = useLangStore(s => s.lang) === 'en';
  const { outsExercise, isLoading, sessionStats, fetchOutsExercise, recordResult, setTrainerStarted } = useTrainingStore(
    useShallow(s => ({ outsExercise: s.outsExercise, isLoading: s.isLoading, sessionStats: s.sessionStats, fetchOutsExercise: s.fetchOutsExercise, recordResult: s.recordResult, setTrainerStarted: s.setTrainerStarted }))
  );

  const [showIntro, setShowIntro] = useState(true);
  const [phase, setPhase] = useState<Phase>('exercise');
  const [selected, setSelected] = useState<number | null>(null);
  const mode = useModeStore(s => s.mode);

  // Exam mode (advanced/expert): loop exercises until 3 errors; score = correct.
  const { examActive, examFinished, startRun, quitRun, recordAnswer } = useExamRunner('outs');

  useEffect(() => {
    if (phase === 'result') window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [phase]);

  // Lock mode switching while a question is on screen.
  useExerciseLock(!showIntro && phase === 'exercise' && !!outsExercise && !isLoading);

  const handleNext = async () => {
    setPhase('exercise');
    setSelected(null);
    await fetchOutsExercise();
  };

  const handleAnswer = (value: number) => {
    if (!outsExercise) return;
    const correct = value === outsExercise.outs;
    setSelected(value);
    setPhase('result');
    recordResult(correct, correct ? 15 : 5, 'outs');
    if (examActive) recordAnswer(correct, handleNext);
  };

  const handleStart = async () => {
    quitRun();              // clear any leftover exam state — normal mode never shows the lives HUD / auto-advance
    setShowIntro(false);
    setTrainerStarted(true);
    await fetchOutsExercise();
  };

  const handleStartExam = async () => {
    startRun();
    setShowIntro(false);
    setTrainerStarted(true);
    setSelected(null);
    setPhase('exercise');
    await fetchOutsExercise();
  };

  const handleQuitExam = () => {
    quitRun();
    setShowIntro(true);
    setTrainerStarted(false);
    setSelected(null);
    setPhase('exercise');
  };

  const isCorrect = !!outsExercise && selected === outsExercise.outs;
  const ex = outsExercise;
  const streetLabel = ex ? { flop: 'Flop', turn: 'Turn' }[ex.street] : '';

  if (showIntro) {
    return (
      <div className="flex flex-col gap-5 max-w-2xl mx-auto">
        <TrainerIntro
          emoji="🔢"
          title={isEn ? 'Outs Trainer' : 'Entraîneur Outs'}
          description={isEn
            ? "Count your outs and estimate your chances of improving your hand on the next card."
            : "Comptez vos outs et estimez vos chances d'améliorer votre main sur la prochaine carte."}
          whatTitle={isEn ? "What are outs?" : "Qu'est-ce que les outs ?"}
          whatContent={
            <>
              <p className="text-gray-400 text-xs leading-snug mb-2.5">
                <RichLine text={isEn
                  ? "A card remaining in the deck that improves your hand. For example, with a flush draw (4 cards of the same suit), there are 9 remaining cards of that suit = 9 outs."
                  : "Une carte restante dans le deck qui améliore votre main. Exemple : avec un tirage couleur (4 cartes de la même couleur), il reste 9 cartes de cette couleur = 9 outs."} />
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { emoji: '🔵', label: isEn ? 'Flop → ×4' : 'Flop → ×4', desc: isEn ? '2 cards to come — multiply outs by 4' : '2 cartes à venir — outs × 4' },
                  { emoji: '🟡', label: isEn ? 'Turn → ×2' : 'Turn → ×2', desc: isEn ? '1 card to come — multiply outs by 2' : '1 carte à venir — outs × 2' },
                ].map(s => (
                  <div key={s.label} className="bg-gray-800/50 rounded-lg px-2 py-1.5 border border-gray-700 text-center">
                    <div className="text-base mb-0.5">{s.emoji}</div>
                    <div className="text-white font-bold text-xs">{s.label}</div>
                    <div className="text-gray-500 text-[10px] mt-0.5 leading-tight"><RichLine text={s.desc} /></div>
                  </div>
                ))}
              </div>
            </>
          }
          steps={isEn ? [
            '🃏 You see your hand + the board (flop or turn)',
            '🔢 Count the exact number of outs that improve your hand',
            '🎯 Choose the correct number from the options',
            '💡 Each out is explained: flush draw, straight draw, pair...',
          ] : [
            '🃏 Vous voyez votre main + le board (flop ou turn)',
            "🔢 Comptez le nombre exact d'outs qui améliorent votre main",
            '🎯 Choisissez le bon nombre parmi les options',
            '💡 Chaque out est expliqué : tirage couleur, quinte, paire...',
          ]}
          beginnerHint={isEn ? "Shows draw type hints & rule of 2/4" : "Affiche le type de tirage & règle 2/4"}
          advancedHint={isEn ? 'No hints — count from scratch' : 'Sans indices — comptez de tête'}
          expertHint={isEn ? 'Premium Expert — the most demanding level, zero help' : 'Premium Expert — le niveau le plus exigeant, aucune aide'}
          startLabel={isEn ? 'Start training' : "Commencer l'entraînement"}
          onStart={handleStart}
          mode={mode}
          examSlot={mode !== 'beginner' ? <ExamLauncher module="outs" onStart={handleStartExam} /> : undefined}
        />
      </div>
    );
  }

  if (examFinished) {
    return (
      <div className="flex flex-col gap-6 max-w-xl mx-auto pt-4">
        <ExamResult module="outs" onRetry={handleStartExam} onQuit={handleQuitExam} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-xl mx-auto">

      {/* Header — replaced by the lives HUD during an exam */}
      {examActive ? (
        <ExamHud onQuit={handleQuitExam} />
      ) : (
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">{t.training.outs_title}</h2>
            <p className="text-gray-400 text-sm">{t.training.outs_subtitle}</p>
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

      {/* ── Exercise ── */}
      {phase === 'exercise' && (
        <AnimatePresence mode="wait">
          <motion.div
            key={`${ex?.heroCards?.[0]}-${ex?.board?.join('')}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col gap-5"
          >
            {isLoading ? (
              <Spinner />
            ) : ex ? (
              <>
                {/* Cards */}
                <div
                  className="rounded-2xl border p-4 flex flex-col items-center gap-4"
                  style={{ background: 'radial-gradient(ellipse at 50% 0%, #1a4a2e44, #0d231888)', borderColor: 'rgba(26,74,46,0.4)' }}
                >
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">{streetLabel}</p>
                    <div className="p-3 rounded-xl border" style={{ background: 'rgba(10,53,32,0.6)', borderColor: 'rgba(26,74,46,0.3)' }}>
                      <Hand cards={ex.board as CardStr[]} size="sm" gap="gap-1.5" />
                    </div>
                  </div>
                  <div className="w-full border-t border-white/5" />
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
                      {isEn ? 'Your hand' : 'Votre main'}
                    </p>
                    <div className="p-3 bg-gray-900/60 rounded-xl border border-gray-700/50">
                      <Hand cards={ex.heroCards as CardStr[]} size="lg" gap="gap-2" />
                    </div>
                  </div>
                </div>

                {/* Question */}
                <p className="text-center text-white font-semibold text-lg">{t.training.outs_question}</p>
                <p className="text-center text-xs text-gray-400 -mt-3 max-w-md mx-auto leading-snug">
                  {isEn
                    ? 'Count the cards that give you a likely winning hand — your draw completing AND improving to top pair count; weak/low pairs that wouldn’t win do not.'
                    : 'Compte les cartes qui te donnent une main probablement gagnante — ton tirage qui rentre ET passer top paire comptent ; les petites paires qui ne gagneraient pas, non.'}
                </p>

                {/* Options */}
                <div className="grid grid-cols-2 gap-3">
                  {ex.options.map(opt => (
                    <motion.button
                      key={opt}
                      onClick={() => handleAnswer(opt)}
                      whileHover={{ scale: 1.03, borderColor: '#34d399' }}
                      whileTap={{ scale: 0.97 }}
                      className="bg-gray-800/80 border-2 border-gray-600 rounded-2xl py-5 flex flex-col items-center gap-1 cursor-pointer transition-all group"
                    >
                      <span className="text-3xl font-black font-mono text-white">{opt}</span>
                      <span className="text-felt-400 text-xs font-semibold group-hover:text-felt-300">
                        {t.training.outs_select}
                      </span>
                    </motion.button>
                  ))}
                </div>

                {/* Guidance below the decision — no scrolling needed to answer. */}
                <BeginnerGuide
                  title={isEn ? 'What you must do' : 'Ce qu\'on te demande'}
                  text={isEn
                    ? `Your hand is **not finished yet** — but the next card could make it a **likely winner** (a flush, a straight, or top pair).\nAn **out** is a hidden card that gets you to that winning hand. Count your draw's cards **and** cards that pair you up to top pair — but **not** low pairs that still wouldn't win.\n👉 Look at your 2 cards + the board and count those cards, then pick the number above.\n💡 Example: with **A9s** on **K-Q-J** rainbow, any **10** makes the nut straight (4) and any **ace** gives top pair (3) = **7 outs**. A 9 would only be a weak third pair, so it doesn't count.`
                    : `Ta main n'est **pas encore terminée** — mais la prochaine carte peut la rendre **probablement gagnante** (couleur, suite, ou top paire).\nUn **out**, c'est une carte cachée qui t'amène à cette main gagnante. Compte les cartes de ton tirage **et** celles qui te donnent top paire — mais **pas** les petites paires qui ne gagneraient pas.\n👉 Regarde tes 2 cartes + le board, compte ces cartes, puis choisis le nombre ci-dessus.\n💡 Exemple : avec **A9s** sur **K-Q-J** rainbow, n'importe quel **10** fait la quinte max (4) et n'importe quel **as** donne top paire (3) = **7 outs**. Un 9 ne ferait qu'une petite troisième paire, donc il ne compte pas.`}
                />

                {/* Indice — common-draw cheat sheet. Beginner shows it; advanced
                    reveals behind a streak-breaking spoiler; expert hides it. */}
                <SpoilableHint resetKey={`${ex.heroCards.join('')}-${ex.board.join('')}`} className="w-full">
                  <div className="w-full rounded-xl border border-amber-700/40 bg-amber-950/30 px-4 py-3 flex items-start gap-2 text-left">
                    <Lightbulb size={15} className="text-amber-400 mt-0.5 shrink-0" />
                    <div className="text-xs text-gray-300 leading-relaxed">
                      <p className="font-bold text-amber-300 mb-1">{isEn ? 'Common draws — count by type' : 'Tirages courants — compte par type'}</p>
                      <p>• {isEn ? 'Flush draw (4 to a suit) = 9 outs' : 'Tirage couleur (4 à la même couleur) = 9 outs'}</p>
                      <p>• {isEn ? 'Open-ended straight (4 in a row) = 8 outs' : 'Quinte ouverte (4 cartes qui se suivent) = 8 outs'}</p>
                      <p>• {isEn ? 'Gutshot (a hole in the middle) = 4 outs' : 'Tirage par le ventre (un trou au milieu) = 4 outs'}</p>
                      <p>• {isEn ? 'Two overcards = 6 outs' : 'Deux surcartes = 6 outs'}</p>
                      <p>• {isEn ? 'Pocket pair → set = 2 outs' : 'Paire servie → brelan = 2 outs'}</p>
                      <p className="text-amber-400/80 mt-1">⚠️ {isEn ? 'Never count the same card twice (e.g. flush + straight).' : 'Ne compte jamais deux fois la même carte (ex. couleur + quinte).'}</p>
                    </div>
                  </div>
                </SpoilableHint>
              </>
            ) : null}
          </motion.div>
        </AnimatePresence>
      )}

      {/* ── Result ── */}
      {phase === 'result' && ex && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-5">

          {/* Verdict */}
          <VerdictBanner isCorrect={isCorrect} />

          {/* Hand recap */}
          <div className="flex items-center justify-center gap-3 flex-wrap bg-gray-900/40 rounded-xl p-3 border border-gray-800">
            <Hand cards={ex.heroCards as CardStr[]} size="sm" animate={false} />
            <span className="text-gray-600">+</span>
            <Hand cards={ex.board as CardStr[]} size="sm" animate={false} />
          </div>

          {/* Outs + equity */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-900/60 rounded-xl p-4 text-center border border-felt-800/40">
              <p className="text-xs text-gray-500 mb-1 flex items-center justify-center gap-1">
                <Target size={12} /> {t.training.outs_your_outs}
              </p>
              <p className="text-3xl font-black font-mono text-felt-300">{ex.outs}</p>
              {!isCorrect && selected !== null && (
                <p className="text-xs text-red-400 mt-1">
                  {isEn ? 'You picked' : 'Ton choix'} : {selected}
                </p>
              )}
            </div>
            <div className="bg-gray-900/60 rounded-xl p-4 text-center border border-gray-700">
              <p className="text-xs text-gray-500 mb-1">{t.training.outs_est_equity}</p>
              <p className="text-3xl font-black font-mono text-blue-400">≈{ex.equityEstimate}%</p>
            </div>
          </div>

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

          {/* Draws identified — beginner only */}
          {mode === 'beginner' && (
            <div className="bg-gray-800/60 rounded-2xl p-4 border border-gray-700">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                {t.training.outs_draws_lbl}
              </p>
              <ul className="space-y-1.5">
                {ex.draws.map((d, i) => (
                  <li key={i} className="text-sm text-gray-300 flex gap-2">
                    <span className="text-gold-400">•</span>
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Full explanation — hidden during an exam (auto-advances, not clickable) */}
          {!examActive && <ExplanationPanel text={ex.explanation} />}
        </motion.div>
      )}
    </div>
  );
}
