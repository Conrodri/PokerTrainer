import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/Button';
import { OnboardingModal } from '../components/onboarding/OnboardingModal';
import { isOnboardingDone } from '../components/onboarding/onboardingState';
import { useT } from '../i18n';

type Mode = 'login' | 'register';

export function LoginPage() {
  const t = useT();
  const navigate = useNavigate();
  const { login, register, isLoading, error } = useAuthStore();
  const [mode, setMode] = useState<Mode>('login');
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [showOnboarding, setShowOnboarding] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (mode === 'login') await login(form.email, form.password);
      else await register(form.username, form.email, form.password);
      // Show the onboarding questionnaire if it hasn't been completed on this device yet.
      if (!isOnboardingDone()) {
        setShowOnboarding(true);
      } else {
        navigate('/training');
      }
    } catch {/* error shown via store */}
  };

  return (
    <div className="max-w-md mx-auto pt-10">
      <AnimatePresence>
        {showOnboarding && <OnboardingModal onClose={() => setShowOnboarding(false)} />}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-900/60 border border-gray-800 rounded-2xl p-8"
      >
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🃏</div>
          <h1 className="text-2xl font-bold text-white mb-1">
            {mode === 'login' ? t.login.title_in : t.login.title_up}
          </h1>
          <p className="text-gray-400 text-sm">{t.login.subtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === 'register' && (
            <div>
              <label className="block text-sm text-gray-400 mb-1">{t.login.username}</label>
              <input
                type="text"
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-felt-500"
                placeholder={t.login.username_ph}
                required
              />
            </div>
          )}
          <div>
            <label className="block text-sm text-gray-400 mb-1">{t.login.email}</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-felt-500"
              placeholder="email@exemple.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">{t.login.password}</label>
            <input
              type="password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-felt-500"
              placeholder="••••••••"
              required minLength={6}
            />
          </div>

          {error && (
            <div className="bg-red-900/40 border border-red-700 text-red-300 rounded-xl px-4 py-3 text-sm">{error}</div>
          )}

          <Button type="submit" size="lg" variant="gold" fullWidth loading={isLoading}>
            {mode === 'login' ? t.login.submit_in : t.login.submit_up}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-400">
          {mode === 'login' ? (
            <>{t.login.no_account}{' '}
              <button onClick={() => setMode('register')} className="text-gold-400 hover:text-gold-300">{t.login.register_link}</button>
            </>
          ) : (
            <>{t.login.has_account}{' '}
              <button onClick={() => setMode('login')} className="text-gold-400 hover:text-gold-300">{t.login.login_link}</button>
            </>
          )}
        </div>

        <div className="mt-4 text-center">
          <Link to="/training" className="text-xs text-gray-600 hover:text-gray-400">{t.login.skip}</Link>
        </div>
      </motion.div>
    </div>
  );
}
