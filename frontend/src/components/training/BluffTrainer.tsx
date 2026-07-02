import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, TrendingUp, Zap, Lightbulb } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useTrainingStore } from '../../store/trainingStore';
import { useModeStore } from '../../store/modeStore';
import { useLangStore } from '../../store/langStore';
import { useAuthStore } from '../../store/authStore';
import { useQuotaStore } from '../../store/quotaStore';
import { useExerciseLock } from '../../hooks/useExerciseLock';
import { useExamRunner } from '../../hooks/useExamRunner';
import { Button } from '../ui/Button';
import { SessionStatsBar } from '../ui/SessionStatsBar';
import { VerdictBanner } from '../ui/VerdictBanner';
import { TrainerIntro } from '../ui/TrainerIntro';
import { QuotaLockPanel } from '../ui/QuotaLockPanel';
import { ExplanationPanel } from '../ui/ExplanationPanel';
import { SpoilableHint } from '../ui/SpoilableHint';
import { BeginnerGuide } from '../ui/BeginnerGuide';
import { RichLine } from '../ui/RichText';
import { Spinner } from '../ui/Spinner';
import { SprintTimer } from '../ui/SprintTimer';
import { ExamLauncher, ExamHud, ExamResult } from './ExamMode';
import { PokerTable, SeatInfo } from '../poker/PokerTable';
import { Hand } from '../poker/Card';
import { quotaApi } from '../../services/api';
import type { BluffAction, BluffExercise, BluffFactorScore, Position } from '../../types/poker';

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = 'exercise' | 'result';

// ─── Constants ────────────────────────────────────────────────────────────────

const ACTION_LABELS_FR: Record<BluffAction, (pot: number) => string> = {
  'check-fold':   ()    => 'Checker / Abandonner',
  'bluff-small':  (pot) => `Bluffer ${Math.round(pot / 3)} BB  (1/3 du pot)`,
  'bluff-medium': (pot) => `Bluffer ${Math.round(pot * 2 / 3)} BB  (2/3 du pot)`,
  'bluff-large':  (pot) => `Bluffer ${Math.round(pot)} BB  (mise pleine)`,
};

const ACTION_LABELS_EN: Record<BluffAction, (pot: number) => string> = {
  'check-fold':   ()    => 'Check / Fold',
  'bluff-small':  (pot) => `Bluff ${Math.round(pot / 3)} BB  (1/3 pot)`,
  'bluff-medium': (pot) => `Bluff ${Math.round(pot * 2 / 3)} BB  (2/3 pot)`,
  'bluff-large':  (pot) => `Bluff ${Math.round(pot)} BB  (full pot)`,
};

const FACTOR_ICON: Record<BluffFactorScore, string> = {
  positive: '🟢',
  neutral:  '🟡',
  negative: '🔴',
};

const FACTOR_LABEL_FR: Record<string, string> = {
  position:     'Position',
  board:        'Board',
  villainRange: 'Range vilain',
  heroHand:     'Votre main',
};
const FACTOR_LABEL_EN: Record<string, string> = {
  position:     'Position',
  board:        'Board',
  villainRange: "Villain's range",
  heroHand:     'Your hand',
};

const STREET_COLORS: Record<BluffExercise['street'], string> = {
  flop:  'text-blue-400 border-blue-700 bg-blue-900/20',
  turn:  'text-yellow-400 border-yellow-700 bg-yellow-900/20',
  river: 'text-red-400 border-red-700 bg-red-900/20',
};
const STREET_LABELS: Record<BluffExercise['street'], { fr: string; en: string }> = {
  flop:  { fr: 'Flop',  en: 'Flop'  },
  turn:  { fr: 'Turn',  en: 'Turn'  },
  river: { fr: 'River', en: 'River' },
};

const ALL_ACTIONS: BluffAction[] = ['check-fold', 'bluff-small', 'bluff-medium', 'bluff-large'];

const ACTION_ICON: Record<BluffAction, string> = {
  'check-fold':   '✋',
  'bluff-small':  '💙',
  'bluff-medium': '💜',
  'bluff-large':  '🔥',
};

function actionButtonVariant(action: BluffAction, selected: BluffAction | null, correct: BluffAction): string {
  if (!selected) return 'secondary';
  if (action === correct)  return 'gold';
  if (action === selected && action !== correct) return 'danger';
  return 'secondary';
}

// ─── Intro ────────────────────────────────────────────────────────────────────

function BluffIntro({ onStart, locked, lockedVariant, freeInfo, examSlot }: {
  onStart: () => void;
  locked?: boolean;
  lockedVariant?: 'login' | 'quota';
  freeInfo?: { remaining: number; limit: number };
  examSlot?: React.ReactNode;
}) {
  const isEn  = useLangStore(s => s.lang) === 'en';
  const mode  = useModeStore(s => s.mode);

  const title       = isEn ? 'Bluff Training' : 'Entraînement au Bluff';
  const description = isEn
    ? 'Learn when to bluff, when to fold, and how to size your bets as a bluff.'
    : "Apprenez quand bluffer, quand abandonner, et comment doser la taille de votre bluff.";

  const whatContent = (
    <>
      <p className="text-[11px] text-gray-400 leading-snug mb-2">
        {isEn
          ? 'Betting with a weak hand to make your opponent fold a better one. 4 factors determine if a bluff is profitable:'
          : 'Miser avec une main faible pour faire fold une meilleure main adverse. 4 facteurs déterminent si un bluff est rentable :'}
      </p>
      <div className="grid grid-cols-2 gap-1.5">
        {[
          { icon: <TrendingUp size={11} />, iconBg: 'bg-green-900/40 text-green-400', label: isEn ? 'Position' : 'Position', desc: isEn ? 'IP = more fold equity' : 'IP = plus de fold equity' },
          { icon: <Zap size={11} />, iconBg: 'bg-blue-900/40 text-blue-400', label: isEn ? 'Board texture' : 'Texture', desc: isEn ? 'Scary boards → more folds' : 'Boards menaçants → plus de folds' },
          { icon: <Lightbulb size={11} />, iconBg: 'bg-yellow-900/40 text-yellow-400', label: isEn ? "Villain's range" : 'Range vilain', desc: isEn ? 'Weak range = good target' : 'Range faible = bonne cible' },
          { icon: <ChevronRight size={11} />, iconBg: 'bg-purple-900/40 text-purple-400', label: isEn ? 'Hand equity' : 'Équité de main', desc: isEn ? 'Semi-bluffs > pure air' : 'Semi-bluffs > bluff pur' },
        ].map(f => (
          <div key={f.label} className="flex items-start gap-1.5 bg-gray-800/40 rounded-lg px-2 py-1.5 border border-gray-700/50">
            <span className={`grid place-items-center w-5 h-5 rounded-md ${f.iconBg} shrink-0 mt-0.5`}>{f.icon}</span>
            <div>
              <div className="text-white font-bold text-[11px] leading-none">{f.label}</div>
              <div className="text-gray-500 text-[10px] leading-tight mt-0.5">{f.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );

  const steps = isEn
    ? ['🃏 Study the board and hand history', '🧠 Analyze villain\'s range and position', '🎯 Pick the right action and bet size']
    : ['🃏 Analysez le board et l\'historique de la main', '🧠 Évaluez la range de vilain et votre position', '🎯 Choisissez la bonne action et la bonne taille de mise'];

  return (
    <TrainerIntro
      emoji="🎭"
      title={title}
      description={description}
      whatTitle={isEn ? 'What is a bluff?' : 'Qu\'est-ce qu\'un bluff ?'}
      whatContent={whatContent}
      steps={steps}
      beginnerHint={isEn
        ? 'Detailed breakdowns of every bluffing factor: position, board texture, villain\'s range, and your hand equity.'
        : 'Analyse détaillée de chaque facteur : position, texture du board, range de vilain et équité de votre main.'}
      advancedHint={isEn
        ? 'Factors shown after answering — read the board and context carefully before deciding.'
        : 'Facteurs affichés après la réponse — lisez le board et le contexte avant de décider.'}
      expertHint={isEn
        ? 'No hints. Pure read on position, range, and board dynamics.'
        : 'Aucun indice. Lecture pure de la position, de la range et de la dynamique du board.'}
      startLabel={isEn ? 'Start Bluffing' : 'Commencer'}
      onStart={onStart}
      mode={mode}
      locked={locked}
      lockedVariant={lockedVariant}
      freeInfo={freeInfo}
      examSlot={examSlot}
    />
  );
}

// ─── Factor grid ──────────────────────────────────────────────────────────────

function FactorGrid({ factors, isEn }: {
  factors: BluffExercise['factors'];
  isEn: boolean;
}) {
  const keys = ['position', 'board', 'villainRange', 'heroHand'] as const;
  const labels = isEn ? FACTOR_LABEL_EN : FACTOR_LABEL_FR;

  return (
    <div className="flex flex-col gap-2 w-full">
      {keys.map(k => {
        const f = factors[k];
        const borderColor = f.score === 'positive' ? 'border-green-800' : f.score === 'negative' ? 'border-red-900' : 'border-yellow-900';
        const bgColor     = f.score === 'positive' ? 'bg-green-900/15' : f.score === 'negative' ? 'bg-red-900/15'  : 'bg-yellow-900/15';
        return (
          <div key={k} className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 ${bgColor} ${borderColor}`}>
            <span className="text-lg leading-none mt-0.5 shrink-0">{FACTOR_ICON[f.score]}</span>
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{labels[k]}</span>
              <span className="text-sm text-gray-200 leading-snug">{isEn ? f.en : f.fr}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Action button row ────────────────────────────────────────────────────────

function ActionButton({
  action, pot, isEn, selected, correct, onClick,
}: {
  action:   BluffAction;
  pot:      number;
  isEn:     boolean;
  selected: BluffAction | null;
  correct:  BluffAction;
  onClick:  (a: BluffAction) => void;
}) {
  const labels  = isEn ? ACTION_LABELS_EN : ACTION_LABELS_FR;
  const label   = labels[action](pot);
  const variant = actionButtonVariant(action, selected, correct);
  const isThis  = selected === action;
  const isBet   = action !== 'check-fold';

  return (
    <Button
      variant={variant as any}
      className={`w-full justify-start text-sm font-medium transition-all ${
        selected && action !== correct && action !== selected ? 'opacity-40' : ''
      } ${isThis && action !== correct ? 'ring-2 ring-red-500' : ''}`}
      disabled={!!selected}
      onClick={() => onClick(action)}
    >
      <span className={`mr-2 text-base ${isBet ? 'text-blue-400' : 'text-gray-400'}`}>
        {ACTION_ICON[action]}
      </span>
      {label}
    </Button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function BluffTrainer() {
  const isEn = useLangStore(s => s.lang) === 'en';
  const mode = useModeStore(s => s.mode);

  const { bluffExercise, fetchBluffExercise, isLoading, recordResult, sessionStats, setIsExercising, setTrainerStarted } =
    useTrainingStore(useShallow(s => ({
      bluffExercise:      s.bluffExercise,
      fetchBluffExercise: s.fetchBluffExercise,
      isLoading:          s.isLoading,
      recordResult:       s.recordResult,
      sessionStats:       s.sessionStats,
      setIsExercising:    s.setIsExercising,
      setTrainerStarted:  s.setTrainerStarted,
    })));

  const user      = useAuthStore(s => s.user);
  const isPremium = true;
  const loggedIn  = !!user;
  const quota     = useQuotaStore();
  const freeRemaining = Infinity;
  const [quotaBlocked, setQuotaBlocked] = useState(false);

  const [showIntro, setShowIntro]       = useState(true);
  const [phase, setPhase]               = useState<Phase>('exercise');
  const [selected, setSelected]         = useState<BluffAction | null>(null);
  const [startTime, setStartTime]       = useState(Date.now());
  const [xpEarned, setXpEarned]         = useState(0);

  // Refresh free-quota counts when a non-premium user opens the module
  useEffect(() => {
    if (loggedIn && !isPremium) quota.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedIn, isPremium]);

  // Lock mode switching while a question is on screen
  useExerciseLock(!showIntro && phase === 'exercise' && !!bluffExercise);

  // Exam mode (advanced/expert)
  const { examActive, examFinished, startRun, quitRun, recordAnswer } = useExamRunner('bluff');

  const nextExercise = async () => {
    if (!isPremium) {
      try {
        const r = await quotaApi.consume('bluff');
        if (r && !r.unlimited && typeof r.remaining === 'number') quota.set('bluff', r.remaining);
      } catch (e: any) {
        if (e?.response?.status === 402) { quota.set('bluff', 0); setQuotaBlocked(true); }
        return;
      }
    }
    fetchBluffExercise();
  };

  const backToIntro = () => {
    setQuotaBlocked(false);
    setShowIntro(true);
    setTrainerStarted(false);
  };

  const handleStart = () => {
    quitRun();
    setShowIntro(false);
    setTrainerStarted(true);
    nextExercise();
    setStartTime(Date.now());
  };

  const handleStartExam = async () => {
    startRun();
    setShowIntro(false);
    setTrainerStarted(true);
    setSelected(null);
    setPhase('exercise');
    fetchBluffExercise();
    setStartTime(Date.now());
  };

  const handleQuitExam = () => {
    quitRun();
    backToIntro();
  };

  const handleAnswer = async (action: BluffAction) => {
    if (!bluffExercise || selected) return;
    const timeTaken = Date.now() - startTime;
    const isCorrect = action === bluffExercise.correctAction;
    const xp        = isCorrect ? 20 : 5;
    setSelected(action);
    setXpEarned(xp);
    setPhase('result');
    setIsExercising(false);
    await recordResult(isCorrect, xp, 'bluff', timeTaken);
    if (examActive) recordAnswer(isCorrect, handleNext);
  };

  const handleTimeout = () => {
    if (!bluffExercise || phase !== 'exercise') return;
    const wrong = ALL_ACTIONS.find(a => a !== bluffExercise.correctAction) ?? 'check-fold';
    handleAnswer(wrong);
  };

  const handleNext = () => {
    setSelected(null);
    setPhase('exercise');
    setStartTime(Date.now());
    nextExercise();
    setIsExercising(true);
  };

  // Signal exercising state to hide range panel
  useEffect(() => {
    if (!showIntro && phase === 'exercise') setIsExercising(true);
  }, [showIntro, phase, setIsExercising]);

  // Listen for global back-to-intro event
  useEffect(() => {
    const onBack = () => { backToIntro(); };
    window.addEventListener('training:back', onBack);
    return () => window.removeEventListener('training:back', onBack);
  }, []);

  if (showIntro) return (
    <BluffIntro
      onStart={handleStart}
      locked={!isPremium && (!loggedIn || freeRemaining <= 0)}
      lockedVariant={!loggedIn ? 'login' : 'quota'}
      freeInfo={!isPremium && loggedIn && freeRemaining > 0
        ? { remaining: freeRemaining, limit: quota.limit }
        : undefined}
      examSlot={<ExamLauncher module="bluff" onStart={handleStartExam} />}
    />
  );

  if (examFinished) {
    return (
      <div className="flex flex-col gap-5 max-w-2xl mx-auto pt-4">
        <ExamResult module="bluff" onRetry={handleStartExam} onQuit={handleQuitExam} />
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

  if (isLoading || !bluffExercise) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  const ex        = bluffExercise;
  const correct   = ex.correctAction;
  const isRight   = selected === correct;
  const resetKey  = ex.board.join('') + ex.heroHand.join('');
  const actionLabels = isEn ? ACTION_LABELS_EN : ACTION_LABELS_FR;

  const heroPos    = ex.heroPosition as Position;
  const villainPos = ex.villainPosition as Position;
  const seatInfos  = {
    [heroPos]:    { stack: `${ex.stackBB}bb` },
    [villainPos]: { stack: `${ex.stackBB}bb` },
  } as Partial<Record<Position, SeatInfo>>;

  return (
    <div className="flex flex-col gap-5 max-w-2xl mx-auto">

      {examActive && <ExamHud onQuit={handleQuitExam} />}

      {phase === 'exercise' && (
        <SprintTimer
          active={examActive && (mode === 'advanced' || mode === 'expert') && !!bluffExercise && !isLoading}
          resetKey={resetKey}
          onTimeout={handleTimeout}
          seconds={30}
        />
      )}

      {/* ════════════ EXERCISE ════════════ */}
      {phase === 'exercise' && (
        <AnimatePresence mode="wait">
          <motion.div
            key={resetKey}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            className="flex flex-col items-center gap-2 sm:gap-3"
          >
            {/* Street badge */}
            <div className="flex items-center gap-2 flex-wrap justify-center">
              <div className={`px-3 py-1 rounded-full border text-xs font-bold ${STREET_COLORS[ex.street]}`}>
                {isEn ? STREET_LABELS[ex.street].en : STREET_LABELS[ex.street].fr}
              </div>
              <div className={`px-3 py-1 rounded-full border text-xs font-bold ${
                ex.heroIsIP ? 'text-green-400 border-green-700 bg-green-900/20' : 'text-orange-400 border-orange-700 bg-orange-900/20'
              }`}>
                {isEn
                  ? (ex.heroIsIP ? 'In Position' : 'Out of Position')
                  : (ex.heroIsIP ? 'En position' : 'Hors position')}
              </div>
            </div>

            {/* Poker table */}
            <div className="w-full max-w-xs sm:max-w-md mx-auto">
              <PokerTable
                heroPosition={heroPos}
                interactive={false}
                activePlayers={[heroPos, villainPos]}
                potDisplay={`${ex.potBB}bb`}
                heroCards={ex.heroHand}
                boardCards={ex.board}
                boardCardSize="md"
                compact={true}
                seatInfos={seatInfos}
              />
            </div>

            {/* Hero hand block */}
            <div className="w-full max-w-xs sm:max-w-sm rounded-2xl border border-gray-700/60 bg-gray-900/50 px-4 py-1.5 flex flex-col items-center gap-1">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {isEn ? 'Your hand' : 'Votre main'}
              </span>
              <Hand cards={ex.heroHand} size="sm" gap="gap-2" animate={false} />
            </div>

            {/* Context block — hand history + question */}
            <div className="w-full rounded-2xl border border-gray-700 overflow-hidden text-sm">
              {/* Hand history */}
              <div className="flex items-start gap-3 px-4 py-3 bg-gray-900/70 border-b border-gray-700/60">
                <span className="text-gray-500 font-bold text-xs uppercase tracking-wide pt-0.5 shrink-0 w-16">
                  {isEn ? 'History' : 'Histoire'}
                </span>
                <div className="flex-1 flex flex-col gap-1.5">
                  <p className="text-gray-300">{isEn ? ex.preflopNarrative.en : ex.preflopNarrative.fr}</p>
                  {ex.streetNarrative.map((n, i) => (
                    <p key={i} className="text-gray-400">{isEn ? n.en : n.fr}</p>
                  ))}
                </div>
              </div>

              {/* Question */}
              <div className="flex items-start gap-3 px-4 py-3 bg-yellow-900/10">
                <span className="text-yellow-600 font-bold text-xs uppercase tracking-wide pt-0.5 shrink-0 w-16">
                  {isEn ? 'Question' : 'Question'}
                </span>
                <p className="text-yellow-100 font-semibold flex-1">
                  {isEn ? 'What do you do?' : 'Que faites-vous ?'}
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="grid grid-cols-2 gap-2.5 w-full"
            >
              {ALL_ACTIONS.map(action => (
                <ActionButton
                  key={action}
                  action={action}
                  pot={ex.potBB}
                  isEn={isEn}
                  selected={selected}
                  correct={correct}
                  onClick={handleAnswer}
                />
              ))}
            </motion.div>

            {/* Indices — beginner shows them; advanced reveals behind a streak-breaking
                spoiler; expert hides them. */}
            <SpoilableHint resetKey={resetKey} className="w-full">
              <div className="w-full rounded-xl border border-amber-700/40 bg-amber-950/30 px-4 py-3 flex items-start gap-2 text-left">
                <Lightbulb size={15} className="text-amber-400 mt-0.5 shrink-0" />
                <div className="text-xs text-gray-300 leading-relaxed">
                  <p className="font-bold text-amber-300 mb-1">{isEn ? 'Hint' : 'Indice'}</p>
                  <p><RichLine text={isEn
                    ? 'Bluff when the board favours your range and villain\'s range is weak/capped — and pick a size that makes them fold the hands they\'re continuing with. Give up when you\'re out of position with no equity against a strong range.'
                    : 'Bluffez quand le board favorise votre range et que celle de vilain est faible/cappée — et choisissez une taille qui fait coucher les mains avec lesquelles il continue. Abandonnez hors position sans équité face à une range forte.'} /></p>
                </div>
              </div>
            </SpoilableHint>

            {/* Beginner guidance */}
            <BeginnerGuide
              title={isEn ? 'What you must do' : 'Ce qu\'on te demande'}
              text={isEn
                ? `Your hand isn't strong enough to win at showdown. The question is whether a **bluff** can make villain fold a better hand — and if so, **how big** should it be?\n👉 Look at the board, your position, and the story you've told so far. If everything points to villain being weak, bluff — and size up when you need to fold out their medium hands.\n💡 If you're out of position with no backup equity against a strong range, just **give up** (check / fold).`
                : `Votre main n'est pas assez forte pour gagner au showdown. La question : un **bluff** peut-il faire coucher une meilleure main à vilain — et si oui, **de combien** ?\n👉 Regardez le board, votre position et l'histoire racontée jusqu'ici. Si tout indique que vilain est faible, bluffez — et augmentez la taille quand il faut faire coucher ses mains moyennes.\n💡 Hors position et sans équité de secours face à une range forte ? **Abandonnez** (check / fold).`}
            />
          </motion.div>
        </AnimatePresence>
      )}

      {/* ════════════ RESULT ════════════ */}
      {phase === 'result' && selected && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-5"
        >
          <VerdictBanner isCorrect={isRight} />

          {/* Table recap */}
          <div className="w-full max-w-xs sm:max-w-full">
            <PokerTable
              heroPosition={heroPos}
              interactive={false}
              activePlayers={[heroPos, villainPos]}
              potDisplay={`${ex.potBB}bb`}
              heroCards={ex.heroHand}
              boardCards={ex.board}
              compact={false}
              seatInfos={seatInfos}
            />
          </div>

          {/* Street badge */}
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <div className={`px-3 py-1 rounded-full border text-xs font-bold ${STREET_COLORS[ex.street]}`}>
              {isEn ? STREET_LABELS[ex.street].en : STREET_LABELS[ex.street].fr}
            </div>
          </div>

          {/* Answer recap pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-full border bg-green-900/30 text-green-300 border-green-700">
              ✓ {isEn ? 'Correct:' : 'Correct :'}{' '}
              <strong>{actionLabels[correct](ex.potBB)}</strong>
            </span>
            {!isRight && (
              <span className="px-2.5 py-1 rounded-full border bg-red-900/30 text-red-300 border-red-700">
                ✗ {isEn ? 'You chose:' : 'Votre choix :'}{' '}
                <strong>{actionLabels[selected](ex.potBB)}</strong>
              </span>
            )}
            <span className="px-2.5 py-1 rounded-full border bg-blue-900/30 text-blue-300 border-blue-700">
              <Zap size={10} className="inline mr-1" />+{xpEarned} XP
            </span>
          </div>

          {/* Next + stats */}
          <div className="w-full max-w-xs">
            <Button size="lg" variant="gold" onClick={handleNext} fullWidth>
              {isEn ? 'Next exercise' : 'Exercice suivant'}{' '}
              <ChevronRight size={18} className="inline" />
            </Button>
          </div>
          <SessionStatsBar
            total={sessionStats.total}
            correct={sessionStats.correct}
            xp={sessionStats.xp}
          />

          {/* Factor analysis — bluff-specific breakdown */}
          <div className="flex flex-col gap-3 w-full">
            <div className="flex items-center gap-2">
              <TrendingUp size={14} className="text-blue-400" />
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {isEn ? 'Factor Analysis' : 'Analyse des Facteurs'}
              </span>
            </div>
            <FactorGrid factors={ex.factors} isEn={isEn} />
          </div>

          {/* Detailed explanation */}
          <ExplanationPanel text={isEn ? ex.explanation.en : ex.explanation.fr} className="p-5" />
        </motion.div>
      )}
    </div>
  );
}
