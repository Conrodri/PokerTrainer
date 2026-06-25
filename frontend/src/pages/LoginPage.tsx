import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MailCheck, Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useShallow } from 'zustand/react/shallow';
import { Button } from '../components/ui/Button';
import { OnboardingModal } from '../components/onboarding/OnboardingModal';
import { isOnboardingDone } from '../components/onboarding/onboardingState';
import { useT } from '../i18n';
import { useLangStore } from '../store/langStore';
import { authApi } from '../services/api';

type Mode = 'login' | 'register';

const GOOGLE_ERROR_MESSAGES: Record<string, string> = {
  google_cancelled: 'Connexion Google annulée.',
  google_failed: 'La connexion Google a échoué. Réessaie.',
};

export function LoginPage() {
  const t = useT();
  const isEn = useLangStore(s => s.lang) === 'en';
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const oauthError = searchParams.get('error');
  const { login, register, isLoading, error, verificationPending, clearVerificationPending } = useAuthStore(
    useShallow(s => ({ login: s.login, register: s.register, isLoading: s.isLoading, error: s.error, verificationPending: s.verificationPending, clearVerificationPending: s.clearVerificationPending }))
  );
  const [mode, setMode] = useState<Mode>('login');
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendDone, setResendDone] = useState(false);

  const apiBase = import.meta.env.VITE_API_URL || '';
  const handleGoogleLogin = () => {
    window.location.href = `${apiBase}/api/auth/google`;
  };

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

  const handleResend = async () => {
    if (!verificationPending) return;
    setResendLoading(true);
    try {
      await authApi.resendVerification(verificationPending);
      setResendDone(true);
    } finally {
      setResendLoading(false);
    }
  };

  // Show the "check your email" screen after register or after EMAIL_NOT_VERIFIED login error
  if (verificationPending) {
    return (
      <div className="max-w-md mx-auto pt-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-900/60 border border-gray-800 rounded-2xl p-8 text-center space-y-4"
        >
          <MailCheck size={48} className="mx-auto text-blue-400" />
          <h1 className="text-xl font-bold text-white">Vérifie ta boîte mail</h1>
          <p className="text-gray-400 text-sm">
            Un lien de confirmation a été envoyé à{' '}
            <span className="text-white font-medium">{verificationPending}</span>.
            <br />Clique sur le lien pour activer ton compte.
          </p>
          {resendDone ? (
            <p className="text-green-400 text-sm">E-mail renvoyé !</p>
          ) : (
            <button
              onClick={handleResend}
              disabled={resendLoading}
              className="text-blue-400 hover:underline text-sm flex items-center gap-1 mx-auto"
            >
              {resendLoading && <Loader2 size={14} className="animate-spin" />}
              Renvoyer l'e-mail
            </button>
          )}
          <button
            onClick={() => { clearVerificationPending(); setResendDone(false); }}
            className="text-xs text-gray-500 hover:text-gray-400 block mx-auto"
          >
            Retour à la connexion
          </button>
        </motion.div>
      </div>
    );
  }

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
              required minLength={mode === 'register' ? 8 : 6}
            />
          </div>

          {mode === 'login' && (
            <div className="text-right -mt-1">
              <Link to="/forgot-password" className="text-xs text-blue-400 hover:underline">
                {isEn ? 'Forgot your password?' : 'Mot de passe oublié ?'}
              </Link>
            </div>
          )}

          {(error || oauthError) && (
            <div className="bg-red-900/40 border border-red-700 text-red-300 rounded-xl px-4 py-3 text-sm">
              {error || (oauthError ? (GOOGLE_ERROR_MESSAGES[oauthError] ?? 'Erreur de connexion Google.') : '')}
            </div>
          )}

          <Button type="submit" size="lg" variant="gold" fullWidth loading={isLoading}>
            {mode === 'login' ? t.login.submit_in : t.login.submit_up}
          </Button>
        </form>

        {/* OAuth separator */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-gray-700" />
          <span className="text-xs text-gray-500">{isEn ? 'or' : 'ou'}</span>
          <div className="flex-1 h-px bg-gray-700" />
        </div>

        {/* Google sign-in */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 bg-white text-gray-900 rounded-xl px-4 py-3 font-medium text-sm hover:bg-gray-100 active:bg-gray-200 transition-colors shadow-sm"
        >
          <GoogleIcon />
          {isEn ? 'Continue with Google' : 'Continuer avec Google'}
        </button>

        <div className="mt-5 text-center text-sm text-gray-400">
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

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
      <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332Z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
    </svg>
  );
}
