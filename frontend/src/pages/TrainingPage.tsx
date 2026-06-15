import { useEffect, useState, lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock } from 'lucide-react';
import { useTrainingStore } from '../store/trainingStore';
import { useShallow } from 'zustand/react/shallow';
import { useAuthStore } from '../store/authStore';
import { TrainingModule, Position } from '../types/poker';
import { Spinner } from '../components/ui/Spinner';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import { profilesApi } from '../services/api';
import { useT } from '../i18n';
import { useLangStore } from '../store/langStore';
import { useModeStore } from '../store/modeStore';
import { useCustomRangeStore } from '../store/customRangeStore';
import { Button } from '../components/ui/Button';
import { MyRangesPanel } from '../components/poker/MyRangesPanel';

// Each trainer is its own chunk: only the selected module's code is fetched.
const PreflopTrainer = lazy(() => import('../components/training/PreflopTrainer').then(m => ({ default: m.PreflopTrainer })));
const PotOddsTrainer = lazy(() => import('../components/training/PotOddsTrainer').then(m => ({ default: m.PotOddsTrainer })));
const EquityTrainer = lazy(() => import('../components/training/EquityTrainer').then(m => ({ default: m.EquityTrainer })));
const OutsTrainer = lazy(() => import('../components/training/OutsTrainer').then(m => ({ default: m.OutsTrainer })));
const PostflopTrainer = lazy(() => import('../components/training/PostflopTrainer').then(m => ({ default: m.PostflopTrainer })));
const FullHandTrainer = lazy(() => import('../components/training/FullHandTrainer').then(m => ({ default: m.FullHandTrainer })));
const BetSizingTrainer = lazy(() => import('../components/training/BetSizingTrainer').then(m => ({ default: m.BetSizingTrainer })));

const PREFLOP_POSITIONS: Position[] = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'];

export function TrainingPage() {
  const t = useT();
  const lang = useLangStore(s => s.lang);
  const isEn = lang === 'en';
  const user = useAuthStore(s => s.user);

  const [searchParams, setSearchParams] = useSearchParams();
  const { startSession, setModule, resetSession, isExercising, trainerStarted, currentPosition } = useTrainingStore(
    useShallow(s => ({ startSession: s.startSession, setModule: s.setModule, resetSession: s.resetSession, isExercising: s.isExercising, trainerStarted: s.trainerStarted, currentPosition: s.currentPosition }))
  );
  // Beginner trains on GTO only → no custom-range toolbar.
  const trainMode = useModeStore(s => s.mode);
  const isBeginnerMode = trainMode === 'beginner';
  const [activeModule, setActiveModule] = useState<TrainingModule>(
    (searchParams.get('module') as TrainingModule) || 'preflop'
  );
  const [showMyRanges, setShowMyRanges] = useState(false);

  // Auto-close panels when an exercise starts
  useEffect(() => {
    if (isExercising) {
      setShowMyRanges(false);
    }
  }, [isExercising]);

  const { preflopEnabled, togglePreflopEnabled } = useCustomRangeStore(
    useShallow(s => ({ preflopEnabled: s.preflopEnabled, togglePreflopEnabled: s.togglePreflopEnabled }))
  );
  const customEnabled = preflopEnabled;

  // Complex profiles are usable only in Expert mode → deactivate any active
  // profile outside it. In Beginner, custom ranges are off entirely (GTO only).
  useEffect(() => {
    if (trainMode !== 'expert') profilesApi.deactivate().catch(() => {});
    if (trainMode === 'beginner' && preflopEnabled) togglePreflopEnabled();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trainMode]);


  const isPremium = !!user?.isPremium;
  const isRangeModule = activeModule === 'preflop';

  const TABS: { id: TrainingModule; label: string; icon: string; premium?: boolean }[] = [
    { id: 'preflop',   label: t.training.tab_preflop,   icon: '🎯' },
    { id: 'outs',      label: t.training.tab_outs,      icon: '🎲' },
    { id: 'equity',    label: t.training.tab_equity,    icon: '⚖️' },
    { id: 'potodds',   label: t.training.tab_potodds,   icon: '📐' },
    { id: 'postflop',  label: isEn ? 'Post-flop'   : 'Post-flop',     icon: '🃏', premium: true },
    { id: 'fullhand',  label: isEn ? 'Full Hand'   : 'Main complète', icon: '🎰', premium: true },
    { id: 'betsizing', label: isEn ? 'Bet Sizing'  : 'Bet Sizing',    icon: '📐', premium: true },
  ];

  // Sync activeModule when URL param changes (e.g. navbar dropdown click)
  useEffect(() => {
    const mod = (searchParams.get('module') as TrainingModule) || 'preflop';
    if (mod !== activeModule) {
      setActiveModule(mod);
      setModule(mod);
      resetSession();
      setShowMyRanges(false);
    }
  }, [searchParams]);

  useEffect(() => { startSession(activeModule); }, [activeModule]);

  const handleTabChange = (mod: TrainingModule) => {
    setActiveModule(mod);
    setModule(mod);
    resetSession();
    setSearchParams({ module: mod });
    setShowMyRanges(false);
  };

  useEffect(() => {
    const onModule = (e: Event) => {
      const mod = (e as CustomEvent).detail as TrainingModule;
      if (mod) handleTabChange(mod);
    };
    window.addEventListener('training:module', onModule);
    return () => window.removeEventListener('training:module', onModule);
  }, []);

  return (
    <div className="flex flex-col gap-6">
      {/* Module tabs — horizontally scrollable on mobile, hidden once trainer is active */}
      <div className={`flex gap-1.5 border-b border-gray-800 pb-2 overflow-x-auto transition-all duration-300 scrollbar-none ${trainerStarted ? 'hidden' : ''}`}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`
              flex items-center gap-1.5 px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap shrink-0 transition-all relative
              ${activeModule === tab.id
                ? 'bg-felt-700 text-white shadow-glow-green border border-felt-500'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'}
            `}
          >
            <span className="text-sm leading-none">{tab.icon}</span>
            <span>{tab.label}</span>
            {tab.premium && !isPremium && (
              <Lock size={10} className="text-yellow-400 shrink-0 ml-0.5" />
            )}
          </button>
        ))}
      </div>

      {/* Range toolbar — preflop only, once the trainer has started (intro
          dismissed). Hidden in beginner mode (GTO only). */}
      {isRangeModule && trainerStarted && !isBeginnerMode && (
        <div className="flex items-center gap-2 -mt-2 flex-wrap">

          {isExercising && isPremium && (
            <span className="text-xs text-gray-500 italic">
              {isEn ? '🔒 Range access locked during exercise' : '🔒 Accès aux ranges verrouillé pendant l\'exercice'}
            </span>
          )}

          {/* Mes Ranges button — always visible, locked appearance for non-premium */}
          <Button
            variant="ghost" size="sm"
            disabled={isExercising && isPremium}
            onClick={() => { if (!(isExercising && isPremium)) setShowMyRanges(v => !v); }}
            className={`flex items-center gap-1.5 text-xs border transition-all ${
              isExercising && isPremium
                ? 'text-gray-600 border-gray-700 cursor-not-allowed opacity-40'
                : showMyRanges
                  ? 'text-yellow-300 border-yellow-600 bg-yellow-900/20'
                  : 'text-yellow-400 border-yellow-800/60 hover:bg-yellow-900/20'
            }`}
          >
            {isPremium ? <span>👑</span> : <Lock size={11} />}
            {isEn ? 'My Ranges' : 'Mes Ranges'}
          </Button>

          {/* Status indicator (not clickable) — green = a profile or the simple range
              is active, red = none active (GTO). Activation happens in the panel. */}
          {isPremium && (
            <span
              className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border ${
                customEnabled
                  ? 'text-green-300 border-green-700 bg-green-900/20'
                  : 'text-red-300 border-red-700 bg-red-900/20'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${customEnabled ? 'bg-green-400' : 'bg-red-400'}`} />
              {customEnabled ? (isEn ? 'Active' : 'Activé') : (isEn ? 'Inactive' : 'Désactivé')}
            </span>
          )}
        </div>
      )}

      {/* My Ranges panel — visible to all, locked for non-premium */}
      <AnimatePresence>
        {isRangeModule && trainerStarted && !isBeginnerMode && showMyRanges && (
          <MyRangesPanel
            onClose={() => setShowMyRanges(false)}
            positions={PREFLOP_POSITIONS}
            defaultPosition={currentPosition ?? undefined}
            locked={!isPremium}
          />
        )}
      </AnimatePresence>

      <motion.div
        key={activeModule}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <ErrorBoundary key={activeModule}>
          <Suspense fallback={<Spinner />}>
            {activeModule === 'preflop'   && <PreflopTrainer />}
            {activeModule === 'potodds'   && <PotOddsTrainer />}
            {activeModule === 'equity'    && <EquityTrainer />}
            {activeModule === 'outs'      && <OutsTrainer />}

            {/* Premium modules: non-premium users still see the full intro and get
                a daily free allowance; the trainers handle access internally
                (premium / logged-in free quota / locked). */}
            {activeModule === 'postflop'  && <PostflopTrainer />}
            {activeModule === 'fullhand'  && <FullHandTrainer />}
            {activeModule === 'betsizing' && <BetSizingTrainer />}
          </Suspense>
        </ErrorBoundary>
      </motion.div>
    </div>
  );
}
