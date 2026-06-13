import { Info } from 'lucide-react';
import { useLangStore } from '../../store/langStore';
import { useModeStore, TrainingMode } from '../../store/modeStore';
import { RichText } from './RichText';

interface Props {
  text: string;
  /** @deprecated — ignored, RichText is always used (supports poker-term tooltips) */
  plain?: boolean;
  /** Override mode — if not provided, reads from useModeStore */
  mode?: TrainingMode;
  /** Bypass the beginner-only guard (used when revealed via SpoilableHint). */
  forceShow?: boolean;
  className?: string;
}

export function ExplanationPanel({ text, mode: modeProp, forceShow, className }: Props) {
  const isEn = useLangStore(s => s.lang) === 'en';
  const storeMode = useModeStore(s => s.mode);
  const mode = modeProp ?? storeMode;
  if (mode !== 'beginner' && !forceShow) return null;
  return (
    <div className={`bg-gray-800/60 rounded-xl p-4 border border-gray-700 w-full ${className ?? ''}`}>
      <p className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-1">
        <Info size={14} /> {isEn ? 'Explanation' : 'Explication'}
      </p>
      <RichText text={text} />
    </div>
  );
}
