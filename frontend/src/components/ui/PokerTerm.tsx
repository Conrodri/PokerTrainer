import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { GLOSSARY } from '../../data/glossary';
import { useLangStore } from '../../store/langStore';

interface PokerTermProps {
  /** Glossary entry id (e.g. "equity", "potodds", "outs") */
  id: string;
  children: React.ReactNode;
}

interface TipPos {
  /** Fixed left (px) of the tooltip box, viewport-relative. */
  left: number;
  /** Fixed top (px) when placed below; bottom (px) when placed above. */
  top?: number;
  bottom?: number;
  /** Arrow horizontal position (px) relative to the tooltip's left edge. */
  arrowLeft: number;
  /** Show above (true) or below (false) the term. */
  above: boolean;
}

const MARGIN = 12;   // min gap from viewport edges
const GAP     = 10;   // gap between term and tooltip
const MAX_W   = 256;  // 16rem

/**
 * Inline poker term with golden highlight + tooltip on hover / tap.
 *
 * The tooltip renders in a portal with `position: fixed`, so it escapes any
 * `overflow-hidden` ancestor (collapsible panels, cards) and is clamped to the
 * viewport on every side — no more clipped or off-screen tooltips.
 *
 * Usage: <PokerTerm id="equity">équité</PokerTerm>
 */
export function PokerTerm({ id, children }: PokerTermProps) {
  const [open, setOpen] = useState(false);
  const [pos,  setPos]  = useState<TipPos | null>(null);
  const ref             = useRef<HTMLSpanElement>(null);
  const isEn            = useLangStore(s => s.lang) === 'en';
  const entry           = GLOSSARY.find(e => e.id === id);

  // Compute a viewport-clamped, fixed position whenever the tooltip opens.
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

      // Horizontal: centre on the term, then clamp inside the viewport.
      let left = termCenter - tipW / 2;
      left = Math.max(MARGIN, Math.min(left, vw - MARGIN - tipW));

      const arrowLeft = Math.max(14, Math.min(termCenter - left, tipW - 14));
      const above     = rect.top > vh - rect.bottom; // more room above than below

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

  // Close on outside click / tap (mobile)
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

      {/* Tooltip — rendered in a portal so it escapes overflow-hidden ancestors */}
      {createPortal(
        <AnimatePresence>
          {open && pos && (
            <motion.div
              initial={{ opacity: 0, y: pos.above ? 4 : -4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0,                  scale: 1    }}
              exit={{   opacity: 0, y: pos.above ? 4 : -4, scale: 0.97 }}
              transition={{ duration: 0.13 }}
              className="fixed z-[9999] bg-gray-950 border border-gray-700 rounded-xl p-3 shadow-2xl pointer-events-none"
              style={{
                left:   pos.left,
                top:    pos.top,
                bottom: pos.bottom,
                width:  `min(${MAX_W}px, calc(100vw - ${MARGIN * 2}px))`,
              }}
            >
              {/* Arrow — re-anchored to point at the term even when clamped */}
              <div
                className={`absolute border-4 border-transparent ${
                  pos.above ? 'top-full border-t-gray-700' : 'bottom-full border-b-gray-700'
                }`}
                style={{ left: pos.arrowLeft, transform: 'translateX(-50%)' }}
              />

              <p className="text-gold-400 font-bold text-xs mb-1">
                {isEn ? entry.en : entry.fr}
              </p>
              <p className="text-gray-300 text-xs leading-relaxed">
                {isEn ? entry.definitionEn : entry.definitionFr}
              </p>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </span>
  );
}
