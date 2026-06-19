import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, BookOpen, Sprout, GraduationCap, Zap, X, PlayCircle } from 'lucide-react';
import { useModeStore } from '../../store/modeStore';
import { useLangStore } from '../../store/langStore';
import { GuidedHand } from './GuidedHand';
import { markOnboardingDone } from './onboardingState';

type Step = 'level' | 'explain' | 'guided';

interface OnboardingModalProps {
  /** Called when the flow finishes (after navigation is triggered). */
  onClose: () => void;
}

export function OnboardingModal({ onClose }: OnboardingModalProps) {
  const isEn      = useLangStore(s => s.lang) === 'en';
  const setMode   = useModeStore(s => s.setMode);
  const navigate  = useNavigate();
  const [step, setStep] = useState<Step>('level');

  const finish = (to: string) => {
    markOnboardingDone();
    onClose();
    navigate(to);
  };

  // ── Level choice handlers ──────────────────────────────────────────────────
  const pickNewbie = () => { setMode('beginner'); setStep('explain'); };
  const pickBasics = () => { setMode('beginner'); finish('/training'); };
  const pickPro    = () => { setMode('advanced'); finish('/training'); };

  const skip = () => { markOnboardingDone(); onClose(); navigate('/training'); };

  // ── Full-hand explanation steps (beginner path) ─────────────────────────────
  const HAND_STEPS = [
    {
      emoji: '🃏', color: 'border-blue-700/50 bg-blue-950/30',
      title: isEn ? 'Pre-flop' : 'Pré-flop',
      desc: isEn
        ? 'You get 2 private cards. First decision: play your hand (raise) or throw it away (fold) — based on your cards and your seat.'
        : 'Tu reçois 2 cartes privées. Première décision : jouer ta main (raise) ou la jeter (fold) — selon tes cartes et ta place.',
    },
    {
      emoji: '🟢', color: 'border-green-700/50 bg-green-950/30',
      title: 'Flop',
      desc: isEn
        ? '3 shared cards appear in the middle. You now combine them with your 2 cards. Decision: check, bet, call or fold.'
        : '3 cartes communes apparaissent au milieu. Tu les combines avec tes 2 cartes. Décision : check, miser, suivre ou se coucher.',
    },
    {
      emoji: '🟡', color: 'border-yellow-700/50 bg-yellow-950/30',
      title: 'Turn',
      desc: isEn
        ? 'A 4th shared card is dealt. The pot grows, the decisions get bigger. Same choices: check, bet, call or fold.'
        : 'Une 4ᵉ carte commune est posée. Le pot grossit, les décisions pèsent plus lourd. Mêmes choix : check, miser, suivre ou se coucher.',
    },
    {
      emoji: '🔴', color: 'border-red-700/50 bg-red-950/30',
      title: 'River',
      desc: isEn
        ? 'The 5th and final shared card. Last round of betting — this is your last chance to bet or bluff.'
        : 'La 5ᵉ et dernière carte commune. Dernier tour de mises — ta dernière chance de miser ou bluffer.',
    },
    {
      emoji: '🏆', color: 'border-gold-700/50 bg-gold-900/20',
      title: 'Showdown',
      desc: isEn
        ? 'Players still in the hand show their cards. The best 5-card combination (your 2 cards + the 5 on the table) wins the pot!'
        : 'Les joueurs encore en jeu montrent leurs cartes. La meilleure combinaison de 5 cartes (tes 2 cartes + les 5 du milieu) remporte le pot !',
    },
  ];

  // Full-screen interactive guided hand (beginner deep-dive)
  if (step === 'guided') {
    return <GuidedHand onFinish={() => finish('/rules')} onSkip={() => finish('/training')} />;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-black/85 overflow-y-auto"
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0,  scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.97 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-lg my-8 rounded-3xl border border-gray-700 bg-gradient-to-b from-gray-900 to-gray-950 p-6 sm:p-8 shadow-2xl"
      >
        {/* Skip */}
        <button
          onClick={skip}
          className="absolute top-4 right-4 text-gray-600 hover:text-gray-300 transition-colors p-1"
          title={isEn ? 'Skip' : 'Passer'}
        >
          <X size={18} />
        </button>

        <AnimatePresence mode="wait">
          {/* ── STEP 1: Level question ── */}
          {step === 'level' && (
            <motion.div
              key="level"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.18 }}
              className="flex flex-col gap-5"
            >
              <div className="text-center">
                <div className="text-5xl mb-3">🃏</div>
                <h2 className="text-2xl font-black text-white mb-2">
                  {isEn ? 'Welcome!' : 'Bienvenue !'}
                </h2>
                <p className="text-gray-400 text-sm">
                  {isEn
                    ? "To tailor your experience, tell us where you're at:"
                    : 'Pour personnaliser ton expérience, dis-nous où tu en es :'}
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <LevelOption
                  icon={<Sprout size={22} className="text-green-400" />}
                  title={isEn ? "I'm brand new" : 'Je débute complètement'}
                  desc={isEn ? "I don't really know the rules yet" : 'Je ne connais pas vraiment les règles'}
                  accent="green"
                  onClick={pickNewbie}
                />
                <LevelOption
                  icon={<GraduationCap size={22} className="text-blue-400" />}
                  title={isEn ? 'I know the basics' : 'Je connais les bases'}
                  desc={isEn ? 'I can play a hand, I want to improve' : 'Je sais jouer une main, je veux progresser'}
                  accent="blue"
                  onClick={pickBasics}
                />
                <LevelOption
                  icon={<Zap size={22} className="text-gold-400" />}
                  title={isEn ? 'Experienced player' : 'Joueur confirmé'}
                  desc={isEn ? 'I already know the strategy' : 'Je maîtrise déjà la stratégie'}
                  accent="gold"
                  onClick={pickPro}
                />
              </div>

              <p className="text-center text-[11px] text-gray-600">
                {isEn
                  ? 'You can switch between Beginner and Advanced anytime from the top bar.'
                  : 'Tu peux basculer entre Débutant et Avancé à tout moment depuis la barre du haut.'}
              </p>
            </motion.div>
          )}

          {/* ── STEP 2: Full-hand explanation (beginner) ── */}
          {step === 'explain' && (
            <motion.div
              key="explain"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.18 }}
              className="flex flex-col gap-4"
            >
              <div className="text-center">
                <div className="text-4xl mb-2">🎓</div>
                <h2 className="text-xl font-black text-white mb-1">
                  {isEn ? 'How a poker hand works' : 'Comment se déroule une main de poker'}
                </h2>
                <p className="text-gray-400 text-sm">
                  {isEn
                    ? 'Every hand goes through up to 4 betting rounds. At each one, you make a decision:'
                    : 'Chaque main passe par jusqu’à 4 tours de mises. À chacun, tu prends une décision :'}
                </p>
              </div>

              <div className="flex flex-col gap-2">
                {HAND_STEPS.map((s, i) => (
                  <motion.div
                    key={s.title}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 ${s.color}`}
                  >
                    <span className="text-xl leading-none shrink-0 mt-0.5">{s.emoji}</span>
                    <div>
                      <p className="text-sm font-bold text-white">{s.title}</p>
                      <p className="text-xs text-gray-300 leading-relaxed">{s.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              <button
                onClick={() => setStep('guided')}
                className="mt-1 flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-gold-600 hover:bg-gold-500 text-gray-900 font-black transition-colors"
              >
                <PlayCircle size={18} />
                {isEn ? 'Watch a hand live, step by step' : 'Voir une main en direct, pas à pas'}
                <ChevronRight size={17} />
              </button>
              <button
                onClick={() => finish('/rules')}
                className="flex items-center justify-center gap-1.5 text-xs text-gray-400 hover:text-gray-200 transition-colors"
              >
                <BookOpen size={13} />
                {isEn ? 'Skip — go to the rules' : 'Passer — aller aux règles'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

// ─── Level option button ───────────────────────────────────────────────────────
function LevelOption({ icon, title, desc, accent, onClick }: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  accent: 'green' | 'blue' | 'gold';
  onClick: () => void;
}) {
  const ring = {
    green: 'hover:border-green-600/60 hover:bg-green-900/15',
    blue:  'hover:border-blue-600/60 hover:bg-blue-900/15',
    gold:  'hover:border-gold-600/60 hover:bg-gold-900/15',
  }[accent];
  return (
    <button
      onClick={onClick}
      className={`group flex items-center gap-3 text-left rounded-2xl border border-gray-700 bg-gray-800/40 px-4 py-3.5 transition-all ${ring}`}
    >
      <span className="shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white">{title}</p>
        <p className="text-xs text-gray-400">{desc}</p>
      </div>
      <ChevronRight size={18} className="text-gray-600 group-hover:text-gray-300 transition-colors shrink-0" />
    </button>
  );
}
