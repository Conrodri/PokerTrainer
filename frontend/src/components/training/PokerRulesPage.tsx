import { useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useLangStore } from '../../store/langStore';
import { Hand } from '../poker/Card';
import { PokerTable, CLOCKWISE, CLOCKWISE_8, CLOCKWISE_3, CLOCKWISE_HU, POSITION_COLORS } from '../poker/PokerTable';
import { Position, Position8, TableFormat } from '../../types/poker';
import { PokerTerm } from '../ui/PokerTerm';
import { TutorialHand } from '../tutorial/HandTutorialModal';
import { useIsMobile } from '../../hooks/useIsMobile';

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-900/50 rounded-xl px-3 py-2.5 border border-gray-800">
      <h2 className="text-sm font-bold text-white mb-2 flex items-center gap-1.5">{title}</h2>
      {children}
    </div>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'jeu',      icon: '🃏', fr: 'Le jeu',   en: 'The game'   },
  { id: 'partie',   icon: '🎲', fr: 'Déroulé',  en: 'The hand'   },
  { id: 'table',    icon: '📍', fr: 'La table', en: 'The table'  },
  { id: 'modules',  icon: '🎯', fr: 'Modules',  en: 'Modules'    },
] as const;
type Tab = typeof TABS[number]['id'];

// ─── Interactive table constants ─────────────────────────────────────────────

const POSITION_TIPS: Record<Position8, { fr: string; en: string }> = {
  BTN: {
    fr: 'La meilleure position. Tu agis en DERNIER post-flop — tu vois toutes les actions avant de décider. Range la plus large (~45%). Le jeton D tourne à chaque main.',
    en: 'The best position. You act LAST post-flop — you see all actions before deciding. Widest range (~45%). The D token rotates each hand.',
  },
  SB: {
    fr: 'Position délicate. Tu postes 0.5 BB obligatoire. Tu as un désavantage de position post-flop (tu agis avant BB). Range assez large mais jeu post-flop difficile.',
    en: 'Tricky position. You post 0.5 BB forced. You have a positional disadvantage post-flop (you act before BB). Fairly wide range but tough post-flop play.',
  },
  BB: {
    fr: "Tu as déjà payé 1 BB. Tu es le DERNIER à parler pré-flop, ce qui te donne un avantage pour fermer l'action. Post-flop tu es en OOP (hors position) sauf face au SB.",
    en: 'You already paid 1 BB. You are the LAST to act pre-flop, giving you an advantage to close the action. Post-flop you are OOP (out of position) except vs. SB.',
  },
  UTG: {
    fr: "La pire position. Tu agis en PREMIER sans aucune information sur les autres joueurs. Joue uniquement tes meilleures mains (~15%). Chaque adversaire est encore à parler.",
    en: 'The worst position. You act FIRST with no information on other players. Only play your best hands (~15%). Every opponent still has to act after you.',
  },
  UTG1: {
    fr: "Position très serrée, juste après UTG. Joue des mains solides (~17%). 6 joueurs actent encore après toi — tu n'as presque aucune information.",
    en: 'Very tight position, right after UTG. Play solid hands (~17%). 6 players still act after you — you have almost no information.',
  },
  LJ: {
    fr: "Position intermédiaire (Lojack). Tu peux élargir légèrement ta range (~19%) mais reste discipliné. 5 joueurs actent encore après toi.",
    en: 'Middle position (Lojack). You can widen your range slightly (~19%) but stay disciplined. 5 players still act after you.',
  },
  HJ: {
    fr: "Position intermédiaire, légèrement meilleure qu'UTG. Tu peux jouer quelques mains de plus (~20%) mais reste relativement serré. 3 joueurs actent encore après toi.",
    en: 'Middle position, slightly better than UTG. You can play a few more hands (~20%) but stay relatively tight. 3 players still act after you.',
  },
  CO: {
    fr: 'Bonne position, juste avant le Button. Tu peux voler les blindes régulièrement et jouer une range assez large (~26%). Seulement BTN, SB et BB actent après toi.',
    en: 'Good position, right before the Button. You can steal the blinds regularly and play a fairly wide range (~26%). Only BTN, SB and BB act after you.',
  },
};

const FORMAT_POSITIONS: Record<TableFormat, Position8[]> = {
  '6max': CLOCKWISE as Position8[],
  '8max': CLOCKWISE_8 as Position8[],
  '3max': CLOCKWISE_3 as Position8[],
  'hu':   CLOCKWISE_HU as Position8[],
};

const FORMAT_RANGE_PCT: Record<TableFormat, Partial<Record<Position8, string>>> = {
  '6max': { BTN: '~45%', SB: '~35%', BB: 'Défend', UTG: '~15%', HJ: '~20%', CO: '~26%' },
  '8max': { BTN: '~45%', SB: '~35%', BB: 'Défend', UTG: '~13%', UTG1: '~17%', LJ: '~19%', HJ: '~22%', CO: '~27%' },
  '3max': { BTN: '~50%', SB: '~40%', BB: 'Défend' },
  'hu':   { BTN: '~65%', BB: 'Défend' },
};

const FORMAT_RANGE_PCT_EN: Record<TableFormat, Partial<Record<Position8, string>>> = {
  '6max': { BTN: '~45%', SB: '~35%', BB: 'Defend', UTG: '~15%', HJ: '~20%', CO: '~26%' },
  '8max': { BTN: '~45%', SB: '~35%', BB: 'Defend', UTG: '~13%', UTG1: '~17%', LJ: '~19%', HJ: '~22%', CO: '~27%' },
  '3max': { BTN: '~50%', SB: '~40%', BB: 'Defend' },
  'hu':   { BTN: '~65%', BB: 'Defend' },
};

const TABLE_FORMATS: { id: TableFormat; label: string; players: number }[] = [
  { id: '6max', label: '6-Max', players: 6 },
  { id: '8max', label: '8-Max', players: 8 },
  { id: '3max', label: '3-Max', players: 3 },
  { id: 'hu',   label: 'HU',    players: 2 },
];

type PosGroupDef = { key: string; colorClass: string; dotClass: string; descFr: string; descEn: string };

const FORMAT_GROUPS: Record<TableFormat, PosGroupDef[]> = {
  '6max': [
    { key: 'BTN',       colorClass: 'border-green-700/50 bg-green-900/20 text-green-300',   dotClass: 'bg-green-500',  descFr: 'La meilleure — tu parles en dernier',    descEn: 'The best — you act last' },
    { key: 'CO/HJ',     colorClass: 'border-yellow-700/50 bg-yellow-900/20 text-yellow-300', dotClass: 'bg-yellow-500', descFr: 'Bonnes — tu parles vers la fin',           descEn: 'Good — you act near the end' },
    { key: 'UTG/SB',    colorClass: 'border-red-700/50 bg-red-900/20 text-red-300',          dotClass: 'bg-red-500',    descFr: 'Les moins bonnes — tu parles en premier', descEn: 'The worst — you act first' },
  ],
  '8max': [
    { key: 'BTN',          colorClass: 'border-green-700/50 bg-green-900/20 text-green-300',    dotClass: 'bg-green-500',  descFr: 'La meilleure — tu parles en dernier',    descEn: 'The best — you act last' },
    { key: 'CO/HJ',        colorClass: 'border-yellow-700/50 bg-yellow-900/20 text-yellow-300', dotClass: 'bg-yellow-500', descFr: 'Bonnes — tu parles vers la fin',           descEn: 'Good — you act near the end' },
    { key: 'LJ/UTG1/UTG',  colorClass: 'border-orange-700/50 bg-orange-900/20 text-orange-300', dotClass: 'bg-orange-500', descFr: 'Early — range la plus serrée',            descEn: 'Early — tightest range' },
    { key: 'SB',           colorClass: 'border-red-700/50 bg-red-900/20 text-red-300',          dotClass: 'bg-red-500',    descFr: 'Délicate — hors position post-flop',     descEn: 'Tricky — out of position post-flop' },
  ],
  '3max': [
    { key: 'BTN', colorClass: 'border-green-700/50 bg-green-900/20 text-green-300',   dotClass: 'bg-green-500',  descFr: 'La meilleure — tu parles en dernier',       descEn: 'The best — you act last' },
    { key: 'SB',  colorClass: 'border-yellow-700/50 bg-yellow-900/20 text-yellow-300', dotClass: 'bg-yellow-500', descFr: 'Délicate — hors position post-flop',         descEn: 'Tricky — out of position post-flop' },
    { key: 'BB',  colorClass: 'border-red-700/50 bg-red-900/20 text-red-300',          dotClass: 'bg-red-500',    descFr: 'Défend — poste 1 BB obligatoire',            descEn: 'Defend — posts 1 BB forced' },
  ],
  'hu': [
    { key: 'BTN', colorClass: 'border-green-700/50 bg-green-900/20 text-green-300', dotClass: 'bg-green-500', descFr: 'La meilleure — BTN = SB, tu parles en dernier post-flop', descEn: 'The best — BTN = SB, you act last post-flop' },
    { key: 'BB',  colorClass: 'border-red-700/50 bg-red-900/20 text-red-300',       dotClass: 'bg-red-500',   descFr: 'Défend — poste 1 BB, tu agis en premier post-flop',     descEn: 'Defend — posts 1 BB, you act first post-flop' },
  ],
};

// ─── PokerRulesPage ───────────────────────────────────────────────────────────

export function PokerRulesPage() {
  const isEn = useLangStore(s => s.lang) === 'en';
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [activePos, setActivePos] = useState<Position8>('BTN');
  const [tab, setTab] = useState<Tab>('jeu');
  const [tableFormat, setTableFormat] = useState<TableFormat>('6max');

  const formatPositions = FORMAT_POSITIONS[tableFormat];
  const rangePct = isEn ? FORMAT_RANGE_PCT_EN[tableFormat] : FORMAT_RANGE_PCT[tableFormat];

  function handleFormatChange(fmt: TableFormat) {
    setTableFormat(fmt);
    const pos = FORMAT_POSITIONS[fmt];
    if (!pos.includes(activePos as Position8)) setActivePos(pos[0]);
  }

  const hands = [
    { emoji: '📋', fr: 'Carte haute',        en: 'High card',       descFr: 'La carte la plus haute gagne',           descEn: 'The highest card wins',              cards: ['As', 'Kd'] },
    { emoji: '1️⃣', fr: 'Paire',             en: 'Pair',            descFr: '2 cartes identiques',                   descEn: '2 identical cards',                  cards: ['Ac', 'Ad'] },
    { emoji: '2️⃣', fr: 'Double paire',      en: 'Two pair',        descFr: '2 paires différentes',                  descEn: '2 different pairs',                  cards: ['Jc', 'Jd', '8h', '8s'] },
    { emoji: '3️⃣', fr: 'Brelan',            en: 'Three of a kind', descFr: '3 cartes identiques',                   descEn: '3 identical cards',                  cards: ['Qc', 'Qd', 'Qh'] },
    { emoji: '📈', fr: 'Suite',              en: 'Straight',        descFr: '5 cartes qui se suivent',               descEn: '5 consecutive cards',                cards: ['9d', '8c', '7h', '6s', '5d'] },
    { emoji: '🎨', fr: 'Couleur',            en: 'Flush',           descFr: '5 cartes de même couleur',              descEn: '5 cards of the same suit',           cards: ['Ac', 'Tc', '8c', '5c', '2c'] },
    { emoji: '🏠', fr: 'Full house',         en: 'Full house',      descFr: 'Brelan + paire',                        descEn: 'Three of a kind + pair',             cards: ['Kc', 'Kd', 'Kh', '8c', '8d'] },
    { emoji: '💪', fr: 'Carré',             en: 'Four of a kind',  descFr: '4 cartes identiques',                   descEn: '4 identical cards',                  cards: ['Ac', 'Ad', 'Ah', 'As'] },
    { emoji: '✨', fr: 'Quinte flush',       en: 'Straight flush',  descFr: 'Suite de même couleur',                 descEn: 'Consecutive + same suit',            cards: ['9h', '8h', '7h', '6h', '5h'] },
    { emoji: '🏆', fr: 'Quinte flush royale',en: 'Royal flush',     descFr: 'A-K-Q-J-10 même couleur — imbattable !',descEn: 'A-K-Q-J-10 same suit — unbeatable!', cards: ['As', 'Ks', 'Qs', 'Js', 'Ts'] },
  ] as const;

  const steps = [
    { num: 1, color: 'bg-blue-500',   label: 'Préflop',   descFr: 'Chaque joueur reçoit 2 cartes secrètes. On mise, on suit ou on se couche.', descEn: 'Each player receives 2 secret cards. You bet, call, or fold.' },
    { num: 2, color: 'bg-green-500',  label: 'Flop',      descFr: 'Le croupier pose 3 cartes au milieu. Ces cartes appartiennent à tout le monde.', descEn: 'The dealer places 3 community cards. Everyone shares them.' },
    { num: 3, color: 'bg-yellow-500', label: 'Turn',      descFr: 'Une 4ème carte est posée au milieu. Nouveau tour de mises.', descEn: 'A 4th card is placed in the middle. Another betting round.' },
    { num: 4, color: 'bg-red-500',    label: 'River',     descFr: 'La 5ème et dernière carte. Dernier tour de mises.', descEn: 'The 5th and last card. Final betting round.' },
    { num: 5, color: 'bg-yellow-400', label: 'Showdown',  descFr: 'Les joueurs restants montrent leurs cartes. La meilleure combinaison gagne !', descEn: 'Remaining players show their cards. The best hand wins!' },
  ] as const;

  const modules = [
    { id: 'preflop',   label: isEn ? '🎯 Preflop' : '🎯 Préflop',       color: 'bg-felt-700 hover:bg-felt-600 border-felt-500' },
    { id: 'outs',      label: '🎲 Outs',                                  color: 'bg-blue-800 hover:bg-blue-700 border-blue-600' },
    { id: 'equity',    label: isEn ? '⚖️ Equity' : '⚖️ Équité',         color: 'bg-purple-800 hover:bg-purple-700 border-purple-600' },
    { id: 'potodds',   label: '📊 Pot Odds',                              color: 'bg-cyan-800 hover:bg-cyan-700 border-cyan-600' },
    { id: 'postflop',  label: '🃏 Post-flop',                             color: 'bg-rose-800 hover:bg-rose-700 border-rose-600' },
    { id: 'betsizing', label: '💰 Bet Sizing',                            color: 'bg-orange-800 hover:bg-orange-700 border-orange-600' },
    { id: 'fullhand',  label: isEn ? '🎰 Full Hand' : '🎰 Main complète', color: 'bg-indigo-800 hover:bg-indigo-700 border-indigo-600' },
    { id: 'bluff',     label: '🎭 Bluff',                                 color: 'bg-pink-800 hover:bg-pink-700 border-pink-600' },
  ] as const;

  const ranks = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];

  return (
    <div className="flex flex-col gap-3 max-w-xl mx-auto">
      {/* Page title */}
      <div className="text-center">
        <h1 className="text-lg font-black text-white">
          📚 {isEn ? 'Poker Rules' : 'Règles du Poker'}
        </h1>
        <p className="text-gray-400 text-xs mt-0.5">
          {isEn ? 'Everything you need to know to get started' : 'Tout ce qu\'il faut savoir pour comprendre le jeu'}
        </p>
      </div>

      {/* ── Tab bar ── */}
      <div className="flex gap-1.5 overflow-x-auto pb-0.5 -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all shrink-0 border ${
              tab === t.id
                ? 'bg-yellow-600 border-yellow-500 text-white'
                : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200 hover:bg-gray-700'
            }`}
          >
            <span className="leading-none">{t.icon}</span>
            <span>{isEn ? t.en : t.fr}</span>
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -3 }}
          transition={{ duration: 0.12 }}
          className="flex flex-col gap-2.5"
        >

          {/* ══ LE JEU ══ */}
          {tab === 'jeu' && <>
            <Section title={`🃏 ${isEn ? 'The deck' : 'Le jeu de cartes'}`}>
              <p className="text-[11px] text-gray-400 font-mono bg-gray-800 rounded-lg px-2 py-1 inline-block mb-2">
                52 {isEn ? 'cards' : 'cartes'} = 4 {isEn ? 'suits' : 'couleurs'} × 13 {isEn ? 'ranks' : 'valeurs'}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mb-2">
                {[
                  { sym: '♠', color: 'text-gray-100',  fr: 'Pique',   en: 'Spades'   },
                  { sym: '♥', color: 'text-red-500',   fr: 'Cœur',    en: 'Hearts'   },
                  { sym: '♦', color: 'text-blue-400',  fr: 'Carreau', en: 'Diamonds' },
                  { sym: '♣', color: 'text-green-400', fr: 'Trèfle',  en: 'Clubs'    },
                ].map(s => (
                  <div key={s.sym} className="flex items-center gap-1.5 bg-gray-800/50 rounded-lg px-2 py-1.5 border border-gray-700">
                    <span className={`text-lg leading-none ${s.color}`}>{s.sym}</span>
                    <span className="text-[11px] text-gray-300 font-semibold">{isEn ? s.en : s.fr}</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-gray-500 mb-2">
                {isEn ? '4-colour deck: each suit has its own colour.' : 'Jeu 4 couleurs : chaque couleur a sa teinte propre.'}
              </p>
              <p className="text-[11px] text-gray-400 mb-1.5 font-semibold">
                {isEn ? 'Rank order (weakest → strongest)' : 'Ordre des rangs (plus faible → plus fort)'}
              </p>
              <div className="flex flex-wrap gap-1 mb-2">
                {ranks.map(r => (
                  <span key={r} className={`px-1.5 py-0.5 rounded text-[11px] font-bold border ${
                    r === 'A'
                      ? 'bg-yellow-700/40 text-yellow-300 border-yellow-600'
                      : 'bg-gray-800 text-gray-300 border-gray-700'
                  }`}>
                    {r}
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-yellow-300">⭐ As (A) = {isEn ? 'strongest card' : 'carte la plus forte'}</p>
            </Section>

            <Section title={`🏆 ${isEn ? 'Hand rankings (weakest → strongest)' : 'Combinaisons (plus faible → plus fort)'}`}>
              <div className="space-y-1">
                {hands.map((h, i) => (
                  <div key={i} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg ${
                    i === 9 ? 'bg-yellow-900/20 border border-yellow-700/40' : 'bg-gray-800/50'
                  }`}>
                    <span className="text-xs w-4 text-center shrink-0 leading-none">{h.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-white text-[11px]">{isEn ? h.en : h.fr}</span>
                      <span className="text-gray-500 text-[10px] ml-1">— {isEn ? h.descEn : h.descFr}</span>
                    </div>
                    <Hand cards={h.cards as any} size="xs" animate={false} context="display" cardStyle="fourcolor" />
                  </div>
                ))}
              </div>
            </Section>
          </>}

          {/* ══ LA PARTIE (DÉROULÉ) ══ */}
          {tab === 'partie' && (
            <>
            <Section title={`🎲 ${isEn ? 'How a hand plays out' : 'Comment se déroule une partie'}`}>
              <div className="flex flex-col gap-2 mb-3">
                {steps.map(step => {
                  const STEP_TERM: Record<number, string> = { 1: 'preflop', 2: 'flop', 3: 'turn', 4: 'river', 5: 'showdown' };
                  const termId = STEP_TERM[step.num];
                  return (
                    <div key={step.num} className="flex items-start gap-2">
                      <div className={`${step.color} text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center shrink-0 mt-0.5`}>
                        {step.num}
                      </div>
                      <div>
                        <span className="font-bold text-white text-xs">
                          {termId ? <PokerTerm id={termId}>{step.label}</PokerTerm> : step.label}
                        </span>
                        <span className="text-gray-400 text-[11px] ml-1.5">— {isEn ? step.descEn : step.descFr}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="bg-gray-800/60 rounded-lg p-2.5 border border-gray-700">
                <p className="text-[11px] text-gray-400 mb-1.5 font-semibold">
                  {isEn ? 'Example at showdown:' : 'Exemple au showdown :'}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <div>
                    <p className="text-[10px] text-gray-500 mb-1">{isEn ? 'Your hand' : 'Ta main'}</p>
                    <Hand cards={['Ah', 'Kd']} size="xs" animate={false} context="display" cardStyle="fourcolor" />
                  </div>
                  <span className="text-gray-500 font-bold">+</span>
                  <div>
                    <p className="text-[10px] text-gray-500 mb-1">{isEn ? 'Community' : 'Communes'}</p>
                    <Hand cards={['Qs', 'Jc', 'Tc', '2h', '5d']} size="xs" animate={false} context="display" cardStyle="fourcolor" />
                  </div>
                  <span className="text-gray-500">=</span>
                  <span className="text-green-400 font-bold text-xs">
                    {isEn ? '🏆 Straight (A-K-Q-J-T)!' : '🏆 Suite (A-K-Q-J-T) !'}
                  </span>
                </div>
              </div>
            </Section>

            <Section title={isEn ? "🚶 Hand: step by step" : "🚶 Une main pas à pas"}>
              <TutorialHand isEn={isEn} />
            </Section>
            </>
          )}


          {/* ══ LA TABLE ══ */}
          {tab === 'table' && <>
            {/* Format selector */}
            <div className="flex gap-1.5">
              {TABLE_FORMATS.map(f => (
                <button
                  key={f.id}
                  onClick={() => handleFormatChange(f.id)}
                  className={`flex-1 flex flex-col items-center py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                    tableFormat === f.id
                      ? 'bg-yellow-600 border-yellow-500 text-white'
                      : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                  }`}
                >
                  <span className="font-bold">{f.label}</span>
                  <span className="text-[10px] opacity-70">{f.players} {isEn ? 'players' : 'joueurs'}</span>
                </button>
              ))}
            </div>

            <Section title={`📍 ${isEn ? 'Positions' : 'Les positions'}`}>
              <p className="text-[11px] text-gray-400 mb-2">
                {isEn ? 'Your seat at the table matters a lot!' : 'Ta place à la table est très importante au poker !'}
              </p>
              <div className="flex flex-col gap-1.5 mb-2">
                {FORMAT_GROUPS[tableFormat].map(grp => {
                  const POS_LABEL: Record<string, ReactNode> = {
                    'BTN':        <><PokerTerm id="btn">BTN</PokerTerm> (Button)</>,
                    'CO/HJ':      <><PokerTerm id="co">CO</PokerTerm> / <PokerTerm id="hj">HJ</PokerTerm></>,
                    'UTG/SB':     <><PokerTerm id="utg">UTG</PokerTerm> / <PokerTerm id="sb">SB</PokerTerm></>,
                    'LJ/UTG1/UTG':<>LJ / UTG1 / <PokerTerm id="utg">UTG</PokerTerm></>,
                    'SB':         <><PokerTerm id="sb">SB</PokerTerm></>,
                    'BB':         <><PokerTerm id="bb">BB</PokerTerm></>,
                  };
                  return (
                    <div key={grp.key} className={`rounded-lg p-2 border ${grp.colorClass} flex items-center gap-2`}>
                      <div className={`${grp.dotClass} rounded-full w-2 h-2 shrink-0`} />
                      <span className="font-bold text-xs">{POS_LABEL[grp.key] ?? grp.key}</span>
                      <span className="text-[11px] opacity-70">— {isEn ? grp.descEn : grp.descFr}</span>
                    </div>
                  );
                })}
              </div>
              <div className="bg-green-900/20 border border-green-700/50 rounded-lg px-3 py-1.5">
                <p className="text-green-300 font-bold text-xs">
                  {isEn
                    ? <>✅ <PokerTerm id="ip">In position</PokerTerm> = act LAST = huge advantage!</>
                    : <>✅ <PokerTerm id="ip">En position</PokerTerm> = parler EN DERNIER = gros avantage !</>}
                </p>
              </div>
            </Section>

            <Section title={`🎮 ${isEn ? 'Interactive table' : 'Table interactive'}`}>
              <p className="text-[11px] text-gray-400 mb-2">
                {isEn ? 'Click a seat to see tips for each position.' : 'Clique sur une place pour voir les conseils de chaque position.'}
              </p>

              <div className="mb-2">
                <PokerTable
                  heroPosition={activePos as Position}
                  onPositionChange={(p) => setActivePos(p as Position8)}
                  interactive
                  format={tableFormat}
                  compact={isMobile}
                />
              </div>

              <motion.div
                key={`${tableFormat}-${activePos}`}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.12 }}
                className="rounded-lg px-3 py-2 border mb-2"
                style={{
                  background: `${POSITION_COLORS[activePos]}0f`,
                  borderColor: `${POSITION_COLORS[activePos]}30`,
                }}
              >
                <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: POSITION_COLORS[activePos] }} />
                  <span className="text-white font-bold text-sm">{activePos}</span>
                  <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full" style={{
                    background: `${POSITION_COLORS[activePos]}22`,
                    color: POSITION_COLORS[activePos],
                    border: `1px solid ${POSITION_COLORS[activePos]}44`,
                  }}>
                    {rangePct[activePos]}
                  </span>
                  {activePos === 'BTN' && <span className="text-[10px] px-1.5 py-0.5 bg-gray-700 text-gray-300 rounded-full">{isEn ? '⬤ Dealer' : '⬤ Donneur'}</span>}
                  {activePos === 'SB'  && <span className="text-[10px] px-1.5 py-0.5 bg-blue-900/50 text-blue-300 rounded-full border border-blue-800">{isEn ? 'Posts ½ BB' : 'Poste ½ BB'}</span>}
                  {activePos === 'BB'  && <span className="text-[10px] px-1.5 py-0.5 bg-red-900/50 text-red-300 rounded-full border border-red-800">{isEn ? 'Posts 1 BB' : 'Poste 1 BB'}</span>}
                </div>
                <p className="text-gray-300 text-xs leading-snug">
                  {isEn ? POSITION_TIPS[activePos].en : POSITION_TIPS[activePos].fr}
                </p>
              </motion.div>

              <div className={`grid gap-1.5 mb-2 ${formatPositions.length <= 3 ? 'grid-cols-3' : formatPositions.length <= 6 ? 'grid-cols-3' : 'grid-cols-4'}`}>
                {formatPositions.map(pos => (
                  <button
                    key={pos}
                    onClick={() => setActivePos(pos)}
                    className={`flex items-center gap-1.5 p-2 rounded-lg border text-left transition-all ${
                      activePos === pos
                        ? 'border-white/20 bg-gray-800/80'
                        : 'border-gray-800 bg-gray-900/30 hover:border-gray-700 hover:bg-gray-900/60'
                    }`}
                  >
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: POSITION_COLORS[pos] }} />
                    <div className="min-w-0">
                      <p className="text-white text-[11px] font-bold leading-none">{pos}</p>
                      <p className="text-gray-500 text-[10px] mt-0.5">{rangePct[pos]}</p>
                    </div>
                    {activePos === pos && <div className="ml-auto w-1.5 h-1.5 rounded-full shrink-0" style={{ background: POSITION_COLORS[pos] }} />}
                  </button>
                ))}
              </div>

              <Link to={`/training?module=preflop&tableFormat=${tableFormat}`}>
                <button className="w-full py-2 rounded-lg bg-yellow-600 hover:bg-yellow-500 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5">
                  {isEn ? `Train from ${activePos} (${TABLE_FORMATS.find(f => f.id === tableFormat)?.label}) →` : `S'entraîner depuis ${activePos} (${TABLE_FORMATS.find(f => f.id === tableFormat)?.label}) →`}
                  <ArrowRight size={13} />
                </button>
              </Link>
            </Section>
          </>}

          {/* ══ MODULES ══ */}
          {tab === 'modules' && (
            <Section title={`🎯 ${isEn ? 'PokerPeak modules' : 'Les modules de PokerPeak'}`}>
              <p className="text-[11px] text-gray-400 mb-2">
                {isEn ? 'Now that you know the rules, go practice!' : 'Maintenant que tu connais les règles, va t\'entraîner !'}
              </p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {modules.map(m => (
                  <button
                    key={m.id}
                    onClick={() => navigate(`/training?module=${m.id}`)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold text-white border transition-all ${m.color}`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => navigate('/training?module=preflop')}
                className="w-full py-2.5 rounded-lg bg-yellow-600 hover:bg-yellow-500 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2"
              >
                {isEn ? 'Start training →' : 'Commencer l\'entraînement →'}
              </button>
            </Section>
          )}

        </motion.div>
      </AnimatePresence>
    </div>
  );
}
