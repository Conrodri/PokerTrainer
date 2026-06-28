import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useShallow } from 'zustand/react/shallow';
import { X, Sliders, Layers, Plus, Check, Zap, Upload, Download, Target, Flame, Lock } from 'lucide-react';
import { Position, TableFormat, GameType } from '../../types/poker';
import { useAuthStore } from '../../store/authStore';
import { RangeEditor } from './RangeEditor';
import { RangeMatrix } from './RangeMatrix';
import { ExpertRangeEditor, gtoToExpertMix, EXPERT_DISPLAY } from './ExpertRangeEditor';
import { RANKS_ORDER, getNotationFromIndices, frequencyBg, bbCellColor } from '../../utils/pokerUtils';
import { HoverTip } from '../ui/HoverTip';
import { Button } from '../ui/Button';
import { useT } from '../../i18n';
import { useLangStore } from '../../store/langStore';
import { useModeStore } from '../../store/modeStore';
import { useCustomRangeStore } from '../../store/customRangeStore';
import { trainingApi, rangesApi, profilesApi, RangeProfile } from '../../services/api';
import {
  validateFileMeta,
  safeJsonParse,
  validateComplexImport,
  validateSimpleRangeImport,
} from '../../utils/rangeImportValidator';

// Storage keys are namespaced by format and game type.
// Key structure: [mtt:]?[8max:|3max:|hu:]?POSITION
const realPos     = (key: string): Position => {
  const k = key.startsWith('mtt:') ? key.slice(4) : key;
  if (k.startsWith('8max:')) return k.slice(5) as Position;
  if (k.startsWith('3max:')) return k.slice(5) as Position;
  if (k.startsWith('hu:'))   return k.slice(3) as Position;
  return k as Position;
};
const fmtOf       = (key: string): TableFormat => {
  const k = key.startsWith('mtt:') ? key.slice(4) : key;
  if (k.startsWith('8max:')) return '8max';
  if (k.startsWith('3max:')) return '3max';
  if (k.startsWith('hu:'))   return 'hu';
  return '6max';
};
const gameTypeOf  = (key: string): GameType => key.startsWith('mtt:') ? 'mtt' : 'cashgame';

const POSITIONS_6MAX     = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
const POSITIONS_8MAX     = ['8max:UTG', '8max:UTG1', '8max:LJ', '8max:HJ', '8max:CO', '8max:BTN', '8max:SB', '8max:BB'];
const POSITIONS_3MAX     = ['3max:BTN', '3max:SB', '3max:BB'];
const POSITIONS_HU       = ['hu:BTN', 'hu:BB'];
const POSITIONS_6MAX_MTT = ['mtt:UTG', 'mtt:HJ', 'mtt:CO', 'mtt:BTN', 'mtt:SB', 'mtt:BB'];
const POSITIONS_8MAX_MTT = ['mtt:8max:UTG', 'mtt:8max:UTG1', 'mtt:8max:LJ', 'mtt:8max:HJ', 'mtt:8max:CO', 'mtt:8max:BTN', 'mtt:8max:SB', 'mtt:8max:BB'];
const POSITIONS_3MAX_MTT = ['mtt:3max:BTN', 'mtt:3max:SB', 'mtt:3max:BB'];
const POSITIONS_HU_MTT   = ['mtt:hu:BTN', 'mtt:hu:BB'];

function getPositions(format: TableFormat, gameType: GameType): string[] {
  if (gameType === 'mtt') {
    if (format === '8max') return POSITIONS_8MAX_MTT;
    if (format === '3max') return POSITIONS_3MAX_MTT;
    if (format === 'hu')   return POSITIONS_HU_MTT;
    return POSITIONS_6MAX_MTT;
  }
  if (format === '8max') return POSITIONS_8MAX;
  if (format === '3max') return POSITIONS_3MAX;
  if (format === 'hu')   return POSITIONS_HU;
  return POSITIONS_6MAX;
}

function flatToMatrix(flat: number[]): number[][] {
  const m: number[][] = [];
  for (let r = 0; r < 13; r++) m.push(flat.slice(r * 13, r * 13 + 13));
  return m;
}

// Read-only stacked-bar expert grid (used for the locked-state preview)
function ExpertGtoMatrix({ mix }: { mix: number[] }) {
  return (
    <div className="overflow-auto">
      <div className="flex">
        <div className="w-6 h-6 sm:w-7 sm:h-7 shrink-0" />
        {RANKS_ORDER.map(r => (
          <div key={r} className="w-6 h-6 sm:w-7 sm:h-7 shrink-0 flex items-center justify-center text-gray-500 font-mono text-[8px]">{r}</div>
        ))}
      </div>
      {RANKS_ORDER.map((rowRank, rowIdx) => (
        <div key={rowRank} className="flex">
          <div className="w-6 h-6 sm:w-7 sm:h-7 shrink-0 flex items-center justify-center text-gray-500 font-mono text-[8px]">{rowRank}</div>
          {RANKS_ORDER.map((_, colIdx) => {
            const idx = rowIdx * 13 + colIdx;
            const notation = getNotationFromIndices(rowIdx, colIdx);
            return (
              <div key={idx} title={notation} className="w-6 h-6 sm:w-7 sm:h-7 shrink-0 border border-black/30 relative overflow-hidden">
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
  );
}

// ─── Add-profile inline form ─────────────────────────────────────────────────

function AddProfileForm({ isEn, isExpert, onAdd, onCancel }: {
  isEn: boolean;
  isExpert: boolean;
  onAdd: (name: string, mode: 'standard' | 'expert') => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [mode, setMode] = useState<'standard' | 'expert'>('standard');
  const submit = () => { if (name.trim()) onAdd(name.trim(), mode); };
  return (
    <div className="flex flex-col gap-2 mt-1 bg-gray-800/40 border border-gray-700 rounded-xl p-3">
      <div className="flex items-center gap-2">
        <input
          autoFocus value={name} onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && name.trim()) submit(); if (e.key === 'Escape') onCancel(); }}
          placeholder={isEn ? 'Profile name…' : 'Nom du profil…'}
          className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-felt-500"
        />
        <button onClick={submit}
          className="px-3 py-1.5 bg-felt-700 hover:bg-felt-600 text-white rounded-lg text-sm font-semibold transition-colors">
          {isEn ? 'Create' : 'Créer'}
        </button>
        <button onClick={onCancel} className="text-gray-500 hover:text-white"><X size={16} /></button>
      </div>

      {/* Type: standard vs expert (frequency mixes) */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-gray-500">{isEn ? 'Type:' : 'Type :'}</span>
        <button
          onClick={() => setMode('standard')}
          className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
            mode === 'standard' ? 'bg-felt-700 text-white border-felt-500' : 'text-gray-400 border-gray-700 hover:text-white'
          }`}
        >
          {isEn ? 'Standard' : 'Standard'}
        </button>
        <HoverTip
          title="Expert"
          text={isEn
            ? 'Expert mode: set a frequency mix per hand (Fold / Call / Raise / All-in, summing to 100%) instead of a single action. Reserved for the Premium Expert tier.'
            : 'Mode expert : définis un mix de fréquences par main (Fold / Call / Raise / All-in, somme = 100%) au lieu d\'une seule action. Réservé à l\'offre Premium Expert.'}
        >
          <button
            onClick={() => (isExpert ? setMode('expert') : undefined)}
            disabled={!isExpert}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all flex items-center gap-1 ${
              !isExpert ? 'text-gray-600 border-gray-800 cursor-not-allowed'
                : mode === 'expert' ? 'bg-purple-700 text-white border-purple-500' : 'text-purple-300 border-purple-800 hover:bg-purple-900/20'
            }`}
          >
            {!isExpert && <Lock size={10} />}
            <Flame size={11} /> Expert
          </button>
        </HoverTip>
        {!isExpert && (
          <span className="text-[10px] text-gray-600">{isEn ? '(Premium Expert)' : '(Premium Expert)'}</span>
        )}
      </div>
    </div>
  );
}

// ─── Add-stack-range inline form ──────────────────────────────────────────────

function AddRangeForm({ isEn, onAdd, onCancel }: {
  isEn: boolean;
  onAdd: (label: string, stackMin: number, stackMax: number | null) => void;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState('');
  const [minVal, setMinVal] = useState('0');
  const [maxVal, setMaxVal] = useState('');
  const submit = () => {
    if (!label.trim()) return;
    onAdd(label.trim(), parseFloat(minVal) || 0, maxVal.trim() === '' ? null : parseFloat(maxVal));
  };
  return (
    <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-3 flex flex-col gap-2">
      <p className="text-xs text-gray-400 font-semibold">
        {isEn ? 'New stack range' : 'Nouveau palier de stack'}
      </p>
      <div className="flex items-center gap-2 flex-wrap">
        <input value={label} onChange={e => setLabel(e.target.value)}
          placeholder={isEn ? 'Label (e.g. < 20bb)' : 'Libellé (ex. < 20bb)'}
          className="flex-1 min-w-[120px] bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-felt-500" />
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <span>Min</span>
          <input type="number" value={minVal} onChange={e => setMinVal(e.target.value)} min={0}
            className="w-14 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-felt-500" />
          <span>bb</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <span>Max</span>
          <input type="number" value={maxVal} onChange={e => setMaxVal(e.target.value)} min={0} placeholder="∞"
            className="w-14 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-felt-500" />
          <span>bb</span>
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={submit}
          className="flex-1 py-1.5 bg-felt-700 hover:bg-felt-600 text-white rounded-lg text-xs font-semibold transition-colors">
          {isEn ? 'Add' : 'Ajouter'}
        </button>
        <button onClick={onCancel}
          className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-xs transition-colors">
          {isEn ? 'Cancel' : 'Annuler'}
        </button>
      </div>
    </div>
  );
}

// ─── Unified MyRangesPanel ────────────────────────────────────────────────────

export function MyRangesPanel({ onClose, defaultFormat = '6max', defaultGameType = 'cashgame', defaultPosition, locked }: {
  onClose: () => void;
  defaultFormat?: TableFormat;
  defaultGameType?: GameType;
  defaultPosition?: string;
  locked?: boolean;
}) {
  const isEn = useLangStore(s => s.lang) === 'en';
  const t = useT();
  const authUser = useAuthStore(s => s.user);
  const isExpert = !!authUser?.isPremiumExpert;
  const isLoggedIn = authUser !== null;
  // Complex ranges (profiles) are an Expert-mode-only feature.
  const isExpertMode = useModeStore(s => s.mode) === 'expert';
  const { preflopEnabled, togglePreflopEnabled } = useCustomRangeStore(
    useShallow(s => ({ preflopEnabled: s.preflopEnabled, togglePreflopEnabled: s.togglePreflopEnabled }))
  );
  const [format, setFormat]     = useState<TableFormat>(defaultFormat);
  const [gameType, setGameType] = useState<GameType>(defaultGameType);
  const positions = getPositions(format, gameType);
  const [tab, setTab] = useState<'profiles' | 'simple'>('simple');
  // BB-defense legend + tooltip, stabilized (t is a stable per-language object)
  // so the memoized RangeMatrix isn't re-rendered on every parent update.
  const bbGtoLegend = useMemo(() => [
    { color: 'rgba(202,138,4,0.82)', label: t.training.bb_leg_bluff, tip: { title: t.training.bb_leg_bluff, text: t.training.bb_tip_bluff } },
    { color: 'rgba(22,130,60,0.85)', label: t.training.bb_leg_value, tip: { title: t.training.bb_leg_value, text: t.training.bb_tip_value } },
    { color: 'rgba(37,99,235,0.70)', label: t.training.bb_leg_call,  tip: { title: t.training.bb_leg_call,  text: t.training.bb_tip_call  } },
    { color: '#1a202c',              label: t.training.bb_leg_fold,  tip: { title: t.training.bb_leg_fold,  text: t.training.bb_tip_fold  } },
  ], [t]);
  const bbGtoTooltipValue = useCallback((code: number) => ({
    0: t.training.bb_leg_fold, 1: t.training.bb_leg_call,
    2: t.training.bb_leg_call, 3: t.training.bb_leg_value, 4: t.training.bb_leg_bluff,
  } as Record<number, string>)[code] ?? '', [t]);
  // Read-only GTO reference matrix (BB = 5-category defense grid, others = open-raise).
  const renderGtoRef = (matrix: number[][] | null | undefined, position: string) => {
    if (!matrix) return null;
    if (realPos(position) === 'BB') {
      return (
        <RangeMatrix
          matrix={matrix}
          size="sm"
          crisp
          cellColor={bbCellColor}
          legend={bbGtoLegend}
          tooltipValue={bbGtoTooltipValue}
        />
      );
    }
    return <RangeMatrix matrix={matrix} size="sm" crisp cellColor={frequencyBg} />;
  };

  // ══ PROFILES TAB STATE ══════════════════════════════════════════════════════
  const [profiles,   setProfiles]   = useState<RangeProfile[]>([]);
  const [loadingP,   setLoadingP]   = useState(true);
  const [activating, setActivating] = useState(false);

  const [selProfileId, setSelProfileId] = useState<string | null>(null);
  const [selRangeId,   setSelRangeId]   = useState<string | null>(null);
  const initPositions = getPositions(defaultFormat, defaultGameType);
  const [profilePos,   setProfilePos]   = useState<string>(
    defaultPosition && initPositions.includes(defaultPosition) ? defaultPosition : initPositions[0]
  );
  const [profileMatrix, setProfileMatrix] = useState<number[][] | null>(null);
  const [profileExpertMix, setProfileExpertMix] = useState<number[] | null>(null); // flat 169×4 for expert profiles
  const [profileGto,    setProfileGto]    = useState<number[][] | null>(null);
  const [savingP,  setSavingP]  = useState(false);
  const [savedP,   setSavedP]   = useState(false);

  const [showAddProf,  setShowAddProf]  = useState(false);
  const [showAddRange, setShowAddRange] = useState(false);
  const [renamingId,   setRenamingId]   = useState<string | null>(null);
  const [renameVal,    setRenameVal]    = useState('');

  // ══ IMPORT / EXPORT ══════════════════════════════════════════════════════════
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const importProfileRef  = useRef<HTMLInputElement>(null);
  const importSimpleRef   = useRef<HTMLInputElement>(null);

  const showImportMsg = (ok: boolean, text: string) => {
    setImportMsg({ ok, text });
    setTimeout(() => setImportMsg(null), 3500);
  };

  // Download helper
  const downloadJson = (obj: unknown, filename: string) => {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  // ── Profile export ────────────────────────────────────────────────────────
  const exportProfile = () => {
    if (!selProfile) return;
    downloadJson({
      type: 'pokertrainer-profile',
      version: 1,
      name: selProfile.name,
      mode: selProfile.mode ?? 'standard',
      stackRanges: selProfile.stackRanges.map(sr => ({
        label: sr.label,
        stackMin: sr.stackMin,
        stackMax: sr.stackMax,
        data: sr.data,
      })),
    }, `${selProfile.name.replace(/\s+/g, '_')}_profile.json`);
  };

  // ── Profile import ────────────────────────────────────────────────────────
  const importProfile = async (file: File) => {
    setImporting(true);
    try {
      // Layer 1 — file meta (size + extension)
      validateFileMeta(file);

      // Layer 2 — safe JSON parse (prototype-pollution scan + JSON validity)
      const raw = safeJsonParse(await file.text());

      // Layer 3 — accepts a profile export, or a simple-range export converted
      // to a standard profile (simple → complex is allowed; the reverse is not).
      const validated = validateComplexImport(raw);

      const suffix  = isEn ? ' (imported)' : ' (importé)';
      const created = await profilesApi.create(validated.name + suffix, validated.mode);

      for (const sr of validated.stackRanges) {
        const createdSr = await profilesApi.createStackRange(
          created.id, sr.label, sr.stackMin, sr.stackMax,
        );
        // Only validated positions with exactly 169 clean cells reach here
        for (const [pos, cells] of Object.entries(sr.data)) {
          await profilesApi.updateStackRange(created.id, createdSr.id, { position: pos, cells });
        }
      }

      const refreshed = await profilesApi.list();
      setProfiles(refreshed);
      setSelProfileId(created.id);
      setSelRangeId(refreshed.find(p => p.id === created.id)?.stackRanges[0]?.id ?? null);
      showImportMsg(true, isEn
        ? `Profile "${validated.name}" imported successfully!`
        : `Profil "${validated.name}" importé avec succès !`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      showImportMsg(false, (isEn ? 'Import failed: ' : 'Échec de l\'import : ') + msg);
    } finally {
      setImporting(false);
      if (importProfileRef.current) importProfileRef.current.value = '';
    }
  };

  // ── Simple range export ───────────────────────────────────────────────────
  const exportSimpleRanges = () => {
    const flat: Record<string, number[]> = {};
    for (const [pos, matrix] of Object.entries(customCache)) {
      if (matrix) flat[pos] = matrix.flat();
    }
    downloadJson({ type: 'pokertrainer-simple-range', version: 1, data: flat }, 'my_simple_ranges.json');
  };

  // ── Simple range import ───────────────────────────────────────────────────
  const importSimpleRanges = async (file: File) => {
    setImporting(true);
    try {
      // Layer 1 — file meta
      validateFileMeta(file);

      // Layer 2 — safe JSON parse
      const raw = safeJsonParse(await file.text());

      // Layer 3 — strict structural + value validation
      const validated = validateSimpleRangeImport(raw);

      // Only sanitized positions with exactly 169 clean cells reach here
      for (const [pos, cells] of Object.entries(validated.data)) {
        await rangesApi.save(pos, cells);
        const matrix: number[][] = [];
        for (let r = 0; r < 13; r++) matrix.push(cells.slice(r * 13, r * 13 + 13));
        setCustomCache(prev => ({ ...prev, [pos]: matrix }));
      }

      const count = Object.keys(validated.data).length;
      showImportMsg(true, isEn
        ? `${count} position(s) imported successfully!`
        : `${count} position(s) importée(s) avec succès !`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      showImportMsg(false, (isEn ? 'Import failed: ' : 'Échec de l\'import : ') + msg);
    } finally {
      setImporting(false);
      if (importSimpleRef.current) importSimpleRef.current.value = '';
    }
  };

  const selProfile = profiles.find(p => p.id === selProfileId) ?? null;
  const selRange   = selProfile?.stackRanges.find(r => r.id === selRangeId) ?? null;

  // Load profiles — skip entirely when locked (no token, API would 401)
  useEffect(() => {
    if (locked) { setLoadingP(false); return; }
    (async () => {
      setLoadingP(true);
      try {
        let data = await profilesApi.list();
        // Outside Expert mode, complex profiles can't be used → show none as active.
        if (!isExpertMode) data = data.map(p => ({ ...p, isActive: false }));
        setProfiles(data);
        const activeProfile = data.find(p => p.isActive) ?? null;
        const sel = activeProfile ?? data[0] ?? null;
        if (sel) {
          setSelProfileId(sel.id);
          setSelRangeId(sel.stackRanges[0]?.id ?? null);
        }
        // If a complex range (profile) is active, open straight onto its tab + profile —
        // but only in Expert mode, where complex ranges are usable.
        if (activeProfile && isExpertMode) setTab('profiles');
      } catch {}
      setLoadingP(false);
    })();
  }, []);

  // Leaving Expert mode while the panel is open: a complex profile can no longer
  // be used → drop its active state locally and fall back to GTO.
  useEffect(() => {
    if (!isExpertMode && profiles.some(p => p.isActive)) {
      setProfiles(prev => prev.map(p => ({ ...p, isActive: false })));
      if (preflopEnabled) togglePreflopEnabled();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExpertMode]);

  // GTO reference for current profile position.
  // BB is a defense spot → its reference is the 5-category defense grid, not an
  // open-raise frequency matrix (keeps profiles consistent with the rest of the app).
  useEffect(() => {
    if (realPos(profilePos) === 'BB' && gameTypeOf(profilePos) === 'cashgame') {
      trainingApi.getBBDefenseRange()
        .then(d => { const g = (d as any)?.grid; setProfileGto(Array.isArray(g) ? g : null); })
        .catch(() => setProfileGto(null));
    } else {
      trainingApi.getRangeMatrix(realPos(profilePos), fmtOf(profilePos), gameTypeOf(profilePos))
        .then(d => { const m = (d as any)?.matrix ?? d; setProfileGto(Array.isArray(m) ? m : null); })
        .catch(() => setProfileGto(null));
    }
  }, [profilePos]);

  // Sync editor data when range / position / profile changes (standard 13×13 vs expert 169×4 mix)
  useEffect(() => {
    const isExp = selProfile?.mode === 'expert';
    if (!selRange) { setProfileMatrix(isExp ? null : profileGto); setProfileExpertMix(null); return; }
    const flat = selRange.data[profilePos];
    if (isExp) {
      setProfileExpertMix(flat && flat.length === 676 ? flat : gtoToExpertMix(profileGto, realPos(profilePos) === 'BB'));
      setProfileMatrix(null);
    } else {
      setProfileMatrix(flat && flat.length === 169 ? flatToMatrix(flat) : (profileGto ?? null));
      setProfileExpertMix(null);
    }
  }, [selRange, profilePos, profileGto, selProfile]);

  // A custom range is "active" either via a profile or the simple ranges.
  const simpleActive = preflopEnabled && !profiles.some(p => p.isActive);

  // Profile handlers — activating a profile also turns custom ranges ON.
  const handleActivate = async () => {
    if (!selProfile) return;
    setActivating(true);
    try {
      if (selProfile.isActive) {
        await profilesApi.deactivate();
        setProfiles(prev => prev.map(p => ({ ...p, isActive: false })));
        if (preflopEnabled) togglePreflopEnabled();          // back to GTO
      } else {
        await profilesApi.activate(selProfile.id);
        setProfiles(prev => prev.map(p => ({ ...p, isActive: p.id === selProfile.id })));
        if (!preflopEnabled) togglePreflopEnabled();         // use my ranges
      }
    } catch {}
    setActivating(false);
  };

  // Toggle whether 100%-fold hands are quizzed in expert training for this profile.
  const handleToggleFolds = async () => {
    if (!selProfile) return;
    const next = !(selProfile.includeFolds ?? true);
    setProfiles(prev => prev.map(p => (p.id === selProfile.id ? { ...p, includeFolds: next } : p)));
    try { await profilesApi.setIncludeFolds(selProfile.id, next); }
    catch { setProfiles(prev => prev.map(p => (p.id === selProfile.id ? { ...p, includeFolds: !next } : p))); }
  };

  // Simple ranges activation — mirrors profile activation (mutually exclusive).
  const handleActivateSimple = async () => {
    if (simpleActive) {
      if (preflopEnabled) togglePreflopEnabled();            // deactivate → GTO
      return;
    }
    if (profiles.some(p => p.isActive)) {
      try { await profilesApi.deactivate(); } catch {}
      setProfiles(prev => prev.map(p => ({ ...p, isActive: false })));
    }
    if (!preflopEnabled) togglePreflopEnabled();
  };

  const handleCreateProfile = async (name: string, mode: 'standard' | 'expert' = 'standard') => {
    try {
      const created = await profilesApi.create(name, mode);
      setProfiles(prev => [...prev, created]);
      setSelProfileId(created.id);
      setSelRangeId(null);
    } catch {}
    setShowAddProf(false);
  };

  const handleDeleteProfile = async (id: string) => {
    if (!confirm(isEn ? 'Delete this profile?' : 'Supprimer ce profil ?')) return;
    try {
      await profilesApi.delete(id);
      const next = profiles.filter(p => p.id !== id);
      setProfiles(next);
      if (selProfileId === id) {
        setSelProfileId(next[0]?.id ?? null);
        setSelRangeId(next[0]?.stackRanges[0]?.id ?? null);
      }
    } catch {}
  };

  const handleRename = async (id: string) => {
    if (!renameVal.trim()) { setRenamingId(null); return; }
    try {
      const updated = await profilesApi.update(id, renameVal.trim());
      setProfiles(prev => prev.map(p => p.id === id ? { ...p, name: updated.name } : p));
    } catch {}
    setRenamingId(null);
  };

  const handleCreateRange = async (label: string, stackMin: number, stackMax: number | null) => {
    if (!selProfile) return;
    try {
      const sr = await profilesApi.createStackRange(selProfile.id, label, stackMin, stackMax);
      setProfiles(prev => prev.map(p =>
        p.id === selProfile.id ? { ...p, stackRanges: [...p.stackRanges, sr] } : p
      ));
      setSelRangeId(sr.id);
    } catch {}
    setShowAddRange(false);
  };

  const handleDeleteRange = async (rangeId: string) => {
    if (!selProfile) return;
    if (!confirm(isEn ? 'Delete this stack range?' : 'Supprimer ce palier ?')) return;
    try {
      await profilesApi.deleteStackRange(selProfile.id, rangeId);
      setProfiles(prev => prev.map(p =>
        p.id === selProfile.id
          ? { ...p, stackRanges: p.stackRanges.filter(r => r.id !== rangeId) }
          : p
      ));
      if (selRangeId === rangeId) {
        const rem = selProfile.stackRanges.filter(r => r.id !== rangeId);
        setSelRangeId(rem[0]?.id ?? null);
      }
    } catch {}
  };

  const handleSaveProfile = async () => {
    if (!selProfile || !selRange) return;
    const isExp = selProfile.mode === 'expert';
    const cells = isExp ? profileExpertMix : profileMatrix?.flat();
    if (!cells) return;
    setSavingP(true);
    try {
      await profilesApi.updateStackRange(selProfile.id, selRange.id, {
        position: profilePos, cells,
      });
      setProfiles(prev => prev.map(p =>
        p.id === selProfile.id ? {
          ...p,
          stackRanges: p.stackRanges.map(sr => sr.id === selRange.id
            ? { ...sr, data: { ...sr.data, [profilePos]: cells } }
            : sr),
        } : p
      ));
      setSavedP(true);
      setTimeout(() => setSavedP(false), 2000);
    } catch {}
    setSavingP(false);
  };

  // ══ SIMPLE RANGE TAB STATE ═══════════════════════════════════════════════════
  const [simplePos,    setSimplePos]    = useState<string>(
    defaultPosition && initPositions.includes(defaultPosition) ? defaultPosition : initPositions[0]
  );
  const [gtoCache,    setGtoCache]    = useState<Record<string, number[][]>>({});
  const [customCache, setCustomCache] = useState<Record<string, number[][] | null>>({});
  const [loadingS,    setLoadingS]    = useState(true);
  const [savingS,     setSavingS]     = useState(false);
  const [savedS,      setSavedS]      = useState(false);
  const [lockedStackTier, setLockedStackTier] = useState(0);

  // Reset selected positions and caches when format or game type changes.
  useEffect(() => {
    const pos = getPositions(format, gameType);
    setSimplePos(pos[0]);
    setProfilePos(pos[0]);
    setGtoCache({});
    setCustomCache({});
  }, [format, gameType]);

  useEffect(() => {
    let cancelled = false;
    const pos = getPositions(format, gameType);
    (async () => {
      setLoadingS(true);
      const gtoResults = await Promise.all(pos.map(async p => {
        try {
          if (realPos(p) === 'BB' && gameTypeOf(p) === 'cashgame') {
            const data = await trainingApi.getBBDefenseRange();
            const g = (data as any)?.grid;
            return Array.isArray(g) ? (g as number[][]) : null;
          }
          const data = await trainingApi.getRangeMatrix(realPos(p), fmtOf(p), gameTypeOf(p));
          const m = (data as any)?.matrix ?? data;
          return Array.isArray(m) ? (m as number[][]) : null;
        } catch { return null; }
      }));
      if (cancelled) return;
      const newGto: Record<string, number[][]> = {};
      pos.forEach((p, i) => { if (gtoResults[i]) newGto[p] = gtoResults[i]!; });
      setGtoCache(newGto);

      if (!locked) {
        const customResults = await Promise.all(pos.map(async (p, i) => {
          try {
            const data = await rangesApi.get(p);
            if (data && Array.isArray(data)) {
              const m: number[][] = [];
              for (let r = 0; r < 13; r++) m.push((data as number[]).slice(r * 13, r * 13 + 13));
              return m;
            }
            return gtoResults[i] ? gtoResults[i]!.map(r => [...r]) : null;
          } catch {
            return gtoResults[i] ? gtoResults[i]!.map(r => [...r]) : null;
          }
        }));
        if (cancelled) return;
        const newCustom: Record<string, number[][] | null> = {};
        pos.forEach((p, i) => { newCustom[p] = customResults[i]; });
        setCustomCache(newCustom);
      }
      setLoadingS(false);
    })();
    return () => { cancelled = true; };
  }, [format, gameType, locked]);

  const simpleMatrix = customCache[simplePos] ?? null;
  const simpleGto    = gtoCache[simplePos]    ?? null;
  const updateSimple = (m: number[][]) => setCustomCache(prev => ({ ...prev, [simplePos]: m }));

  const handleSaveSimple = async () => {
    if (!simpleMatrix) return;
    setSavingS(true);
    try {
      await rangesApi.save(simplePos, simpleMatrix.flat());
      setSavedS(true);
      setTimeout(() => setSavedS(false), 2000);
    } catch {}
    setSavingS(false);
  };

  // ══ RENDER ═══════════════════════════════════════════════════════════════════
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-gray-900 border border-gray-700 rounded-2xl p-5 w-full"
    >
      {/* Header — always interactive even in locked mode */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-white font-bold text-lg">
            {isEn ? 'My Custom Ranges' : 'Mes Ranges Personnalisées'}
          </h3>
          {locked && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-yellow-900/30 border border-yellow-800/50 rounded-full text-[10px] font-bold text-yellow-400">
              <Lock size={9} /> Premium
            </span>
          )}
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
          <X size={20} />
        </button>
      </div>

      {/* Format + game type toggles — une seule ligne */}
      <div className="flex items-center gap-1.5 mb-4 flex-wrap">
        <button
          onClick={() => setGameType('cashgame')}
          className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${
            gameType === 'cashgame'
              ? 'bg-green-900/40 text-green-300 border-green-700'
              : 'text-gray-400 border-gray-700 hover:text-white hover:bg-gray-800'
          }`}
        >
          Cash Game
        </button>
        <button
          onClick={() => setGameType('mtt')}
          className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${
            gameType === 'mtt'
              ? 'bg-amber-900/40 text-amber-300 border-amber-700'
              : 'text-gray-400 border-gray-700 hover:text-white hover:bg-gray-800'
          }`}
        >
          MTT
        </button>
        <div className="w-px h-4 bg-gray-700 mx-1 shrink-0" />
        {([
          { f: '6max' as TableFormat, label: '6-max', title: isEn ? '6-player table' : 'Table 6 joueurs' },
          { f: '8max' as TableFormat, label: '8-max', title: isEn ? '8-player table' : 'Table 8 joueurs' },
          { f: '3max' as TableFormat, label: '3-max', title: isEn ? '3-player table' : 'Table 3 joueurs' },
          { f: 'hu'   as TableFormat, label: 'HU',    title: isEn ? 'Heads-up' : 'Têtes-à-tête' },
        ] as const).map(({ f, label, title }) => (
          <button
            key={f}
            onClick={() => setFormat(f)}
            title={title}
            className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${
              format === f
                ? 'bg-felt-700/60 text-felt-300 border-felt-600'
                : 'text-gray-400 border-gray-700 hover:text-white hover:bg-gray-800'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Locked notice */}
      {locked && (
        <div className="mb-4 flex items-center justify-between gap-3 bg-yellow-950/30 border border-yellow-800/40 rounded-xl px-3 py-2.5">
          <p className="text-xs text-gray-400">
            {isEn
              ? 'Upgrade to Premium to edit your custom ranges and activate profiles.'
              : 'Passez Premium pour modifier vos ranges personnalisées et activer des profils.'}
          </p>
        </div>
      )}

      {/* Hidden file inputs for import */}
      <input ref={importProfileRef} type="file" accept=".json" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) importProfile(f); }} />
      <input ref={importSimpleRef} type="file" accept=".json" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) importSimpleRanges(f); }} />

      {/* Import status message */}
      <AnimatePresence>
        {importMsg && (
          <motion.div
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            className={`mb-3 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border ${
              importMsg.ok
                ? 'bg-green-900/20 border-green-800/50 text-green-300'
                : 'bg-red-900/20 border-red-800/50 text-red-300'
            }`}
          >
            {importMsg.ok ? <Check size={12} /> : <X size={12} />}
            {importMsg.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tab switcher — order: Simple, Complex (profiles), Expert, GTO */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setTab('simple')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-bold border transition-all ${
            tab === 'simple'
              ? 'bg-yellow-900/30 text-yellow-300 border-yellow-700'
              : 'text-gray-400 border-gray-700 hover:text-white hover:bg-gray-800'
          }`}
        >
          <Sliders size={13} />
          {isEn ? 'Simple ranges' : 'Ranges simples'}
        </button>
        <button
          onClick={() => setTab('profiles')}
          title={isExpertMode ? undefined : (isEn ? 'View only — usable in Expert mode' : 'Lecture seule — utilisable en mode Expert')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-bold border transition-all ${
            tab === 'profiles'
              ? 'bg-orange-900/30 text-orange-300 border-orange-700'
              : 'text-gray-400 border-gray-700 hover:text-white hover:bg-gray-800'
          }`}
        >
          {isExpertMode ? <Layers size={13} /> : <Lock size={12} />}
          {isEn ? 'Complex ranges' : 'Ranges complexes'}
        </button>
      </div>

      {/* ══ PROFILES TAB ══ */}
      {tab === 'profiles' && (
        <div className="flex flex-col gap-3">
          {locked ? (
            <>
              {/* View-only banner */}
              <div className="flex items-center gap-2 text-[11px] text-orange-300/90 bg-orange-900/20 border border-orange-800/50 rounded-lg px-3 py-2">
                <Lock size={12} className="shrink-0" />
                {isEn
                  ? 'View only — switch to Expert mode to activate or edit complex ranges.'
                  : 'Visualisation seule — passe en mode Expert pour activer ou éditer les ranges complexes.'}
              </div>

              {/* Profile list header */}
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">
                  {isEn ? 'Profiles' : 'Profils'}
                  <span className="ml-2 text-gray-600 font-normal normal-case">
                    {isEn
                      ? '— one active at a time, takes priority over simple range'
                      : '— un seul actif à la fois, prioritaire sur la range simple'}
                  </span>
                </p>
              </div>

              {/* Static "Profil type" example tab */}
              <div className="flex flex-wrap gap-2">
                <div className="px-3 py-1.5 rounded-lg text-sm font-bold border flex items-center gap-1.5 bg-felt-700 text-white border-felt-500">
                  <span className="text-green-400 text-xs">●</span>
                  <Flame size={11} className="text-purple-400 shrink-0" />
                  {isEn ? 'Type profile' : 'Profil type'}
                </div>
              </div>

              {/* Profile detail */}
              <div className="flex flex-col gap-3 border-t border-gray-800 pt-3">
                <p className="text-white font-semibold text-sm">{isEn ? 'Type profile' : 'Profil type'}</p>

                {/* Stack range tabs */}
                <div className="flex flex-col gap-1">
                  <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wide">
                    {isEn ? 'Stack tiers' : 'Paliers de stack'}
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { label: '<20', sublabel: '(0–20bb)' },
                      { label: '<50', sublabel: '(20–50bb)' },
                      { label: '<100', sublabel: '(50–100bb)' },
                    ].map(({ label, sublabel }, i) => (
                      <button key={label} onClick={() => setLockedStackTier(i)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-bold border transition-all flex items-center gap-1 ${
                          lockedStackTier === i
                            ? 'bg-purple-800/60 text-purple-200 border-purple-600'
                            : 'text-gray-500 border-gray-700 hover:text-gray-300 hover:bg-gray-800'
                        }`}>
                        {label} <span className="font-normal text-[10px] opacity-60">{sublabel}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Position tabs */}
                <div className="flex gap-2 flex-wrap">
                  {positions.map(pos => (
                    <button key={pos} onClick={() => setSimplePos(pos)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-bold border transition-all ${
                        simplePos === pos
                          ? 'bg-felt-700 text-white border-felt-500'
                          : 'text-gray-400 border-gray-700 hover:text-white hover:bg-gray-800'
                      }`}>{realPos(pos)}</button>
                  ))}
                </div>

                {loadingS ? (
                  <div className="h-32 flex items-center justify-center">
                    <div className="animate-spin h-8 w-8 border-2 border-felt-500 border-t-transparent rounded-full" />
                  </div>
                ) : (
                  <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-8 xl:gap-12">
                    {/* Left: expert GTO grid (view-only) */}
                    <div className="flex flex-col gap-2 flex-1 items-start">
                      <p className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                        <Flame size={13} className="shrink-0" />
                        {isEn ? `Your range — ${realPos(simplePos)}` : `Ta range — ${realPos(simplePos)}`}
                      </p>
                      <div className="flex flex-col gap-1">
                      {simpleGto
                        ? <ExpertGtoMatrix mix={gtoToExpertMix(simpleGto, realPos(simplePos) === 'BB')} />
                        : <div className="h-48 bg-gray-800/50 rounded-xl" />}
                      <div className="flex gap-3 text-[11px] text-gray-500 flex-wrap justify-center">
                        {EXPERT_DISPLAY.map(a => (
                          <div key={a.key} className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded border border-black/30 shrink-0" style={{ backgroundColor: a.color }} />
                            <span>{isEn ? a.labelEn : a.labelFr}</span>
                          </div>
                        ))}
                      </div>
                      </div>
                    </div>

                    {/* Right: simple GTO reference */}
                    <div className="flex flex-col items-start gap-2 xl:shrink-0">
                      <p className="text-xs font-semibold text-felt-300 flex items-center gap-1.5">
                        <Target size={13} className="shrink-0" />
                        {isEn ? 'GTO reference' : 'Range GTO (référence)'}
                        <span className="text-gray-600">— {realPos(simplePos)}</span>
                      </p>
                      {simpleGto
                        ? renderGtoRef(simpleGto, simplePos)
                        : <p className="text-[11px] text-gray-600 py-8">{isEn ? 'Loading…' : 'Chargement…'}</p>}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : loadingP ? (
            <div className="h-32 flex items-center justify-center">
              <div className="animate-spin h-8 w-8 border-2 border-felt-500 border-t-transparent rounded-full" />
            </div>
          ) : (
            <>
              {/* View-only notice outside Expert mode */}
              {!isExpertMode && (
                <div className="flex items-center gap-2 text-[11px] text-orange-300/90 bg-orange-900/20 border border-orange-800/50 rounded-lg px-3 py-2">
                  <Lock size={12} className="shrink-0" />
                  {isEn
                    ? 'View only — switch to Expert mode to activate or edit complex ranges.'
                    : 'Visualisation seule — passe en mode Expert pour activer ou éditer les ranges complexes.'}
                </div>
              )}

              {/* Profile list + add */}
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">
                  {isEn ? 'Profiles' : 'Profils'}
                  <span className="ml-2 text-gray-600 font-normal normal-case">
                    {isEn
                      ? '— one active at a time, takes priority over simple range'
                      : '— un seul actif à la fois, prioritaire sur la range simple'}
                  </span>
                </p>
                {/* Import is available in any mode (bring a range in to view).
                    Creating/deleting/renaming/editing stay Expert-only. */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => importProfileRef.current?.click()}
                    disabled={importing}
                    className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 transition-colors disabled:opacity-40"
                    title={isEn ? 'Import a profile (.json)' : 'Importer un profil (.json)'}
                  >
                    <Upload size={12} /> {isEn ? 'Import' : 'Importer'}
                  </button>
                  {isExpertMode && (
                    <button onClick={() => setShowAddProf(v => !v)}
                      className="flex items-center gap-1 text-xs text-felt-400 hover:text-felt-300 transition-colors">
                      <Plus size={13} /> {isEn ? 'New' : 'Nouveau'}
                    </button>
                  )}
                </div>
              </div>

              <AnimatePresence initial={false}>
                {showAddProf && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <AddProfileForm isEn={isEn} isExpert={isExpert} onAdd={handleCreateProfile} onCancel={() => setShowAddProf(false)} />
                  </motion.div>
                )}
              </AnimatePresence>

              {profiles.length === 0 ? (
                <p className="text-xs text-gray-500 italic text-center py-4">
                  {isEn ? 'No profiles yet. Create one to get started.' : 'Aucun profil. Créez-en un pour commencer.'}
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {profiles.map(p => (
                    <div key={p.id} className="relative group">
                      {renamingId === p.id ? (
                        <input autoFocus value={renameVal} onChange={e => setRenameVal(e.target.value)}
                          onBlur={() => handleRename(p.id)}
                          onKeyDown={e => { if (e.key === 'Enter') handleRename(p.id); if (e.key === 'Escape') setRenamingId(null); }}
                          className="px-3 py-1.5 rounded-lg text-sm border border-felt-500 bg-gray-800 text-white focus:outline-none" />
                      ) : (
                        <button
                          onClick={() => {
                            setSelProfileId(p.id);
                            setSelRangeId(p.stackRanges[0]?.id ?? null);
                          }}
                          onDoubleClick={() => { if (isExpertMode) { setRenamingId(p.id); setRenameVal(p.name); } }}
                          className={`px-3 py-1.5 rounded-lg text-sm font-bold border transition-all flex items-center gap-1.5 ${
                            selProfileId === p.id
                              ? 'bg-felt-700 text-white border-felt-500'
                              : 'text-gray-400 border-gray-700 hover:text-white hover:bg-gray-800'
                          }`}
                        >
                          {p.isActive && <span className="text-green-400 text-xs">●</span>}
                          {p.mode === 'expert' && <Flame size={11} className="text-purple-400 shrink-0" />}
                          {p.name}
                        </button>
                      )}
                      {renamingId !== p.id && isExpertMode && (
                        <button onClick={() => handleDeleteProfile(p.id)}
                          className="absolute -top-1.5 -right-1.5 hidden group-hover:flex h-4 w-4 items-center justify-center bg-red-900/80 rounded-full text-red-300 hover:bg-red-700">
                          <X size={9} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Selected profile detail */}
              {selProfile && (
                <div className="flex flex-col gap-3 border-t border-gray-800 pt-3">

                  {/* Activate / deactivate button + Export */}
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <p className="text-white font-semibold text-sm">{selProfile.name}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Export this profile */}
                      <button
                        onClick={exportProfile}
                        className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 transition-colors"
                        title={isEn ? 'Export profile as JSON' : 'Exporter le profil en JSON'}
                      >
                        <Download size={12} /> {isEn ? 'Export' : 'Exporter'}
                      </button>
                      <button onClick={handleActivate} disabled={activating || !isExpertMode}
                        title={isExpertMode ? undefined : (isEn ? 'Expert mode required' : 'Mode Expert requis')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                          selProfile.isActive
                            ? 'bg-green-900/30 text-green-300 border-green-700 hover:bg-red-900/30 hover:text-red-300 hover:border-red-700'
                            : 'bg-gray-800 text-gray-300 border-gray-600 hover:bg-felt-900/30 hover:text-felt-300 hover:border-felt-700'
                        }`}
                      >
                        {selProfile.isActive
                          ? <><Check size={12} /> {isEn ? 'Active — click to deactivate' : 'Actif — cliquer pour désactiver'}</>
                          : <><Zap size={12} /> {isEn ? 'Activate this profile' : 'Activer ce profil'}</>
                        }
                      </button>
                    </div>
                  </div>

                  {/* Expert training option: quiz 100%-fold hands or skip them */}
                  {isExpertMode && selProfile.mode === 'expert' && (
                    <button
                      onClick={handleToggleFolds}
                      className="flex items-center gap-2.5 text-left rounded-lg border border-gray-700 bg-gray-800/40 px-3 py-2 hover:bg-gray-800 transition-colors"
                    >
                      <span className={`flex h-4 w-4 items-center justify-center rounded border shrink-0 ${
                        (selProfile.includeFolds ?? true)
                          ? 'bg-felt-700 border-felt-500'
                          : 'bg-gray-900 border-gray-600'
                      }`}>
                        {(selProfile.includeFolds ?? true) && <Check size={11} className="text-white" />}
                      </span>
                      <span className="flex flex-col">
                        <span className="text-xs font-semibold text-gray-200">
                          {isEn ? 'Quiz 100%-fold hands' : 'Inclure les mains fold 100%'}
                        </span>
                        <span className="text-[11px] text-gray-500 leading-snug">
                          {(selProfile.includeFolds ?? true)
                            ? (isEn ? 'Exercises can ask about pure-fold hands.' : 'Les exercices peuvent porter sur des mains 100% fold.')
                            : (isEn ? 'Only hands with a Call/Raise/All-in decision are quizzed.' : 'Seules les mains avec décision Call/Raise/All-in sont posées.')}
                        </span>
                      </span>
                    </button>
                  )}

                  {/* Stack ranges */}
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">
                      {isEn ? 'Stack ranges' : 'Paliers de stack'}
                    </p>
                    {isExpertMode && (
                      <button onClick={() => setShowAddRange(v => !v)}
                        className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors">
                        <Plus size={13} /> {isEn ? 'Add range' : 'Ajouter'}
                      </button>
                    )}
                  </div>

                  <AnimatePresence initial={false}>
                    {showAddRange && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <AddRangeForm isEn={isEn} onAdd={handleCreateRange} onCancel={() => setShowAddRange(false)} />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {selProfile.stackRanges.length === 0 ? (
                    <p className="text-xs text-gray-500 italic">
                      {isEn ? 'No stack ranges. Add one above.' : 'Aucun palier. Ajoutez-en un.'}
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {selProfile.stackRanges.map(sr => (
                        <div key={sr.id} className="relative group">
                          <button onClick={() => setSelRangeId(sr.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                              selRangeId === sr.id
                                ? 'bg-purple-700 text-white border-purple-500'
                                : 'text-gray-400 border-gray-700 hover:text-white hover:bg-gray-800'
                            }`}
                          >
                            {sr.label}
                            <span className="ml-1 text-gray-500 font-normal">
                              ({sr.stackMin}–{sr.stackMax ?? '∞'}bb)
                            </span>
                          </button>
                          {isExpertMode && (
                          <button onClick={() => handleDeleteRange(sr.id)}
                            className="absolute -top-1.5 -right-1.5 hidden group-hover:flex h-4 w-4 items-center justify-center bg-red-900/80 rounded-full text-red-300 hover:bg-red-700">
                            <X size={9} />
                          </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Position selector + range editor */}
                  {selRange && (
                    <div className="flex flex-col gap-3 border-t border-gray-800 pt-3">
                      <div className="flex gap-2 flex-wrap">
                        {positions.map(pos => (
                          <button key={pos} onClick={() => setProfilePos(pos)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-bold border transition-all ${
                              profilePos === pos
                                ? 'bg-felt-700 text-white border-felt-500'
                                : 'text-gray-400 border-gray-700 hover:text-white hover:bg-gray-800'
                            }`}>{realPos(pos)}</button>
                        ))}
                      </div>

                      {selProfile.mode === 'expert' ? (
                        profileExpertMix ? (
                          <ExpertRangeEditor
                            mix={profileExpertMix}
                            onChange={isExpertMode ? setProfileExpertMix : () => {}}
                            onSave={isExpertMode ? handleSaveProfile : undefined}
                            onReset={isExpertMode ? () => setProfileExpertMix(gtoToExpertMix(profileGto, realPos(profilePos) === 'BB')) : undefined}
                            resetLabel="Reset GTO"
                            isSaving={savingP}
                            title={`${isEn ? 'Your range' : 'Ta range'} — ${realPos(profilePos)}`}
                            gtoSlot={
                              <div className="flex flex-col items-start gap-2">
                                <p className="text-xs font-semibold text-felt-300 flex items-center gap-1.5">
                                  <Target size={13} className="shrink-0" />
                                  {isEn ? 'GTO reference' : 'Range GTO (référence)'}
                                  <span className="text-gray-600">— {realPos(profilePos)}</span>
                                </p>
                                {profileGto ? (
                                  realPos(profilePos) === 'BB'
                                    // BB is a defense spot → use the 5-category defense rendering.
                                    ? renderGtoRef(profileGto, 'BB')
                                    : (
                                      <div className="flex flex-col gap-2">
                                        <ExpertGtoMatrix mix={gtoToExpertMix(profileGto, false)} />
                                        <div className="flex gap-3 text-[11px] text-gray-400 justify-center flex-wrap">
                                          {EXPERT_DISPLAY.map(a => (
                                            <div key={a.key} className="flex items-center gap-1.5">
                                              <div className="w-4 h-4 rounded border border-black/30" style={{ backgroundColor: a.color }} />
                                              <span>{isEn ? a.labelEn : a.labelFr}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )
                                ) : <p className="text-[11px] text-gray-600 py-8">{isEn ? 'Loading…' : 'Chargement…'}</p>}
                              </div>
                            }
                          />
                        ) : (
                          <div className="h-32 flex items-center justify-center">
                            <div className="animate-spin h-6 w-6 border-2 border-purple-500 border-t-transparent rounded-full" />
                          </div>
                        )
                      ) : profileMatrix ? (
                        <RangeEditor
                          matrix={profileMatrix}
                          onChange={isExpertMode ? setProfileMatrix : () => {}}
                          position={realPos(profilePos)}
                          scheme={realPos(profilePos) === 'BB' ? 'bb' : 'open'}
                          onSave={isExpertMode ? handleSaveProfile : undefined}
                          onReset={isExpertMode ? () => { if (profileGto) setProfileMatrix(profileGto.map(r => [...r])); } : undefined}
                          isSaving={savingP}
                        />
                      ) : (
                        <div className="h-32 flex items-center justify-center">
                          <div className="animate-spin h-6 w-6 border-2 border-felt-500 border-t-transparent rounded-full" />
                        </div>
                      )}

                      {savedP && (
                        <p className="text-green-400 text-sm text-center font-semibold flex items-center justify-center gap-1">
                          <Check size={14} /> {isEn ? 'Saved!' : 'Sauvegardé !'}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ══ SIMPLE RANGE TAB ══ */}
      {tab === 'simple' && (
        <>
          {/* Header — hidden when locked */}
          {!locked && (
            <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
              <p className="text-white font-semibold text-sm">{isEn ? 'Simple ranges' : 'Ranges simples'}</p>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                <button
                  onClick={exportSimpleRanges}
                  className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 transition-colors"
                  title={isEn ? 'Export all positions as JSON' : 'Exporter toutes les positions en JSON'}
                >
                  <Download size={12} /> {isEn ? 'Export' : 'Exporter'}
                </button>
                <button
                  onClick={() => importSimpleRef.current?.click()}
                  disabled={importing}
                  className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 transition-colors disabled:opacity-40"
                  title={isEn ? 'Import ranges from JSON' : 'Importer des ranges depuis un JSON'}
                >
                  <Upload size={12} /> {isEn ? 'Import' : 'Importer'}
                </button>
                <button onClick={handleActivateSimple}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                    simpleActive
                      ? 'bg-green-900/30 text-green-300 border-green-700 hover:bg-red-900/30 hover:text-red-300 hover:border-red-700'
                      : 'bg-gray-800 text-gray-300 border-gray-600 hover:bg-felt-900/30 hover:text-felt-300 hover:border-felt-700'
                  }`}
                >
                  {simpleActive
                    ? <><Check size={12} /> {isEn ? 'Active — click to deactivate' : 'Actives — cliquer pour désactiver'}</>
                    : <><Zap size={12} /> {isEn ? 'Use these ranges' : 'Activer ces ranges'}</>
                  }
                </button>
              </div>
            </div>
          )}

          {/* Position tabs — always visible */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {positions.map(pos => (
              <button key={pos} onClick={() => setSimplePos(pos)}
                className={`px-3 py-1.5 rounded-lg text-sm font-bold border transition-all ${
                  simplePos === pos
                    ? 'bg-felt-700 text-white border-felt-500'
                    : 'text-gray-400 border-gray-700 hover:text-white hover:bg-gray-800'
                }`}>{realPos(pos)}</button>
            ))}
          </div>

          {loadingS ? (
            <div className="h-32 flex items-center justify-center">
              <div className="animate-spin h-8 w-8 border-2 border-felt-500 border-t-transparent rounded-full" />
            </div>
          ) : locked ? (
            /* View-only: GTO as default range on left, GTO reference on right */
            <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-8 xl:gap-12">
              <div className="flex flex-col gap-2 flex-1 items-start">
                <p className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                  <Sliders size={13} className="shrink-0" />
                  {isEn ? `Your range — ${realPos(simplePos)}` : `Ta range — ${realPos(simplePos)}`}
                </p>
                {simpleGto
                  ? renderGtoRef(simpleGto, simplePos)
                  : <p className="text-[11px] text-gray-600 py-8">{isEn ? 'Loading…' : 'Chargement…'}</p>}
              </div>
              <div className="flex flex-col items-start gap-2 xl:shrink-0">
                <p className="text-xs font-semibold text-felt-300 flex items-center gap-1.5">
                  <Target size={13} className="shrink-0" />
                  {isEn ? 'GTO reference' : 'Range GTO (référence)'}
                  <span className="text-gray-600">— {realPos(simplePos)}</span>
                </p>
                {simpleGto
                  ? renderGtoRef(simpleGto, simplePos)
                  : <p className="text-[11px] text-gray-600 py-8">{isEn ? 'Loading…' : 'Chargement…'}</p>}
              </div>
            </div>
          ) : simpleMatrix ? (
            <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-8 xl:gap-12">
              <RangeEditor
                matrix={simpleMatrix}
                onChange={updateSimple}
                position={realPos(simplePos)}
                scheme={realPos(simplePos) === 'BB' ? 'bb' : 'open'}
                onSave={handleSaveSimple}
                onReset={() => { if (simpleGto) updateSimple(simpleGto.map(r => [...r])); }}
                isSaving={savingS}
              />
              {/* GTO reference on the right */}
              <div className="flex flex-col items-start gap-2 xl:shrink-0">
                <p className="text-xs font-semibold text-felt-300 flex items-center gap-1.5">
                  <Target size={13} className="shrink-0" />
                  {isEn ? 'GTO reference' : 'Range GTO (référence)'}
                  <span className="text-gray-600">— {realPos(simplePos)}</span>
                </p>
                {simpleGto
                  ? renderGtoRef(simpleGto, simplePos)
                  : <p className="text-[11px] text-gray-600 py-8">{isEn ? 'Loading…' : 'Chargement…'}</p>}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">
              {isEn ? 'Could not load range.' : 'Impossible de charger la range.'}
            </p>
          )}

          {!locked && savedS && (
            <p className="text-green-400 text-sm text-center mt-2 font-semibold">
              {isEn ? 'Saved!' : 'Sauvegardé !'}
            </p>
          )}
        </>
      )}

    </motion.div>
  );
}
