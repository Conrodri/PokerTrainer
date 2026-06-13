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
}

const cellSizes = {
  sm: 'w-6 h-6 text-[8px]',
  md: 'w-8 h-8 text-[9px]',
  lg: 'w-10 h-10 text-xs',
};

export function RangeMatrix({
  matrix, highlightNotation, onCellClick, size = 'md', showLegend = true,
  title, cellColor, legend, tooltipValue,
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
              const opacity = isHighlighted ? 1 : isHovered ? 0.9 : 0.75;

              return (
                <motion.div
                  key={`${rowIdx}-${colIdx}`}
                  className={`
                    ${cellSize} shrink-0 border border-black/30 cursor-pointer
                    flex items-center justify-center font-mono relative
                    transition-all duration-100
                    ${isHighlighted ? 'ring-2 ring-gold-400 ring-inset z-10' : ''}
                  `}
                  style={{ backgroundColor: bg, opacity }}
                  onMouseEnter={() => setHovered(notation)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => onCellClick?.(notation)}
                  whileHover={{ scale: 1.15, zIndex: 20 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                >
                  <span className="text-white/80 font-bold truncate px-px leading-none">
                    {size !== 'sm' ? RANKS_ORDER[rowIdx === colIdx ? rowIdx : (rowIdx < colIdx ? rowIdx : colIdx)] : ''}
                  </span>
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
