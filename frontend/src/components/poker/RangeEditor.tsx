import { useState } from 'react';
import { motion } from 'framer-motion';
import { Save, RotateCcw } from 'lucide-react';
import { RANKS_ORDER, getNotationFromIndices, frequencyBg, handToDisplay } from '../../utils/pokerUtils';
import { Button } from '../ui/Button';
import { HoverTip } from '../ui/HoverTip';
import { useLangStore } from '../../store/langStore';

// ── BB defense scheme: 5 categories keyed by cell code (0-4) ──────────────────
// Matches the backend bbDefense.ts grid (0=fold,1=call,2=thin,3=value3bet,4=bluff3bet).
const BB_CATEGORIES = [
  { code: 0, color: '#1a202c',              labelFr: 'Fold',         labelEn: 'Fold' },
  { code: 1, color: 'rgba(37,99,235,0.70)', labelFr: 'Call',         labelEn: 'Call' },
  { code: 2, color: 'rgba(37,99,235,0.32)', labelFr: 'Call fin',     labelEn: 'Thin call' },
  { code: 3, color: 'rgba(22,130,60,0.85)', labelFr: '3-bet valeur', labelEn: 'Value 3-bet' },
  { code: 4, color: 'rgba(202,138,4,0.82)', labelFr: '3-bet bluff',  labelEn: 'Bluff 3-bet' },
] as const;

// Display + click-cycle order (by code): 3-bet bluff → 3-bet valeur → Call → Call fin → Fold.
const BB_CYCLE = [4, 3, 1, 2, 0];

const BB_TIPS: Record<number, { fr: string; en: string }> = {
  0: { fr: 'Main trop faible pour défendre hors de position : on se couche.',
       en: 'Too weak to defend out of position — fold.' },
  1: { fr: 'Suivre la mise pour défendre ta blinde : main jouable, mais pas assez forte pour relancer.',
       en: 'Call to defend your blind: playable, but not strong enough to 3-bet.' },
  2: { fr: 'Call limite (marginal) : défense optionnelle grâce à ta bonne cote en BB ; se coucher reste acceptable.',
       en: 'Borderline (marginal) call: optional defense thanks to your great BB price; folding is also acceptable.' },
  3: { fr: 'Relancer (3-bet) une main forte pour gonfler le pot : tu domines la range d\'ouverture adverse.',
       en: 'Re-raise (3-bet) a strong hand to build the pot: you dominate villain\'s opening range.' },
  4: { fr: 'Relancer (3-bet) sans main faite, en semi-bluff : souvent avec un bloqueur (un As).',
       en: 'Re-raise (3-bet) as a semi-bluff, often with a blocker (an ace).' },
};

/** Normalize any stored value to a valid BB category code (0-4). */
const toCode = (v: number): number => Math.max(0, Math.min(4, Math.round(v || 0)));

// Hover explanations for the editor's legend terms (custom opening range).
const LEGEND_TIPS = {
  raise: {
    fr: 'Tu ouvres (relances) cette main à 100 % depuis cette position.',
    en: 'You open-raise this hand 100% of the time from this position.',
  },
  call: {
    fr: 'Fréquence mixte (~50 %) : tu n\'ouvres cette main qu\'une partie du temps. Clique encore pour cycler Fold → Raise → Call.',
    en: 'Mixed frequency (~50%): you open this hand only part of the time. Click again to cycle Fold → Raise → Call.',
  },
  fold: {
    fr: 'Tu n\'ouvres pas cette main : elle est couchée depuis cette position.',
    en: 'You don\'t open this hand — fold from this position.',
  },
} as const;

interface RangeEditorProps {
  matrix: number[][];
  onChange: (matrix: number[][]) => void;
  position: string;
  onSave?: () => void;
  onReset?: () => void;
  isSaving?: boolean;
  /** 'open' = Raise/Call/Fold frequencies (default); 'bb' = 5 defense categories (codes 0-4). */
  scheme?: 'open' | 'bb';
}

export function RangeEditor({ matrix, onChange, position, onSave, onReset, isSaving, scheme = 'open' }: RangeEditorProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  const isEn = useLangStore(s => s.lang) === 'en';
  const isBB = scheme === 'bb';

  const handleCellClick = (row: number, col: number) => {
    const next = matrix.map(r => [...r]);
    const cur = next[row][col];
    if (isBB) {
      // Cycle in legend order: 3-bet bluff → 3-bet valeur → Call → Call fin → Fold → …
      const idx = BB_CYCLE.indexOf(toCode(cur));
      next[row][col] = BB_CYCLE[(idx + 1) % BB_CYCLE.length];
    } else {
      // Cycle: Fold (0) → Raise (1) → Call (0.5) → Fold (0)
      if      (cur <= 0)   next[row][col] = 1;
      else if (cur >= 0.8) next[row][col] = 0.5;
      else                 next[row][col] = 0;
    }
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
              const bg = isBB ? BB_CATEGORIES[toCode(freq)].color : frequencyBg(freq);

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
              if (isBB) {
                const cat = BB_CATEGORIES[toCode(freq)];
                return isEn ? cat.labelEn : cat.labelFr;
              }
              return freq === 0 ? 'Fold' : freq >= 0.8 ? 'Raise' : 'Call';
            })()}
          </span>
        </motion.div>
      )}

      {/* Legend */}
      <div className="flex gap-4 text-xs text-gray-400 justify-center flex-wrap">
        {isBB ? (
          // Same order as the click cycle: 3-bet bluff → 3-bet valeur → Call → Call fin → Fold
          BB_CYCLE.map(code => BB_CATEGORIES[code]).map(cat => (
            <LegendItem
              key={cat.code}
              color={cat.color}
              label={isEn ? cat.labelEn : cat.labelFr}
              tip={{ title: isEn ? cat.labelEn : cat.labelFr, text: isEn ? BB_TIPS[cat.code].en : BB_TIPS[cat.code].fr }}
            />
          ))
        ) : (
          <>
            <LegendItem color="rgba(22,130,60,0.85)"  label="Raise" tip={{ title: 'Raise', text: isEn ? LEGEND_TIPS.raise.en : LEGEND_TIPS.raise.fr }} />
            <LegendItem color="rgba(200,150,20,0.75)" label="Call"  tip={{ title: 'Call',  text: isEn ? LEGEND_TIPS.call.en  : LEGEND_TIPS.call.fr  }} />
            <LegendItem color="#1a202c"               label="Fold"  tip={{ title: 'Fold',  text: isEn ? LEGEND_TIPS.fold.en  : LEGEND_TIPS.fold.fr  }} />
          </>
        )}
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

function LegendItem({ color, label, tip }: { color: string; label: string; tip?: { title: string; text: string } }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-4 h-4 rounded border border-black/30" style={{ backgroundColor: color }} />
      {tip ? <HoverTip title={tip.title} text={tip.text}>{label}</HoverTip> : <span>{label}</span>}
    </div>
  );
}
