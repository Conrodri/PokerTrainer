import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GraduationCap, Play, Zap, Check, Crown, Lock, Gift, Flame, ChevronDown, ChevronUp } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from './Button';
import { RichText } from './RichText';
import { useLangStore } from '../../store/langStore';
import { useModeStore, TrainingMode } from '../../store/modeStore';
import { useAuthStore } from '../../store/authStore';

interface TrainerIntroProps {
  emoji: string;
  title: string;            // already localized by caller
  description: string;      // already localized by caller
  whatTitle: string;        // already localized by caller
  whatContent: React.ReactNode;  // the inner content of the "What is X?" section — varies
  steps: string[];          // already localized bullet items (emoji + text combined)
  beginnerHint: string;     // already localized
  advancedHint: string;     // already localized
  expertHint?: string;      // already localized — optional 3rd (expert) hint
  startLabel: string;       // already localized
  onStart: () => void;
  mode: TrainingMode;
  /** When true, the module is a Premium preview: the intro is fully visible
   *  but the start button is replaced by a Premium upsell CTA. */
  locked?: boolean;
  /** Tailors the locked-state copy/CTA. 'premium' (default) = upgrade prompt,
   *  'login' = sign-in prompt, 'quota' = daily free allowance used up. */
  lockedVariant?: 'premium' | 'login' | 'quota';
  /** For non-premium logged-in users with credits left: shows a free-allowance
   *  banner above the (working) start button. */
  freeInfo?: { remaining: number; limit: number };
  /** Optional secondary CTA (the exam launcher) shown directly under the start
   *  button so both ways to begin are visible without scrolling. */
  examSlot?: React.ReactNode;
}

export function TrainerIntro({
  emoji, title, description, whatTitle, whatContent,
  steps, beginnerHint, advancedHint, expertHint, startLabel, onStart, mode,
  locked = false, lockedVariant = 'premium', freeInfo, examSlot,
}: TrainerIntroProps) {
  const isEn = useLangStore(s => s.lang) === 'en';
  const setMode = useModeStore(s => s.setMode);
  const isExpert = !!useAuthStore(s => s.user?.isPremiumExpert);
  const navigate = useNavigate();
  // Beginners see the full guidance; advanced/expert get a compact launcher
  // (details collapsed) so the start + exam buttons stay above the fold.
  const [showDetails, setShowDetails] = useState(mode === 'beginner');
  useEffect(() => { setShowDetails(mode === 'beginner'); }, [mode]);
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-2 max-w-xl mx-auto"
    >
      {/* Header */}
      <div className="flex flex-col items-center text-center gap-1">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 flex items-center justify-center text-xl shadow-lg shadow-black/30">
          {emoji}
        </div>
        <h2 className="text-lg sm:text-xl font-black text-white">{title}</h2>
        {locked && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-yellow-500/10 border border-yellow-600/40 text-yellow-400 text-[10px] font-bold uppercase tracking-wide">
            <Crown size={11} fill="currentColor" />
            Premium
          </span>
        )}
        <div className="text-gray-400 text-xs leading-snug max-w-lg">
          <RichText text={description} />
        </div>
      </div>

      {/* Info sections — collapsible; auto-collapsed outside beginner for a 0-scroll launcher */}
      <div className="flex flex-col gap-1.5">
        <button
          type="button"
          onClick={() => setShowDetails(v => !v)}
          className="self-center flex items-center gap-1.5 text-[11px] font-medium text-gray-500 hover:text-gray-300 transition-colors"
        >
          {showDetails ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          {showDetails
            ? (isEn ? 'Hide details' : 'Masquer les détails')
            : (isEn ? "What it is & how it works" : "C'est quoi & comment ça marche")}
        </button>
        {showDetails && (<>
        {/* What is X? */}
        <section className="bg-gray-900/50 rounded-xl px-3 py-2 border border-gray-800">
          <h3 className="text-gray-200 font-bold text-sm mb-1.5 flex items-center gap-2">
            <span className="grid place-items-center w-5 h-5 rounded-md bg-blue-900/40 text-blue-300 text-[11px]">📖</span>
            {whatTitle}
          </h3>
          {whatContent}
        </section>

        {/* How it works */}
        <section className="bg-gray-900/50 rounded-xl px-3 py-2 border border-gray-800">
          <h3 className="text-gray-200 font-bold text-sm mb-1.5 flex items-center gap-2">
            <span className="grid place-items-center w-5 h-5 rounded-md bg-gold-900/40 text-gold-300 text-[11px]">⚡</span>
            {isEn ? 'How the exercises work' : 'Comment ça marche ?'}
          </h3>
          <ul className="space-y-1 text-xs text-gray-400">
            {steps.map((item, i) => {
              const spaceIdx = item.indexOf(' ');
              return (
                <li key={i} className="flex items-start gap-2">
                  <span className="grid place-items-center w-4 h-4 rounded bg-gray-800 text-[10px] shrink-0 mt-px">
                    {item.slice(0, spaceIdx)}
                  </span>
                  <div className="flex-1 leading-snug"><RichText text={item.slice(spaceIdx + 1)} /></div>
                </li>
              );
            })}
          </ul>
        </section>
        </>)}
      </div>

      {/* Mode selector — pushed to the footer (below the start/exam buttons) via order-last */}
      <div className="flex flex-col items-center gap-1.5 order-last">
        <div className="inline-flex p-1 rounded-2xl bg-gray-900/70 border border-gray-700 gap-1">
          <button
            type="button"
            onClick={() => setMode('beginner')}
            className={`flex items-center gap-1.5 px-3.5 py-1 rounded-xl text-sm font-bold transition-all ${
              mode === 'beginner' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'
            }`}
          >
            <GraduationCap size={15} />
            {isEn ? 'Beginner' : 'Débutant'}
            {mode === 'beginner' && <Check size={13} />}
          </button>
          <button
            type="button"
            onClick={() => setMode('advanced')}
            className={`flex items-center gap-1.5 px-3.5 py-1 rounded-xl text-sm font-bold transition-all ${
              mode === 'advanced' ? 'bg-gold-600 text-gray-900 shadow' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Zap size={15} />
            {isEn ? 'Advanced' : 'Avancé'}
            {mode === 'advanced' && <Check size={13} />}
          </button>
          <button
            type="button"
            onClick={() => (isExpert ? setMode('expert') : navigate('/premium'))}
            title={isExpert ? undefined : (isEn ? 'Expert — premium tier' : 'Expert — offre premium')}
            className={`flex items-center gap-1.5 px-3.5 py-1 rounded-xl text-sm font-bold transition-all ${
              mode === 'expert' ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:text-white'
            }`}
          >
            {isExpert ? <Flame size={15} /> : <Lock size={13} />}
            Expert
            {mode === 'expert' && <Check size={13} />}
          </button>
        </div>

        {/* Modes explained — active one highlighted */}
        <div className="w-full max-w-md rounded-xl border border-gray-800 bg-gray-900/40 px-3 py-1 flex flex-col gap-0.5 text-[11px] leading-snug">
          <div className={`flex items-start gap-1.5 transition-opacity ${mode === 'beginner' ? 'opacity-100' : 'opacity-50'}`}>
            <GraduationCap size={12} className="text-blue-400 mt-0.5 shrink-0" />
            <span className="text-gray-400">
              <span className="font-bold text-blue-300">{isEn ? 'Beginner' : 'Débutant'}</span> — {beginnerHint}
            </span>
          </div>
          <div className={`flex items-start gap-1.5 transition-opacity ${mode === 'advanced' ? 'opacity-100' : 'opacity-50'}`}>
            <Zap size={12} className="text-gold-400 mt-0.5 shrink-0" />
            <span className="text-gray-400">
              <span className="font-bold text-gold-300">{isEn ? 'Advanced' : 'Avancé'}</span> — {advancedHint}
            </span>
          </div>
          {expertHint && (
            <div className={`flex items-start gap-1.5 transition-opacity ${mode === 'expert' ? 'opacity-100' : 'opacity-50'}`}>
              <Flame size={12} className="text-purple-400 mt-0.5 shrink-0" />
              <span className="text-gray-400">
                <span className="font-bold text-purple-300">Expert</span> — {expertHint}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Start button — or Premium / login / quota upsell when locked */}
      {locked ? (
        lockedVariant === 'login' ? (
          <div className="flex flex-col items-center gap-2">
            <Link to="/login" className="w-full">
              <Button size="lg" variant="gold" fullWidth>
                <Lock size={16} className="inline mr-2" />
                {isEn ? 'Log in to play' : 'Se connecter pour jouer'}
              </Button>
            </Link>
            <p className="flex items-center gap-1.5 text-xs text-gray-500 text-center">
              <Gift size={11} />
              {isEn
                ? 'Log in for 5 free exercises per day — or go Premium for unlimited'
                : 'Connecte-toi pour 5 exercices gratuits par jour — ou passe Premium pour un accès illimité'}
            </p>
          </div>
        ) : lockedVariant === 'quota' ? (
          <div className="flex flex-col items-center gap-2">
            <Link to="/premium" className="w-full">
              <Button size="lg" variant="gold" fullWidth>
                <Crown size={16} className="inline mr-2" fill="currentColor" />
                {isEn ? 'Go Premium for unlimited' : 'Passer Premium — accès illimité'}
              </Button>
            </Link>
            <p className="flex items-center gap-1.5 text-xs text-gray-500 text-center">
              <Lock size={11} />
              {isEn
                ? "You've used your 5 free exercises today — come back tomorrow or go Premium"
                : 'Tu as utilisé tes 5 exercices gratuits du jour — reviens demain ou passe Premium'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Link to="/premium" className="w-full">
              <Button size="lg" variant="gold" fullWidth>
                <Crown size={16} className="inline mr-2" fill="currentColor" />
                {isEn ? 'Unlock with Premium' : 'Débloquer avec Premium'}
              </Button>
            </Link>
            <p className="flex items-center gap-1.5 text-xs text-gray-500">
              <Lock size={11} />
              {isEn
                ? 'This module is reserved for Premium members'
                : 'Ce module est réservé aux membres Premium'}
            </p>
          </div>
        )
      ) : (
        <div className="flex flex-col items-center gap-2">
          {freeInfo && (
            <div className="flex items-center gap-2 text-xs font-medium text-blue-300 bg-blue-900/25 border border-blue-700/40 rounded-full px-3 py-1">
              <Gift size={13} className="text-blue-400" />
              <span>
                {isEn
                  ? `${freeInfo.remaining}/${freeInfo.limit} free exercises left today`
                  : `${freeInfo.remaining}/${freeInfo.limit} exercices gratuits restants aujourd'hui`}
              </span>
            </div>
          )}
          <Button size="lg" variant="gold" onClick={onStart} fullWidth>
            <Play size={16} className="inline mr-2" />
            {startLabel}
          </Button>
          {examSlot}
          {freeInfo && (
            <Link to="/premium" className="text-[11px] text-gray-500 hover:text-yellow-400 transition-colors flex items-center gap-1">
              <Crown size={10} />
              {isEn ? 'Premium = unlimited access' : 'Premium = accès illimité'}
            </Link>
          )}
        </div>
      )}
    </motion.div>
  );
}
