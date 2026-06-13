import { useState, useEffect } from 'react';
import { Eye } from 'lucide-react';
import { useModeStore } from '../../store/modeStore';
import { useTrainingStore } from '../../store/trainingStore';
import { useLangStore } from '../../store/langStore';

interface SpoilableHintProps {
  children: React.ReactNode;
  /** Changing this resets the revealed state (pass the exercise key/notation). */
  resetKey?: string | number;
  className?: string;
}

/**
 * Mode-aware wrapper for hint/guidance content:
 *  - beginner: shows the hint outright.
 *  - advanced: hides it behind a "Reveal hint" button; revealing resets the
 *    current streak to 0 and flags the pending answer as assisted (won't count).
 *  - expert: renders nothing (no hints).
 *
 * Children that self-hide outside beginner (BeginnerGuide, ExplanationPanel)
 * should be passed `forceShow` so this wrapper is the sole gatekeeper.
 */
export function SpoilableHint({ children, resetKey, className }: SpoilableHintProps) {
  const mode = useModeStore(s => s.mode);
  const breakStreak = useTrainingStore(s => s.breakStreak);
  const isEn = useLangStore(s => s.lang) === 'en';
  const [revealed, setRevealed] = useState(false);

  useEffect(() => { setRevealed(false); }, [resetKey]);

  if (mode === 'beginner') return <>{children}</>;
  if (mode === 'expert') return null;

  // advanced
  if (!revealed) {
    return (
      <button
        onClick={() => { breakStreak(); setRevealed(true); }}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-700 bg-gray-900/50 text-xs font-semibold text-gray-400 hover:text-gray-200 hover:border-gray-500 transition-colors ${className ?? ''}`}
      >
        <Eye size={13} className="text-gold-400" />
        {isEn ? 'Reveal hint (resets your streak)' : "Révéler l'indice (remet la série à 0)"}
      </button>
    );
  }
  return (
    <div className={className}>
      <div className="flex items-center gap-1.5 text-[11px] text-gold-400/80 mb-1.5">
        <Eye size={11} />
        {isEn
          ? "Hint revealed — streak reset, this exercise won't count."
          : 'Indice révélé — série remise à 0, cet exercice ne compte pas.'}
      </div>
      {children}
    </div>
  );
}
