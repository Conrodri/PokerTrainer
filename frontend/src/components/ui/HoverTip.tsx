import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';

interface HoverTipProps {
  /** Bold heading of the tooltip. */
  title: string;
  /** Body text of the tooltip. */
  text: string;
  children: React.ReactNode;
  /** Extra classes for the trigger wrapper. */
  className?: string;
}

interface TipPos {
  left: number;
  top?: number;
  bottom?: number;
  arrowLeft: number;
  above: boolean;
}

const MARGIN = 12;
const GAP    = 10;
const MAX_W  = 240;

/**
 * Generic hover/tap tooltip with arbitrary content. Same robust portal +
 * viewport-clamping behaviour as PokerTerm (escapes overflow-hidden ancestors,
 * never clips), but with neutral styling so it can wrap legend chips, labels,
 * etc. without forcing the golden glossary look.
 */
export function HoverTip({ title, text, children, className = '' }: HoverTipProps) {
  const [open, setOpen] = useState(false);
  const [pos,  setPos]  = useState<TipPos | null>(null);
  const ref             = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open || !ref.current) return;
    const compute = () => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vw   = window.innerWidth;
      const vh   = window.innerHeight;
      const tipW = Math.min(MAX_W, vw - MARGIN * 2);
      const termCenter = rect.left + rect.width / 2;

      let left = termCenter - tipW / 2;
      left = Math.max(MARGIN, Math.min(left, vw - MARGIN - tipW));

      const arrowLeft = Math.max(14, Math.min(termCenter - left, tipW - 14));
      const above     = rect.top > vh - rect.bottom;

      const base: TipPos = { left, arrowLeft, above };
      if (above) base.bottom = vh - rect.top + GAP;
      else       base.top    = rect.bottom + GAP;
      setPos(base);
    };
    compute();
    window.addEventListener('resize', compute);
    window.addEventListener('scroll', compute, true);
    return () => {
      window.removeEventListener('resize', compute);
      window.removeEventListener('scroll', compute, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <span
      ref={ref}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onClick={() => setOpen(v => !v)}
      className={`cursor-help border-b border-dashed border-gray-500/50 ${className}`}
    >
      {children}

      {createPortal(
        <AnimatePresence>
          {open && pos && (
            <motion.div
              initial={{ opacity: 0, y: pos.above ? 4 : -4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0,                  scale: 1    }}
              exit={{   opacity: 0, y: pos.above ? 4 : -4, scale: 0.97 }}
              transition={{ duration: 0.13 }}
              className="fixed z-[9999] bg-gray-950 border border-gray-700 rounded-xl p-3 shadow-2xl pointer-events-none text-left"
              style={{
                left:   pos.left,
                top:    pos.top,
                bottom: pos.bottom,
                width:  `min(${MAX_W}px, calc(100vw - ${MARGIN * 2}px))`,
              }}
            >
              <div
                className={`absolute border-4 border-transparent ${
                  pos.above ? 'top-full border-t-gray-700' : 'bottom-full border-b-gray-700'
                }`}
                style={{ left: pos.arrowLeft, transform: 'translateX(-50%)' }}
              />
              <p className="text-gold-400 font-bold text-xs mb-1">{title}</p>
              <p className="text-gray-300 text-xs leading-relaxed">{text}</p>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </span>
  );
}
