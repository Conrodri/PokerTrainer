import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight, ChevronDown, ChevronUp, Zap, Target,
  Check, Lock, Trophy, Shuffle, Info,
} from 'lucide-react';
import { useIsMobile } from '../../hooks/useIsMobile';
import { useTrainingStore } from '../../store/trainingStore';
import { Hand } from '../poker/Card';
import { Button } from '../ui/Button';
import { ProgressBar } from '../ui/ProgressBar';
import { useModeStore } from '../../store/modeStore';
import { VerdictBanner } from '../ui/VerdictBanner';
import { Spinner } from '../ui/Spinner';
import { ExplanationPanel } from '../ui/ExplanationPanel';
import { RichLine } from '../ui/RichText';
import { BeginnerGuide } from '../ui/BeginnerGuide';
import { TrainerIntro } from '../ui/TrainerIntro';
import { QuotaLockPanel } from '../ui/QuotaLockPanel';
import { StatChip } from '../ui/StatChip';
import { useAuthStore } from '../../store/authStore';
import { useQuotaStore } from '../../store/quotaStore';
import { PokerTable, POSITION_COLORS } from '../poker/PokerTable';
import { CardStr, Position } from '../../types/poker';
import { postflopApi, trainingApi } from '../../services/api';
import { RangeMatrix } from '../poker/RangeMatrix';
import { handToDisplay } from '../../utils/pokerUtils';
import { useLangStore } from '../../store/langStore';

// ─── Types ────────────────────────────────────────────────────────────────────

type ActionKey = 'fold' | 'check' | 'call' | 'raise' | 'bet';
type HandPhase =
  | 'loading'
  | 'preflop' | 'preflop_result'
  | 'flop'    | 'flop_result'
  | 'turn'    | 'turn_result'
  | 'river'   | 'river_result';

interface Option { key: string; labelFr: string; labelEn: string }

interface StreetDecision {
  heroEquity: number;
  heroHandRank: number;
  heroHandLabel: { fr: string; en: string };
  heroHandDescription: string;
  boardTexture: { fr: string; en: string };
  potSize: number;
  isHeroIP: boolean;
  villainPosition: string;
  villainAction: 'check' | 'bet';
  villainBetSize: number;
  correctAction: ActionKey;
  options: { key: ActionKey; labelFr: string; labelEn: string }[];
  explanation: { fr: string; en: string };
}

interface PreflopDecision {
  correctAction: 'fold' | 'raise';
  rangeFreq: number;
  isInRange: boolean;
  options: Option[];
  explanation: { fr: string; en: string };
}

interface FullHandScenario {
  heroPosition: string;
  villainPosition: string;
  heroHand: CardStr[];
  heroNotation: string;
  villainHand: CardStr[];
  villainNotation: string;
  flop: CardStr[];
  turn: CardStr;
  river: CardStr;
  isHeroIP: boolean;
  preflopContext: { fr: string; en: string };
  lastStreet: 'flop' | 'turn' | 'river';
  preflopDecision: PreflopDecision;
  flopDecision: StreetDecision;
  turnDecision: StreetDecision | null;
  riverDecision: StreetDecision | null;
  showdown: {
    heroWins: boolean;
    isTie: boolean;
    heroHandDescription: string;
    villainHandDescription: string;
  };
}

// ─── Stepper ─────────────────────────────────────────────────────────────────

const STEP_KEYS = ['preflop', 'flop', 'turn', 'river'] as const;
type StepKey = typeof STEP_KEYS[number];
const STEP_LABELS: Record<StepKey, { fr: string; en: string }> = {
  preflop: { fr: 'Préflop', en: 'Preflop' },
  flop:    { fr: 'Flop',    en: 'Flop' },
  turn:    { fr: 'Turn',    en: 'Turn' },
  river:   { fr: 'River',   en: 'River' },
};

function Stepper({
  phase, lastStreet, isEn,
}: {
  phase: HandPhase;
  lastStreet: 'flop' | 'turn' | 'river' | null;
  isEn: boolean;
}) {
  const activeIdx = STEP_KEYS.findIndex(k => phase.startsWith(k));
  const completedIdx = phase.endsWith('_result') ? activeIdx : activeIdx - 1;

  // Which steps are locked (beyond lastStreet)?
  const lastIdx = lastStreet ? STEP_KEYS.indexOf(lastStreet) : 3;

  return (
    <div className="grid w-full" style={{ gridTemplateColumns: `repeat(${STEP_KEYS.length}, 1fr)` }}>
      {STEP_KEYS.map((key, i) => {
        const isActive    = i === activeIdx;
        const isCompleted = i <= completedIdx;
        const isLocked    = i > lastIdx;
        const lineActive  = i > 0 && i <= completedIdx + 1 && completedIdx >= 0;
        return (
          <div key={key} className="flex flex-col items-center relative">
            {/* Left half of connector — from previous step center to this step center */}
            {i > 0 && (
              <div
                className={`absolute top-4 right-1/2 left-0 h-0.5 -translate-y-1/2 transition-colors ${lineActive ? 'bg-green-600' : 'bg-gray-700'}`}
              />
            )}
            {/* Right half of connector — from this step center to next step center */}
            {i < STEP_KEYS.length - 1 && (
              <div
                className={`absolute top-4 left-1/2 right-0 h-0.5 -translate-y-1/2 transition-colors ${isCompleted ? 'bg-green-600' : 'bg-gray-700'}`}
              />
            )}
            {/* Circle */}
            <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
              isCompleted ? 'border-green-600 bg-green-900/40 text-green-400' :
              isActive    ? 'border-gold-500 bg-gold-900/30 text-gold-400 shadow-[0_0_8px_rgba(234,179,8,0.3)]' :
              isLocked    ? 'border-gray-700 bg-gray-900/60 text-gray-600' :
                            'border-gray-600 bg-gray-900 text-gray-500'
            }`}>
              {isCompleted ? <Check size={14} /> :
               isLocked    ? <Lock size={11} /> :
               (i + 1).toString()}
            </div>
            {/* Label */}
            <span className={`mt-0.5 text-[10px] font-semibold ${isActive ? 'text-gold-400' : isCompleted ? 'text-green-500' : isLocked ? 'text-gray-700' : 'text-gray-500'}`}>
              {isEn ? STEP_LABELS[key].en : STEP_LABELS[key].fr}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Stack info bar ───────────────────────────────────────────────────────────

function StackBar({ heroPos, villainPos, heroStack, villainStack, potSize, isEn }: {
  heroPos: string; villainPos: string; heroStack: number; villainStack: number; potSize: number; isEn: boolean;
}) {
  const heroColor    = POSITION_COLORS[heroPos    as Position] ?? '#888';
  const villainColor = POSITION_COLORS[villainPos as Position] ?? '#888';
  return (
    <div className="flex items-center justify-between bg-gray-900/50 rounded-xl px-4 py-2.5 border border-gray-800 text-xs w-full">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full" style={{ background: heroColor }} />
        <span className="font-bold" style={{ color: heroColor }}>{heroPos}</span>
        <span className="text-gray-500">{isEn ? '(you)' : '(vous)'}</span>
        <span className="text-blue-400 font-bold">{heroStack}bb</span>
      </div>
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-gray-500 text-[10px] uppercase tracking-wider">Pot</span>
        <span className="text-yellow-400 font-black">{potSize}bb</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-blue-400 font-bold">{villainStack}bb</span>
        <span className="text-gray-500">Villain</span>
        <span className="font-bold" style={{ color: villainColor }}>{villainPos}</span>
        <div className="w-2 h-2 rounded-full" style={{ background: villainColor }} />
      </div>
    </div>
  );
}

// ─── Equity badge ────────────────────────────────────────────────────────────

function EquityBadge({ equity, label }: { equity: number; label: string }) {
  const color = equity >= 60 ? 'text-green-400' : equity >= 45 ? 'text-yellow-400' : 'text-red-400';
  return (
    <div className="bg-gray-800/60 rounded-xl px-4 py-2.5 border border-gray-700 text-center">
      <p className="text-gray-500 text-xs mb-0.5">{label}</p>
      <p className={`font-bold text-lg ${color}`}>{equity}%</p>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function FullHandTrainer() {
  const lang     = useLangStore(s => s.lang);
  const isEn     = lang === 'en';
  const isMobile = useIsMobile();
  const { sessionStats, recordResult, setTrainerStarted } = useTrainingStore();

  // Premium access / daily free-quota for non-premium users
  const user      = useAuthStore(s => s.user);
  const isPremium = !!user?.isPremium;
  const loggedIn  = !!user;
  const quota     = useQuotaStore();
  const freeRemaining = isPremium ? Infinity : quota.remaining.fullhand;
  const [quotaBlocked, setQuotaBlocked] = useState(false);

  const [showIntro, setShowIntro] = useState(true);
  const [phase, setPhase]       = useState<HandPhase>('loading');
  const [scenario, setScenario] = useState<FullHandScenario | null>(null);
  const [answered, setAnswered] = useState<Partial<Record<StepKey, string>>>({});
  const [xpTotal, setXpTotal]   = useState(0);
  const mode = useModeStore(s => s.mode);

  // Range matrix for preflop beginner display
  const [rangeMatrix, setRangeMatrix] = useState<number[][] | null>(null);
  const [showRange,   setShowRange]   = useState(false);

  const loadScenario = async () => {
    setPhase('loading');
    setAnswered({});
    setXpTotal(0);
    try {
      const data = await postflopApi.getFullHandScenario();
      setScenario(data);
      setPhase('preflop');
      if (!isPremium) quota.decrement('fullhand'); // server consumed one credit
    } catch (e: any) {
      if (e?.response?.status === 402) {            // daily free allowance used up
        quota.set('fullhand', 0);
        setQuotaBlocked(true);
      } else {
        setPhase('loading'); // stays on spinner — user can retry
      }
    }
  };

  const handleStart = () => {
    setShowIntro(false);
    setTrainerStarted(true);
    loadScenario();
  };

  const backToIntro = () => {
    setQuotaBlocked(false);
    setShowIntro(true);
    setTrainerStarted(false);
  };

  // Refresh free-quota counts when a non-premium user opens the module
  useEffect(() => {
    if (loggedIn && !isPremium) quota.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedIn, isPremium]);

  useEffect(() => {
    if (phase.endsWith('_result')) window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [phase]);

  // Fetch range matrix when scenario loads (or position changes)
  useEffect(() => {
    if (!scenario) { setRangeMatrix(null); return; }
    trainingApi.getRangeMatrix(scenario.heroPosition as any)
      .then(d => setRangeMatrix((d as any)?.matrix ?? null))
      .catch(() => setRangeMatrix(null));
    setShowRange(false);
  }, [scenario?.heroPosition]);

  // ── Current board based on phase ────────────────────────────────────────────

  const board: CardStr[] = !scenario ? [] :
    phase.startsWith('flop')    ? scenario.flop :
    phase.startsWith('turn')    ? [...scenario.flop, scenario.turn] :
    phase.startsWith('river')   ? [...scenario.flop, scenario.turn, scenario.river] :
    [];

  // ── Current decision data ────────────────────────────────────────────────────

  function getCurrentDecision(): { preflop: PreflopDecision } | { street: StreetDecision } | null {
    if (!scenario) return null;
    if (phase.startsWith('preflop')) return { preflop: scenario.preflopDecision };
    if (phase.startsWith('flop'))    return { street: scenario.flopDecision };
    if (phase.startsWith('turn'))    return scenario.turnDecision ? { street: scenario.turnDecision } : null;
    if (phase.startsWith('river'))   return scenario.riverDecision ? { street: scenario.riverDecision } : null;
    return null;
  }

  const currentStep: StepKey = STEP_KEYS.find(k => phase.startsWith(k)) ?? 'preflop';
  const decision = getCurrentDecision();

  // ── Handle answer ────────────────────────────────────────────────────────────

  const handleAnswer = async (actionKey: string) => {
    if (!decision) return;
    const correctAction =
      'preflop' in decision ? decision.preflop.correctAction : decision.street.correctAction;
    const ok = actionKey === correctAction;
    const xp = currentStep === 'preflop' ? 10 : 15;
    setAnswered(prev => ({ ...prev, [currentStep]: actionKey }));
    if (ok) setXpTotal(prev => prev + xp);
    await recordResult(ok, xp, `fullhand_${currentStep}`);
    setPhase(`${currentStep}_result` as HandPhase);
  };

  // ── Handle continue ──────────────────────────────────────────────────────────

  const handleContinue = () => {
    if (!scenario) return;
    if (phase === 'preflop_result') {
      if (correctAction === 'fold') { loadScenario(); return; }
      setPhase('flop'); return;
    }
    if (phase === 'flop_result') {
      if (scenario.lastStreet === 'flop') { loadScenario(); return; }
      setPhase('turn'); return;
    }
    if (phase === 'turn_result') {
      if (scenario.lastStreet === 'turn') { loadScenario(); return; }
      setPhase('river'); return;
    }
    if (phase === 'river_result') { loadScenario(); return; }
  };

  const isFinalStreet =
    (phase === 'preflop_result' && scenario?.preflopDecision?.correctAction === 'fold') ||
    (phase === 'flop_result'  && scenario?.lastStreet === 'flop')  ||
    (phase === 'turn_result'  && scenario?.lastStreet === 'turn')  ||
    phase === 'river_result';

  // ── Accuracy ─────────────────────────────────────────────────────────────────
  const accuracy = sessionStats.total > 0
    ? Math.round((sessionStats.correct / sessionStats.total) * 100)
    : 0;

  // ── Current pot size for the table display ───────────────────────────────────
  const currentPotSize =
    decision && 'street' in decision ? decision.street.potSize :
    decision && 'preflop' in decision ? 1.5 :
    1.5;

  const effectiveStack = 100 - currentPotSize;

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────

  if (showIntro) {
    return (
      <div className="flex flex-col gap-5 max-w-2xl mx-auto">
        <TrainerIntro
          emoji="🏆"
          title={isEn ? 'Full Hand Trainer' : 'Entraîneur Main Complète'}
          description={isEn
            ? "Play a full hand from pre-flop to showdown, making decisions at every street."
            : "Jouez une main complète du pré-flop jusqu'au showdown, en prenant des décisions à chaque rue."}
          whatTitle={isEn ? 'The format' : 'Le format'}
          whatContent={
            <>
              <p className="text-gray-400 text-xs leading-snug mb-2.5">
                <RichLine text={isEn
                  ? 'Follow a complete hand across 2 to 4 streets. At each stage, choose the best action and see how each decision impacts the hand result.'
                  : 'Suivez une main complète sur 2 à 4 rues. À chaque étape, choisissez la meilleure action et voyez comment chaque décision impacte le résultat de la main.'} />
              </p>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { emoji: '♠️', label: isEn ? 'Preflop' : 'Préflop', desc: isEn ? 'Open or fold?' : 'Ouvrir ou fold ?' },
                  { emoji: '🔵', label: 'Flop',  desc: isEn ? '3 community cards' : '3 cartes communes' },
                  { emoji: '🟡', label: 'Turn',  desc: isEn ? '4th card' : '4ème carte' },
                  { emoji: '🔴', label: 'River', desc: isEn ? 'Last card' : 'Dernière carte' },
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
            '🃏 Receive a random hand against an opponent in a scenario',
            '🎯 Make decisions at each street (2 to 4 decisions per hand)',
            '📊 Your equity is calculated at each stage',
            '💡 Each mistake is explained in detail',
            '🏆 Final score and XP earned at the showdown',
          ] : [
            '🃏 Recevez une main aléatoire face à un adversaire dans un scénario',
            '🎯 Prenez des décisions à chaque rue (2 à 4 décisions par main)',
            '📊 Votre équité est calculée à chaque étape',
            '💡 Chaque erreur est expliquée en détail',
            '🏆 Score final et XP gagnés au showdown',
          ]}
          beginnerHint={isEn ? 'Shows equity & board texture hints' : 'Affiche équité & indices de texture'}
          advancedHint={isEn ? 'No hints — full immersion' : 'Sans indices — immersion totale'}
          startLabel={isEn ? 'Start training' : "Commencer l'entraînement"}
          onStart={handleStart}
          mode={mode}
          locked={!isPremium && (!loggedIn || freeRemaining <= 0)}
          lockedVariant={!loggedIn ? 'login' : 'quota'}
          freeInfo={!isPremium && loggedIn && freeRemaining > 0
            ? { remaining: freeRemaining, limit: quota.limit }
            : undefined}
        />
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

  if (phase === 'loading' || !scenario) {
    return (
      <div className="flex flex-col gap-6 max-w-2xl mx-auto items-center py-16">
        <div className="animate-spin h-12 w-12 border-2 border-gold-500 border-t-transparent rounded-full" />
        <p className="text-gray-400 text-sm">
          {isEn ? 'Generating hand…' : 'Génération de la main…'}
        </p>
      </div>
    );
  }

  const currentAnswerKey = answered[currentStep];
  const isResultPhase    = phase.endsWith('_result');
  const correctAction    = decision
    ? ('preflop' in decision ? decision.preflop.correctAction : decision.street.correctAction)
    : '';
  const isCorrect        = currentAnswerKey === correctAction;

  return (
    <div className="flex flex-col gap-5 max-w-2xl mx-auto">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">
            {isEn ? 'Full Hand Trainer' : 'Entraîneur Main Complète'}
          </h2>
          <p className="text-gray-400 text-sm">
            {isEn ? 'Play through a complete hand — preflop to river' : 'Jouez une main complète — du préflop à la river'}
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

      {/* ── Stepper ── */}
      <Stepper phase={phase} lastStreet={scenario.lastStreet} isEn={isEn} />

      {/* ── Poker table ── */}
      <div className="w-full max-w-xs sm:max-w-xl mx-auto">
        <PokerTable
          heroPosition={scenario.heroPosition as Position}
          interactive={false}
          activePlayers={[scenario.heroPosition as Position, scenario.villainPosition as Position]}
          potDisplay={`${currentPotSize}bb`}
          heroCards={scenario.heroHand as string[]}
          boardCards={board as string[]}
          boardCardSize="md"
          compact={true}
        />
      </div>

      {/* Hero cards */}
      <div className="w-full rounded-2xl border border-gray-700/60 bg-gray-900/50 px-4 py-3 flex flex-col items-center gap-2">
        <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
          {isEn ? 'Your hand' : 'Votre main'}
        </p>
        <Hand cards={scenario.heroHand as any} size="md" gap="gap-2" animate={false} />
      </div>

      {/* ── Stack info bar ── */}
      <StackBar
        heroPos={scenario.heroPosition}
        villainPos={scenario.villainPosition}
        heroStack={effectiveStack}
        villainStack={effectiveStack}
        potSize={currentPotSize}
        isEn={isEn}
      />

      {/* ── Preflop context info ── */}
      <div className="bg-gray-900/60 rounded-xl px-4 py-2.5 border border-gray-800 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="text-gray-400">{isEn ? scenario.preflopContext.en : scenario.preflopContext.fr}</span>
        <span className={`font-semibold px-2 py-0.5 rounded-full border ${
          scenario.isHeroIP
            ? 'text-green-400 border-green-800 bg-green-900/20'
            : 'text-orange-400 border-orange-800 bg-orange-900/20'
        }`}>
          {scenario.isHeroIP ? (isEn ? 'In Position' : 'En position') : (isEn ? 'Out of Position' : 'Hors position')}
        </span>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          DECISION PHASE
          ═══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence mode="wait">
        {!isResultPhase && decision && (
          <motion.div
            key={phase}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            className="flex flex-col items-center gap-5"
          >
            {/* Beginner explanation of the current step */}
            <BeginnerGuide
              title={isEn
                ? `What you must do — ${STEP_LABELS[currentStep].en}`
                : `Ce qu'on te demande — ${STEP_LABELS[currentStep].fr}`}
              text={'preflop' in decision
                ? (isEn
                    ? `You're playing **one full hand** from start to finish. Right now it's the **pre-flop** step.\nYou got **${handToDisplay(scenario.heroNotation)}** in **${scenario.heroPosition}**. Decide if this hand is worth playing: **Raise** to attack, or **Fold** to wait for better.\n👉 If you fold, the hand stops. If you raise correctly, you move on to the flop and keep going.`
                    : `Tu joues **une main complète** du début à la fin. Là, c'est l'étape **pré-flop**.\nTu as **${handToDisplay(scenario.heroNotation)}** en **${scenario.heroPosition}**. Décide si la main vaut la peine d'être jouée : **Raise** pour attaquer, ou **Fold** pour attendre mieux.\n👉 Si tu fold, la main s'arrête. Si tu raises correctement, tu passes au flop et tu continues.`)
                : (isEn
                    ? `Same hand continues — now on the **${STEP_LABELS[currentStep].en}**. New community cards are on the table.\n${decision.street.villainAction === 'bet'
                        ? `**${decision.street.villainPosition}** bet **${decision.street.villainBetSize}bb**. React: **Fold**, **Call**, or **Raise**.`
                        : `**${decision.street.villainPosition}** checked. It's your turn: **Check** for a free card, or **Bet** to attack.`}\n👉 Use the hints (your hand strength + equity) to pick the smart action and reach the showdown.`
                    : `La même main continue — maintenant au **${STEP_LABELS[currentStep].fr}**. De nouvelles cartes communes sont sur la table.\n${decision.street.villainAction === 'bet'
                        ? `**${decision.street.villainPosition}** a misé **${decision.street.villainBetSize}bb**. Réagis : **Fold**, **Call**, ou **Raise**.`
                        : `**${decision.street.villainPosition}** a checké. C'est ton tour : **Check** pour une carte gratuite, ou **Bet** pour attaquer.`}\n👉 Sers-toi des indices (force de ta main + équité) pour choisir l'action maligne et atteindre le showdown.`)}
            />

            {/* Preflop-specific content */}
            {'preflop' in decision && (
              <>
                {/* Range frequency — beginner only */}
                {mode === 'beginner' && (
                  <div className="grid grid-cols-2 gap-3 w-full">
                    <div className="bg-gray-800/60 rounded-xl px-4 py-2.5 border border-gray-700 text-center">
                      <p className="text-gray-500 text-xs mb-0.5">
                        {isEn ? `${scenario.heroPosition} range` : `Range ${scenario.heroPosition}`}
                      </p>
                      <p className={`font-bold ${decision.preflop.isInRange ? 'text-green-400' : 'text-red-400'}`}>
                        {Math.round(decision.preflop.rangeFreq * 100)}%
                      </p>
                    </div>
                    <div className="bg-gray-800/60 rounded-xl px-4 py-2.5 border border-gray-700 text-center">
                      <p className="text-gray-500 text-xs mb-0.5">
                        {isEn ? 'In range?' : 'Dans la range ?'}
                      </p>
                      <p className={`font-bold ${decision.preflop.isInRange ? 'text-green-400' : 'text-red-400'}`}>
                        {decision.preflop.isInRange ? (isEn ? 'Yes ✓' : 'Oui ✓') : (isEn ? 'No ✗' : 'Non ✗')}
                      </p>
                    </div>
                  </div>
                )}

                {/* Range matrix — beginner only, collapsible */}
                {mode === 'beginner' && rangeMatrix && (
                  <div className="w-full">
                    <button
                      onClick={() => setShowRange(v => !v)}
                      className="flex items-center justify-between w-full px-4 py-2.5 rounded-xl border transition-colors mb-1 border-gray-700 bg-gray-800/50 hover:bg-gray-800 text-sm font-semibold"
                    >
                      <span className="flex items-center gap-1.5 text-felt-300">
                        <Target size={14} className="text-felt-400 shrink-0" />
                        {isEn ? `GTO range — ${scenario.heroPosition}` : `Range GTO — ${scenario.heroPosition}`}
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
                          className="overflow-hidden flex flex-col items-center gap-2 pt-2"
                        >
                          <RangeMatrix
                            matrix={rangeMatrix}
                            highlightNotation={scenario.heroNotation}
                            size="sm"
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Preflop: blinds info */}
                <div className="text-xs text-gray-400 text-center">
                  {isEn ? 'Pot after raise: ' : 'Pot après raise : '}
                  <span className="text-yellow-400 font-bold">1.5bb</span>
                  {' · '}
                  {isEn ? 'Effective stack: ' : 'Stack effectif : '}
                  <span className="text-blue-400 font-bold">100bb</span>
                </div>
              </>
            )}

            {/* Post-flop street-specific content */}
            {'street' in decision && (
              <>
                {mode === 'beginner' && (
                  <div className="grid grid-cols-2 gap-3 w-full">
                    <div className="bg-gray-800/60 rounded-xl px-4 py-2.5 border border-gray-700 text-center">
                      <p className="text-gray-500 text-xs mb-0.5">{isEn ? 'Hand strength' : 'Force de main'}</p>
                      <p className="text-white font-semibold text-sm">
                        {isEn ? decision.street.heroHandLabel.en : decision.street.heroHandLabel.fr}
                      </p>
                    </div>
                    <EquityBadge
                      equity={decision.street.heroEquity}
                      label={isEn ? 'Equity' : 'Équité'}
                    />
                    <div className="bg-gray-800/60 rounded-xl px-4 py-2.5 border border-gray-700 text-center col-span-2">
                      <p className="text-gray-500 text-xs mb-0.5">{isEn ? 'Board texture' : 'Texture'}</p>
                      <p className="text-white font-semibold text-sm">
                        {isEn ? decision.street.boardTexture.en : decision.street.boardTexture.fr}
                      </p>
                    </div>
                  </div>
                )}

                {/* Villain action */}
                {decision.street.villainAction === 'bet' ? (
                  <div className="bg-red-900/20 border border-red-800/50 rounded-xl px-4 py-2.5 text-sm text-red-300 w-full text-center">
                    <span className="font-bold">{decision.street.villainPosition}</span>{' '}
                    {isEn ? `bets ${decision.street.villainBetSize}bb` : `mise ${decision.street.villainBetSize}bb`}
                  </div>
                ) : (
                  <div className="bg-gray-800/40 border border-gray-700/50 rounded-xl px-4 py-2.5 text-sm text-gray-400 w-full text-center">
                    <span className="font-bold text-white">{decision.street.villainPosition}</span>{' '}
                    {isEn ? 'checks' : 'check'}
                  </div>
                )}
              </>
            )}

            {/* Action buttons */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-wrap gap-3 justify-center w-full"
            >
              {('preflop' in decision ? decision.preflop.options : decision.street.options).map((opt) => (
                <Button
                  key={opt.key}
                  size="lg"
                  variant={
                    opt.key === 'fold'  ? 'danger' :
                    opt.key === 'raise' ? 'gold' :
                    'secondary'
                  }
                  onClick={() => handleAnswer(opt.key)}
                  className="min-w-[130px]"
                >
                  {isEn ? opt.labelEn : opt.labelFr}
                </Button>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════════════════
          RESULT PHASE
          ═══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence mode="wait">
        {isResultPhase && decision && (
          <motion.div
            key={phase + '_res'}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-5"
          >
            {/* ── 1. Verdict + action recap (grouped) ── */}
            <div className="flex flex-col items-center gap-3 w-full">
              <VerdictBanner isCorrect={isCorrect} />
              <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
                {(() => {
                  const opts = 'preflop' in decision ? decision.preflop.options : decision.street.options;
                  const correctOpt = opts.find(o => o.key === correctAction);
                  const playerOpt  = opts.find(o => o.key === currentAnswerKey);
                  return (
                    <>
                      {correctOpt && (
                        <span className="px-2.5 py-1 rounded-full border bg-green-900/30 text-green-300 border-green-700">
                          {isEn ? 'Correct:' : 'Correct :'} <strong>{isEn ? correctOpt.labelEn : correctOpt.labelFr}</strong>
                        </span>
                      )}
                      {playerOpt && currentAnswerKey !== correctAction && (
                        <span className="px-2.5 py-1 rounded-full border bg-red-900/30 text-red-300 border-red-700">
                          {isEn ? 'You played:' : 'Votre action :'} <strong>{isEn ? playerOpt.labelEn : playerOpt.labelFr}</strong>
                        </span>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>

            {/* ── 2. Hand context — one compact line ── */}
            <p className="text-xs text-gray-500 text-center leading-relaxed">
              <span className="text-yellow-400 font-mono font-semibold">{handToDisplay(scenario.heroNotation)}</span>
              {'preflop' in decision && (
                <span>
                  {' · '}
                  {isEn
                    ? `${scenario.heroPosition} range: ${Math.round(decision.preflop.rangeFreq * 100)}%`
                    : `Range ${scenario.heroPosition} : ${Math.round(decision.preflop.rangeFreq * 100)}%`}
                </span>
              )}
              {'street' in decision && (
                <span>
                  {' · '}
                  {isEn ? decision.street.heroHandLabel.en : decision.street.heroHandLabel.fr}
                  {' · '}
                  <span className={decision.street.heroEquity >= 60 ? 'text-green-400' : decision.street.heroEquity >= 45 ? 'text-yellow-400' : 'text-red-400'}>
                    {decision.street.heroEquity}%
                  </span>
                </span>
              )}
            </p>

            {/* ── 3. Navigation CTA ── */}
            <div className="w-full max-w-xs">
              <Button size="lg" variant="gold" onClick={handleContinue} fullWidth>
                {isFinalStreet ? (
                  <><Shuffle size={16} className="inline mr-1" /> {isEn ? 'New hand' : 'Nouvelle main'}</>
                ) : (
                  <>
                    {isEn ? `Continue → ${STEP_LABELS[STEP_KEYS[STEP_KEYS.indexOf(currentStep) + 1] ?? 'preflop'].en}`
                           : `Continuer → ${STEP_LABELS[STEP_KEYS[STEP_KEYS.indexOf(currentStep) + 1] ?? 'preflop'].fr}`}
                    <ChevronRight size={18} className="inline" />
                  </>
                )}
              </Button>
            </div>

            {/* ── 4. Session stats ── */}
            {sessionStats.total > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-4 bg-gray-900/60 rounded-xl px-5 py-3 border border-gray-700 w-full"
              >
                <StatChip icon={<Target size={14} />} label={isEn ? 'acc.' : 'préc.'} value={`${accuracy}%`} color={accuracy >= 70 ? 'text-green-400' : 'text-yellow-400'} />
                <StatChip icon={<Trophy size={14} />} label={isEn ? 'this hand' : 'cette main'} value={`+${xpTotal} XP`} color="text-gold-400" />
                <div className="flex-1"><ProgressBar value={accuracy} color="green" size="sm" /></div>
                <span className="text-xs text-gray-500 shrink-0">{sessionStats.correct}/{sessionStats.total}</span>
              </motion.div>
            )}

            {/* ── 5. Explanation — beginner only ── */}
            <ExplanationPanel
              text={
                isEn
                  ? ('preflop' in decision ? decision.preflop.explanation.en : decision.street.explanation.en)
                  : ('preflop' in decision ? decision.preflop.explanation.fr : decision.street.explanation.fr)
              }
            />

            {/* ── 6. River showdown ── */}
            {phase === 'river_result' && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className={`w-full rounded-2xl border-2 p-5 ${
                  scenario.showdown.heroWins
                    ? 'border-gold-600/60 bg-gold-900/15'
                    : scenario.showdown.isTie
                      ? 'border-gray-600 bg-gray-900/40'
                      : 'border-gray-700 bg-gray-900/40'
                }`}
              >
                <p className="text-center font-bold text-lg mb-4 flex items-center justify-center gap-2">
                  {scenario.showdown.heroWins
                    ? <><Trophy size={18} className="text-gold-400" /> <span className="text-gold-400">{isEn ? 'You win!' : 'Vous gagnez !'}</span></>
                    : scenario.showdown.isTie
                      ? <span className="text-gray-300">{isEn ? 'Split pot' : 'Partage du pot'}</span>
                      : <span className="text-red-400">{isEn ? 'Villain wins' : 'Le villain gagne'}</span>
                  }
                </p>

                <div className="grid grid-cols-2 gap-4">
                  {/* Hero */}
                  <div className={`rounded-xl p-3 text-center border ${scenario.showdown.heroWins ? 'border-gold-700 bg-gold-900/20' : 'border-gray-700 bg-gray-900/40'}`}>
                    <p className="text-xs text-gray-500 mb-2">{isEn ? 'You' : 'Vous'} ({scenario.heroPosition})</p>
                    <Hand cards={scenario.heroHand} size="sm" animate={false} />
                    <p className="text-yellow-400 font-mono text-xs mt-1.5">{handToDisplay(scenario.heroNotation)}</p>
                    <p className="text-gray-400 text-xs mt-1">{scenario.showdown.heroHandDescription}</p>
                  </div>

                  {/* Villain */}
                  <div className={`rounded-xl p-3 text-center border ${!scenario.showdown.heroWins && !scenario.showdown.isTie ? 'border-red-800 bg-red-900/15' : 'border-gray-700 bg-gray-900/40'}`}>
                    <p className="text-xs text-gray-500 mb-2">{isEn ? 'Villain' : 'Villain'} ({scenario.villainPosition})</p>
                    <Hand cards={scenario.villainHand} size="sm" animate={false} />
                    <p className="text-yellow-400 font-mono text-xs mt-1.5">{handToDisplay(scenario.villainNotation)}</p>
                    <p className="text-gray-400 text-xs mt-1">{scenario.showdown.villainHandDescription}</p>
                  </div>
                </div>

              </motion.div>
            )}

            {/* Fold terminal message */}
            {isFinalStreet && phase !== 'river_result' && (
              <div className="bg-gray-800/40 border border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-400 text-center w-full">
                {correctAction === 'fold'
                  ? (isEn
                      ? "✓ Fold was the optimal play — hand ends here."
                      : "✓ Le fold était la meilleure action — la main s'arrête ici.")
                  : (isEn
                      ? 'The hand ends here.'
                      : 'La main s\'arrête ici.')}
              </div>
            )}

          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
