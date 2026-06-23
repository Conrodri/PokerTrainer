import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { authApi } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { analytics } from '../lib/analytics';

type Status = 'loading' | 'success' | 'error';

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [status, setStatus] = useState<Status>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const setUser = useAuthStore(s => s.setUser);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMsg('Lien invalide.');
      return;
    }

    authApi.verifyEmail(token)
      .then(data => {
        // data = { token, user }
        if (data?.token) {
          localStorage.setItem('token', data.token);
          setUser(data.user);
          analytics.emailVerified();
        }
        setStatus('success');
      })
      .catch(err => {
        setStatus('error');
        setErrorMsg(err.response?.data?.error ?? 'Lien invalide ou expiré.');
      });
  }, [token]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="bg-gray-900/80 border border-gray-700 rounded-2xl p-8 max-w-md w-full text-center space-y-4">
        {status === 'loading' && (
          <>
            <Loader2 size={40} className="mx-auto text-blue-400 animate-spin" />
            <p className="text-gray-300">Vérification en cours…</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle size={40} className="mx-auto text-green-400" />
            <h1 className="text-xl font-bold text-white">E-mail confirmé !</h1>
            <p className="text-gray-400">Ton compte est activé. Tu peux commencer à t'entraîner.</p>
            <Link
              to="/"
              className="inline-block mt-2 bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 px-6 rounded-lg transition-colors"
            >
              Accueil
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle size={40} className="mx-auto text-red-400" />
            <h1 className="text-xl font-bold text-white">Lien invalide</h1>
            <p className="text-gray-400">{errorMsg}</p>
            <Link
              to="/login"
              className="inline-block mt-2 text-blue-400 hover:underline text-sm"
            >
              Retour à la connexion
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
