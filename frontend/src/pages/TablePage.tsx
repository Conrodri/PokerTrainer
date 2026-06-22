import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Position } from '../types/poker';
import { PokerTable, CLOCKWISE, POSITION_COLORS } from '../components/poker/PokerTable';
import { Button } from '../components/ui/Button';
import { useT } from '../i18n';

const RANGE_PCT: Record<Position, string> = {
  BTN: '~45%', SB: '~35%', BB: t_def('Défend', 'Defend'), UTG: '~15%', HJ: '~20%', CO: '~26%',
};

// Simple helper to avoid t in module scope
function t_def(fr: string, en: string) { return fr; }

const TIPS: Record<Position, { fr: string; en: string }> = {
  BTN: {
    fr: 'La meilleure position. Tu agis en DERNIER post-flop — tu vois toutes les actions avant de décider. Range la plus large (~45%). Le jeton D tourne à chaque main.',
    en: 'The best position. You act LAST post-flop — you see all actions before deciding. Widest range (~45%). The D token rotates each hand.',
  },
  SB: {
    fr: 'Position délicate. Tu postes 0.5 BB obligatoire. Tu as un désavantage de position post-flop (tu agis avant BB). Range assez large mais jeu post-flop difficile.',
    en: 'Tricky position. You post 0.5 BB forced. You have a positional disadvantage post-flop (you act before BB). Fairly wide range but tough post-flop play.',
  },
  BB: {
    fr: 'Tu as déjà payé 1 BB. Tu es le DERNIER à parler pré-flop, ce qui te donne un avantage pour fermer l\'action. Post-flop tu es en OOP (hors position) sauf face au SB.',
    en: 'You already paid 1 BB. You are the LAST to act pre-flop, giving you an advantage to close the action. Post-flop you are OOP (out of position) except vs. SB.',
  },
  UTG: {
    fr: 'La pire position. Tu agis en PREMIER sans aucune information sur les autres joueurs. Joue uniquement tes meilleures mains (~15%). Chaque adversaire est encore à parler.',
    en: 'The worst position. You act FIRST with no information on other players. Only play your best hands (~15%). Every opponent still has to act after you.',
  },
  HJ: {
    fr: 'Position intermédiaire, légèrement meilleure qu\'UTG. Tu peux jouer quelques mains de plus (~20%) mais reste relativement serré. 3 joueurs actent encore après toi.',
    en: 'Middle position, slightly better than UTG. You can play a few more hands (~20%) but stay relatively tight. 3 players still act after you.',
  },
  CO: {
    fr: 'Bonne position, juste avant le Button. Tu peux voler les blindes régulièrement et jouer une range assez large (~26%). Seulement BTN, SB et BB actent après toi.',
    en: 'Good position, right before the Button. You can steal the blinds regularly and play a fairly wide range (~26%). Only BTN, SB and BB act after you.',
  },
};

export function TablePage() {
  const t = useT();
  const isEn = t.nav.home === 'Home';
  const [activePos, setActivePos] = useState<Position>('BTN');

  const tip = TIPS[activePos];
  const color = POSITION_COLORS[activePos];

  const rangePct: Record<Position, string> = {
    BTN: '~45%', SB: '~35%', BB: isEn ? 'Defend' : 'Défend',
    UTG: '~15%', HJ: '~20%', CO: '~26%',
  };

  return (
    <div className="flex flex-col gap-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-2">
          {isEn ? 'Interactive Poker Table' : 'Table de Poker Interactive'}
        </h1>
        <p className="text-gray-400 text-sm">
          {isEn
            ? 'Click any seat to understand each position\'s role, range, and strategy.'
            : 'Cliquez une place pour comprendre le rôle, la range et la stratégie de chaque position.'}
        </p>
      </div>

      {/* Table — large */}
      <div
        className="rounded-2xl p-6 border border-gray-800"
        style={{ background: 'radial-gradient(ellipse at 50% 0%, #1a2e1a, #0d1a0d)' }}
      >
        <PokerTable
          heroPosition={activePos}
          onPositionChange={setActivePos}
          interactive
          className="max-w-full"
        />
      </div>

      {/* Position info */}
      <motion.div
        key={activePos}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-5 border"
        style={{
          background: `${color}0f`,
          borderColor: `${color}30`,
        }}
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-3 h-3 rounded-full" style={{ background: color }} />
          <h2 className="text-2xl font-bold text-white">{activePos}</h2>
          <span
            className="text-sm font-bold px-3 py-0.5 rounded-full"
            style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}
          >
            {isEn ? 'Range' : 'Range'} {rangePct[activePos]}
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
        <p className="text-gray-300 text-sm leading-relaxed">{isEn ? tip.en : tip.fr}</p>
      </motion.div>

      {/* Position grid legend */}
      <div className="grid grid-cols-3 gap-3">
        {CLOCKWISE.map(pos => (
          <button
            key={pos}
            onClick={() => setActivePos(pos)}
            className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all ${
              activePos === pos ? 'border-white/20 bg-gray-800/80' : 'border-gray-800 bg-gray-900/30 hover:border-gray-700 hover:bg-gray-900/60'
            }`}
          >
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: POSITION_COLORS[pos] }} />
            <div>
              <p className="text-white text-sm font-bold leading-none">{pos}</p>
              <p className="text-gray-500 text-xs mt-0.5">{rangePct[pos]}</p>
            </div>
            {activePos === pos && (
              <div className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: POSITION_COLORS[pos] }} />
            )}
          </button>
        ))}
      </div>

      {/* CTA */}
      <div className="text-center pb-4">
        <Link to={activePos === 'BB' ? `/training?module=bbdefense` : `/training?module=preflop`}>
          <Button size="lg" variant="gold">
            {isEn ? `Train from ${activePos}` : `S'entraîner depuis ${activePos}`}
            <ArrowRight size={16} className="inline ml-1" />
          </Button>
        </Link>
        {activePos === 'BB' && (
          <p className="text-xs text-red-400/70 mt-2">
            {isEn
              ? 'BB defense is trained in its dedicated module'
              : 'La défense BB s\'entraîne dans son module dédié'}
          </p>
        )}
      </div>
    </div>
  );
}
