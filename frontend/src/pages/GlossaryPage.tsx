import { useState } from 'react';
import { Search } from 'lucide-react';
import { GLOSSARY, GlossaryCategory, GlossaryEntry } from '../data/glossary';
import { useLangStore } from '../store/langStore';

// ─── Category meta ─────────────────────────────────────────────────────────────

const CATEGORIES: { id: GlossaryCategory; fr: string; en: string; emoji: string }[] = [
  { id: 'action',   fr: 'Actions',           en: 'Actions',        emoji: '⚡' },
  { id: 'position', fr: 'Positions',         en: 'Positions',      emoji: '📍' },
  { id: 'concept',  fr: 'Concepts',          en: 'Concepts',       emoji: '🧠' },
  { id: 'strength', fr: 'Force des mains',   en: 'Hand strength',  emoji: '💪' },
  { id: 'street',   fr: 'Streets (phases)',  en: 'Streets',        emoji: '🃏' },
  { id: 'board',    fr: 'Textures de board', en: 'Board textures', emoji: '🎴' },
];

// ─── GlossaryPage ──────────────────────────────────────────────────────────────

export function GlossaryPage() {
  const isEn = useLangStore(s => s.lang) === 'en';
  const [search, setSearch] = useState('');

  const q = search.trim().toLowerCase();

  const filtered = q
    ? GLOSSARY.filter(e =>
        e.id.includes(q) ||
        e.fr.toLowerCase().includes(q) ||
        e.en.toLowerCase().includes(q) ||
        e.definitionFr.toLowerCase().includes(q) ||
        e.definitionEn.toLowerCase().includes(q)
      )
    : null;

  return (
    <div className="flex flex-col gap-5 max-w-2xl mx-auto">

      {/* Header */}
      <div className="text-center mb-1">
        <h1 className="text-2xl font-bold text-white">
          📖 {isEn ? 'Poker Glossary' : 'Lexique Poker'}
        </h1>
        <p className="text-gray-400 mt-1 text-sm">
          {isEn
            ? 'All key terms to understand and master the game'
            : 'Tous les termes clés pour comprendre et maîtriser le jeu'}
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={isEn ? 'Search a term…' : 'Rechercher un terme…'}
          className="w-full pl-9 pr-4 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gold-500 transition-colors"
        />
      </div>

      {/* Results */}
      {filtered ? (
        /* ── Search mode: flat list ── */
        <div className="flex flex-col gap-3">
          {filtered.length === 0 ? (
            <p className="text-gray-500 text-center py-10">
              {isEn ? 'No results for' : 'Aucun résultat pour'} «&nbsp;{search}&nbsp;»
            </p>
          ) : (
            filtered.map(entry => (
              <EntryCard key={entry.id} entry={entry} isEn={isEn} />
            ))
          )}
        </div>
      ) : (
        /* ── Browse mode: by category ── */
        CATEGORIES.map(cat => {
          const entries = GLOSSARY.filter(e => e.category === cat.id);
          return (
            <div key={cat.id} className="bg-gray-900/60 rounded-2xl p-5 border border-gray-700">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                {cat.emoji} {isEn ? cat.en : cat.fr}
                <span className="text-xs font-normal text-gray-500 ml-1">
                  ({entries.length})
                </span>
              </h2>
              <div className="flex flex-col gap-2.5">
                {entries.map(entry => (
                  <EntryCard key={entry.id} entry={entry} isEn={isEn} />
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

// ─── Entry card ────────────────────────────────────────────────────────────────

function EntryCard({ entry, isEn }: { entry: GlossaryEntry; isEn: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <button
      onClick={() => setOpen(v => !v)}
      className="w-full text-left bg-gray-800/50 hover:bg-gray-800/80 rounded-xl border border-gray-700/50 hover:border-gray-600 transition-all overflow-hidden"
    >
      <div className="flex items-center justify-between px-3.5 py-2.5 gap-3">
        <p className="text-gold-400 font-bold text-sm">{isEn ? entry.en : entry.fr}</p>
        <span className="text-gray-600 text-xs shrink-0">{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div className="px-3.5 pb-3 border-t border-gray-700/50">
          <p className="text-gray-300 text-xs leading-relaxed pt-2.5">
            {isEn ? entry.definitionEn : entry.definitionFr}
          </p>
        </div>
      )}
    </button>
  );
}
