import { useState } from 'react';
import { motion } from 'framer-motion';
import { RANKS_ORDER, getNotationFromIndices, actionBg, actionLabel, handToDisplay } from '../../utils/pokerUtils';
import { HoverTip } from '../ui/HoverTip';

interface LegendEntry {
  color: string;
  label: string;
  /** Optional hover explanation for the term. */
  tip?: { title: string; text: string };
}

interface RangeMatrixProps {
  matrix: number[][];
  highlightNotation?: string;
  onCellClick?: (notation: string) => void;
  size?: 'sm' | 'md' | 'lg';
  showLegend?: boolean;
  /** Title shown above the grid */
  title?: string;
  /** Custom cell background colour. Default: GTO frequency colouring via frequencyBg(). */
  cellColor?: (value: number) => string;
  /** Replaces the default legend row when provided */
  legend?: LegendEntry[];
  /** Formats the tooltip value string. Receives the raw cell value. */
  tooltipValue?: (value: number) => string;
  /** Overrides the in-cell label. Default: the hand notation (e.g. "AKs"). */
  cellLabel?: (value: number, notation: string) => string;
  /** Small bottom-right corner badge per cell (e.g. the GTO frequency "75%"). */
  cellCorner?: (value: number, notation: string) => string;
  /** Full-opacity, no hover scaling — crisp read-only display (matches editors). */
  crisp?: boolean;
}

// Cells shrink on mobile so the 13×13 grid fits a phone width, then scale up
// from the `sm` breakpoint. The grid stays inside an overflow-auto wrapper as a
// safety net on very narrow screens.
const cellSizes = {
  sm: 'w-6 h-6 text-[7px] sm:w-7 sm:h-7 sm:text-[8px]',
  md: 'w-6 h-6 text-[7px] sm:w-8 sm:h-8 sm:text-[9px]',
  lg: 'w-6 h-6 text-[8px] sm:w-10 sm:h-10 sm:text-xs',
};

export function RangeMatrix({
  matrix, highlightNotation, onCellClick, size = 'md', showLegend = true,
  title, cellColor, legend, tooltipValue, cellLabel, cellCorner, crisp,
}: RangeMatrixProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  const cellSize = cellSizes[size];

  const getColor = cellColor ?? actionBg;

  return (
    <div className="flex flex-col gap-3">
      {title && (
        <p className="text-xs text-gray-400 text-center font-semibold">{title}</p>
      )}
      <div className="overflow-auto">
        {/* Column headers */}
        <div className="flex">
          <div className={`${cellSize} shrink-0`} /> {/* spacer */}
          {RANKS_ORDER.map(r => (
            <div key={r} className={`${cellSize} shrink-0 flex items-center justify-center text-gray-500 font-mono`}>
              {r}
            </div>
          ))}
        </div>

        {/* Grid rows */}
        {RANKS_ORDER.map((rowRank, rowIdx) => (
          <div key={rowRank} className="flex">
            {/* Row label */}
            <div className={`${cellSize} shrink-0 flex items-center justify-center text-gray-500 font-mono`}>
              {rowRank}
            </div>

            {/* Cells */}
            {RANKS_ORDER.map((_, colIdx) => {
              const notation = getNotationFromIndices(rowIdx, colIdx);
              const freq = matrix[rowIdx]?.[colIdx] ?? 0;
              const isHighlighted = notation === highlightNotation;
              const isHovered = notation === hovered;

              const bg = getColor(freq);
              const opacity = crisp ? 1 : (isHighlighted ? 1 : isHovered ? 0.9 : 0.75);
              const cls = `${cellSize} shrink-0 border border-black/30 cursor-pointer flex items-center justify-center relative ${isHighlighted ? 'ring-2 ring-gold-400 ring-inset z-10' : ''}`;
              const corner = cellCorner ? cellCorner(freq, notation) : '';
              const inner = (
                <>
                  <span className="text-white/90 font-bold leading-none tracking-tight pointer-events-none">
                    {cellLabel ? cellLabel(freq, notation) : notation}
                  </span>
                  {corner && (
                    <span className="absolute bottom-0 right-0.5 text-[6px] font-bold text-white/90 leading-none pointer-events-none">
                      {corner}
                    </span>
                  )}
                </>
              );

              // Crisp mode renders a plain <div> (no framer-motion compositing) so
              // the in-cell text stays sharp — matching the editable grid.
              if (crisp) {
                return (
                  <div
                    key={`${rowIdx}-${colIdx}`}
                    className={cls}
                    style={{ backgroundColor: bg, opacity, backgroundClip: 'padding-box' }}
                    onMouseEnter={() => setHovered(notation)}
                    onMouseLeave={() => setHovered(null)}
                    onClick={() => onCellClick?.(notation)}
                  >
                    {inner}
                  </div>
                );
              }

              return (
                <motion.div
                  key={`${rowIdx}-${colIdx}`}
                  className={`${cls} transition-all duration-100`}
                  style={{ backgroundColor: bg, opacity, backgroundClip: 'padding-box' }}
                  onMouseEnter={() => setHovered(notation)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => onCellClick?.(notation)}
                  whileHover={{ scale: 1.15, zIndex: 20 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                >
                  {inner}
                </motion.div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Tooltip */}
      {hovered && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center text-sm text-white font-mono"
        >
          <span className="bg-gray-800 px-3 py-1 rounded-full border border-gray-600">
            {handToDisplay(hovered)}
            {' — '}
            {(() => {
              const val = matrix[getRowFromNotation(hovered)]?.[getColFromNotation(hovered)];
              if (val === undefined) return 'Hors range';
              return tooltipValue ? tooltipValue(val) : actionLabel(val);
            })()}
          </span>
        </motion.div>
      )}

      {showLegend && (
        <div className="flex gap-4 text-xs text-gray-400 justify-center flex-wrap">
          {(legend ?? [
            { color: 'rgba(22,130,60,0.85)', label: 'Raise' },
            { color: 'rgba(202,138,4,0.9)',  label: 'Call' },
            { color: '#1a202c',              label: 'Fold' },
          ]).map(item => (
            <LegendItem key={item.label} color={item.color} label={item.label} tip={item.tip} />
          ))}
        </div>
      )}
    </div>
  );
}

function LegendItem({ color, label, tip }: LegendEntry) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-4 h-4 rounded border border-black/30" style={{ backgroundColor: color }} />
      {tip ? <HoverTip title={tip.title} text={tip.text}>{label}</HoverTip> : <span>{label}</span>}
    </div>
  );
}

// Helper to get matrix indices from notation
function getRowFromNotation(n: string): number {
  if (n.length === 2) return RANKS_ORDER.indexOf(n[0]);
  if (n.endsWith('s')) return RANKS_ORDER.indexOf(n[0]);
  return RANKS_ORDER.indexOf(n[1]); // offsuit: higher rank is col (idx 1 in notation)
}

function getColFromNotation(n: string): number {
  if (n.length === 2) return RANKS_ORDER.indexOf(n[0]);
  if (n.endsWith('s')) return RANKS_ORDER.indexOf(n[1]);
  return RANKS_ORDER.indexOf(n[0]); // offsuit: lower rank is row
}
