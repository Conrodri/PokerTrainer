import { motion } from 'framer-motion';
import { X } from 'lucide-react';

interface DayData    { correct: number; total: number }
interface ModuleDay  { correct: number; total: number; bestStreak: number }
const MODULE_META: Record<string, { icon: string; label: string; labelFr: string }> = {
  preflop:   { icon: '🎯', label: 'Pre-flop',      labelFr: 'Pré-flop'       },
  potodds:   { icon: '📐', label: 'Pot Odds',       labelFr: 'Pot Odds'       },
  equity:    { icon: '⚖️', label: 'Equity',         labelFr: 'Équité'         },
  outs:      { icon: '🎲', label: 'Outs',           labelFr: 'Outs'           },
  bbdefense: { icon: '🛡️', label: 'BB Defense',    labelFr: 'Défense BB'     },
  postflop:  { icon: '🃏', label: 'Post-flop',      labelFr: 'Post-flop'      },
  fullhand:  { icon: '🎰', label: 'Full Hand',      labelFr: 'Main Complète'  },
};

export function DayDetailPanel({ dateStr, dayData, moduleMap, isEn, onClose }: {
  dateStr:   string;
  dayData:   DayData;
  moduleMap: Record<string, ModuleDay>;
  isEn:      boolean;
  onClose:   () => void;
}) {
  const acc         = dayData.total > 0 ? Math.round(dayData.correct / dayData.total * 100) : null;
  const bbDay       = moduleMap['bbdefense'];
  const pfStreets = (['postflop_flop', 'postflop_turn', 'postflop_river'] as const)
    .map(k => ({ key: k,
      label: k === 'postflop_flop' ? 'Flop' : k === 'postflop_turn' ? 'Turn' : 'River',
      icon:  k === 'postflop_flop' ? '🃏'   : k === 'postflop_turn' ? '🔄'   : '🌊',
      data: moduleMap[k] as ModuleDay | undefined }))
    .filter(s => s.data && s.data.total > 0);

  const fhStreetDefs = [
    { key: 'fullhand_preflop', label: isEn ? 'Pre-flop' : 'Pré-flop', icon: '🎯' },
    { key: 'fullhand_flop',    label: 'Flop',                          icon: '🃏' },
    { key: 'fullhand_turn',    label: 'Turn',                          icon: '🔄' },
    { key: 'fullhand_river',   label: 'River',                         icon: '🌊' },
  ] as const;
  const fhStreets = fhStreetDefs
    .map(s => ({ ...s, data: moduleMap[s.key] as ModuleDay | undefined }))
    .filter(s => s.data && s.data.total > 0);
  const fhAggregate: ModuleDay | null = fhStreets.length > 0
    ? fhStreets.reduce((acc, s) => ({
        correct:     acc.correct     + s.data!.correct,
        total:       acc.total       + s.data!.total,
        bestStreak:  Math.max(acc.bestStreak, s.data!.bestStreak),
      }), { correct: 0, total: 0, bestStreak: 0 })
    : null;

  const modules = Object.entries(moduleMap)
    .filter(([mod]) => mod !== 'bbdefense' && !mod.startsWith('postflop_') && !mod.startsWith('fullhand_'))
    .sort(([,a],[,b]) => b.total - a.total);
  const dateLabel   = new Date(dateStr + 'T12:00:00').toLocaleDateString(
    isEn ? 'en-US' : 'fr-FR',
    { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
  );

  const totalXp = modules.reduce((sum, [, m]) => sum + m.correct * 15 + (m.total - m.correct) * 5, 0)
    + (bbDay ? bbDay.correct * 15 + (bbDay.total - bbDay.correct) * 5 : 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.98 }}
      transition={{ duration: 0.18 }}
      className="bg-gray-900 border border-gray-700 rounded-2xl p-4 shadow-xl"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-white font-bold text-sm capitalize">{dateLabel}</p>
          <p className="text-gray-500 text-xs mt-0.5">
            {dayData.total} {isEn ? 'exercises' : 'exercices'} &middot; {dayData.correct} {isEn ? 'correct' : 'corrects'}
            {totalXp > 0 && <> &middot; <span className="text-gold-400">+{totalXp} XP</span></>}
          </p>
        </div>
        <button onClick={onClose} className="text-gray-600 hover:text-white transition-colors p-0.5">
          <X size={14} />
        </button>
      </div>

      {/* Global accuracy bar */}
      {acc !== null && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-400">{isEn ? 'Overall accuracy' : 'Précision globale'}</span>
            <span className={`text-xs font-bold ${acc >= 75 ? 'text-green-400' : acc >= 55 ? 'text-yellow-400' : 'text-red-400'}`}>
              {acc}%
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-gray-800 overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${acc >= 75 ? 'bg-green-500' : acc >= 55 ? 'bg-yellow-500' : 'bg-red-500'}`}
              initial={{ width: 0 }}
              animate={{ width: `${acc}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      )}

      {/* Per-module rows */}
      {modules.length > 0 ? (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
            {isEn ? 'By module' : 'Par module'}
          </p>
          {modules.map(([mod, m]) => {
            const meta   = MODULE_META[mod];
            const modAcc = m.total > 0 ? Math.round(m.correct / m.total * 100) : 0;
            const pctBar = (m.total / dayData.total) * 100;
            const isPreflop = mod === 'preflop';
            const bbAcc  = bbDay && bbDay.total > 0 ? Math.round(bbDay.correct / bbDay.total * 100) : null;
            return (
              <div key={mod}>
                <div className="flex items-center gap-3">
                  {/* Icon + name */}
                  <div className="flex items-center gap-1.5 w-28 shrink-0">
                    <span className="text-sm leading-none">{meta?.icon ?? '•'}</span>
                    <span className="text-xs text-gray-300 font-medium truncate">
                      {isEn ? (meta?.label ?? mod) : (meta?.labelFr ?? mod)}
                    </span>
                  </div>

                  {/* Bar */}
                  <div className="flex-1 h-1.5 rounded-full bg-gray-800 overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${modAcc >= 75 ? 'bg-green-500' : modAcc >= 55 ? 'bg-yellow-500' : 'bg-red-400'}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${modAcc}%` }}
                      transition={{ duration: 0.45, delay: 0.05 }}
                    />
                  </div>

                  {/* Count + % */}
                  <div className="text-right shrink-0 w-20">
                    <span className="text-xs font-mono text-gray-400">{m.correct}/{m.total}</span>
                    <span className={`ml-1.5 text-xs font-bold ${modAcc >= 75 ? 'text-green-400' : modAcc >= 55 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {modAcc}%
                    </span>
                  </div>

                  {/* Volume % */}
                  <div className="shrink-0 w-12 text-right">
                    <span className="text-[10px] text-gray-600">{Math.round(pctBar)}%</span>
                  </div>
                </div>

                {/* Best streak of the day */}
                {m.bestStreak > 1 && (
                  <div className="ml-7 mt-0.5">
                    <span className="text-[10px] text-gray-500">
                      🔥 {isEn ? 'Best streak' : 'Meilleure série'} :&nbsp;
                      <span className="text-orange-400 font-bold">{m.bestStreak}</span>
                    </span>
                  </div>
                )}

                {/* Post-flop → sous-lignes par rue */}
                {mod === 'postflop' && pfStreets.length > 0 && (
                  <div className="mt-1.5 ml-7 pl-3 border-l-2 border-gray-700/50 space-y-1">
                    {pfStreets.map(s => {
                      const sAcc = s.data!.total > 0 ? Math.round(s.data!.correct / s.data!.total * 100) : 0;
                      return (
                        <div key={s.key} className="flex items-center gap-3">
                          <div className="flex items-center gap-1 w-[84px] shrink-0">
                            <span className="text-[10px]">{s.icon}</span>
                            <span className="text-[10px] font-bold text-gray-500">{s.label}</span>
                          </div>
                          <div className="flex-1 h-1 rounded-full bg-gray-800 overflow-hidden">
                            <motion.div
                              className={`h-full rounded-full ${sAcc >= 75 ? 'bg-green-500/70' : sAcc >= 55 ? 'bg-yellow-500/70' : 'bg-red-400/70'}`}
                              initial={{ width: 0 }}
                              animate={{ width: `${sAcc}%` }}
                              transition={{ duration: 0.45, delay: 0.1 }}
                            />
                          </div>
                          <div className="text-right shrink-0 w-20">
                            <span className="text-[10px] font-mono text-gray-500">{s.data!.correct}/{s.data!.total}</span>
                            <span className={`ml-1.5 text-[10px] font-bold ${sAcc >= 75 ? 'text-green-400' : sAcc >= 55 ? 'text-yellow-400' : 'text-red-400'}`}>{sAcc}%</span>
                          </div>
                          <div className="shrink-0 w-12 text-right">
                            <span className="text-[10px] text-gray-600">{Math.round((s.data!.total / dayData.total) * 100)}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Pré-flop → sous-ligne BB */}
                {isPreflop && bbDay && bbDay.total > 0 && (
                  <div className="mt-1.5 ml-7 pl-3 border-l-2 border-gray-700/50">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 w-[84px] shrink-0">
                        <span className="text-[10px] font-bold text-gray-500">BB</span>
                      </div>
                      <div className="flex-1 h-1 rounded-full bg-gray-800 overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${bbAcc! >= 75 ? 'bg-green-500/70' : bbAcc! >= 55 ? 'bg-yellow-500/70' : 'bg-red-400/70'}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${bbAcc}%` }}
                          transition={{ duration: 0.45, delay: 0.1 }}
                        />
                      </div>
                      <div className="text-right shrink-0 w-20">
                        <span className="text-[10px] font-mono text-gray-500">{bbDay.correct}/{bbDay.total}</span>
                        <span className={`ml-1.5 text-[10px] font-bold ${bbAcc! >= 75 ? 'text-green-400' : bbAcc! >= 55 ? 'text-yellow-400' : 'text-red-400'}`}>
                          {bbAcc}%
                        </span>
                      </div>
                      <div className="shrink-0 w-12 text-right">
                        <span className="text-[10px] text-gray-600">
                          {Math.round((bbDay.total / dayData.total) * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Full Hand — ligne agrégée + sous-détail par rue */}
          {fhAggregate && (() => {
            const fhAcc = Math.round(fhAggregate.correct / fhAggregate.total * 100);
            const fhMeta = MODULE_META['fullhand'];
            return (
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 w-28 shrink-0">
                    <span className="text-sm leading-none">{fhMeta?.icon ?? '🎰'}</span>
                    <span className="text-xs text-gray-300 font-medium truncate">
                      {isEn ? (fhMeta?.label ?? 'Full Hand') : (fhMeta?.labelFr ?? 'Main Complète')}
                    </span>
                  </div>
                  <div className="flex-1 h-1.5 rounded-full bg-gray-800 overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${fhAcc >= 75 ? 'bg-green-500' : fhAcc >= 55 ? 'bg-yellow-500' : 'bg-red-400'}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${fhAcc}%` }}
                      transition={{ duration: 0.45, delay: 0.05 }}
                    />
                  </div>
                  <div className="text-right shrink-0 w-20">
                    <span className="text-xs font-mono text-gray-400">{fhAggregate.correct}/{fhAggregate.total}</span>
                    <span className={`ml-1.5 text-xs font-bold ${fhAcc >= 75 ? 'text-green-400' : fhAcc >= 55 ? 'text-yellow-400' : 'text-red-400'}`}>{fhAcc}%</span>
                  </div>
                  <div className="shrink-0 w-12 text-right">
                    <span className="text-[10px] text-gray-600">{Math.round((fhAggregate.total / dayData.total) * 100)}%</span>
                  </div>
                </div>
                <div className="mt-1.5 ml-7 pl-3 border-l-2 border-gray-700/50 space-y-1">
                  {fhStreets.map(s => {
                    const sAcc = Math.round(s.data!.correct / s.data!.total * 100);
                    return (
                      <div key={s.key} className="flex items-center gap-3">
                        <div className="flex items-center gap-1 w-[84px] shrink-0">
                          <span className="text-[10px]">{s.icon}</span>
                          <span className="text-[10px] font-bold text-gray-500">{s.label}</span>
                        </div>
                        <div className="flex-1 h-1 rounded-full bg-gray-800 overflow-hidden">
                          <motion.div
                            className={`h-full rounded-full ${sAcc >= 75 ? 'bg-green-500/70' : sAcc >= 55 ? 'bg-yellow-500/70' : 'bg-red-400/70'}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${sAcc}%` }}
                            transition={{ duration: 0.45, delay: 0.1 }}
                          />
                        </div>
                        <div className="text-right shrink-0 w-20">
                          <span className="text-[10px] font-mono text-gray-500">{s.data!.correct}/{s.data!.total}</span>
                          <span className={`ml-1.5 text-[10px] font-bold ${sAcc >= 75 ? 'text-green-400' : sAcc >= 55 ? 'text-yellow-400' : 'text-red-400'}`}>{sAcc}%</span>
                        </div>
                        <div className="shrink-0 w-12 text-right">
                          <span className="text-[10px] text-gray-600">{Math.round((s.data!.total / dayData.total) * 100)}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      ) : (
        <p className="text-xs text-gray-600 text-center py-2">
          {isEn ? 'No module detail available.' : 'Détail par module non disponible.'}
        </p>
      )}
    </motion.div>
  );
}
