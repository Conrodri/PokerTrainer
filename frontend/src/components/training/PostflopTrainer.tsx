import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Info, Zap, Target, Lightbulb } from 'lucide-react';
import { SourcesFooter } from '../ui/SourcesFooter';
import type { Source } from '../ui/SourcesFooter';

const POSTFLOP_SOURCES: Source[] = [
  { authors: 'Janda, M.', title: 'Applications of No-Limit Hold\'em', year: '2013', note: { fr: 'Polarisation, texture de board, continuation bet et théorie post-flop GTO', en: 'Polarization, board texture, continuation betting and post-flop GTO theory' } },
  { authors: 'Acevedo, M.', title: 'Modern Poker Theory', year: '2019', note: { fr: 'Stratégie post-flop dérivée de solveurs : sizings, fréquences de bet et de check', en: 'Solver-derived post-flop strategy: sizings, bet and check frequencies' } },
  { authors: 'Miller, E.', title: "Poker's 1%", year: '2014', note: { fr: 'Lecture de board et décisions post-flop à haute fréquence', en: 'Board reading and high-frequency post-flop decision making' } },
  { authors: 'GTO Wizard', title: 'Post-flop solver solutions', year: '2023', note: { fr: 'Fréquences de bet/check/raise par texture de board et position', en: 'Bet/check/raise frequencies by board texture and position' }, url: 'https://gtowizard.com' },
];
const POSTFLOP_METHODOLOGY = {
  fr: 'Les scénarios et actions correctes sont calibrés sur des solutions de solveurs GTO pour du cash game 6-max à 100bb. Les textures de board (monotone, bigarrée, assortie) et les forces de main (value, tirage, air) déterminent les fréquences d\'action optimales.',
  en: 'Scenarios and correct actions are calibrated from GTO solver solutions for 6-max cash games at 100bb. Board textures (monotone, rainbow, two-tone) and hand strengths (value, draw, air) determine optimal action frequencies.',
};
import { useIsMobile } from '../../hooks/useIsMobile';
import { useExerciseLock } from '../../hooks/useExerciseLock';
import { useExamRunner } from '../../hooks/useExamRunner';
import { SprintTimer } from '../ui/SprintTimer';
import { ExamLauncher, ExamHud, ExamResult } from './ExamMode';
import { useShallow } from 'zustand/react/shallow';
import { useTrainingStore } from '../../store/trainingStore';
import { Hand } from '../poker/Card';
import { Button } from '../ui/Button';
import { ProgressBar } from '../ui/ProgressBar';
import { SessionStatsBar } from '../ui/SessionStatsBar';
import { useModeStore } from '../../store/modeStore';
import { VerdictBanner } from '../ui/VerdictBanner';
import { RichText, RichLine } from '../ui/RichText';
import { Spinner } from '../ui/Spinner';
import { ExplanationPanel } from '../ui/ExplanationPanel';
import { BeginnerGuide } from '../ui/BeginnerGuide';
import { SpoilableHint } from '../ui/SpoilableHint';
import { postflopHint } from '../../utils/coachHints';
import { TrainerIntro } from '../ui/TrainerIntro';
import { QuotaLockPanel } from '../ui/QuotaLockPanel';
import { useAuthStore } from '../../store/authStore';
import { useQuotaStore } from '../../store/quotaStore';
import { StatChip } from '../ui/StatChip';
import { PokerTable, SeatInfo } from '../poker/PokerTable';
import { CardStr, Position } from '../../types/poker';
import { postflopApi } from '../../services/api';
import { handToDisplay } from '../../utils/pokerUtils';
import { useLangStore } from '../../store/langStore';

type Phase        = 'exercise' | 'result';
type ActionKey    = 'fold' | 'check' | 'call' | 'raise' | 'bet' | 'bet_33' | 'bet_67' | 'bet_100';
type StreetFilter = 'random' | 'flop' | 'turn' | 'river';

const STREET_KEY = 'poker-postflop-street';

interface EquityDetail {
  wins: number;
  ties: number;
  samples: number;
  runsPerSample: number;
  totalSimulations: number;
  example?: { fr: string; en: string };
}

interface PostflopExercise {
  street: string;
  streetLabel: { fr: string; en: string };
  heroPosition: string;
  villainPosition: string;
  heroHand: CardStr[];
  heroNotation: string;
  board: CardStr[];
  potSize: number;
  effectiveStack: number;
  heroEquity: number;
  equityDetail?: EquityDetail;
  heroHandRank: number;
  heroHandLabel: string;
  heroHandLabelI18n?: { fr: string; en: string };
  heroHandDescription: string;
  boardTexture: { fr: string; en: string };
  isHeroIP: boolean;
  preflopContext: { fr: string; en: string };
  villainAction: 'check' | 'bet';
  villainBetSize: number;
  correctAction: ActionKey;
  options: { key: ActionKey; labelFr: string; labelEn: string }[];
  explanation: { fr: string; en: string };
}

function markHero(text: string, heroPos: string, isEn: boolean): string {
  const label = isEn ? 'you' : 'vous';
  return text.replace(new RegExp(`\\b${heroPos}\\b`, 'g'), `${heroPos} (${label})`);
}

const STREET_COLORS: Record<string, string> = {
  flop:  'text-blue-400 border-blue-700 bg-blue-900/20',
  turn:  'text-yellow-400 border-yellow-700 bg-yellow-900/20',
  river: 'text-red-400 border-red-700 bg-red-900/20',
};

const STREET_FILTERS: { key: StreetFilter; labelFr: string; labelEn: string; icon: string }[] = [
  { key: 'random', labelFr: 'Aléatoire', labelEn: 'Random', icon: '🔀' },
  { key: 'flop',   labelFr: 'Flop',      labelEn: 'Flop',   icon: '🔵' },
  { key: 'turn',   labelFr: 'Turn',      labelEn: 'Turn',   icon: '🟡' },
  { key: 'river',  labelFr: 'River',     labelEn: 'River',  icon: '🔴' },
];

// ─── Hero outs panel ─────────────────────────────────────────────────────────

const RANK_LABEL_FR: Record<string, string> = {
  A: 'As', K: 'Rois', Q: 'Dames', J: 'Valets', T: 'Dix',
  '9': '9', '8': '8', '7': '7', '6': '6', '5': '5', '4': '4', '3': '3', '2': '2',
};
const RANK_LABEL_EN: Record<string, string> = {
  A: 'Aces', K: 'Kings', Q: 'Queens', J: 'Jacks', T: 'Tens',
  '9': '9s', '8': '8s', '7': '7s', '6': '6s', '5': '5s', '4': '4s', '3': '3s', '2': '2s',
};

function computeDraws(hero: string[], board: string[]) {
  const rankOf = (c: string) => c[0];
  const suitOf = (c: string) => c[c.length - 1];
  const all = [...hero, ...board];
  const rankCount: Record<string, number> = {};
  for (const c of all) rankCount[rankOf(c)] = (rankCount[rankOf(c)] || 0) + 1;

  // Pair outs: hero rank appears exactly once in all known cards → 3 remaining
  const pairOuts: Array<{ rank: string; count: number }> = [];
  const seen = new Set<string>();
  for (const c of hero) {
    const r = rankOf(c);
    if (seen.has(r)) continue;
    seen.add(r);
    if (rankCount[r] === 1) pairOuts.push({ rank: r, count: 3 });
    else if (rankCount[r] === 2 && hero.filter(h => rankOf(h) === r).length === 2) pairOuts.push({ rank: r, count: 2 }); // pocket pair → set
  }

  // Flush draw / backdoor flush
  let flushType: 'draw' | 'backdoor' | null = null;
  let flushOuts = 0;
  for (const suit of new Set(hero.map(suitOf))) {
    const heroCount  = hero.filter(c => suitOf(c) === suit).length;
    const boardCount = board.filter(c => suitOf(c) === suit).length;
    const total = heroCount + boardCount;
    if (total >= 4) { flushType = 'draw'; flushOuts = 13 - total; break; }
    if (total === 3 && board.length <= 3) { flushType = 'backdoor'; flushOuts = 13 - total; }
  }

  const directOuts = pairOuts.reduce((s, o) => s + o.count, 0) + (flushType === 'draw' ? flushOuts : 0);
  return { pairOuts, flushType, flushOuts, directOuts };
}

function HeroOutsPanel({ heroHand, board, isEn }: { heroHand: string[]; board: string[]; isEn: boolean }) {
  const draws = computeDraws(heroHand, board);
  const cardsLeft = 5 - board.length; // 2 on flop, 1 on turn
  const pct = draws.directOuts * (cardsLeft === 2 ? 4 : 2);

  if (draws.pairOuts.length === 0 && !draws.flushType) return null;

  return (
    <div className="w-full rounded-xl border border-teal-800/40 bg-teal-950/20 px-4 py-3 text-xs">
      <p className="font-bold text-teal-300 mb-2">
        🎯 {isEn ? 'Your improvement outs' : 'Tes outs (cartes qui améliorent ta main)'}
      </p>
      <ul className="space-y-1 text-gray-300">
        {draws.pairOuts.map(o => (
          <li key={o.rank}>
            • {isEn ? RANK_LABEL_EN[o.rank] : RANK_LABEL_FR[o.rank]} → {isEn ? 'Pair' : 'Paire'} : <span className="text-white font-semibold">{o.count} outs</span>
          </li>
        ))}
        {draws.flushType === 'draw' && (
          <li>• {isEn ? `Flush draw : ${draws.flushOuts} outs` : `Tirage couleur : ${draws.flushOuts} outs`}</li>
        )}
        {draws.flushType === 'backdoor' && (
          <li className="text-gray-500">• {isEn ? 'Backdoor flush draw (needs 2 running cards)' : 'Tirage couleur backdoor (2 cartes consécutives nécessaires)'}</li>
        )}
      </ul>
      {draws.directOuts > 0 && (
        <p className="mt-2 text-teal-200 font-semibold">
          → {draws.directOuts} {isEn ? `direct outs ≈ ${pct}% chance to improve (rule of ${cardsLeft === 2 ? '4' : '2'})` : `outs directs ≈ ${pct}% de chance d'amélioration (règle du ${cardsLeft === 2 ? '4' : '2'})`}
        </p>
      )}
    </div>
  );
}

// ─── Equity detail panel ─────────────────────────────────────────────────────

function EquityDetailPanel({ detail, equity, isEn }: {
  detail: EquityDetail; equity: number; isEn: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-blue-900/60 overflow-hidden text-xs">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-blue-950/50 hover:bg-blue-950/70 transition-colors text-left gap-2"
      >
        <span className="flex items-center gap-2 text-blue-300 font-semibold">
          <Info size={12} className="shrink-0" />
          {isEn ? `Equity ${equity}% — how is it calculated?` : `Équité ${equity}% — comment est-elle calculée ?`}
        </span>
        <span className="text-blue-500 shrink-0">{open ? '▲' : '▼'}</span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="bg-blue-950/30 px-4 py-3 border-t border-blue-900/40">
              {detail.example
                ? <RichText text={isEn ? detail.example.en : detail.example.fr} />
                : <p className="text-blue-400/80 leading-relaxed">
                    {isEn
                      ? `Monte Carlo: ${detail.samples} random villain hands × ${detail.runsPerSample} runouts = ${detail.totalSimulations.toLocaleString()} simulations.`
                      : `Monte Carlo : ${detail.samples} mains × ${detail.runsPerSample} runouts = ${detail.totalSimulations.toLocaleString()} simulations.`}
                  </p>
              }
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PostflopTrainer() {
  const lang     = useLangStore(s => s.lang);
  const isEn     = lang === 'en';
  const isMobile = useIsMobile();
  const { sessionStats, recordResult, setTrainerStarted } = useTrainingStore(
    useShallow(s => ({ sessionStats: s.sessionStats, recordResult: s.recordResult, setTrainerStarted: s.setTrainerStarted }))
  );

  // Premium access / daily free-quota for non-premium users
  const user      = useAuthStore(s => s.user);
  const isPremium = !!user?.isPremium;
  const loggedIn  = !!user;
  const quota     = useQuotaStore();
  const freeRemaining = isPremium ? Infinity : quota.remaining.postflop;
  const [quotaBlocked, setQuotaBlocked] = useState(false);

  const [showIntro, setShowIntro]   = useState(true);
  const [phase, setPhase]           = useState<Phase>('exercise');
  const [exercise, setExercise]     = useState<PostflopExercise | null>(null);
  const [isLoading, setIsLoading]   = useState(false);
  const [selected, setSelected]     = useState<ActionKey | null>(null);
  const [xpEarned, setXpEarned]     = useState(0);
  const mode = useModeStore(s => s.mode);

  // Refresh free-quota counts when a non-premium user opens the module
  useEffect(() => {
    if (loggedIn && !isPremium) quota.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedIn, isPremium]);
  const [streetFilter, setStreetFilter] = useState<StreetFilter>(
    () => (localStorage.getItem(STREET_KEY) as StreetFilter) || 'random'
  );

  // Lock mode switching while a question is on screen.
  useExerciseLock(!showIntro && phase === 'exercise' && !!exercise && !isLoading);

  // Exam mode — premium only here (each exercise consumes a credit for free users).
  const { examActive, examFinished, startRun, quitRun, recordAnswer } = useExamRunner('postflop');

  // Prevent double-fetch on mount via ref guard
  const hasStarted = useRef(false);

  const handleStreetChange = (sf: StreetFilter) => {
    if (sf === streetFilter) return; // same filter — don't re-generate
    setStreetFilter(sf);
    localStorage.setItem(STREET_KEY, sf);
    // Only re-fetch if already past intro
    if (hasStarted.current && phase === 'exercise') fetchExercise(sf);
  };

  const fetchExercise = async (sf = streetFilter) => {
    setIsLoading(true);
    try {
      const street     = sf !== 'random' ? sf : undefined;
      const difficulty = mode === 'expert' ? 'expert' : undefined;
      const data   = await postflopApi.getExercise(street, difficulty);
      setExercise(data);
      setPhase('exercise');
      if (!isPremium) quota.decrement('postflop'); // server consumed one credit
    } catch (e: any) {
      if (e?.response?.status === 402) {            // daily free allowance used up
        quota.set('postflop', 0);
        setQuotaBlocked(true);
      } /* else: stays on spinner */
    }
    finally  { setIsLoading(false); }
  };

  const backToIntro = () => {
    setQuotaBlocked(false);
    setShowIntro(true);
    setTrainerStarted(false);
  };

  const handleStart = () => {
    quitRun();              // clear any leftover exam state — normal mode never shows the lives HUD / auto-advance
    setShowIntro(false);
    setTrainerStarted(true);
    hasStarted.current = true;
    fetchExercise();
  };

  const handleAnswer = async (action: ActionKey) => {
    if (!exercise) return;
    setSelected(action);
    const ok = action === exercise.correctAction;
    const xp = ok ? 15 : 5;
    setXpEarned(xp);
    await recordResult(ok, xp, `postflop_${exercise.street}`);
    setPhase('result');
    if (examActive) recordAnswer(ok, handleNext);
  };

  // Expert sprint: no decision within 5s → submit a wrong option (a miss).
  const handleTimeout = () => {
    if (!exercise || phase !== 'exercise') return;
    const wrong = exercise.options.find(o => o.key !== exercise.correctAction);
    if (wrong) handleAnswer(wrong.key);
  };

  const handleNext = async () => {
    setSelected(null);
    await fetchExercise();
  };

  const handleStartExam = () => {
    startRun();
    setQuotaBlocked(false);
    setShowIntro(false);
    setTrainerStarted(true);
    hasStarted.current = true;
    setSelected(null);
    fetchExercise();
  };

  const handleQuitExam = () => {
    quitRun();
    setShowIntro(true);
    setTrainerStarted(false);
  };

  const isCorrect   = !!exercise && selected !== null && selected === exercise.correctAction;
  const accuracy    = sessionStats.total > 0 ? Math.round((sessionStats.correct / sessionStats.total) * 100) : 0;
  const ex          = exercise;
  const streetColor = ex ? (STREET_COLORS[ex.street] ?? 'text-gray-400 border-gray-700 bg-gray-900/20') : '';

  // ── Intro panel ──
  if (showIntro) {
    return (
      <div className="flex flex-col gap-3 sm:gap-4 max-w-2xl mx-auto">
        <TrainerIntro
          emoji="🃏"
          title={isEn ? 'Post-flop Trainer' : 'Entraîneur Post-flop'}
          description={isEn
            ? "Master the decisions that happen after the flop — where most of the money is won or lost."
            : "Maîtrisez les décisions qui se jouent après le flop — là où la majorité de l'argent se gagne ou se perd."}
          whatTitle={isEn ? "What is post-flop play?" : "Qu'est-ce que le jeu post-flop ?"}
          whatContent={
            <>
              <p className="text-gray-400 text-xs leading-snug mb-2.5">
                <RichLine text={isEn
                  ? "After the preflop action (raises, calls), the dealer places community cards on the table. You must decide how to play your hand based on the visible board and your 2 hole cards."
                  : "Après l'action préflop (relances, appels), le dealer place des cartes communes sur la table. Vous devez décider comment jouer votre main selon le board visible et vos 2 cartes en main."} />
              </p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { emoji: '🔵', label: isEn ? 'Flop' : 'Flop',  desc: isEn ? '3 community cards — first board evaluation' : '3 cartes communes — première évaluation du board' },
                  { emoji: '🟡', label: isEn ? 'Turn' : 'Turn',  desc: isEn ? '4th card — bigger pot, bigger decisions' : '4ème carte — plus gros pot, décisions plus lourdes' },
                  { emoji: '🔴', label: isEn ? 'River' : 'River', desc: isEn ? '5th and final card — last chance to bet' : '5ème et dernière carte — dernière chance de miser' },
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
            '🎯 You receive a random hand + board position (flop, turn or river)',
            '🃏 Your cards appear on the table — board in the center, your hand at the bottom',
            '🤔 Choose the best action: Check, Bet, Call, Raise or Fold',
            '📊 Your equity is calculated via Monte Carlo simulation (6,000 runs)',
            '💡 A detailed explanation shows why the correct action was right',
          ] : [
            '🎯 Vous recevez une main + position au board aléatoires (flop, turn ou river)',
            '🃏 Vos cartes apparaissent sur la table — board au centre, votre main en bas',
            '🤔 Choisissez la meilleure action : Check, Bet, Call, Raise ou Fold',
            '📊 Votre équité est calculée par simulation Monte Carlo (6 000 runouts)',
            '💡 Une explication détaillée vous montre pourquoi la bonne action est correcte',
          ]}
          beginnerHint={isEn ? "Shows hand strength, equity & texture hints" : "Affiche force de main, équité & texture"}
          advancedHint={isEn ? 'No hints — for experienced players' : 'Sans indices — pour joueurs confirmés'}
          expertHint={isEn ? 'Premium Expert — the most demanding level, zero help' : 'Premium Expert — le niveau le plus exigeant, aucune aide'}
          startLabel={isEn ? 'Start training' : "Commencer l'entraînement"}
          onStart={handleStart}
          mode={mode}
          locked={!isPremium && (!loggedIn || freeRemaining <= 0)}
          lockedVariant={!loggedIn ? 'login' : 'quota'}
          freeInfo={!isPremium && loggedIn && freeRemaining > 0
            ? { remaining: freeRemaining, limit: quota.limit }
            : undefined}
          examSlot={mode !== 'beginner' && isPremium ? <ExamLauncher module="postflop" onStart={handleStartExam} /> : undefined}
        />
      </div>
    );
  }

  if (examFinished) {
    return (
      <div className="flex flex-col gap-5 max-w-2xl mx-auto pt-4">
        <ExamResult module="postflop" onRetry={handleStartExam} onQuit={handleQuitExam} />
      </div>
    );
  }

  if (quotaBlocked) {
    return (
      <div className="flex flex-col gap-5 max-w-2xl mx-auto">
        <QuotaLockPanel limit={quota.limit} onBackToIntro={backToIntro} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 max-w-2xl mx-auto">

      {/* ── Header — lives HUD during an exam ── */}
      {examActive ? <ExamHud onQuit={handleQuitExam} /> : (
      <div className="flex items-end justify-end">
        <button
          onClick={() => { setShowIntro(true); setTrainerStarted(false); }}
          className="text-xs text-gray-500 hover:text-gray-300 transition-colors px-2 py-1"
          title={isEn ? 'Module info' : 'Infos du module'}
        >
          <Info size={14} />
        </button>
      </div>
      )}

      {/* ── Street selector — hidden during an exam ── */}
      {!examActive && (
      <div className="flex gap-1.5 p-1 bg-gray-900/60 rounded-xl border border-gray-800">
        {STREET_FILTERS.map(sf => (
          <button
            key={sf.key}
            onClick={() => handleStreetChange(sf.key)}
            className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-semibold transition-all ${
              streetFilter === sf.key
                ? sf.key === 'random' ? 'bg-gray-700 text-white shadow-sm'
                : sf.key === 'flop'   ? 'bg-blue-900/60 text-blue-300 border border-blue-700'
                : sf.key === 'turn'   ? 'bg-yellow-900/40 text-yellow-300 border border-yellow-700'
                :                       'bg-red-900/40 text-red-300 border border-red-700'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <span>{sf.icon}</span>
            <span>{isEn ? sf.labelEn : sf.labelFr}</span>
          </button>
        ))}
      </div>
      )}

      {/* ════════════ LOADING ════════════ */}
      {isLoading && <Spinner />}

      {/* Expert sprint countdown */}
      {!isLoading && phase === 'exercise' && ex && (
        <SprintTimer
          active={examActive && mode === 'expert'}
          resetKey={ex.heroNotation + ex.street}
          onTimeout={handleTimeout}
        />
      )}

      {/* ════════════ EXERCISE ════════════ */}
      {!isLoading && phase === 'exercise' && ex && (
        <AnimatePresence mode="wait">
          <motion.div
            key={ex.heroNotation + ex.street}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            className="flex flex-col items-center gap-2 sm:gap-3"
          >
            {/* Street badge */}
            <div className={`px-4 py-1.5 rounded-full border text-sm font-bold ${streetColor}`}>
              {isEn ? ex.streetLabel.en : ex.streetLabel.fr}
            </div>

            {/* ── Poker table ── */}
            <div className="w-full max-w-[260px] sm:max-w-sm mx-auto">
              <PokerTable
                heroPosition={ex.heroPosition as Position}
                interactive={false}
                activePlayers={[ex.heroPosition as Position, ex.villainPosition as Position]}
                potDisplay={`${ex.potSize}bb`}
                heroCards={ex.heroHand as string[]}
                boardCards={ex.board as string[]}
                boardCardSize="md"
                compact={true}
                seatInfos={{
                  [ex.heroPosition]: { stack: `${ex.effectiveStack}bb` },
                  [ex.villainPosition]: {
                    stack: `${ex.effectiveStack}bb`,
                    bet: ex.villainAction === 'bet' ? `${ex.villainBetSize}bb` : undefined,
                  },
                } as Partial<Record<Position, SeatInfo>>}
              />
            </div>

            {/* Hero cards in a clearly separated info block */}
            <div className="w-full max-w-xs sm:max-w-sm rounded-2xl border border-gray-700/60 bg-gray-900/50 px-4 py-3 flex items-center justify-center gap-3">
              <Hand cards={ex.heroHand as CardStr[]} size="md" gap="gap-2" animate={false} />
            </div>

            {/* ── Bloc de contexte narratif ── */}
            <div className="w-full rounded-2xl border border-gray-700 overflow-hidden text-sm">

              {/* Ligne 1 : Préflop (contexte historique) */}
              <div className="flex items-start gap-3 px-4 py-3 bg-gray-900/70 border-b border-gray-700/60">
                <span className="text-gray-500 font-bold text-xs uppercase tracking-wide pt-0.5 shrink-0 w-16">
                  {isEn ? 'Preflop' : 'Préflop'}
                </span>
                <div className="flex-1">
                  <p className="text-gray-300">
                    {markHero(isEn ? ex.preflopContext.en : ex.preflopContext.fr, ex.heroPosition, isEn)}
                  </p>
                  <p className="text-gray-500 text-xs mt-0.5">
                    {isEn ? 'Pot at start of street:' : 'Pot au début du street :'}{' '}
                    <span className="text-yellow-400 font-bold">{ex.potSize}bb</span>
                    {mode === 'beginner' && (
                      <>
                        {' · '}
                        <span className={`font-semibold ${ex.isHeroIP ? 'text-green-400' : 'text-orange-400'}`}>
                          {isEn
                            ? (ex.isHeroIP ? 'You act last (In Position)' : 'You act first (Out of Position)')
                            : (ex.isHeroIP ? 'Vous agissez en dernier (En position)' : 'Vous agissez en premier (Hors position)')}
                        </span>
                      </>
                    )}
                  </p>
                </div>
              </div>

              {/* Ligne 2 : Street actuel + action du villain */}
              {ex.villainAction === 'bet' ? (
                <div className={`flex items-start gap-3 px-4 py-3 ${mode === 'beginner' ? 'bg-red-900/20' : 'bg-gray-800/40'}`}>
                  <span className="text-gray-500 font-bold text-xs uppercase tracking-wide pt-0.5 shrink-0 w-16">
                    {isEn ? ex.streetLabel.en : ex.streetLabel.fr}
                  </span>
                  <div className="flex-1">
                    <p className={`font-medium ${mode === 'beginner' ? 'text-red-200' : 'text-gray-200'}`}>
                      <span className={`font-bold ${mode === 'beginner' ? 'text-red-300' : 'text-white'}`}>
                        {ex.villainPosition}
                      </span>
                      {isEn ? ' bets ' : ' mise '}
                      <span className={`font-black text-base ${mode === 'beginner' ? 'text-red-300' : 'text-white'}`}>
                        {ex.villainBetSize}bb
                      </span>
                      {isEn ? ' — your action?' : ' — quelle est votre action ?'}
                    </p>
                    {mode === 'beginner' && (
                      <p className="text-gray-400 text-xs mt-0.5">
                        {isEn
                          ? `Pot if you call: ${ex.potSize + ex.villainBetSize * 2}bb`
                          : `Pot si vous callez : ${ex.potSize + ex.villainBetSize * 2}bb`}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 px-4 py-3 bg-gray-800/40">
                  <span className="text-gray-500 font-bold text-xs uppercase tracking-wide pt-0.5 shrink-0 w-16">
                    {isEn ? ex.streetLabel.en : ex.streetLabel.fr}
                  </span>
                  <div className="flex-1">
                    <p className="text-gray-200 font-medium">
                      <span className="font-bold text-white">{ex.villainPosition}</span>
                      {isEn ? ' checks — your action?' : ' checke — quelle est votre action ?'}
                    </p>
                    {mode === 'beginner' && (
                      <p className="text-gray-500 text-xs mt-0.5">
                        {isEn
                          ? 'You can check (free card) or bet to build the pot.'
                          : 'Vous pouvez checker (carte gratuite) ou miser pour construire le pot.'}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ── Action buttons ── */}
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="flex flex-wrap gap-3 justify-center w-full"
            >
              {ex.options.map(opt => (
                <Button
                  key={opt.key} size="lg"
                  variant={opt.key === 'fold' ? 'danger' : (opt.key === 'raise' || opt.key === 'bet' || opt.key.startsWith('bet_')) ? 'gold' : 'secondary'}
                  onClick={() => handleAnswer(opt.key)}
                  className="min-w-[130px]"
                >
                  {isEn ? opt.labelEn : opt.labelFr}
                </Button>
              ))}
            </motion.div>

            {/* ── Indices — below the decision. Beginner shows them; advanced
                reveals behind a streak-breaking spoiler; expert hides them. ── */}
            <SpoilableHint resetKey={ex.heroNotation + ex.street} className="w-full">
              <div className="flex flex-col gap-2 w-full">
                {/* Compact info row: hand · equity · texture on one line */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-gray-800/60 rounded-xl px-3 py-2 border border-gray-700 text-center">
                    <p className="text-gray-500 text-[10px] mb-0.5">{isEn ? 'Hand' : 'Main'}</p>
                    <p className="text-white font-semibold text-xs leading-tight">
                      {ex.heroHandLabelI18n
                        ? (isEn ? ex.heroHandLabelI18n.en : ex.heroHandLabelI18n.fr)
                        : ex.heroHandLabel}
                    </p>
                  </div>
                  <div className="bg-gray-800/60 rounded-xl px-3 py-2 border border-gray-700 text-center">
                    <p className="text-gray-500 text-[10px] mb-0.5">{isEn ? 'Equity' : 'Équité'}</p>
                    <p className={`font-bold text-base ${ex.heroEquity >= 60 ? 'text-green-400' : ex.heroEquity >= 45 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {ex.heroEquity}%
                    </p>
                  </div>
                  <div className="bg-gray-800/60 rounded-xl px-3 py-2 border border-gray-700 text-center">
                    <p className="text-gray-500 text-[10px] mb-0.5">{isEn ? 'Texture' : 'Texture'}</p>
                    <p className="text-white font-semibold text-xs leading-tight">{isEn ? ex.boardTexture.en : ex.boardTexture.fr}</p>
                  </div>
                </div>
                {/* Hint */}
                <div className="w-full rounded-xl border border-amber-700/40 bg-amber-950/30 px-4 py-3 flex items-start gap-2 text-left">
                  <Lightbulb size={15} className="text-amber-400 mt-0.5 shrink-0" />
                  <div className="text-xs text-gray-300 leading-relaxed">
                    <p className="font-bold text-amber-300 mb-1">{isEn ? 'Hint' : 'Indice'}</p>
                    <p>{postflopHint({
                        equity: ex.heroEquity,
                        facingBet: ex.villainAction === 'bet',
                        bet: ex.villainBetSize,
                        pot: ex.potSize,
                        isEn,
                        handRank: ex.heroHandRank,
                        handLabel: ex.heroHandLabelI18n
                          ? (isEn ? ex.heroHandLabelI18n.en : ex.heroHandLabelI18n.fr)
                          : ex.heroHandLabel,
                        street: ex.street as 'flop' | 'turn' | 'river',
                        isHeroIP: ex.isHeroIP,
                        hasDraw: (() => {
                          const d = computeDraws(ex.heroHand as string[], ex.board as string[]);
                          return d.flushType === 'draw' || d.directOuts >= 6;
                        })(),
                      })}</p>
                  </div>
                </div>
                {ex.equityDetail && (
                  <EquityDetailPanel detail={ex.equityDetail} equity={ex.heroEquity} isEn={isEn} />
                )}
              </div>
            </SpoilableHint>

            {/* Guidance below the decision — no scrolling needed to answer. */}
            <BeginnerGuide
              title={isEn ? 'What you must do' : 'Ce qu\'on te demande'}
              text={isEn
                ? `The first community cards are out. You hold **${handToDisplay(ex.heroNotation)}** and you're playing against **${ex.villainPosition}**.\n${ex.villainAction === 'bet'
                    ? `${ex.villainPosition} just **bet ${ex.villainBetSize}bb**. You must react: **Fold** (give up), **Call** (pay to continue), or **Raise** (bet even more).`
                    : `${ex.villainPosition} **checked** (bet nothing). It's your turn: **Check** (free card) or **Bet** (put chips in to attack).`}\n👉 Use the hints above: how strong is your hand, your chance to win (equity), and what the board looks like. Then pick the action that makes the most sense.`
                : `Les premières cartes communes sont sorties. Tu as **${handToDisplay(ex.heroNotation)}** et tu joues contre **${ex.villainPosition}**.\n${ex.villainAction === 'bet'
                    ? `${ex.villainPosition} vient de **miser ${ex.villainBetSize}bb**. Tu dois réagir : **Fold** (abandonner), **Call** (payer pour continuer), ou **Raise** (miser encore plus).`
                    : `${ex.villainPosition} a **checké** (rien misé). C'est ton tour : **Check** (carte gratuite) ou **Bet** (miser pour attaquer).`}\n👉 Regarde les indices ci-dessus : la force de ta main, ta chance de gagner (équité) et la tête du board. Puis choisis l'action la plus logique.`}
            />
          </motion.div>
        </AnimatePresence>
      )}

      {/* ════════════ RESULT ════════════ */}
      {!isLoading && phase === 'result' && ex && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-5">

          <VerdictBanner isCorrect={isCorrect} />

          {/* Table + stacks */}
          <div className="w-full max-w-xs sm:max-w-full">
            <PokerTable
              heroPosition={ex.heroPosition as Position}
              interactive={false}
              activePlayers={[ex.heroPosition as Position, ex.villainPosition as Position]}
              potDisplay={`${ex.potSize}bb`}
              heroCards={ex.heroHand as string[]}
              boardCards={ex.board as string[]}
              compact={false}
              seatInfos={{
                [ex.heroPosition]: { stack: `${ex.effectiveStack}bb` },
                [ex.villainPosition]: {
                  stack: `${ex.effectiveStack}bb`,
                  bet: ex.villainAction === 'bet' ? `${ex.villainBetSize}bb` : undefined,
                },
              } as Partial<Record<Position, SeatInfo>>}
            />
          </div>

          {/* Street badge */}
          <div className={`px-3 py-1 rounded-full border text-xs font-bold ${streetColor}`}>
            {isEn ? ex.streetLabel.en : ex.streetLabel.fr}
          </div>

          {/* Action recap pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
            {(() => {
              const correctOpt = ex.options.find(o => o.key === ex.correctAction);
              return correctOpt ? (
                <span className="px-2.5 py-1 rounded-full border bg-green-900/30 text-green-300 border-green-700">
                  ✓ {isEn ? 'Correct:' : 'Correct :'} <strong>{isEn ? correctOpt.labelEn : correctOpt.labelFr}</strong>
                </span>
              ) : null;
            })()}
            {selected && selected !== ex.correctAction && (() => {
              const selOpt = ex.options.find(o => o.key === selected);
              return selOpt ? (
                <span className="px-2.5 py-1 rounded-full border bg-red-900/30 text-red-300 border-red-700">
                  ✗ {isEn ? 'You played:' : 'Votre action :'} <strong>{isEn ? selOpt.labelEn : selOpt.labelFr}</strong>
                </span>
              ) : null;
            })()}
            <span className="px-2.5 py-1 rounded-full border bg-blue-900/30 text-blue-300 border-blue-700">
              <Zap size={10} className="inline mr-1" />+{xpEarned} XP
            </span>
          </div>

          {/* Stats grid — part of recap */}
          <div className="grid grid-cols-3 gap-3 w-full text-sm">
            <div className="bg-gray-800/60 rounded-xl px-3 py-2 border border-gray-700 text-center">
              <p className="text-gray-500 text-xs mb-0.5">{isEn ? 'Hand' : 'Main'}</p>
              <p className="text-white font-semibold text-xs">
                {ex.heroHandLabelI18n ? (isEn ? ex.heroHandLabelI18n.en : ex.heroHandLabelI18n.fr) : ex.heroHandLabel}
              </p>
            </div>
            <div className="bg-gray-800/60 rounded-xl px-3 py-2 border border-gray-700 text-center">
              <p className="text-gray-500 text-xs mb-0.5">{isEn ? 'Equity' : 'Équité'}</p>
              <p className={`font-bold ${ex.heroEquity >= 60 ? 'text-green-400' : ex.heroEquity >= 45 ? 'text-yellow-400' : 'text-red-400'}`}>
                {ex.heroEquity}%
              </p>
            </div>
            <div className="bg-gray-800/60 rounded-xl px-3 py-2 border border-gray-700 text-center">
              <p className="text-gray-500 text-xs mb-0.5">Texture</p>
              <p className="text-white font-semibold text-xs">{isEn ? ex.boardTexture.en : ex.boardTexture.fr}</p>
            </div>
          </div>

          {/* Next + stats + explanation — hidden during an exam (auto-advances) */}
          {!examActive && (
            <>
              <div className="w-full max-w-xs">
                <Button size="lg" variant="gold" onClick={handleNext} fullWidth>
                  {isEn ? 'Next exercise' : 'Exercice suivant'} <ChevronRight size={18} className="inline" />
                </Button>
              </div>
              <SessionStatsBar
                total={sessionStats.total}
                correct={sessionStats.correct}
                xp={sessionStats.xp}
              />
              {ex.street !== 'river' && (
                <HeroOutsPanel heroHand={ex.heroHand as string[]} board={ex.board as string[]} isEn={isEn} />
              )}
              <ExplanationPanel text={isEn ? ex.explanation.en : ex.explanation.fr} className="p-5" />
            </>
          )}
        </motion.div>
      )}
      <SourcesFooter isEn={isEn} sources={POSTFLOP_SOURCES} methodology={POSTFLOP_METHODOLOGY} />
    </div>
  );
}

