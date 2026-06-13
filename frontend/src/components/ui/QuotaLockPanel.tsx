import { Crown, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from './Button';
import { useLangStore } from '../../store/langStore';

interface QuotaLockPanelProps {
  /** Daily free limit, for the message copy. */
  limit: number;
  /** Return to the module intro (resets trainerStarted etc.). */
  onBackToIntro: () => void;
}

/** Shown inside a premium trainer when a non-premium user exhausts their daily
 *  free allowance mid-session. */
export function QuotaLockPanel({ limit, onBackToIntro }: QuotaLockPanelProps) {
  const isEn = useLangStore(s => s.lang) === 'en';
  return (
    <div className="flex flex-col items-center justify-center min-h-[360px] py-12 px-6 text-center max-w-md mx-auto">
      <div className="relative mb-5">
        <div className="w-20 h-20 rounded-full bg-yellow-500/10 border border-yellow-600/30 flex items-center justify-center">
          <Lock size={34} className="text-yellow-500" />
        </div>
        <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-yellow-500 flex items-center justify-center shadow-lg">
          <Crown size={14} className="text-black" fill="currentColor" />
        </div>
      </div>

      <h2 className="text-xl font-bold text-white mb-2">
        {isEn ? 'Daily free exercises used up' : 'Exercices gratuits du jour épuisés'}
      </h2>
      <p className="text-gray-400 text-sm mb-6">
        {isEn
          ? `You've completed your ${limit} free exercises for this module today. Come back tomorrow, or go Premium for unlimited access to every module.`
          : `Tu as terminé tes ${limit} exercices gratuits du jour pour ce module. Reviens demain, ou passe Premium pour un accès illimité à tous les modules.`}
      </p>

      <Link to="/premium" className="w-full max-w-xs">
        <Button size="lg" variant="gold" fullWidth>
          <Crown size={16} className="inline mr-2" fill="currentColor" />
          {isEn ? 'Go Premium' : 'Passer Premium'}
        </Button>
      </Link>
      <button
        onClick={onBackToIntro}
        className="mt-3 text-xs text-gray-500 hover:text-gray-300 transition-colors"
      >
        {isEn ? '← Back to module info' : '← Retour aux infos du module'}
      </button>
    </div>
  );
}
