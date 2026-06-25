import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, CheckCircle, Loader2 } from 'lucide-react';
import { authApi } from '../services/api';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setIsLoading(true);
    setError('');
    try {
      await authApi.forgotPassword(email.trim());
      setSent(true);
    } catch {
      setError('Une erreur est survenue. Réessaie dans quelques instants.');
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
        {sent ? (
          <div className="text-center space-y-4">
            <CheckCircle size={40} className="mx-auto text-green-400" />
            <h1 className="text-xl font-bold text-white">Vérifie ta boîte mail</h1>
            <p className="text-gray-400 text-sm">
              Si un compte est associé à <span className="text-white font-medium">{email}</span>,
              tu recevras un lien de réinitialisation valable 1 heure.
            </p>
            <Link to="/login" className="inline-block text-blue-400 hover:underline text-sm">
              Retour à la connexion
            </Link>
          </div>
        ) : (
          <>
            <div>
              <Link to="/login" className="text-gray-500 hover:text-gray-300 text-sm flex items-center gap-1 mb-4">
                <ArrowLeft size={14} /> Retour
              </Link>
              <h1 className="text-xl font-bold text-white">Mot de passe oublié ?</h1>
              <p className="text-gray-400 text-sm mt-1">
                Saisis ton adresse e-mail et on t'envoie un lien pour le réinitialiser.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="ton@email.com"
                  required
                  className="w-full bg-gray-800 border border-gray-600 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <button
                type="submit"
                disabled={isLoading || !email.trim()}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {isLoading && <Loader2 size={16} className="animate-spin" />}
                Envoyer le lien
              </button>
            </form>
          </>
        )}
      </motion.div>
    </div>
  );
}
