import { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { authApi } from '../services/api';
import { useAuthStore } from '../store/authStore';

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();
  const setUser = useAuthStore(s => s.setUser);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="bg-gray-900/80 border border-gray-700 rounded-2xl p-8 max-w-md w-full text-center space-y-4">
          <XCircle size={40} className="mx-auto text-red-400" />
          <h1 className="text-xl font-bold text-white">Lien invalide</h1>
          <p className="text-gray-400">Ce lien de réinitialisation est invalide.</p>
          <Link to="/login" className="inline-block text-blue-400 hover:underline text-sm">
            Retour à la connexion
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    if (password.length < 6) {
      setError('Le mot de passe doit faire au moins 6 caractères.');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const data = await authApi.resetPassword(token, password);
      if (data?.token) {
        localStorage.setItem('token', data.token);
        setUser(data.user);
      }
      setDone(true);
      setTimeout(() => navigate('/'), 2000);
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Lien invalide ou expiré.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-900/80 border border-gray-700 rounded-2xl p-8 max-w-md w-full space-y-5"
      >
        {done ? (
          <div className="text-center space-y-4">
            <CheckCircle size={40} className="mx-auto text-green-400" />
            <h1 className="text-xl font-bold text-white">Mot de passe modifié !</h1>
            <p className="text-gray-400 text-sm">Tu es connecté(e). Redirection en cours…</p>
          </div>
        ) : (
          <>
            <div>
              <h1 className="text-xl font-bold text-white">Nouveau mot de passe</h1>
              <p className="text-gray-400 text-sm mt-1">Choisis un mot de passe d'au moins 6 caractères.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Nouveau mot de passe"
                  required
                  className="w-full bg-gray-800 border border-gray-600 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Confirmer le mot de passe"
                  required
                  className="w-full bg-gray-800 border border-gray-600 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <button
                type="submit"
                disabled={isLoading || !password || !confirm}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {isLoading && <Loader2 size={16} className="animate-spin" />}
                Réinitialiser
              </button>
            </form>
          </>
        )}
      </motion.div>
    </div>
  );
}
