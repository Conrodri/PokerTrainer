import { Crown, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useLangStore } from '../../store/langStore';

interface PremiumGateProps {
  children: React.ReactNode;
  /** Optional module name shown on the lock screen */
  label?: string;
}

export function PremiumGate({ children, label }: PremiumGateProps) {
  const user = useAuthStore(s => s.user);
  const isEn = useLangStore(s => s.lang) === 'en';

  if (user?.isPremium) return <>{children}</>;

  return (
    <div className="flex flex-col items-center justify-center min-h-[420px] py-16 px-6 text-center">
      {/* Lock icon */}
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-full bg-yellow-500/10 border border-yellow-600/30 flex items-center justify-center">
          <Lock size={36} className="text-yellow-500" />
        </div>
        <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-yellow-500 flex items-center justify-center shadow-lg">
          <Crown size={14} className="text-black" fill="currentColor" />
        </div>
      </div>

      {/* Title */}
      <h2 className="text-2xl font-bold text-white mb-2">
        {label
          ? (isEn ? `${label} — Premium` : `${label} — Premium`)
          : (isEn ? 'Premium Module' : 'Module Premium')}
      </h2>

      {/* Description */}
      <p className="text-gray-400 text-sm max-w-sm mb-8">
        {isEn
          ? 'This module is reserved for Premium members. Upgrade your account to unlock it.'
          : 'Ce module est réservé aux membres Premium. Passez à la version supérieure pour le débloquer.'}
      </p>

      {/* CTA */}
      {!user ? (
        <div className="flex flex-col items-center gap-3">
          <Link
            to="/login"
            className="px-8 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-xl text-sm transition-colors shadow-lg shadow-yellow-500/20"
          >
            {isEn ? 'Log in to access Premium' : 'Se connecter pour accéder au Premium'}
          </Link>
          <p className="text-xs text-gray-600">
            {isEn ? 'Already have an account? Log in above.' : 'Déjà un compte ? Connecte-toi ci-dessus.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="px-8 py-3 bg-yellow-500/10 border border-yellow-600/30 rounded-xl text-yellow-400 text-sm font-semibold flex items-center gap-2">
            <Crown size={14} />
            {isEn ? 'Upgrade to Premium to unlock' : 'Passe en Premium pour débloquer'}
          </div>
          <p className="text-xs text-gray-600">
            {isEn ? 'Contact an admin to upgrade your account.' : 'Contacte un admin pour upgrader ton compte.'}
          </p>
        </div>
      )}
    </div>
  );
}
