import { useEffect, useRef, useState, lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lock, X, Sliders, Layers, Plus, Check, Zap, Upload, Download,
  Target, Flame,
} from 'lucide-react';
import { useTrainingStore } from '../store/trainingStore';
import { useShallow } from 'zustand/react/shallow';
import { useAuthStore } from '../store/authStore';
import { TrainingModule, Position } from '../types/poker';
import { Spinner } from '../components/ui/Spinner';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';

// Each trainer is its own chunk: only the selected module's code is fetched.
const PreflopTrainer = lazy(() => import('../components/training/PreflopTrainer').then(m => ({ default: m.PreflopTrainer })));
const PotOddsTrainer = lazy(() => import('../components/training/PotOddsTrainer').then(m => ({ default: m.PotOddsTrainer })));
const EquityTrainer = lazy(() => import('../components/training/EquityTrainer').then(m => ({ default: m.EquityTrainer })));
const OutsTrainer = lazy(() => import('../components/training/OutsTrainer').then(m => ({ default: m.OutsTrainer })));
const PostflopTrainer = lazy(() => import('../components/training/PostflopTrainer').then(m => ({ default: m.PostflopTrainer })));
const FullHandTrainer = lazy(() => import('../components/training/FullHandTrainer').then(m => ({ default: m.FullHandTrainer })));
const BetSizingTrainer = lazy(() => import('../components/training/BetSizingTrainer').then(m => ({ default: m.BetSizingTrainer })));

import { RangeEditor } from '../components/poker/RangeEditor';
import { RangeMatrix } from '../components/poker/RangeMatrix';
import { ExpertRangeEditor, gtoToExpertMix } from '../components/poker/ExpertRangeEditor';
import { HoverTip } from '../components/ui/HoverTip';
import { useT } from '../i18n';
import { useLangStore } from '../store/langStore';
import { useModeStore } from '../store/modeStore';

// Cell code → colour for the GTO BB-defense reference grid (0-4).
const BB_GTO_CELL_COLOR = (code: number): string => ({
  0: '#1a202c', 1: 'rgba(37,99,235,0.70)', 2: 'rgba(37,99,235,0.32)',
  3: 'rgba(22,130,60,0.85)', 4: 'rgba(202,138,4,0.82)',
} as Record<number, string>)[code] ?? '#1a202c';
import { trainingApi, rangesApi, profilesApi, RangeProfile } from '../services/api';
import {
  validateFileMeta,
  safeJsonParse,
  validateComplexImport,
  validateSimpleRangeImport,
} from '../utils/rangeImportValidator';
import { useCustomRangeStore } from '../store/customRangeStore';
import { Button } from '../components/ui/Button';

const PREFLOP_POSITIONS: Position[] = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'];

// ─── helpers ─────────────────────────────────────────────────────────────────

function flatToMatrix(flat: number[]): number[][] {
  const m: number[][] = [];
  for (let r = 0; r < 13; r++) m.push(flat.slice(r * 13, r * 13 + 13));
  return m;
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

function MyRangesPanel({ onClose, positions, defaultPosition, locked }: {
  onClose: () => void;
  positions: Position[];
  defaultPosition?: Position;
  locked?: boolean;
}) {
  const isEn = useLangStore(s => s.lang) === 'en';
  const t = useT();
  const isExpert = !!useAuthStore(s => s.user?.isPremiumExpert);
  // Complex ranges (profiles) are an Expert-mode-only feature.
  const isExpertMode = useModeStore(s => s.mode) === 'expert';
  const { preflopEnabled, togglePreflopEnabled } = useCustomRangeStore(
    useShallow(s => ({ preflopEnabled: s.preflopEnabled, togglePreflopEnabled: s.togglePreflopEnabled }))
  );
  const [tab, setTab] = useState<'profiles' | 'simple'>('simple');
  // Read-only GTO reference matrix (BB = 5-category defense grid, others = open-raise).
  const renderGtoRef = (matrix: number[][] | null | undefined, position: string) => {
    if (!matrix) return null;
    if (position === 'BB') {
      return (
        <RangeMatrix
          matrix={matrix}
          size="sm"
          crisp
          cellColor={BB_GTO_CELL_COLOR}
          legend={[
            { color: 'rgba(202,138,4,0.82)', label: t.training.bb_leg_bluff, tip: { title: t.training.bb_leg_bluff, text: t.training.bb_tip_bluff } },
            { color: 'rgba(22,130,60,0.85)', label: t.training.bb_leg_value, tip: { title: t.training.bb_leg_value, text: t.training.bb_tip_value } },
            { color: 'rgba(37,99,235,0.70)', label: t.training.bb_leg_call,  tip: { title: t.training.bb_leg_call,  text: t.training.bb_tip_call  } },
            { color: 'rgba(37,99,235,0.32)', label: t.training.bb_leg_thin,  tip: { title: t.training.bb_leg_thin,  text: t.training.bb_tip_thin  } },
            { color: '#1a202c',              label: t.training.bb_leg_fold,  tip: { title: t.training.bb_leg_fold,  text: t.training.bb_tip_fold  } },
          ]}
          tooltipValue={(code) => ({
            0: t.training.bb_leg_fold, 1: t.training.bb_leg_call,
            2: t.training.bb_leg_thin, 3: t.training.bb_leg_value, 4: t.training.bb_leg_bluff,
          } as Record<number, string>)[code] ?? ''}
        />
      );
    }
    return <RangeMatrix matrix={matrix} size="sm" crisp />;
  };

  // ══ PROFILES TAB STATE ══════════════════════════════════════════════════════
  const [profiles,   setProfiles]   = useState<RangeProfile[]>([]);
  const [loadingP,   setLoadingP]   = useState(true);
  const [activating, setActivating] = useState(false);

  const [selProfileId, setSelProfileId] = useState<string | null>(null);
  const [selRangeId,   setSelRangeId]   = useState<string | null>(null);
  const [profilePos,   setProfilePos]   = useState<Position>(
    defaultPosition && positions.includes(defaultPosition) ? defaultPosition : positions[0]
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

  // Load profiles
  useEffect(() => {
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
    if (profilePos === 'BB') {
      trainingApi.getBBDefenseRange()
        .then(d => { const g = (d as any)?.grid; setProfileGto(Array.isArray(g) ? g : null); })
        .catch(() => setProfileGto(null));
    } else {
      trainingApi.getRangeMatrix(profilePos)
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
      setProfileExpertMix(flat && flat.length === 676 ? flat : gtoToExpertMix(profileGto, profilePos === 'BB'));
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
  const [simplePos,    setSimplePos]    = useState<Position>(
    defaultPosition && positions.includes(defaultPosition) ? defaultPosition : positions[0]
  );
  const [gtoCache,    setGtoCache]    = useState<Record<string, number[][]>>({});
  const [customCache, setCustomCache] = useState<Record<string, number[][] | null>>({});
  const [loadingS,    setLoadingS]    = useState(true);
  const [savingS,     setSavingS]     = useState(false);
  const [savedS,      setSavedS]      = useState(false);

  useEffect(() => {
    (async () => {
      setLoadingS(true);
      const gtoResults = await Promise.all(positions.map(async pos => {
        try {
          // BB is a defense spot: its reference range is the 5-category defense
          // grid (codes 0-4), not an open-raise frequency matrix.
          if (pos === 'BB') {
            const data = await trainingApi.getBBDefenseRange();
            const g = (data as any)?.grid;
            return Array.isArray(g) ? (g as number[][]) : null;
          }
          const data = await trainingApi.getRangeMatrix(pos);
          const m = (data as any)?.matrix ?? data;
          return Array.isArray(m) ? (m as number[][]) : null;
        } catch { return null; }
      }));
      const newGto: Record<string, number[][]> = {};
      positions.forEach((pos, i) => { if (gtoResults[i]) newGto[pos] = gtoResults[i]!; });
      setGtoCache(newGto);

      const customResults = await Promise.all(positions.map(async (pos, i) => {
        try {
          const data = await rangesApi.get(pos);
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
      const newCustom: Record<string, number[][] | null> = {};
      positions.forEach((pos, i) => { newCustom[pos] = customResults[i]; });
      setCustomCache(newCustom);
      setLoadingS(false);
    })();
  }, []);

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

      {/* Tab content — locked if not premium */}
      <div className={locked ? 'pointer-events-none select-none opacity-50' : ''}>

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
          {loadingP ? (
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
                            }`}>{pos}</button>
                        ))}
                      </div>

                      {selProfile.mode === 'expert' ? (
                        profileExpertMix ? (
                          <ExpertRangeEditor
                            mix={profileExpertMix}
                            onChange={isExpertMode ? setProfileExpertMix : () => {}}
                            onSave={isExpertMode ? handleSaveProfile : undefined}
                            onReset={isExpertMode ? () => setProfileExpertMix(gtoToExpertMix(profileGto, profilePos === 'BB')) : undefined}
                            resetLabel="Reset GTO"
                            isSaving={savingP}
                            title={`${isEn ? 'Your range' : 'Ta range'} — ${profilePos}`}
                            gtoSlot={
                              <div className="flex flex-col items-start gap-2">
                                <p className="text-xs font-semibold text-felt-300 flex items-center gap-1.5">
                                  <Target size={13} className="shrink-0" />
                                  {isEn ? 'GTO reference' : 'Range GTO (référence)'}
                                  <span className="text-gray-600">— {profilePos}</span>
                                </p>
                                {profileGto ? (
                                  profilePos === 'BB'
                                    // BB is a defense spot → use the 5-category defense rendering.
                                    ? renderGtoRef(profileGto, 'BB')
                                    : (() => {
                                      // Shade mixed (call) cells by frequency, and list each distinct
                                      // call frequency in the legend (e.g. "Call 75%", "Call 50%").
                                      // Blue = same as the expert "Call" action, for visual consistency.
                                      const callColor = (f: number) => `rgba(37,99,235,${(0.45 + f * 0.5).toFixed(2)})`;
                                      const freqs = Array.from(new Set(profileGto.flat().filter(f => f > 0 && f < 1))).sort((a, b) => b - a);
                                      return (
                                        <RangeMatrix
                                          matrix={profileGto}
                                          size="sm"
                                          crisp
                                          cellColor={(v) => v >= 1 ? 'rgba(22,130,60,0.85)' : v <= 0 ? '#1a202c' : callColor(v)}
                                          legend={[
                                            { color: 'rgba(22,130,60,0.85)', label: 'Raise' },
                                            ...freqs.map(f => ({ color: callColor(f), label: `Call ${Math.round(f * 100)}%` })),
                                            { color: '#1a202c', label: 'Fold' },
                                          ]}
                                        />
                                      );
                                    })()
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
                          position={profilePos}
                          scheme={profilePos === 'BB' ? 'bb' : 'open'}
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
          {/* Same layout as the Complex tab: title left, Export/Import + Activate on the right. */}
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

          {/* Position tabs */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {positions.map(pos => (
              <button key={pos} onClick={() => setSimplePos(pos)}
                className={`px-3 py-1.5 rounded-lg text-sm font-bold border transition-all ${
                  simplePos === pos
                    ? 'bg-felt-700 text-white border-felt-500'
                    : 'text-gray-400 border-gray-700 hover:text-white hover:bg-gray-800'
                }`}>{pos}</button>
            ))}
          </div>

          {loadingS ? (
            <div className="h-32 flex items-center justify-center">
              <div className="animate-spin h-8 w-8 border-2 border-felt-500 border-t-transparent rounded-full" />
            </div>
          ) : simpleMatrix ? (
            <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-8 xl:gap-12">
              <RangeEditor
                matrix={simpleMatrix}
                onChange={updateSimple}
                position={simplePos}
                scheme={simplePos === 'BB' ? 'bb' : 'open'}
                onSave={handleSaveSimple}
                onReset={() => { if (simpleGto) updateSimple(simpleGto.map(r => [...r])); }}
                isSaving={savingS}
              />
              {/* GTO reference on the right (same as in Complex ranges) */}
              <div className="flex flex-col items-start gap-2 xl:shrink-0">
                <p className="text-xs font-semibold text-felt-300 flex items-center gap-1.5">
                  <Target size={13} className="shrink-0" />
                  {isEn ? 'GTO reference' : 'Range GTO (référence)'}
                  <span className="text-gray-600">— {simplePos}</span>
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

          {savedS && (
            <p className="text-green-400 text-sm text-center mt-2 font-semibold">
              {isEn ? 'Saved!' : 'Sauvegardé !'}
            </p>
          )}
        </>
      )}

      {/* end locked wrapper */}
      </div>
    </motion.div>
  );
}

// ─── TrainingPage ─────────────────────────────────────────────────────────────

export function TrainingPage() {
  const t = useT();
  const lang = useLangStore(s => s.lang);
  const isEn = lang === 'en';
  const user = useAuthStore(s => s.user);

  const [searchParams, setSearchParams] = useSearchParams();
  const { startSession, setModule, resetSession, isExercising, trainerStarted, currentPosition } = useTrainingStore(
    useShallow(s => ({ startSession: s.startSession, setModule: s.setModule, resetSession: s.resetSession, isExercising: s.isExercising, trainerStarted: s.trainerStarted, currentPosition: s.currentPosition }))
  );
  // Beginner trains on GTO only → no custom-range toolbar.
  const trainMode = useModeStore(s => s.mode);
  const isBeginnerMode = trainMode === 'beginner';
  const [activeModule, setActiveModule] = useState<TrainingModule>(
    (searchParams.get('module') as TrainingModule) || 'preflop'
  );
  const [showMyRanges, setShowMyRanges] = useState(false);

  // Auto-close panels when an exercise starts
  useEffect(() => {
    if (isExercising) {
      setShowMyRanges(false);
    }
  }, [isExercising]);

  const { preflopEnabled, togglePreflopEnabled } = useCustomRangeStore(
    useShallow(s => ({ preflopEnabled: s.preflopEnabled, togglePreflopEnabled: s.togglePreflopEnabled }))
  );
  const customEnabled = preflopEnabled;

  // Complex profiles are usable only in Expert mode → deactivate any active
  // profile outside it. In Beginner, custom ranges are off entirely (GTO only).
  useEffect(() => {
    if (trainMode !== 'expert') profilesApi.deactivate().catch(() => {});
    if (trainMode === 'beginner' && preflopEnabled) togglePreflopEnabled();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trainMode]);


  const isPremium = !!user?.isPremium;
  const isRangeModule = activeModule === 'preflop';

  const TABS: { id: TrainingModule; label: string; icon: string; premium?: boolean }[] = [
    { id: 'preflop',   label: t.training.tab_preflop,   icon: '🎯' },
    { id: 'outs',      label: t.training.tab_outs,      icon: '🎲' },
    { id: 'equity',    label: t.training.tab_equity,    icon: '⚖️' },
    { id: 'potodds',   label: t.training.tab_potodds,   icon: '📐' },
    { id: 'postflop',  label: isEn ? 'Post-flop'   : 'Post-flop',     icon: '🃏', premium: true },
    { id: 'fullhand',  label: isEn ? 'Full Hand'   : 'Main complète', icon: '🎰', premium: true },
    { id: 'betsizing', label: isEn ? 'Bet Sizing'  : 'Bet Sizing',    icon: '📐', premium: true },
  ];

  // Sync activeModule when URL param changes (e.g. navbar dropdown click)
  useEffect(() => {
    const mod = (searchParams.get('module') as TrainingModule) || 'preflop';
    if (mod !== activeModule) {
      setActiveModule(mod);
      setModule(mod);
      resetSession();
      setShowMyRanges(false);
    }
  }, [searchParams]);

  useEffect(() => { startSession(activeModule); }, [activeModule]);

  const handleTabChange = (mod: TrainingModule) => {
    setActiveModule(mod);
    setModule(mod);
    resetSession();
    setSearchParams({ module: mod });
    setShowMyRanges(false);
  };

  useEffect(() => {
    const onModule = (e: Event) => {
      const mod = (e as CustomEvent).detail as TrainingModule;
      if (mod) handleTabChange(mod);
    };
    window.addEventListener('training:module', onModule);
    return () => window.removeEventListener('training:module', onModule);
  }, []);

  return (
    <div className="flex flex-col gap-6">
      {/* Module tabs — horizontally scrollable on mobile, hidden once trainer is active */}
      <div className={`flex gap-1.5 border-b border-gray-800 pb-2 overflow-x-auto transition-all duration-300 scrollbar-none ${trainerStarted ? 'hidden' : ''}`}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`
              flex items-center gap-1.5 px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap shrink-0 transition-all relative
              ${activeModule === tab.id
                ? 'bg-felt-700 text-white shadow-glow-green border border-felt-500'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'}
            `}
          >
            <span className="text-sm leading-none">{tab.icon}</span>
            <span>{tab.label}</span>
            {tab.premium && !isPremium && (
              <Lock size={10} className="text-yellow-400 shrink-0 ml-0.5" />
            )}
          </button>
        ))}
      </div>

      {/* Range toolbar — preflop only, once the trainer has started (intro
          dismissed). Hidden in beginner mode (GTO only). */}
      {isRangeModule && trainerStarted && !isBeginnerMode && (
        <div className="flex items-center gap-2 -mt-2 flex-wrap">

          {isExercising && isPremium && (
            <span className="text-xs text-gray-500 italic">
              {isEn ? '🔒 Range access locked during exercise' : '🔒 Accès aux ranges verrouillé pendant l\'exercice'}
            </span>
          )}

          {/* Mes Ranges button — always visible, locked appearance for non-premium */}
          <Button
            variant="ghost" size="sm"
            disabled={isExercising && isPremium}
            onClick={() => { if (!(isExercising && isPremium)) setShowMyRanges(v => !v); }}
            className={`flex items-center gap-1.5 text-xs border transition-all ${
              isExercising && isPremium
                ? 'text-gray-600 border-gray-700 cursor-not-allowed opacity-40'
                : showMyRanges
                  ? 'text-yellow-300 border-yellow-600 bg-yellow-900/20'
                  : 'text-yellow-400 border-yellow-800/60 hover:bg-yellow-900/20'
            }`}
          >
            {isPremium ? <span>👑</span> : <Lock size={11} />}
            {isEn ? 'My Ranges' : 'Mes Ranges'}
          </Button>

          {/* Status indicator (not clickable) — green = a profile or the simple range
              is active, red = none active (GTO). Activation happens in the panel. */}
          {isPremium && (
            <span
              className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border ${
                customEnabled
                  ? 'text-green-300 border-green-700 bg-green-900/20'
                  : 'text-red-300 border-red-700 bg-red-900/20'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${customEnabled ? 'bg-green-400' : 'bg-red-400'}`} />
              {customEnabled ? (isEn ? 'Active' : 'Activé') : (isEn ? 'Inactive' : 'Désactivé')}
            </span>
          )}
        </div>
      )}

      {/* My Ranges panel — visible to all, locked for non-premium */}
      <AnimatePresence>
        {isRangeModule && trainerStarted && !isBeginnerMode && showMyRanges && (
          <MyRangesPanel
            onClose={() => setShowMyRanges(false)}
            positions={PREFLOP_POSITIONS}
            defaultPosition={currentPosition ?? undefined}
            locked={!isPremium}
          />
        )}
      </AnimatePresence>

      <motion.div
        key={activeModule}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <ErrorBoundary key={activeModule}>
          <Suspense fallback={<Spinner />}>
            {activeModule === 'preflop'   && <PreflopTrainer />}
            {activeModule === 'potodds'   && <PotOddsTrainer />}
            {activeModule === 'equity'    && <EquityTrainer />}
            {activeModule === 'outs'      && <OutsTrainer />}

            {/* Premium modules: non-premium users still see the full intro and get
                a daily free allowance; the trainers handle access internally
                (premium / logged-in free quota / locked). */}
            {activeModule === 'postflop'  && <PostflopTrainer />}
            {activeModule === 'fullhand'  && <FullHandTrainer />}
            {activeModule === 'betsizing' && <BetSizingTrainer />}
          </Suspense>
        </ErrorBoundary>
      </motion.div>
    </div>
  );
}
