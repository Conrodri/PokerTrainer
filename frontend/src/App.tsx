import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Layout } from './components/layout/Layout';
import { HomePage } from './pages/HomePage';
import { TrainingPage } from './pages/TrainingPage';
import { StatsPage } from './pages/StatsPage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { LoginPage } from './pages/LoginPage';
import { TablePage } from './pages/TablePage';
import { ProfilePage } from './pages/ProfilePage';
import { PokerRulesPage } from './components/training/PokerRulesPage';
import { GlossaryPage } from './pages/GlossaryPage';
import { PremiumPage } from './pages/PremiumPage';
import { OnboardingModal } from './components/onboarding/OnboardingModal';
import { isOnboardingDone } from './components/onboarding/onboardingState';
import { useAuthStore } from './store/authStore';
import { useTrainingStore } from './store/trainingStore';
import { pingBackend } from './services/api';

export default function App() {
  const { fetchMe } = useAuthStore();
  const { startSession } = useTrainingStore();
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
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/rules" element={<PokerRulesPage />} />
          <Route path="/glossary" element={<GlossaryPage />} />
          <Route path="/training" element={<TrainingPage />} />
          <Route path="/table" element={<TablePage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/premium" element={<PremiumPage />} />
        </Routes>
      </Layout>

      <AnimatePresence>
        {showOnboarding && <OnboardingModal onClose={() => setShowOnboarding(false)} />}
      </AnimatePresence>
    </BrowserRouter>
  );
}
