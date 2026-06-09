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
import { Tutorial } from './components/tutorial/Tutorial';
import { useAuthStore } from './store/authStore';
import { useTrainingStore } from './store/trainingStore';
import { pingBackend } from './services/api';

export default function App() {
  const { fetchMe } = useAuthStore();
  const { startSession } = useTrainingStore();
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    // Wake up Render backend immediately so it's ready when the user hits a module
    pingBackend();
    startSession('preflop');

    // Wait for user data before deciding whether to show the tutorial.
    // If tutorialDone is true in the DB we skip the tutorial and sync localStorage.
    const timer = setTimeout(async () => {
      await fetchMe();
      if (localStorage.getItem('poker-tutorial-done')) return;
      const { user } = useAuthStore.getState();
      if (user?.tutorialDone) {
        // Sync DB preference to localStorage so future visits skip the API call
        localStorage.setItem('poker-tutorial-done', '1');
        return;
      }
      setShowTutorial(true);
    }, 600);

    return () => clearTimeout(timer);
  }, []);

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/rules" element={<PokerRulesPage />} />
          <Route path="/training" element={<TrainingPage />} />
          <Route path="/table" element={<TablePage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Routes>
      </Layout>

      <AnimatePresence>
        {showTutorial && <Tutorial onClose={() => setShowTutorial(false)} />}
      </AnimatePresence>
    </BrowserRouter>
  );
}
