import { useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useLangStore } from '../../store/langStore';
import { Hand } from '../poker/Card';
import { PokerTable } from '../poker/PokerTable';
import { Position } from '../../types/poker';
import { PokerTerm } from '../ui/PokerTerm';
import { TutorialHand } from '../tutorial/HandTutorialModal';

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-900/60 rounded-2xl p-5 border border-gray-700">
      <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">{title}</h2>
      {children}
    </div>
  );
}

// ─── Interactive table constants ─────────────────────────────────────────────

const CLOCKWISE: Position[] = ['BTN', 'SB', 'BB', 'UTG', 'HJ', 'CO'];

const POSITION_COLORS: Record<Position, string> = {
  BTN: '#16a34a', SB: '#2563eb', BB: '#dc2626',
  UTG: '#b45309', HJ: '#7c3aed', CO: '#0891b2',
};

const POSITION_TIPS: Record<Position, { fr: string; en: string }> = {
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
  HJ: {
    fr: "Position intermédiaire, légèrement meilleure qu'UTG. Tu peux jouer quelques mains de plus (~20%) mais reste relativement serré. 3 joueurs actent encore après toi.",
    en: 'Middle position, slightly better than UTG. You can play a few more hands (~20%) but stay relatively tight. 3 players still act after you.',
  },
  CO: {
    fr: 'Bonne position, juste avant le Button. Tu peux voler les blindes régulièrement et jouer une range assez large (~26%). Seulement BTN, SB et BB actent après toi.',
    en: 'Good position, right before the Button. You can steal the blinds regularly and play a fairly wide range (~26%). Only BTN, SB and BB act after you.',
  },
};

// ─── PokerRulesPage ───────────────────────────────────────────────────────────

export function PokerRulesPage() {
  const isEn = useLangStore(s => s.lang) === 'en';
  const navigate = useNavigate();
  const [activePos, setActivePos] = useState<Position>('BTN');

  const rangePct: Record<Position, string> = {
    BTN: '~45%', SB: '~35%', BB: isEn ? 'Defend' : 'Défend',
    UTG: '~15%', HJ: '~20%', CO: '~26%',
  };

  // Only the cards that define the combination — no filler cards
  const hands = [
    { emoji: '📋', fr: 'Carte haute',        en: 'High card',        descFr: 'La carte la plus haute gagne',   descEn: 'The highest card wins',             cards: ['As', 'Kd'] },
    { emoji: '1️⃣', fr: 'Paire',              en: 'Pair',             descFr: '2 cartes identiques',            descEn: '2 identical cards',                 cards: ['Ac', 'Ad'] },
    { emoji: '2️⃣', fr: 'Double paire',       en: 'Two pair',         descFr: '2 paires différentes',           descEn: '2 different pairs',                 cards: ['Jc', 'Jd', '8h', '8s'] },
    { emoji: '3️⃣', fr: 'Brelan',             en: 'Three of a kind',  descFr: '3 cartes identiques',            descEn: '3 identical cards',                 cards: ['Qc', 'Qd', 'Qh'] },
    { emoji: '📈', fr: 'Suite',               en: 'Straight',         descFr: '5 cartes qui se suivent',        descEn: '5 consecutive cards',               cards: ['9d', '8c', '7h', '6s', '5d'] },
    { emoji: '🎨', fr: 'Couleur',             en: 'Flush',            descFr: '5 cartes de même couleur',       descEn: '5 cards of the same suit',          cards: ['Ac', 'Tc', '8c', '5c', '2c'] },
    { emoji: '🏠', fr: 'Full house',          en: 'Full house',       descFr: 'Brelan + paire',                 descEn: 'Three of a kind + pair',            cards: ['Kc', 'Kd', 'Kh', '8c', '8d'] },
    { emoji: '💪', fr: 'Carré',              en: 'Four of a kind',   descFr: '4 cartes identiques',            descEn: '4 identical cards',                 cards: ['Ac', 'Ad', 'Ah', 'As'] },
    { emoji: '✨', fr: 'Quinte flush',        en: 'Straight flush',   descFr: 'Suite de même couleur',          descEn: 'Consecutive + same suit',           cards: ['9h', '8h', '7h', '6h', '5h'] },
    { emoji: '🏆', fr: 'Quinte flush royale', en: 'Royal flush',      descFr: 'A-K-Q-J-10 même couleur — imbattable !', descEn: 'A-K-Q-J-10 same suit — unbeatable!', cards: ['As', 'Ks', 'Qs', 'Js', 'Ts'] },
  ] as const;

  const steps = [
    {
      num: 1, color: 'bg-blue-500', label: 'Préflop',
      descFr: 'Chaque joueur reçoit 2 cartes secrètes. On mise, on suit ou on se couche.',
      descEn: 'Each player receives 2 secret cards. You bet, call, or fold.',
    },
    {
      num: 2, color: 'bg-green-500', label: 'Flop',
      descFr: 'Le croupier pose 3 cartes au milieu. Ces cartes appartiennent à tout le monde.',
      descEn: 'The dealer places 3 community cards. Everyone shares them.',
    },
    {
      num: 3, color: 'bg-yellow-500', label: 'Turn',
      descFr: 'Une 4ème carte est posée au milieu. Nouveau tour de mises.',
      descEn: 'A 4th card is placed in the middle. Another betting round.',
    },
    {
      num: 4, color: 'bg-red-500', label: 'River',
      descFr: 'La 5ème et dernière carte. Dernier tour de mises.',
      descEn: 'The 5th and last card. Final betting round.',
    },
    {
      num: 5, color: 'bg-yellow-400', label: 'Showdown',
      descFr: 'Les joueurs restants montrent leurs cartes. La meilleure combinaison avec ses 2 cartes + les 5 cartes du milieu gagne !',
      descEn: 'Remaining players show their cards. The best 5-card hand using your 2 cards + the 5 community cards wins!',
    },
  ] as const;

  const actions = [
    {
      label: 'FOLD',
      emoji: '🚫',
      color: 'border-red-600 bg-red-900/20 text-red-300',
      badge: 'bg-red-700',
      descFr: 'Tu te couches. Tu abandonnes tes cartes et tu ne paies plus rien.',
      descEn: 'You fold. You give up your cards and owe nothing more.',
    },
    {
      label: 'CHECK',
      emoji: '⏸️',
      color: 'border-gray-600 bg-gray-800/40 text-gray-300',
      badge: 'bg-gray-600',
      descFr: 'Tu passes sans miser. Possible seulement si personne n\'a misé avant toi.',
      descEn: 'You pass without betting. Only possible if no one has bet yet.',
    },
    {
      label: 'CALL',
      emoji: '✅',
      color: 'border-blue-600 bg-blue-900/20 text-blue-300',
      badge: 'bg-blue-700',
      descFr: 'Tu suis la mise du joueur précédent.',
      descEn: 'You match the previous player\'s bet.',
    },
    {
      label: 'RAISE',
      emoji: '💰',
      color: 'border-yellow-600 bg-yellow-900/20 text-yellow-300',
      badge: 'bg-yellow-600',
      descFr: 'Tu relances ! Tu misés plus que le joueur précédent pour mettre la pression.',
      descEn: 'You raise! You bet more than the previous player to apply pressure.',
    },
  ] as const;

  const positions = [
    {
      label: 'BTN (Button)',
      quality: 'green',
      colorClass: 'border-green-600 bg-green-900/20 text-green-300',
      dotClass: 'bg-green-500',
      descFr: 'La meilleure position — tu parles en dernier, tu vois ce que font les autres',
      descEn: 'The best position — you act last, you see what others do',
    },
    {
      label: 'CO, HJ',
      quality: 'yellow',
      colorClass: 'border-yellow-600 bg-yellow-900/20 text-yellow-300',
      dotClass: 'bg-yellow-500',
      descFr: 'Bonnes positions — tu parles vers la fin',
      descEn: 'Good positions — you act near the end',
    },
    {
      label: 'UTG, SB',
      quality: 'red',
      colorClass: 'border-red-600 bg-red-900/20 text-red-300',
      dotClass: 'bg-red-500',
      descFr: 'Les moins bonnes — tu parles en premier, sans savoir ce que font les autres',
      descEn: 'The worst positions — you act first, without knowing what others will do',
    },
  ] as const;

  const modules = [
    { id: 'preflop',   label: isEn ? '🎯 Preflop' : '🎯 Préflop',        color: 'bg-felt-700 hover:bg-felt-600 border-felt-500' },
    { id: 'outs',      label: isEn ? '🎲 Outs' : '🎲 Outs',              color: 'bg-blue-800 hover:bg-blue-700 border-blue-600' },
    { id: 'equity',    label: isEn ? '⚖️ Equity' : '⚖️ Équité',          color: 'bg-purple-800 hover:bg-purple-700 border-purple-600' },
    { id: 'potodds',   label: isEn ? '📊 Pot Odds' : '📊 Pot Odds',      color: 'bg-cyan-800 hover:bg-cyan-700 border-cyan-600' },
    { id: 'postflop',  label: isEn ? '🃏 Post-flop' : '🃏 Post-flop',    color: 'bg-rose-800 hover:bg-rose-700 border-rose-600' },
    { id: 'betsizing', label: isEn ? '💰 Bet Sizing' : '💰 Bet Sizing',  color: 'bg-orange-800 hover:bg-orange-700 border-orange-600' },
    { id: 'fullhand',  label: isEn ? '🎰 Full Hand' : '🎰 Main complète', color: 'bg-indigo-800 hover:bg-indigo-700 border-indigo-600' },
  ] as const;

  const ranks = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];

  return (
    <div className="flex flex-col gap-5 max-w-2xl mx-auto">
      {/* Page title */}
      <div className="text-center mb-2">
        <h1 className="text-2xl font-bold text-white">
          📚 {isEn ? 'Poker Rules' : 'Règles du Poker'}
        </h1>
        <p className="text-gray-400 mt-1 text-sm">
          {isEn
            ? 'Everything you need to know to understand the game'
            : 'Tout ce qu\'il faut savoir pour comprendre le jeu'}
        </p>
      </div>

      {/* ── Section 1: Le jeu de cartes ── */}
      <Section title={`🃏 ${isEn ? 'The deck' : 'Le jeu de cartes'}`}>
        <p className="text-gray-300 text-sm mb-4 font-mono bg-gray-800 rounded-lg px-3 py-2 inline-block">
          52 {isEn ? 'cards' : 'cartes'} = 4 {isEn ? 'suits' : 'couleurs'} × 13 {isEn ? 'ranks' : 'valeurs'}
        </p>

        {/* 4 suits — one distinct colour each (4-colour deck), easier to read */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
          {[
            { sym: '♠', color: 'text-gray-100',  fr: 'Pique',  en: 'Spades'   },
            { sym: '♥', color: 'text-red-500',   fr: 'Cœur',   en: 'Hearts'   },
            { sym: '♦', color: 'text-blue-400',  fr: 'Carreau', en: 'Diamonds' },
            { sym: '♣', color: 'text-green-400', fr: 'Trèfle',  en: 'Clubs'    },
          ].map(s => (
            <div key={s.sym} className="flex items-center gap-2 bg-gray-800/50 rounded-lg px-3 py-2 border border-gray-700">
              <span className={`text-2xl leading-none ${s.color}`}>{s.sym}</span>
              <span className="text-xs text-gray-300 font-semibold">{isEn ? s.en : s.fr}</span>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-gray-500 mb-4">
          {isEn
            ? '4-colour deck: each suit has its own colour so draws are easier to spot.'
            : 'Jeu 4 couleurs : chaque couleur a sa teinte pour repérer les tirages plus facilement.'}
        </p>

        {/* Rank order */}
        <p className="text-xs text-gray-400 mb-2 font-semibold uppercase tracking-wide">
          {isEn ? 'Rank order (weakest → strongest)' : 'Ordre des rangs (plus faible → plus fort)'}
        </p>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {ranks.map(r => (
            <span
              key={r}
              className={`px-2 py-1 rounded-lg text-xs font-bold border ${
                r === 'A'
                  ? 'bg-yellow-700/40 text-yellow-300 border-yellow-600'
                  : 'bg-gray-800 text-gray-300 border-gray-700'
              }`}
            >
              {r}
            </span>
          ))}
        </div>
        <p className="text-xs text-yellow-300">
          ⭐ As (A) = {isEn ? 'the strongest card' : 'la carte la plus forte'}
        </p>
      </Section>

      {/* ── Section 2: Les combinaisons ── */}
      <Section title={`🏆 ${isEn ? 'Hand rankings (weakest to strongest)' : 'Les combinaisons (du plus faible au plus fort)'}`}>
        <div className="space-y-1.5">
          {hands.map((h, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl ${
                i === 9
                  ? 'bg-yellow-900/20 border border-yellow-700/50'
                  : 'bg-gray-800/50'
              }`}
            >
              <span className="text-sm w-5 text-center shrink-0 leading-none">{h.emoji}</span>
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-white text-xs">{isEn ? h.en : h.fr}</span>
                <span className="text-gray-500 text-xs ml-1.5">— {isEn ? h.descEn : h.descFr}</span>
              </div>
              <Hand cards={h.cards as any} size="xs" animate={false} context="display" cardStyle="fourcolor" />
            </div>
          ))}
        </div>
      </Section>

      {/* ── Section 3: Comment se déroule une partie ── */}
      <Section title={`🎲 ${isEn ? 'How a hand plays out' : 'Comment se déroule une partie'}`}>
        <div className="flex flex-col gap-3 mb-4">
          {steps.map(step => {
            const STEP_TERM: Record<number, string> = { 1: 'preflop', 2: 'flop', 3: 'turn', 4: 'river', 5: 'showdown' };
            const termId = STEP_TERM[step.num];
            return (
              <div key={step.num} className="flex items-start gap-3">
                <div className={`${step.color} text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shrink-0 mt-0.5`}>
                  {step.num}
                </div>
                <div>
                  <span className="font-bold text-white text-sm">
                    {termId ? <PokerTerm id={termId}>{step.label}</PokerTerm> : step.label}
                  </span>
                  <span className="text-gray-400 text-xs ml-2">— {isEn ? step.descEn : step.descFr}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Example hand */}
        <div className="bg-gray-800/60 rounded-xl p-3 border border-gray-700">
          <p className="text-xs text-gray-400 mb-2 font-semibold">
            {isEn ? 'Example at showdown:' : 'Exemple au showdown :'}
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <div>
              <p className="text-xs text-gray-500 mb-1">{isEn ? 'Your hand' : 'Ta main'}</p>
              <Hand cards={['Ah', 'Kd']} size="xs" animate={false} context="display" cardStyle="fourcolor" />
            </div>
            <span className="text-gray-500 text-lg font-bold">+</span>
            <div>
              <p className="text-xs text-gray-500 mb-1">{isEn ? 'Community cards' : 'Cartes communes'}</p>
              <Hand cards={['Qs', 'Jc', 'Tc', '2h', '5d']} size="xs" animate={false} context="display" cardStyle="fourcolor" />
            </div>
            <span className="text-gray-500 text-lg">=</span>
            <span className="text-green-400 font-bold text-sm">
              {isEn ? '🏆 Straight (A-K-Q-J-T)!' : '🏆 Suite (A-K-Q-J-T) !'}
            </span>
          </div>
        </div>
      </Section>

      {/* ── Section 3b: Tutoriel pas à pas ── */}
      <Section title={`🎯 ${isEn ? 'Step-by-step hand tutorial' : 'Tutoriel : une main pas à pas'}`}>
        <p className="text-sm text-gray-400 mb-4">
          {isEn
            ? 'Follow a complete hand from deal to showdown. Click Next to advance.'
            : 'Suis une main complète de la distribution au showdown. Clique sur Suivant pour avancer.'}
        </p>
        <TutorialHand isEn={isEn} />
      </Section>

      {/* ── Section 4: Tes actions ── */}
      <Section title={`⚡ ${isEn ? 'Your actions' : 'Tes actions'}`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {actions.map(a => {
            const ACTION_TERM: Record<string, string> = { FOLD: 'fold', CHECK: 'check', CALL: 'call', RAISE: 'raise' };
            return (
              <div key={a.label} className={`rounded-xl p-3 border ${a.color}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 rounded text-xs font-bold text-white ${a.badge}`}>
                    {ACTION_TERM[a.label]
                      ? <PokerTerm id={ACTION_TERM[a.label]}>{a.label}</PokerTerm>
                      : a.label}
                  </span>
                  <span>{a.emoji}</span>
                </div>
                <p className="text-xs leading-relaxed">
                  {isEn ? a.descEn : a.descFr}
                </p>
              </div>
            );
          })}
        </div>
      </Section>

      {/* ── Section 5: Les positions ── */}
      <Section title={`📍 ${isEn ? 'Positions' : 'Les positions'}`}>
        <p className="text-sm text-gray-300 mb-4">
          {isEn
            ? 'Your seat at the table is very important in poker!'
            : 'Ta place à la table est très importante au poker !'}
        </p>
        <div className="flex flex-col gap-3 mb-4">
          {positions.map(pos => {
            const POS_LABEL: Record<string, ReactNode> = {
              'BTN (Button)': <><PokerTerm id="btn">BTN</PokerTerm> (Button)</>,
              'CO, HJ': <><PokerTerm id="co">CO</PokerTerm>, <PokerTerm id="hj">HJ</PokerTerm></>,
              'UTG, SB': <><PokerTerm id="utg">UTG</PokerTerm>, <PokerTerm id="sb">SB</PokerTerm></>,
            };
            return (
              <div key={pos.label} className={`rounded-xl p-3 border ${pos.colorClass} flex items-start gap-3`}>
                <div className={`${pos.dotClass} rounded-full w-2.5 h-2.5 shrink-0 mt-1`} />
                <div>
                  <span className="font-bold text-sm">
                    {POS_LABEL[pos.label] ?? pos.label}
                  </span>
                  <span className="ml-2 text-xs opacity-80">— {isEn ? pos.descEn : pos.descFr}</span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="bg-green-900/20 border border-green-700 rounded-xl px-4 py-3">
          <p className="text-green-300 font-bold text-sm">
            {isEn
              ? <>✅ <PokerTerm id="ip">In position</PokerTerm> = you act LAST = huge advantage!</>
              : <>✅ <PokerTerm id="ip">En position</PokerTerm> = tu parles EN DERNIER = gros avantage !</>}
          </p>
        </div>
      </Section>

      {/* ── Section 5b: Table interactive ── */}
      <Section title={`🎮 ${isEn ? 'Interactive table' : 'Table interactive'}`}>
        <p className="text-sm text-gray-400 mb-4">
          {isEn
            ? 'Click a seat to see the strategy, opening range and key tips for each position.'
            : 'Clique sur une place pour voir la stratégie, la range et les conseils de chaque position.'}
        </p>

        {/* Table */}
        <div className="mb-4">
          <PokerTable
            heroPosition={activePos}
            onPositionChange={setActivePos}
            interactive
          />
        </div>

        {/* Animated position info */}
        <motion.div
          key={activePos}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
          className="rounded-xl p-4 border mb-4"
          style={{
            background: `${POSITION_COLORS[activePos]}0f`,
            borderColor: `${POSITION_COLORS[activePos]}30`,
          }}
        >
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <div className="w-3 h-3 rounded-full shrink-0" style={{ background: POSITION_COLORS[activePos] }} />
            <span className="text-white font-bold text-lg">{activePos}</span>
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{
                background: `${POSITION_COLORS[activePos]}22`,
                color: POSITION_COLORS[activePos],
                border: `1px solid ${POSITION_COLORS[activePos]}44`,
              }}
            >
              {rangePct[activePos]}
            </span>
            {activePos === 'BTN' && (
              <span className="text-xs px-2 py-0.5 bg-gray-700 text-gray-300 rounded-full">
                {isEn ? '⬤ Dealer' : '⬤ Donneur'}
              </span>
            )}
            {activePos === 'SB' && (
              <span className="text-xs px-2 py-0.5 bg-blue-900/50 text-blue-300 rounded-full border border-blue-800">
                {isEn ? 'Posts ½ BB' : 'Poste ½ BB'}
              </span>
            )}
            {activePos === 'BB' && (
              <span className="text-xs px-2 py-0.5 bg-red-900/50 text-red-300 rounded-full border border-red-800">
                {isEn ? 'Posts 1 BB' : 'Poste 1 BB'}
              </span>
            )}
          </div>
          <p className="text-gray-300 text-sm leading-relaxed">
            {isEn ? POSITION_TIPS[activePos].en : POSITION_TIPS[activePos].fr}
          </p>
        </motion.div>

        {/* Position grid */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {CLOCKWISE.map(pos => (
            <button
              key={pos}
              onClick={() => setActivePos(pos)}
              className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all ${
                activePos === pos
                  ? 'border-white/20 bg-gray-800/80'
                  : 'border-gray-800 bg-gray-900/30 hover:border-gray-700 hover:bg-gray-900/60'
              }`}
            >
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: POSITION_COLORS[pos] }} />
              <div>
                <p className="text-white text-xs font-bold leading-none">{pos}</p>
                <p className="text-gray-500 text-xs mt-0.5">{rangePct[pos]}</p>
              </div>
              {activePos === pos && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: POSITION_COLORS[pos] }} />
              )}
            </button>
          ))}
        </div>

        {/* CTA */}
        <Link to={activePos === 'BB' ? '/training?module=preflop' : '/training?module=preflop'}>
          <button className="w-full py-2.5 rounded-xl bg-yellow-600 hover:bg-yellow-500 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2">
            {isEn ? `Train from ${activePos} →` : `S'entraîner depuis ${activePos} →`}
            <ArrowRight size={15} />
          </button>
        </Link>
      </Section>

      {/* ── Section 6: Les modules de PokerPeak ── */}
      <Section title={`🎯 ${isEn ? 'PokerPeak modules' : 'Les modules de PokerPeak'}`}>
        <p className="text-sm text-gray-300 mb-4">
          {isEn
            ? 'Now that you know the rules, go practice!'
            : 'Maintenant que tu connais les règles, va t\'entraîner !'}
        </p>

        <div className="flex flex-wrap gap-2 mb-5">
          {modules.map(m => (
            <button
              key={m.id}
              onClick={() => navigate(`/training?module=${m.id}`)}
              className={`px-4 py-2 rounded-xl text-sm font-bold text-white border transition-all ${m.color}`}
            >
              {m.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => navigate('/training?module=preflop')}
          className="w-full py-3 rounded-xl bg-yellow-600 hover:bg-yellow-500 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2"
        >
          {isEn ? 'Start training →' : 'Commencer l\'entraînement →'}
        </button>
      </Section>
    </div>
  );
}
