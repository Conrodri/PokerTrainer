import { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { GLOSSARY } from '../../data/glossary';
import { useLangStore } from '../../store/langStore';

interface PokerTermProps {
  /** Glossary entry id (e.g. "equity", "potodds", "outs") */
  id: string;
  children: React.ReactNode;
}

/**
 * Inline poker term with golden highlight + tooltip on hover / tap.
 * Usage: <PokerTerm id="equity">équité</PokerTerm>
 */
export function PokerTerm({ id, children }: PokerTermProps) {
  const [open, setOpen]   = useState(false);
  const [above, setAbove] = useState(true);   // tooltip direction
  const ref               = useRef<HTMLSpanElement>(null);
  const isEn              = useLangStore(s => s.lang) === 'en';
  const entry             = GLOSSARY.find(e => e.id === id);

  // Decide whether to show tooltip above or below based on viewport space
  useEffect(() => {
    if (!open || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setAbove(rect.top > 160); // enough room above
  }, [open]);

  // Close on outside click (mobile)
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  if (!entry) return <>{children}</>;

  return (
    <span ref={ref} className="relative inline-block">
      {/* Highlighted term */}
      <span
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={() => setOpen(v => !v)}
        className="text-gold-300 border-b border-dashed border-gold-400/60 cursor-help transition-colors hover:text-gold-200 hover:border-gold-300"
      >
        {children}
      </span>

      {/* Tooltip */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: above ? 4 : -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0,              scale: 1    }}
            exit={{   opacity: 0, y: above ? 4 : -4, scale: 0.97 }}
            transition={{ duration: 0.13 }}
            className={`
              absolute left-1/2 -translate-x-1/2 z-[200]
              w-64 bg-gray-950 border border-gray-700 rounded-xl p-3 shadow-2xl
              pointer-events-none
              ${above ? 'bottom-full mb-2.5' : 'top-full mt-2.5'}
            `}
            style={{ maxWidth: 'min(16rem, calc(100vw - 1.5rem))' }}
          >
            {/* Arrow */}
            {above ? (
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-700" />
            ) : (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-gray-700" />
            )}

            <p className="text-gold-400 font-bold text-xs mb-1">
              {isEn ? entry.en : entry.fr}
            </p>
            <p className="text-gray-300 text-xs leading-relaxed">
              {isEn ? entry.definitionEn : entry.definitionFr}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}
