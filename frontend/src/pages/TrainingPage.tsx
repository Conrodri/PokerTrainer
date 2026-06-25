import { useEffect, useState, useMemo, lazy, Suspense } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock } from 'lucide-react';
import { useTrainingStore } from '../store/trainingStore';
import { useShallow } from 'zustand/react/shallow';
import { useAuthStore } from '../store/authStore';
import { TrainingModule, Position } from '../types/poker';
import { Spinner } from '../components/ui/Spinner';
import { ModeBadge } from '../components/ui/ModeBadge';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import { profilesApi } from '../services/api';
import { useT } from '../i18n';
import { useLangStore } from '../store/langStore';
import { useModeStore } from '../store/modeStore';
import { useCustomRangeStore } from '../store/customRangeStore';
import { MyRangesPanel } from '../components/poker/MyRangesPanel';

// Each trainer is its own chunk: only the selected module's code is fetched.
const PreflopTrainer = lazy(() => import('../components/training/PreflopTrainer').then(m => ({ default: m.PreflopTrainer })));
const PotOddsTrainer = lazy(() => import('../components/training/PotOddsTrainer').then(m => ({ default: m.PotOddsTrainer })));
const EquityTrainer = lazy(() => import('../components/training/EquityTrainer').then(m => ({ default: m.EquityTrainer })));
const OutsTrainer = lazy(() => import('../components/training/OutsTrainer').then(m => ({ default: m.OutsTrainer })));
const PostflopTrainer = lazy(() => import('../components/training/PostflopTrainer').then(m => ({ default: m.PostflopTrainer })));
const FullHandTrainer = lazy(() => import('../components/training/FullHandTrainer').then(m => ({ default: m.FullHandTrainer })));
const BetSizingTrainer = lazy(() => import('../components/training/BetSizingTrainer').then(m => ({ default: m.BetSizingTrainer })));
const BluffTrainer = lazy(() => import('../components/training/BluffTrainer').then(m => ({ default: m.BluffTrainer })));

const PREFLOP_POSITIONS: Position[] = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'];

export function TrainingPage() {
  const t = useT();
  const lang = useLangStore(s => s.lang);
  const isEn = lang === 'en';
  const user = useAuthStore(s => s.user);

  const navigate = useNavigate();
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

  // Complex profiles are usable only in Expert mode → deactivate any active
  // profile outside it. In Beginner, custom ranges are off entirely (GTO only).
  useEffect(() => {
    if (trainMode !== 'expert') profilesApi.deactivate().catch(() => {});
    if (trainMode === 'beginner' && preflopEnabled) togglePreflopEnabled();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trainMode]);


  const isPremium = !!user?.isPremium;
  const isRangeModule = activeModule === 'preflop';

  const TABS = useMemo<{ id: TrainingModule; label: string; icon: string; premium?: boolean }[]>(() => [
    { id: 'preflop',   label: t.training.tab_preflop,   icon: '🎯' },
    { id: 'outs',      label: t.training.tab_outs,      icon: '🎲' },
    { id: 'equity',    label: t.training.tab_equity,    icon: '⚖️' },
    { id: 'potodds',   label: t.training.tab_potodds,   icon: '📐' },
    { id: 'postflop',  label: isEn ? 'Post-flop'   : 'Post-flop',     icon: '🃏', premium: true },
    { id: 'betsizing', label: isEn ? 'Bet Sizing'  : 'Bet Sizing',    icon: '📐', premium: true },
    { id: 'fullhand',  label: isEn ? 'Full Hand'   : 'Main complète', icon: '🎰', premium: true },
    { id: 'bluff',     label: isEn ? 'Bluff'       : 'Bluff',         icon: '🎭', premium: true },
  ], [t, isEn]);

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
    const onOpenRanges = () => { setShowMyRanges(true); window.scrollTo({ top: 0, behavior: 'smooth' }); };
    window.addEventListener('training:module', onModule);
    window.addEventListener('training:open-ranges', onOpenRanges);
    return () => {
      window.removeEventListener('training:module', onModule);
      window.removeEventListener('training:open-ranges', onOpenRanges);
    };
  }, []);

  return (
    <div className="flex flex-col gap-6">
      {/* Module tabs — always wrap: one row when there's room, extra rows when the
          window is narrow (no unreliable horizontal scroll at any width). */}
      <div className={`flex flex-wrap justify-center gap-1.5 border-b border-gray-800 pb-2 transition-all duration-300 ${trainerStarted ? 'hidden' : ''}`}>
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

      {/* Back button — shown below the module tabs, hidden once an exercise starts */}
      {!trainerStarted && (
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 w-fit px-4 py-2 rounded-xl text-sm font-semibold text-gray-300 hover:text-white bg-gray-800/60 hover:bg-gray-700/70 border border-gray-700/50 hover:border-gray-500/60 transition-all duration-150 group -mt-2"
        >
          <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
          <span>Retour</span>
        </button>
      )}

      {/* My Ranges panel — accessible from the preflop intro "Mes ranges" button */}
      <AnimatePresence>
        {isRangeModule && showMyRanges && (
          <MyRangesPanel
            onClose={() => setShowMyRanges(false)}
            positions={PREFLOP_POSITIONS}
            defaultPosition={currentPosition ?? undefined}
            locked={!isPremium}
          />
        )}
      </AnimatePresence>

      {/* Active-mode reminder — shown once an exercise session is running (the
          tabs are hidden then, so this tells the user which mode they're in). */}
      {trainerStarted && (
        <div className="flex justify-center -mb-2">
          <ModeBadge />
        </div>
      )}

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
            {activeModule === 'bluff'     && <BluffTrainer />}
          </Suspense>
        </ErrorBoundary>
      </motion.div>
    </div>
  );
}
