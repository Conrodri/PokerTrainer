import { useEffect, useState, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Layout } from './components/layout/Layout';
import { HomePage } from './pages/HomePage';
import { Spinner } from './components/ui/Spinner';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { CookieBanner } from './components/ui/CookieBanner';
import { OnboardingModal } from './components/onboarding/OnboardingModal';
import { isOnboardingDone } from './components/onboarding/onboardingState';
import { useAuthStore } from './store/authStore';
import { useTrainingStore } from './store/trainingStore';
import { pingBackend } from './services/api';

// Route-level code-splitting: only the landing page ships in the initial chunk;
// every other page (and the charts / trainers they pull in) loads on navigation.
const TrainingPage = lazy(() => import('./pages/TrainingPage').then(m => ({ default: m.TrainingPage })));
const StatsPage = lazy(() => import('./pages/StatsPage').then(m => ({ default: m.StatsPage })));
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage').then(m => ({ default: m.LeaderboardPage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const TablePage = lazy(() => import('./pages/TablePage').then(m => ({ default: m.TablePage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then(m => ({ default: m.ProfilePage })));
const PokerRulesPage = lazy(() => import('./components/training/PokerRulesPage').then(m => ({ default: m.PokerRulesPage })));
const GlossaryPage = lazy(() => import('./pages/GlossaryPage').then(m => ({ default: m.GlossaryPage })));
const LearningPathPage = lazy(() => import('./pages/LearningPathPage').then(m => ({ default: m.LearningPathPage })));
const PremiumPage = lazy(() => import('./pages/PremiumPage').then(m => ({ default: m.PremiumPage })));
const AuthCallbackPage = lazy(() => import('./pages/AuthCallbackPage').then(m => ({ default: m.AuthCallbackPage })));
const CGUPage     = lazy(() => import('./pages/CGUPage').then(m => ({ default: m.CGUPage })));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage').then(m => ({ default: m.PrivacyPage })));

export default function App() {
  const fetchMe = useAuthStore(s => s.fetchMe);
  const startSession = useTrainingStore(s => s.startSession);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    // Wake up Render backend immediately so it's ready when the user hits a module
    pingBackend();
    startSession('preflop');
    fetchMe();

    // First-visit onboarding questionnaire — shown to everyone (logged in or not)
    // who hasn't completed it yet on this device.
    if (!isOnboardingDone()) {
      const timer = setTimeout(() => setShowOnboarding(true), 700);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <BrowserRouter>
      <Layout>
        <ErrorBoundary>
          <Suspense fallback={<Spinner />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/rules" element={<PokerRulesPage />} />
              <Route path="/glossary" element={<GlossaryPage />} />
              <Route path="/learning-path" element={<LearningPathPage />} />
              <Route path="/training" element={<TrainingPage />} />
              <Route path="/table" element={<TablePage />} />
              <Route path="/stats" element={<StatsPage />} />
              <Route path="/stats/:username" element={<StatsPage />} />
              <Route path="/leaderboard" element={<LeaderboardPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/premium" element={<PremiumPage />} />
              <Route path="/auth/callback" element={<AuthCallbackPage />} />
              <Route path="/cgu"          element={<CGUPage />} />
              <Route path="/privacy"      element={<PrivacyPage />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </Layout>

      <CookieBanner />

      <AnimatePresence>
        {showOnboarding && <OnboardingModal onClose={() => setShowOnboarding(false)} />}
      </AnimatePresence>
    </BrowserRouter>
  );
}
