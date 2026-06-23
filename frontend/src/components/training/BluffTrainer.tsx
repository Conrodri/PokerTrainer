import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, TrendingUp, Info } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useTrainingStore } from '../../store/trainingStore';
import { useModeStore, showHints } from '../../store/modeStore';
import { useLangStore } from '../../store/langStore';
import { useAuthStore } from '../../store/authStore';
import { useQuotaStore } from '../../store/quotaStore';
import { useExerciseLock } from '../../hooks/useExerciseLock';
import { Button } from '../ui/Button';
import { SessionStatsBar } from '../ui/SessionStatsBar';
import { VerdictBanner } from '../ui/VerdictBanner';
import { TrainerIntro } from '../ui/TrainerIntro';
import { QuotaLockPanel } from '../ui/QuotaLockPanel';
import { Spinner } from '../ui/Spinner';
import { RichText } from '../ui/RichText';
import { Card } from '../poker/Card';
import { quotaApi } from '../../services/api';
import type { BluffAction, BluffExercise, BluffFactorScore } from '../../types/poker';
import type { CardStr } from '../../types/poker';

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

const ALL_ACTIONS: BluffAction[] = ['check-fold', 'bluff-small', 'bluff-medium', 'bluff-large'];

function actionButtonVariant(action: BluffAction, selected: BluffAction | null, correct: BluffAction): string {
  if (!selected) return 'secondary';
  if (action === correct)  return 'gold';
  if (action === selected && action !== correct) return 'danger';
  return 'secondary';
}

// ─── Street label ─────────────────────────────────────────────────────────────

function streetLabel(street: BluffExercise['street'], isEn: boolean): string {
  const map = { flop: isEn ? 'Flop' : 'Flop', turn: 'Turn', river: 'River' };
  return map[street];
}

// ─── Intro ────────────────────────────────────────────────────────────────────

function BluffIntro({ onStart }: { onStart: () => void }) {
  const isEn  = useLangStore(s => s.lang) === 'en';
  const mode  = useModeStore(s => s.mode);

  const title       = isEn ? 'Bluff Training' : 'Entraînement au Bluff';
  const description = isEn
    ? 'Learn when to bluff, when to fold, and how to size your bets as a bluff.'
    : "Apprenez quand bluffer, quand abandonner, et comment doser la taille de votre bluff.";

  const whatContent = isEn ? (
    <p className="text-sm text-gray-400 leading-relaxed">
      A <strong className="text-white">bluff</strong> is betting or raising with a hand that isn't strong enough to win at showdown, intending to make the opponent fold a better hand. Good bluffing requires understanding board texture, villain's range, position, and hand equity.
    </p>
  ) : (
    <p className="text-sm text-gray-400 leading-relaxed">
      Un <strong className="text-white">bluff</strong> consiste à miser ou relancer avec une main insuffisante pour gagner au showdown, dans le but de faire se coucher une meilleure main adverse. Bien bluffer nécessite de comprendre la texture du board, la range de vilain, la position et l'équité de votre main.
    </p>
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
    <div className="flex flex-col gap-2">
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

// ─── Board display ────────────────────────────────────────────────────────────

function BoardDisplay({ board, street, isEn }: {
  board: CardStr[];
  street: BluffExercise['street'];
  isEn: boolean;
}) {
  const flop  = board.slice(0, 3) as CardStr[];
  const extra = board.slice(3)    as CardStr[];

  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-xs text-gray-500 uppercase tracking-widest">
        {streetLabel(street, isEn)}
      </span>
      <div className="flex items-center gap-2">
        {/* Flop */}
        <div className="flex gap-1.5">
          {flop.map((c, i) => <Card key={i} card={c} size="md" />)}
        </div>
        {/* Turn / River cards (separator + cards) */}
        {extra.length > 0 && (
          <>
            <div className="w-px h-10 bg-gray-700 mx-1" />
            <div className="flex gap-1.5">
              {extra.map((c, i) => <Card key={i} card={c} size="md" />)}
            </div>
          </>
        )}
      </div>
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
        {action === 'check-fold' ? '✋' : action === 'bluff-small' ? '💙' : action === 'bluff-medium' ? '💜' : '🔥'}
      </span>
      {label}
    </Button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function BluffTrainer() {
  const isEn = useLangStore(s => s.lang) === 'en';
  const mode = useModeStore(s => s.mode);
  const showBeginnerHints = showHints(mode);

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

  // Premium access / daily free-quota for non-premium users
  const user      = useAuthStore(s => s.user);
  const isPremium = !!user?.isPremium;
  const loggedIn  = !!user;
  const quota     = useQuotaStore();
  const [quotaBlocked, setQuotaBlocked] = useState(false);

  const [showIntro, setShowIntro]       = useState(true);
  const [phase, setPhase]               = useState<Phase>('exercise');
  const [selected, setSelected]         = useState<BluffAction | null>(null);
  const [startTime, setStartTime]       = useState(Date.now());
  const [showFullExplanation, setShowFullExplanation] = useState(false);

  // Refresh free-quota counts when a non-premium user opens the module
  useEffect(() => {
    if (loggedIn && !isPremium) quota.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedIn, isPremium]);

  // Lock mode switching while a question is on screen
  useExerciseLock(!showIntro && phase === 'exercise' && !!bluffExercise);

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
    setShowIntro(false);
    setTrainerStarted(true);
    nextExercise();
    setStartTime(Date.now());
  };

  const handleAnswer = async (action: BluffAction) => {
    if (!bluffExercise || selected) return;
    const timeTaken = Date.now() - startTime;
    const isCorrect = action === bluffExercise.correctAction;
    const xp        = isCorrect ? 20 : 5;
    setSelected(action);
    setPhase('result');
    setIsExercising(false);
    await recordResult(isCorrect, xp, 'bluff', timeTaken);
  };

  const handleNext = () => {
    setSelected(null);
    setPhase('exercise');
    setShowFullExplanation(false);
    setStartTime(Date.now());
    nextExercise();
    setIsExercising(true);
  };

  // Signal exercising state to hide range panel
  useEffect(() => {
    if (!showIntro && phase === 'exercise') setIsExercising(true);
  }, [showIntro, phase, setIsExercising]);

  if (showIntro) return <BluffIntro onStart={handleStart} />;

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

  const ex      = bluffExercise;
  const correct = ex.correctAction;
  const isRight = selected === correct;

  // ── Result phase ───────────────────────────────────────────────────────────

  if (phase === 'result' && selected) {
    const actionLabels = isEn ? ACTION_LABELS_EN : ACTION_LABELS_FR;

    return (
      <motion.div
        key="result"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-5 max-w-2xl mx-auto"
      >
        <SessionStatsBar total={sessionStats.total} correct={sessionStats.correct} xp={sessionStats.xp} />

        <VerdictBanner isCorrect={isRight} />

        {/* Correct action reminder */}
        <div className="text-center text-sm text-gray-400">
          {isEn ? 'Correct action:' : 'Action correcte :'}{' '}
          <span className="font-bold text-white">{actionLabels[correct](ex.potBB)}</span>
        </div>

        {/* Board + hands recap */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-4 flex flex-col gap-4">
          <BoardDisplay board={ex.board as CardStr[]} street={ex.street} isEn={isEn} />
          <div className="flex items-center justify-between text-xs text-gray-500 border-t border-gray-800 pt-3">
            <span>{isEn ? 'Your hand' : 'Votre main'}</span>
            <div className="flex gap-1.5">
              {(ex.heroHand as CardStr[]).map((c, i) => <Card key={i} card={c} size="sm" />)}
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Pot</span>
            <span className="font-semibold text-white">{ex.potBB} BB</span>
          </div>
        </div>

        {/* Factor grid — always visible in beginner; collapsible toggle in advanced/expert */}
        {(showBeginnerHints || showFullExplanation) ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <TrendingUp size={14} className="text-blue-400" />
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {isEn ? 'Factor Analysis' : 'Analyse des Facteurs'}
              </span>
            </div>
            <FactorGrid factors={ex.factors} isEn={isEn} />
          </div>
        ) : null}

        {/* Explanation toggle (beginner always shown; advanced/expert behind button) */}
        {showBeginnerHints ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Info size={14} className="text-yellow-400" />
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {isEn ? 'Detailed Explanation' : 'Explication Détaillée'}
              </span>
            </div>
            <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-4">
              <RichText text={isEn ? ex.explanation.en : ex.explanation.fr} />
            </div>
          </div>
        ) : !showFullExplanation ? (
          <button
            onClick={() => setShowFullExplanation(true)}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300 transition-colors mx-auto"
          >
            <Info size={13} />
            {isEn ? 'Show explanation' : 'Afficher l\'explication'}
          </button>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Info size={14} className="text-yellow-400" />
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {isEn ? 'Detailed Explanation' : 'Explication Détaillée'}
              </span>
            </div>
            <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-4">
              <RichText text={isEn ? ex.explanation.en : ex.explanation.fr} />
            </div>
          </div>
        )}

        {/* Next button */}
        <Button variant="gold" size="lg" onClick={handleNext} className="w-full mt-2">
          {isEn ? 'Next exercise' : 'Exercice suivant'}
          <ChevronRight size={16} className="ml-1" />
        </Button>
      </motion.div>
    );
  }

  // ── Exercise phase ─────────────────────────────────────────────────────────

  return (
    <motion.div
      key="exercise"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-5 max-w-2xl mx-auto"
    >
      <SessionStatsBar total={sessionStats.total} correct={sessionStats.correct} xp={sessionStats.xp} />

      {/* Board */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-5">
        <BoardDisplay board={ex.board as CardStr[]} street={ex.street} isEn={isEn} />
      </div>

      {/* Hand context / narrative */}
      <div className="bg-gray-900/40 border border-gray-800 rounded-2xl p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            {isEn ? 'Hand history' : 'Historique de la main'}
          </span>
        </div>
        <p className="text-sm text-gray-300 leading-relaxed">
          {isEn ? ex.preflopNarrative.en : ex.preflopNarrative.fr}
        </p>
        {ex.streetNarrative.map((n, i) => (
          <p key={i} className="text-sm text-gray-400 leading-relaxed">
            {isEn ? n.en : n.fr}
          </p>
        ))}
      </div>

      {/* Position badge */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 bg-gray-800/60 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-300">
          <span>🎯</span>
          <span>{isEn ? 'Hero' : 'Héros'}: <strong className="text-white">{ex.heroPosition}</strong></span>
        </div>
        <div className="flex items-center gap-1.5 bg-gray-800/60 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-300">
          <span>😈</span>
          <span>{isEn ? 'Villain' : 'Vilain'}: <strong className="text-white">{ex.villainPosition}</strong></span>
        </div>
        <div className="flex items-center gap-1.5 bg-gray-800/60 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-300">
          <span>💰</span>
          <span>Pot: <strong className="text-white">{ex.potBB} BB</strong></span>
        </div>
        <div className="flex items-center gap-1.5 bg-gray-800/60 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-300">
          <span>📦</span>
          <span>Stack: <strong className="text-white">{ex.stackBB} BB</strong></span>
        </div>
      </div>

      {/* Hero hand */}
      <div className="flex flex-col items-center gap-3">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          {isEn ? 'Your hand' : 'Votre main'}
        </span>
        <div className="flex gap-2">
          {(ex.heroHand as CardStr[]).map((c, i) => <Card key={i} card={c} size="lg" />)}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-2.5">
        <span className="text-sm font-semibold text-gray-300 text-center">
          {isEn ? 'What do you do?' : 'Que faites-vous ?'}
        </span>
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
      </div>
    </motion.div>
  );
}
