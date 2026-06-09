/**
 * RangeProfilesPanel
 * Full profile management UI: create/rename/delete named profiles,
 * add stack-depth sub-ranges within each profile, edit per-position ranges.
 */
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Check, ChevronDown, ChevronUp, Save, RotateCcw, Zap, Download, Upload } from 'lucide-react';
import { profilesApi, rangesApi, trainingApi, RangeProfile, RangeStackRange } from '../../services/api';
import { RangeEditor } from './RangeEditor';
import { Position } from '../../types/poker';
import { useLangStore } from '../../store/langStore';

// ─── helpers ──────────────────────────────────────────────────────────────────

function flatToMatrix(flat: number[]): number[][] {
  const m: number[][] = [];
  for (let r = 0; r < 13; r++) m.push(flat.slice(r * 13, r * 13 + 13));
  return m;
}

// ─── Sub-component: add-profile form ─────────────────────────────────────────

function AddProfileForm({ isEn, onAdd, onCancel }: {
  isEn: boolean; onAdd: (name: string) => void; onCancel: () => void;
}) {
  const [name, setName] = useState('');
  return (
    <div className="flex items-center gap-2">
      <input
        autoFocus
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && name.trim()) onAdd(name.trim()); if (e.key === 'Escape') onCancel(); }}
        placeholder={isEn ? 'Profile name…' : 'Nom du profil…'}
        className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-felt-500"
      />
      <button onClick={() => { if (name.trim()) onAdd(name.trim()); }}
        className="px-3 py-1.5 bg-felt-700 hover:bg-felt-600 text-white rounded-lg text-sm font-semibold transition-colors">
        {isEn ? 'Create' : 'Créer'}
      </button>
      <button onClick={onCancel} className="text-gray-500 hover:text-white"><X size={16} /></button>
    </div>
  );
}

// ─── Sub-component: add-stack-range form ─────────────────────────────────────

function AddRangeForm({ isEn, onAdd, onCancel }: {
  isEn: boolean;
  onAdd: (label: string, stackMin: number, stackMax: number | null) => void;
  onCancel: () => void;
}) {
  const [label, setLabel]     = useState('');
  const [minVal, setMinVal]   = useState('0');
  const [maxVal, setMaxVal]   = useState('');

  const submit = () => {
    if (!label.trim()) return;
    const mn = parseFloat(minVal) || 0;
    const mx = maxVal.trim() === '' ? null : parseFloat(maxVal);
    onAdd(label.trim(), mn, mx);
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
          <span>{isEn ? 'Min' : 'Min'}</span>
          <input type="number" value={minVal} onChange={e => setMinVal(e.target.value)}
            min={0} className="w-16 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-felt-500" />
          <span>bb</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <span>{isEn ? 'Max' : 'Max'}</span>
          <input type="number" value={maxVal} onChange={e => setMaxVal(e.target.value)}
            min={0} placeholder="∞" className="w-16 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-felt-500" />
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

// ─── Main component ───────────────────────────────────────────────────────────

export interface RangeProfilesPanelProps {
  onClose: () => void;
  positions: Position[];
  defaultPosition?: Position;
  /** Called when user activates or deactivates a profile so the trainer can refresh. */
  onActivationChange?: () => void;
}

export function RangeProfilesPanel({
  onClose, positions, defaultPosition, onActivationChange,
}: RangeProfilesPanelProps) {
  const isEn = useLangStore(s => s.lang) === 'en';

  // ── Data ──────────────────────────────────────────────────────────────────
  const [profiles,    setProfiles]    = useState<RangeProfile[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [activating,  setActivating]  = useState(false);

  // Selected items
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [selectedRangeId,   setSelectedRangeId]   = useState<string | null>(null);
  const [selectedPosition,  setSelectedPosition]  = useState<Position>(
    defaultPosition && positions.includes(defaultPosition) ? defaultPosition : positions[0]
  );

  // Range editor local state
  const [localMatrix, setLocalMatrix] = useState<number[][] | null>(null);
  const [gtoMatrix,   setGtoMatrix]   = useState<number[][] | null>(null);
  const [isSaving,    setIsSaving]    = useState(false);
  const [saved,       setSaved]       = useState(false);

  // Forms
  const [showAddProfile, setShowAddProfile] = useState(false);
  const [showAddRange,   setShowAddRange]   = useState(false);
  const [renamingId,     setRenamingId]     = useState<string | null>(null);
  const [renameVal,      setRenameVal]      = useState('');

  // File import ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Derived ───────────────────────────────────────────────────────────────
  const selectedProfile = profiles.find(p => p.id === selectedProfileId) ?? null;
  const selectedRange   = selectedProfile?.stackRanges.find(r => r.id === selectedRangeId) ?? null;

  // ── Load profiles ─────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await profilesApi.list();
        setProfiles(data);
        // Auto-select the active profile (or first)
        const active = data.find(p => p.isActive) ?? data[0] ?? null;
        if (active) {
          setSelectedProfileId(active.id);
          const firstRange = active.stackRanges[0] ?? null;
          if (firstRange) setSelectedRangeId(firstRange.id);
        }
      } catch { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, []);

  // ── Load GTO matrix for current position ─────────────────────────────────
  useEffect(() => {
    trainingApi.getRangeMatrix(selectedPosition)
      .then(d => { const m = (d as any)?.matrix ?? d; setGtoMatrix(Array.isArray(m) ? m : null); })
      .catch(() => setGtoMatrix(null));
  }, [selectedPosition]);

  // ── Sync local editor matrix when range/position changes ─────────────────
  useEffect(() => {
    if (!selectedRange) { setLocalMatrix(gtoMatrix); return; }
    const flat = selectedRange.data[selectedPosition];
    if (flat && flat.length === 169) {
      setLocalMatrix(flatToMatrix(flat));
    } else {
      // No data saved yet → start from GTO
      setLocalMatrix(gtoMatrix ?? null);
    }
  }, [selectedRange, selectedPosition, gtoMatrix]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSelectProfile = (id: string) => {
    setSelectedProfileId(id);
    setSelectedRangeId(null);
    setShowAddRange(false);
    const p = profiles.find(x => x.id === id);
    if (p?.stackRanges[0]) setSelectedRangeId(p.stackRanges[0].id);
  };

  const handleSelectRange = (id: string) => {
    setSelectedRangeId(id);
  };

  const handleCreateProfile = async (name: string) => {
    try {
      const created = await profilesApi.create(name);
      setProfiles(prev => [...prev, created]);
      setSelectedProfileId(created.id);
      setSelectedRangeId(null);
    } catch { /* ignore */ }
    setShowAddProfile(false);
  };

  const handleDeleteProfile = async (id: string) => {
    if (!confirm(isEn ? 'Delete this profile?' : 'Supprimer ce profil ?')) return;
    try {
      await profilesApi.delete(id);
      const next = profiles.filter(p => p.id !== id);
      setProfiles(next);
      if (selectedProfileId === id) {
        setSelectedProfileId(next[0]?.id ?? null);
        setSelectedRangeId(next[0]?.stackRanges[0]?.id ?? null);
      }
    } catch { /* ignore */ }
  };

  const handleRename = async (id: string) => {
    if (!renameVal.trim()) { setRenamingId(null); return; }
    try {
      const updated = await profilesApi.update(id, renameVal.trim());
      setProfiles(prev => prev.map(p => p.id === id ? { ...p, name: updated.name } : p));
    } catch { /* ignore */ }
    setRenamingId(null);
  };

  const handleActivate = async () => {
    if (!selectedProfile) return;
    setActivating(true);
    try {
      if (selectedProfile.isActive) {
        await profilesApi.deactivate();
        setProfiles(prev => prev.map(p => ({ ...p, isActive: false })));
      } else {
        await profilesApi.activate(selectedProfile.id);
        setProfiles(prev => prev.map(p => ({ ...p, isActive: p.id === selectedProfile.id })));
      }
      onActivationChange?.();
    } catch { /* ignore */ }
    setActivating(false);
  };

  const handleCreateRange = async (label: string, stackMin: number, stackMax: number | null) => {
    if (!selectedProfile) return;
    try {
      const sr = await profilesApi.createStackRange(selectedProfile.id, label, stackMin, stackMax);
      setProfiles(prev => prev.map(p =>
        p.id === selectedProfile.id
          ? { ...p, stackRanges: [...p.stackRanges, sr] }
          : p
      ));
      setSelectedRangeId(sr.id);
    } catch { /* ignore */ }
    setShowAddRange(false);
  };

  const handleDeleteRange = async (rangeId: string) => {
    if (!selectedProfile) return;
    if (!confirm(isEn ? 'Delete this stack range?' : 'Supprimer ce palier ?')) return;
    try {
      await profilesApi.deleteStackRange(selectedProfile.id, rangeId);
      setProfiles(prev => prev.map(p =>
        p.id === selectedProfile.id
          ? { ...p, stackRanges: p.stackRanges.filter(r => r.id !== rangeId) }
          : p
      ));
      if (selectedRangeId === rangeId) {
        const remaining = selectedProfile.stackRanges.filter(r => r.id !== rangeId);
        setSelectedRangeId(remaining[0]?.id ?? null);
      }
    } catch { /* ignore */ }
  };

  const handleSave = async () => {
    if (!selectedProfile || !selectedRange || !localMatrix) return;
    setIsSaving(true);
    try {
      await profilesApi.updateStackRange(selectedProfile.id, selectedRange.id, {
        position: selectedPosition,
        cells: localMatrix.flat(),
      });
      // Update local cache
      setProfiles(prev => prev.map(p =>
        p.id === selectedProfile.id ? {
          ...p,
          stackRanges: p.stackRanges.map(sr => sr.id === selectedRange.id ? {
            ...sr,
            data: { ...sr.data, [selectedPosition]: localMatrix.flat() },
          } : sr),
        } : p
      ));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch { /* ignore */ }
    setIsSaving(false);
  };

  const handleReset = () => {
    if (gtoMatrix) setLocalMatrix(gtoMatrix.map(r => [...r]));
  };

  // ── Export profile to JSON file ───────────────────────────────────────────
  const handleExport = () => {
    if (!selectedProfile) return;
    const blob = new Blob([JSON.stringify(selectedProfile, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `range-${selectedProfile.name.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Import profile from JSON file ─────────────────────────────────────────
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ''; // reset so same file can be re-imported
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const raw = JSON.parse(ev.target?.result as string);
        // Minimal validation: expect { name, stackRanges }
        if (!raw?.name || !Array.isArray(raw.stackRanges)) {
          alert(isEn ? 'Invalid file format.' : 'Format de fichier invalide.');
          return;
        }
        // Create the profile
        const created = await profilesApi.create(raw.name + (isEn ? ' (imported)' : ' (importé)'));
        // Create stack ranges with their data
        for (const sr of raw.stackRanges as any[]) {
          const newSr = await profilesApi.createStackRange(created.id, sr.label ?? 'Range', sr.stackMin ?? 0, sr.stackMax ?? null);
          // Restore per-position cells
          if (sr.data && typeof sr.data === 'object') {
            for (const [pos, cells] of Object.entries(sr.data)) {
              if (Array.isArray(cells) && cells.length === 169) {
                await profilesApi.updateStackRange(created.id, newSr.id, {
                  position: pos as any,
                  cells: cells as number[],
                });
              }
            }
          }
        }
        // Reload profiles
        const data = await profilesApi.list();
        setProfiles(data);
        setSelectedProfileId(created.id);
        setSelectedRangeId(null);
      } catch {
        alert(isEn ? 'Failed to import profile.' : "Échec de l'importation.");
      }
    };
    reader.readAsText(file);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-gray-900 border border-gray-700 rounded-2xl p-5 w-full flex flex-col gap-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-white font-bold text-lg flex items-center gap-2">
          📚 {isEn ? 'Range Profiles' : 'Profils de Ranges'}
        </h3>
        <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20} /></button>
      </div>

      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleImport}
      />

      {loading ? (
        <div className="h-32 flex items-center justify-center">
          <div className="animate-spin h-8 w-8 border-2 border-felt-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <>
          {/* ── Profile list ── */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">
                {isEn ? 'Profiles' : 'Profils'}
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  title={isEn ? 'Import profile from JSON' : 'Importer un profil JSON'}
                >
                  <Upload size={13} /> {isEn ? 'Import' : 'Importer'}
                </button>
                <button onClick={() => { setShowAddProfile(v => !v); }}
                  className="flex items-center gap-1 text-xs text-felt-400 hover:text-felt-300 transition-colors">
                  <Plus size={13} /> {isEn ? 'New profile' : 'Nouveau profil'}
                </button>
              </div>
            </div>

            <AnimatePresence initial={false}>
              {showAddProfile && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <AddProfileForm isEn={isEn} onAdd={handleCreateProfile} onCancel={() => setShowAddProfile(false)} />
                </motion.div>
              )}
            </AnimatePresence>

            {profiles.length === 0 ? (
              <p className="text-xs text-gray-500 italic text-center py-2">
                {isEn ? 'No profiles yet. Create one to get started.' : 'Aucun profil. Créez-en un pour commencer.'}
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {profiles.map(p => (
                  <div key={p.id} className="relative group">
                    {renamingId === p.id ? (
                      <input
                        autoFocus
                        value={renameVal}
                        onChange={e => setRenameVal(e.target.value)}
                        onBlur={() => handleRename(p.id)}
                        onKeyDown={e => { if (e.key === 'Enter') handleRename(p.id); if (e.key === 'Escape') setRenamingId(null); }}
                        className="px-3 py-1.5 rounded-lg text-sm border border-felt-500 bg-gray-800 text-white focus:outline-none"
                      />
                    ) : (
                      <button
                        onClick={() => handleSelectProfile(p.id)}
                        onDoubleClick={() => { setRenamingId(p.id); setRenameVal(p.name); }}
                        className={`px-3 py-1.5 rounded-lg text-sm font-bold border transition-all flex items-center gap-1.5 ${
                          selectedProfileId === p.id
                            ? 'bg-felt-700 text-white border-felt-500'
                            : 'text-gray-400 border-gray-700 hover:text-white hover:bg-gray-800'
                        }`}
                      >
                        {p.isActive && <span className="text-green-400 text-xs">●</span>}
                        {p.name}
                      </button>
                    )}
                    {/* Delete button (hover) */}
                    {renamingId !== p.id && (
                      <button
                        onClick={() => handleDeleteProfile(p.id)}
                        className="absolute -top-1.5 -right-1.5 hidden group-hover:flex h-4 w-4 items-center justify-center bg-red-900/80 rounded-full text-red-300 hover:bg-red-700"
                      >
                        <X size={9} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Selected profile content ── */}
          {selectedProfile && (
            <div className="flex flex-col gap-3 border-t border-gray-800 pt-3">

              {/* Profile header: activate + delete */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-white font-semibold text-sm">{selectedProfile.name}</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExport}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-gray-600 bg-gray-800 text-gray-300 hover:text-white hover:bg-gray-700 transition-all"
                    title={isEn ? 'Export profile as JSON' : 'Exporter le profil en JSON'}
                  >
                    <Download size={12} /> {isEn ? 'Export' : 'Exporter'}
                  </button>
                  <button
                    onClick={handleActivate}
                    disabled={activating}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                      selectedProfile.isActive
                        ? 'bg-green-900/30 text-green-300 border-green-700 hover:bg-red-900/30 hover:text-red-300 hover:border-red-700'
                        : 'bg-gray-800 text-gray-300 border-gray-600 hover:bg-felt-900/30 hover:text-felt-300 hover:border-felt-700'
                    }`}
                  >
                    {selectedProfile.isActive
                      ? <><Check size={12} /> {isEn ? 'Active — click to deactivate' : 'Actif — cliquer pour désactiver'}</>
                      : <><Zap size={12} /> {isEn ? 'Activate this profile' : 'Activer ce profil'}</>
                    }
                  </button>
                </div>
              </div>

              {/* Stack ranges */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">
                    {isEn ? 'Stack ranges' : 'Paliers de stack'}
                  </p>
                  <button onClick={() => setShowAddRange(v => !v)}
                    className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors">
                    <Plus size={13} /> {isEn ? 'Add range' : 'Ajouter'}
                  </button>
                </div>

                <AnimatePresence initial={false}>
                  {showAddRange && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <AddRangeForm isEn={isEn} onAdd={handleCreateRange} onCancel={() => setShowAddRange(false)} />
                    </motion.div>
                  )}
                </AnimatePresence>

                {selectedProfile.stackRanges.length === 0 ? (
                  <p className="text-xs text-gray-500 italic">
                    {isEn ? 'No stack ranges. Add one above.' : 'Aucun palier. Ajoutez-en un.'}
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {selectedProfile.stackRanges.map(sr => (
                      <div key={sr.id} className="relative group">
                        <button
                          onClick={() => handleSelectRange(sr.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                            selectedRangeId === sr.id
                              ? 'bg-purple-700 text-white border-purple-500'
                              : 'text-gray-400 border-gray-700 hover:text-white hover:bg-gray-800'
                          }`}
                        >
                          {sr.label}
                          <span className="ml-1 text-gray-500 font-normal">
                            ({sr.stackMin}–{sr.stackMax ?? '∞'}bb)
                          </span>
                        </button>
                        <button
                          onClick={() => handleDeleteRange(sr.id)}
                          className="absolute -top-1.5 -right-1.5 hidden group-hover:flex h-4 w-4 items-center justify-center bg-red-900/80 rounded-full text-red-300 hover:bg-red-700"
                        >
                          <X size={9} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Position + range editor */}
              {selectedRange && (
                <div className="flex flex-col gap-3 border-t border-gray-800 pt-3">

                  {/* Position tabs */}
                  <div className="flex gap-2 flex-wrap">
                    {positions.map(pos => (
                      <button key={pos} onClick={() => setSelectedPosition(pos)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-bold border transition-all ${
                          selectedPosition === pos
                            ? 'bg-felt-700 text-white border-felt-500'
                            : 'text-gray-400 border-gray-700 hover:text-white hover:bg-gray-800'
                        }`}
                      >
                        {pos}
                      </button>
                    ))}
                  </div>

                  {/* Range editor */}
                  {localMatrix ? (
                    <RangeEditor
                      matrix={localMatrix}
                      onChange={setLocalMatrix}
                      position={selectedPosition}
                      onSave={handleSave}
                      onReset={handleReset}
                      isSaving={isSaving}
                    />
                  ) : (
                    <div className="h-32 flex items-center justify-center">
                      <div className="animate-spin h-6 w-6 border-2 border-felt-500 border-t-transparent rounded-full" />
                    </div>
                  )}

                  {saved && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="text-green-400 text-sm text-center font-semibold flex items-center justify-center gap-1">
                      <Check size={14} /> {isEn ? 'Saved!' : 'Sauvegardé !'}
                    </motion.p>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}
