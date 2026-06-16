import { useState, useEffect } from 'react';
import { Eye } from 'lucide-react';
import { useModeStore } from '../../store/modeStore';
import { useExamStore } from '../../store/examStore';
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
 *  - advanced: hides it behind a "Reveal hint" button.
 *  - expert: renders nothing (no hints).
 *  - during an exam (any mode): renders nothing — an exam is a test, no help.
 *
 * Children that self-hide outside beginner (BeginnerGuide, ExplanationPanel)
 * should be passed `forceShow` so this wrapper is the sole gatekeeper.
 */
export function SpoilableHint({ children, resetKey, className }: SpoilableHintProps) {
  const mode = useModeStore(s => s.mode);
  const examActive = useExamStore(s => s.active);
  const isEn = useLangStore(s => s.lang) === 'en';
  const [revealed, setRevealed] = useState(false);

  useEffect(() => { setRevealed(false); }, [resetKey]);

  if (examActive) return null;          // no hints during an exam
  if (mode === 'beginner') return <>{children}</>;
  if (mode === 'expert') return null;

  // advanced
  if (!revealed) {
    return (
      <button
        onClick={() => setRevealed(true)}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-700 bg-gray-900/50 text-xs font-semibold text-gray-400 hover:text-gray-200 hover:border-gray-500 transition-colors ${className ?? ''}`}
      >
        <Eye size={13} className="text-gold-400" />
        {isEn ? 'Reveal hint' : "Révéler l'indice"}
      </button>
    );
  }
  return (
    <div className={className}>
      <div className="flex items-center gap-1.5 text-[11px] text-gold-400/80 mb-1.5">
        <Eye size={11} />
        {isEn ? 'Hint' : 'Indice'}
      </div>
      {children}
    </div>
  );
}
