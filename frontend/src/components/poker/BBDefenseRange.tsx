import { useState } from 'react';
import { motion } from 'framer-motion';
import { RANKS_ORDER, getNotationFromIndices, handToDisplay } from '../../utils/pokerUtils';
import { useT } from '../../i18n';

interface BBDefenseRangeProps {
  grid: number[][];               // cell code 0..4
  highlightNotation?: string;
}

// code: 0=fold, 1=call, 3=value 3-bet, 4=bluff 3-bet
const CODE_BG: Record<number, string> = {
  0: '#1a202c',
  1: 'rgba(37,99,235,0.70)',
  2: 'rgba(37,99,235,0.70)', // legacy alias → call
  3: 'rgba(22,130,60,0.85)',
  4: 'rgba(202,138,4,0.82)',
};

export function BBDefenseRange({ grid, highlightNotation }: BBDefenseRangeProps) {
  const t = useT();
  const [hovered, setHovered] = useState<string | null>(null);
  const cell = 'w-7 h-7 text-[8px] sm:w-8 sm:h-8 sm:text-[9px]';

  const codeLabel = (code: number): string => ({
    0: t.training.bb_leg_fold,
    1: t.training.bb_leg_call,
    2: t.training.bb_leg_call, // legacy alias → call
    3: t.training.bb_leg_value,
    4: t.training.bb_leg_bluff,
  }[code] ?? '');

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-gray-400 text-center font-semibold">{t.training.bb_range_title}</p>

      <div className="overflow-auto">
        {/* Column headers */}
        <div className="flex">
          <div className={`${cell} shrink-0`} />
          {RANKS_ORDER.map(r => (
            <div key={r} className={`${cell} shrink-0 flex items-center justify-center text-gray-500 font-mono`}>{r}</div>
          ))}
        </div>

        {RANKS_ORDER.map((rowRank, rowIdx) => (
          <div key={rowRank} className="flex">
            <div className={`${cell} shrink-0 flex items-center justify-center text-gray-500 font-mono`}>{rowRank}</div>
            {RANKS_ORDER.map((_, colIdx) => {
              const notation = getNotationFromIndices(rowIdx, colIdx);
              const code = grid[rowIdx]?.[colIdx] ?? 0;
              const isHi = notation === highlightNotation;
              return (
                <motion.div
                  key={`${rowIdx}-${colIdx}`}
                  className={`${cell} shrink-0 border border-black/30 flex items-center justify-center font-mono relative cursor-default ${isHi ? 'ring-2 ring-gold-400 ring-inset z-10' : ''}`}
                  style={{ backgroundColor: CODE_BG[code], opacity: isHi ? 1 : 0.85 }}
                  onMouseEnter={() => setHovered(notation)}
                  onMouseLeave={() => setHovered(null)}
                  whileHover={{ scale: 1.15, zIndex: 20, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                >
                  <span className="text-white/80 font-bold truncate px-px leading-none">
                    {RANKS_ORDER[rowIdx === colIdx ? rowIdx : (rowIdx < colIdx ? rowIdx : colIdx)]}
                  </span>
                </motion.div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Tooltip */}
      {hovered && (
        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="text-center text-sm text-white font-mono">
          <span className="bg-gray-800 px-3 py-1 rounded-full border border-gray-600">
            {handToDisplay(hovered)} — {codeLabel(cellCode(grid, hovered))}
          </span>
        </motion.div>
      )}

      {/* Legend */}
      <div className="flex gap-3 text-xs text-gray-400 justify-center flex-wrap">
        <LegendItem color={CODE_BG[3]} label={t.training.bb_leg_value} />
        <LegendItem color={CODE_BG[4]} label={t.training.bb_leg_bluff} />
        <LegendItem color={CODE_BG[1]} label={t.training.bb_leg_call} />
        <LegendItem color={CODE_BG[0]} label={t.training.bb_leg_fold} />
      </div>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-4 h-4 rounded border border-black/30" style={{ backgroundColor: color }} />
      <span>{label}</span>
    </div>
  );
}

function cellCode(grid: number[][], notation: string): number {
  let row: number, col: number;
  if (notation.length === 2) {
    row = col = RANKS_ORDER.indexOf(notation[0]);
  } else if (notation.endsWith('s')) {
    row = RANKS_ORDER.indexOf(notation[0]);
    col = RANKS_ORDER.indexOf(notation[1]);
  } else {
    // offsuit: higher rank is the column
    col = RANKS_ORDER.indexOf(notation[0]);
    row = RANKS_ORDER.indexOf(notation[1]);
  }
  return grid[row]?.[col] ?? 0;
}
