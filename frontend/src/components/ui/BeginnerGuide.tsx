import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, GraduationCap } from 'lucide-react';
import { useModeStore } from '../../store/modeStore';
import { useLangStore } from '../../store/langStore';
import { RichText } from './RichText';

interface BeginnerGuideProps {
  /** Short, friendly title — e.g. "Ce qu'on te demande". */
  title: string;
  /** Kid-friendly explanation. Supports `\n` line breaks and **bold**. */
  text: string;
  /** Optional rich content (e.g. example hands with card icons) rendered below the text. */
  children?: React.ReactNode;
  /** Leading emoji shown in the header. Default 👶 */
  emoji?: string;
  /** Whether the guide starts expanded. Default false (collapsed — click to open). */
  defaultOpen?: boolean;
  className?: string;
}

/**
 * BeginnerGuide
 * ─────────────
 * A soft, friendly "tutor" panel that explains the current exercise in very
 * simple terms — as if explaining to a child. Renders ONLY in beginner mode.
 * Collapsible so it doesn't get in the way once the concept is understood.
 */
export function BeginnerGuide({
  title,
  text,
  children,
  emoji = '👶',
  defaultOpen = false,
  className,
}: BeginnerGuideProps) {
  const mode = useModeStore(s => s.mode);
  const isEn = useLangStore(s => s.lang) === 'en';
  const [open, setOpen] = useState(defaultOpen);

  if (mode !== 'beginner') return null;

  return (
    <div
      className={`w-full rounded-2xl border border-blue-700/40 bg-gradient-to-br from-blue-950/50 to-indigo-950/30 overflow-hidden ${className ?? ''}`}
    >
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between gap-2 px-4 py-2.5 hover:bg-blue-900/20 transition-colors"
      >
        <span className="flex items-center gap-2 text-sm font-bold text-blue-200">
          <span className="text-lg leading-none">{emoji}</span>
          <span className="flex items-center gap-1.5">
            <GraduationCap size={14} className="text-blue-400 shrink-0" />
            {title}
          </span>
        </span>
        <span className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-500/70 hidden sm:block">
            {isEn ? 'Beginner' : 'Débutant'}
          </span>
          {open
            ? <ChevronUp   size={16} className="text-blue-400" />
            : <ChevronDown size={16} className="text-blue-400" />}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="guide-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3.5 pt-0.5">
              <RichText text={text} className="!text-blue-100/90 leading-relaxed" />
              {children && <div className="mt-3">{children}</div>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
