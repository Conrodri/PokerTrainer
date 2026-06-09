import { useState } from 'react';
import { motion } from 'framer-motion';
import { Save, RotateCcw } from 'lucide-react';
import { RANKS_ORDER, getNotationFromIndices, frequencyBg, handToDisplay } from '../../utils/pokerUtils';
import { Button } from '../ui/Button';

interface RangeEditorProps {
  matrix: number[][];
  onChange: (matrix: number[][]) => void;
  position: string;
  onSave?: () => void;
  onReset?: () => void;
  isSaving?: boolean;
}

export function RangeEditor({ matrix, onChange, position, onSave, onReset, isSaving }: RangeEditorProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  const handleCellClick = (row: number, col: number) => {
    const next = matrix.map(r => [...r]);
    // Cycle: Fold (0) → Raise (1) → Call (0.5) → Fold (0)
    const cur = next[row][col];
    if      (cur <= 0)   next[row][col] = 1;
    else if (cur >= 0.8) next[row][col] = 0.5;
    else                 next[row][col] = 0;
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Grid */}
      <div className="overflow-auto">
        {/* Column headers */}
        <div className="flex">
          <div className="w-7 h-7 shrink-0" />
          {RANKS_ORDER.map(r => (
            <div key={r} className="w-7 h-7 shrink-0 flex items-center justify-center text-gray-500 font-mono text-[9px]">
              {r}
            </div>
          ))}
        </div>

        {/* Grid rows */}
        {RANKS_ORDER.map((rowRank, rowIdx) => (
          <div key={rowRank} className="flex">
            {/* Row label */}
            <div className="w-7 h-7 shrink-0 flex items-center justify-center text-gray-500 font-mono text-[9px]">
              {rowRank}
            </div>

            {/* Cells */}
            {RANKS_ORDER.map((_, colIdx) => {
              const notation = getNotationFromIndices(rowIdx, colIdx);
              const freq = matrix[rowIdx]?.[colIdx] ?? 0;
              const isHovered = notation === hovered;
              const bg = frequencyBg(freq);

              return (
                <motion.div
                  key={`${rowIdx}-${colIdx}`}
                  className="w-7 h-7 shrink-0 border border-black/30 cursor-pointer flex items-center justify-center font-mono relative transition-all duration-100"
                  style={{ backgroundColor: bg, opacity: isHovered ? 1 : 0.82 }}
                  onMouseEnter={() => setHovered(notation)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => handleCellClick(rowIdx, colIdx)}
                  whileHover={{ scale: 1.15, zIndex: 20 }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                >
                  <span className="text-white/80 font-bold text-[7px] leading-none truncate px-px">
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
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center text-sm text-white font-mono"
        >
          <span className="bg-gray-800 px-3 py-1 rounded-full border border-gray-600">
            {handToDisplay(hovered)}
            {' — '}
            {(() => {
              const r = hovered.length === 2 ? RANKS_ORDER.indexOf(hovered[0]) : (hovered.endsWith('s') ? RANKS_ORDER.indexOf(hovered[0]) : RANKS_ORDER.indexOf(hovered[1]));
              const c = hovered.length === 2 ? RANKS_ORDER.indexOf(hovered[0]) : (hovered.endsWith('s') ? RANKS_ORDER.indexOf(hovered[1]) : RANKS_ORDER.indexOf(hovered[0]));
              const freq = matrix[r]?.[c] ?? 0;
              return freq === 0 ? 'Fold' : freq >= 0.8 ? 'Raise' : 'Call';
            })()}
          </span>
        </motion.div>
      )}

      {/* Legend */}
      <div className="flex gap-4 text-xs text-gray-400 justify-center flex-wrap">
        <LegendItem color="rgba(22,130,60,0.85)"  label="Raise" />
        <LegendItem color="rgba(200,150,20,0.75)" label="Call" />
        <LegendItem color="#1a202c"               label="Fold" />
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 justify-end mt-1">
        {onReset && (
          <Button variant="ghost" size="sm" onClick={onReset} className="flex items-center gap-1.5">
            <RotateCcw size={14} />
            Reset GTO
          </Button>
        )}
        {onSave && (
          <Button variant="gold" size="sm" onClick={onSave} loading={isSaving} className="flex items-center gap-1.5">
            <Save size={14} />
            Save
          </Button>
        )}
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
