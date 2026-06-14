import { Fragment, useState } from 'react';
import { Save, RotateCcw, X, Wand2 } from 'lucide-react';
import { RANKS_ORDER, getNotationFromIndices, handToDisplay } from '../../utils/pokerUtils';
import { Button } from '../ui/Button';
import { useLangStore } from '../../store/langStore';

// Four actions per hand, stored as frequencies (0-1) in this order.
export const EXPERT_ACTIONS = [
  { key: 0, labelFr: 'Fold',     labelEn: 'Fold',     color: '#1a202c',            accent: '#e5e7eb' },
  { key: 1, labelFr: 'Call',     labelEn: 'Call',     color: 'rgba(37,99,235,0.85)', accent: '#3b9dff' },
  { key: 2, labelFr: 'Raise',    labelEn: 'Raise',    color: 'rgba(22,130,60,0.9)',  accent: '#2ee86a' },
  { key: 3, labelFr: 'All-in',   labelEn: 'All-in',   color: 'rgba(190,45,45,0.9)',  accent: '#ff5252' },
] as const;

// Display order (legends, bars, sliders, buttons): All-in → Raise → Call → Fold.
// Keys are unchanged so the stored 169×4 layout (fold,call,raise,allin) is preserved.
export const EXPERT_DISPLAY = [...EXPERT_ACTIONS].reverse();

const NCELLS = 169;
const STEP = 0.05;

/** A fresh all-fold mix (flat 169×4). */
export function emptyExpertMix(): number[] {
  const m = new Array(NCELLS * 4).fill(0);
  for (let c = 0; c < NCELLS; c++) m[c * 4] = 1; // fold = 100%
  return m;
}

/**
 * Seed an expert mix from a GTO reference matrix.
 *  - open positions: a raise-frequency matrix (0-1) → raise3x = freq, fold = 1-freq.
 *  - BB: the defense grid (codes 0-4) → fold / call(1,2) / raise3x(3,4).
 */
export function gtoToExpertMix(matrix: number[][] | null | undefined, isBB: boolean): number[] {
  const mix = emptyExpertMix();
  if (!matrix) return mix;
  for (let r = 0; r < 13; r++) for (let c = 0; c < 13; c++) {
    const idx = r * 13 + c;
    const v = matrix[r]?.[c] ?? 0;
    let fold = 0, call = 0, raise = 0;
    if (isBB) {
      const code = Math.round(v);
      if (code === 0) fold = 1;
      else if (code === 1 || code === 2) call = 1;
      else raise = 1; // value / bluff 3-bet
    } else {
      raise = Math.max(0, Math.min(1, round2(v)));
      fold = round2(1 - raise);
    }
    mix[idx * 4] = fold; mix[idx * 4 + 1] = call; mix[idx * 4 + 2] = raise; mix[idx * 4 + 3] = 0;
  }
  return mix;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

interface Props {
  /** Flat 169×4 frequency array. */
  mix: number[];
  onChange: (mix: number[]) => void;
  onSave?: () => void;
  onReset?: () => void;
  /** Label for the reset button (e.g. "Reset GTO"). */
  resetLabel?: string;
  isSaving?: boolean;
  /** Small header shown above the editable grid (e.g. "Your range — HJ"). */
  title?: string;
  /** Rendered as the right-hand column (e.g. the read-only GTO reference). */
  gtoSlot?: React.ReactNode;
}

export function ExpertRangeEditor({ mix, onChange, onSave, onReset, resetLabel, isSaving, title, gtoSlot }: Props) {
  const isEn = useLangStore(s => s.lang) === 'en';
  const [selected, setSelected] = useState<number | null>(null);

  const cellSum = (idx: number) =>
    (mix[idx * 4] ?? 0) + (mix[idx * 4 + 1] ?? 0) + (mix[idx * 4 + 2] ?? 0) + (mix[idx * 4 + 3] ?? 0);

  // Every hand must sum to 100% before saving.
  const allValid = (() => {
    for (let c = 0; c < NCELLS; c++) {
      const s = cellSum(c);
      if (s < 0.99 || s > 1.01) return false;
    }
    return true;
  })();

  const setAction = (idx: number, action: number, value: number) => {
    // Cap so the four frequencies can never sum above 100%: the max for this
    // action is whatever headroom the other three leave.
    let others = 0;
    for (let a = 0; a < 4; a++) if (a !== action) others += mix[idx * 4 + a] ?? 0;
    const maxForThis = round2(Math.max(0, 1 - others));
    const v = Math.max(0, Math.min(maxForThis, round2(value)));
    const next = [...mix];
    next[idx * 4 + action] = v;
    onChange(next);
  };

  const normalize = (idx: number) => {
    const s = cellSum(idx);
    const next = [...mix];
    if (s <= 0) { next[idx * 4] = 1; }
    else for (let a = 0; a < 4; a++) next[idx * 4 + a] = round2((mix[idx * 4 + a] ?? 0) / s);
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col xl:flex-row xl:items-stretch xl:justify-center gap-5">
        {/* Left column: editable grid + legend */}
        <div className="flex flex-col gap-2">
      {title && <p className="text-xs font-semibold text-purple-300">{title}</p>}
      {/* Grid — matches RangeMatrix size="sm" (w-7 h-7) so it lines up with the GTO grid */}
      <div className="overflow-auto">
        {/* Column headers */}
        <div className="flex">
          <div className="w-7 h-7 shrink-0" />
          {RANKS_ORDER.map(r => (
            <div key={r} className="w-7 h-7 shrink-0 flex items-center justify-center text-gray-500 font-mono text-[8px]">{r}</div>
          ))}
        </div>

        {RANKS_ORDER.map((rowRank, rowIdx) => (
          <div key={rowRank} className="flex">
            <div className="w-7 h-7 shrink-0 flex items-center justify-center text-gray-500 font-mono text-[8px]">{rowRank}</div>
            {RANKS_ORDER.map((_, colIdx) => {
              const idx = rowIdx * 13 + colIdx;
              const isSel = selected === idx;
              const s = cellSum(idx);
              const invalid = s < 0.99 || s > 1.01;
              const notation = getNotationFromIndices(rowIdx, colIdx);
              return (
                <button
                  key={idx}
                  onClick={() => setSelected(idx)}
                  title={handToDisplay(notation)}
                  className={`w-7 h-7 shrink-0 border relative overflow-hidden transition-all ${
                    isSel ? 'ring-2 ring-white z-10 border-white' : invalid ? 'border-red-500/70' : 'border-black/30'
                  }`}
                >
                  {/* Stacked 4-segment bar (proportional to the mix) */}
                  <div className="absolute inset-0 flex">
                    {EXPERT_DISPLAY.map(a => {
                      const w = (mix[idx * 4 + a.key] ?? 0) * 100;
                      return w > 0 ? <div key={a.key} style={{ width: `${w}%`, backgroundColor: a.color }} /> : null;
                    })}
                  </div>
                  <span className="absolute inset-0 flex items-center justify-center text-white/90 font-bold text-[8px] leading-none tracking-tight pointer-events-none">
                    {notation}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex gap-3 text-[11px] text-gray-400 justify-center flex-wrap">
        {EXPERT_DISPLAY.map(a => (
          <div key={a.key} className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded border border-black/30" style={{ backgroundColor: a.color }} />
            <span>{isEn ? a.labelEn : a.labelFr}</span>
          </div>
        ))}
      </div>
        </div>{/* end left column */}

      {/* Middle column: per-hand mix editor (or a hint when nothing is selected) */}
      <div className="xl:w-72 xl:shrink-0 flex items-center justify-center min-h-[120px]">
      {selected !== null ? (() => {
        const idx = selected;
        const r = Math.floor(idx / 13), c = idx % 13;
        const notation = getNotationFromIndices(r, c);
        const s = cellSum(idx);
        const pct = Math.round(s * 100);
        const ok = s >= 0.99 && s <= 1.01;
        return (
          <div className="rounded-xl border border-gray-700 bg-gray-900/70 p-3 flex flex-col gap-2.5 w-full">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-sm">{handToDisplay(notation)}</span>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold ${ok ? 'text-green-400' : 'text-red-400'}`}>
                  {pct}%
                </span>
                <button onClick={() => setSelected(null)} className="text-gray-500 hover:text-gray-300"><X size={15} /></button>
              </div>
            </div>

            <div className="grid grid-cols-[4.5rem_1fr_2.25rem] gap-x-2 gap-y-2.5 items-center">
              {/* Scale row: 0% … 100% aligned over the sliders */}
              <div />
              <div className="flex justify-between text-[11px] text-gray-200 font-semibold px-0.5">
                <span>0%</span><span>100%</span>
              </div>
              <div />

              {EXPERT_DISPLAY.map(a => {
                const val = mix[idx * 4 + a.key] ?? 0;
                return (
                  <Fragment key={a.key}>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="w-3 h-3 rounded shrink-0 border border-black/30" style={{ backgroundColor: a.color }} />
                      <span className="text-xs text-gray-300 truncate">{isEn ? a.labelEn : a.labelFr}</span>
                    </div>
                    <input
                      type="range" min={0} max={1} step={STEP} value={val}
                      onChange={e => setAction(idx, a.key, parseFloat(e.target.value))}
                      className="mix-slider w-full"
                      style={{
                        ['--thumb' as any]: a.accent,
                        background: `linear-gradient(to right, ${a.accent} 0%, ${a.accent} ${val * 100}%, #374151 ${val * 100}%, #374151 100%)`,
                      }}
                    />
                    <span className="text-xs text-gray-300 text-right tabular-nums font-semibold">{Math.round(val * 100)}%</span>
                  </Fragment>
                );
              })}
            </div>

            {!ok && (
              <button
                onClick={() => normalize(idx)}
                className="self-start flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border border-gold-700/60 text-gold-300 hover:bg-gold-900/20"
              >
                <Wand2 size={12} /> {isEn ? 'Normalize to 100%' : 'Normaliser à 100%'}
              </button>
            )}
          </div>
        );
      })() : (
        <p className="text-xs text-gray-600 text-center px-4 leading-relaxed">
          {isEn ? '👆 Click a hand to set its frequency mix' : '👆 Clique une main pour régler son mix de fréquences'}
        </p>
      )}
      </div>{/* end middle column */}

      {/* Right column: GTO reference */}
      {gtoSlot && <div className="xl:shrink-0">{gtoSlot}</div>}
      </div>{/* end columns row */}

      {/* Action buttons */}
      <div className="flex items-center justify-between gap-3 mt-1">
        {!allValid && (
          <span className="text-[11px] text-red-400">
            {isEn ? 'Some hands don\'t sum to 100%' : 'Certaines mains ne font pas 100%'}
          </span>
        )}
        <div className="flex gap-3 justify-end ml-auto">
          {onReset && (
            <Button variant="ghost" size="sm" onClick={onReset} className="flex items-center gap-1.5">
              <RotateCcw size={14} /> {resetLabel ?? (isEn ? 'Clear (all fold)' : 'Vider (tout fold)')}
            </Button>
          )}
          {onSave && (
            <Button variant="gold" size="sm" onClick={onSave} loading={isSaving} disabled={!allValid} className="flex items-center gap-1.5">
              <Save size={14} /> {isEn ? 'Save' : 'Sauvegarder'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Read-only view of an expert mix (flat 169×4), rendered with the exact same
 *  stacked-bar scheme + legend as the editable grid above. Used in the trainer
 *  recap so the expert range is displayed consistently everywhere. */
export function ExpertRangeGrid({
  mix, highlightNotation, isEn,
}: { mix: number[]; highlightNotation?: string; isEn: boolean }) {
  return (
    <div className="flex flex-col gap-2 items-center">
      <div className="overflow-auto">
        {/* Column headers */}
        <div className="flex">
          <div className="w-7 h-7 shrink-0" />
          {RANKS_ORDER.map(r => (
            <div key={r} className="w-7 h-7 shrink-0 flex items-center justify-center text-gray-500 font-mono text-[8px]">{r}</div>
          ))}
        </div>

        {RANKS_ORDER.map((rowRank, rowIdx) => (
          <div key={rowRank} className="flex">
            <div className="w-7 h-7 shrink-0 flex items-center justify-center text-gray-500 font-mono text-[8px]">{rowRank}</div>
            {RANKS_ORDER.map((_, colIdx) => {
              const idx = rowIdx * 13 + colIdx;
              const notation = getNotationFromIndices(rowIdx, colIdx);
              const isHi = notation === highlightNotation;
              return (
                <div
                  key={idx}
                  title={handToDisplay(notation)}
                  className={`w-7 h-7 shrink-0 border relative overflow-hidden ${
                    isHi ? 'ring-2 ring-gold-400 ring-inset z-10 border-gold-400' : 'border-black/30'
                  }`}
                >
                  {/* Stacked 4-segment bar (proportional to the mix) */}
                  <div className="absolute inset-0 flex">
                    {EXPERT_DISPLAY.map(a => {
                      const w = (mix[idx * 4 + a.key] ?? 0) * 100;
                      return w > 0 ? <div key={a.key} style={{ width: `${w}%`, backgroundColor: a.color }} /> : null;
                    })}
                  </div>
                  <span className="absolute inset-0 flex items-center justify-center text-white/90 font-bold text-[8px] leading-none tracking-tight pointer-events-none">
                    {notation}
                  </span>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend — identical to the editor's */}
      <div className="flex gap-3 text-[11px] text-gray-400 justify-center flex-wrap">
        {EXPERT_DISPLAY.map(a => (
          <div key={a.key} className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded border border-black/30" style={{ backgroundColor: a.color }} />
            <span>{isEn ? a.labelEn : a.labelFr}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
