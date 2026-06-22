import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, X, BookOpen } from 'lucide-react';
import { PokerTable, SeatInfo } from '../poker/PokerTable';
import { Card } from '../poker/Card';
import { RichText } from '../ui/RichText';
import { Position, CardStr } from '../../types/poker';
import { useLangStore } from '../../store/langStore';
import { useIsMobile } from '../../hooks/useIsMobile';

// ─── Scenario constants ─────────────────────────────────────────────────────────
const HERO    = ['Ah', 'Kh'];
const VILLAIN = ['Tc', '5h'];
const FLOP    = ['Ad', 'Ts', '5c'];
const TURN    = 'As';
const RIVER   = '2d';

interface ComboHl { cards: string[]; label: { fr: string; en: string } }

interface Step {
  board:    string[];
  pot:      string;
  heroStack:    string;
  villainStack: string;
  villainBet?:  string;
  revealVillain?: boolean;
  title: { fr: string; en: string };
  text:  { fr: string; en: string };
  combo?: ComboHl;
}

const STEPS: Step[] = [
  {
    board: [], pot: '1.5bb', heroStack: '100bb', villainStack: '99bb', villainBet: '1bb',
    title: { fr: 'Bienvenue à la table', en: 'Welcome to the table' },
    text: {
      fr: "Tu joues une **main complète**, étape par étape. Tu es à la **Grosse Blinde (BB)**, en bas de la table. Ton adversaire est au **Bouton (BTN)**, en face. Chacun a **100 jetons** (on compte en *bb*).",
      en: "You'll play a **full hand**, step by step. You're in the **Big Blind (BB)**, at the bottom. Your opponent is on the **Button (BTN)**, across from you. Each of you has **100 chips** (counted in *bb*).",
    },
  },
  {
    board: [], pot: '1.5bb', heroStack: '100bb', villainStack: '99bb', villainBet: '1bb',
    title: { fr: 'Ta position : la Grosse Blinde', en: 'Your seat: the Big Blind' },
    text: {
      fr: "La **BB** est une mise **obligatoire** de 1 jeton que tu poses **avant** même de voir tes cartes. En échange, tu parles **en dernier** avant le flop — c'est un petit avantage.",
      en: "The **BB** is a **forced** 1-chip bet you post **before** even seeing your cards. In return, you act **last** before the flop — a small advantage.",
    },
  },
  {
    board: [], pot: '1.5bb', heroStack: '100bb', villainStack: '99bb', villainBet: '1bb',
    title: { fr: 'Ta main : As-Roi assortis', en: 'Your hand: Ace-King suited' },
    text: {
      fr: "On te distribue **A♥ K♥** : un **As** et un **Roi**, tous deux à **cœur**. C'est une **excellente main de départ** — deux grosses cartes qui peuvent aussi former une **couleur**.",
      en: "You're dealt **A♥ K♥**: an **Ace** and a **King**, both **hearts**. A **premium starting hand** — two big cards that can also make a **flush**.",
    },
    combo: { cards: HERO, label: { fr: 'AK assortis — main forte', en: 'AK suited — strong hand' } },
  },
  {
    board: [], pot: '1.5bb', heroStack: '100bb', villainStack: '99bb', villainBet: '1bb',
    title: { fr: 'Les stacks', en: 'The stacks' },
    text: {
      fr: "Ton **stack**, c'est le nombre de jetons devant toi : **100 bb**. C'est le **maximum** que tu peux gagner ou perdre sur cette main. Plus le stack est gros, plus les décisions comptent.",
      en: "Your **stack** is the chips in front of you: **100 bb**. That's the **most** you can win or lose this hand. The bigger the stack, the more your decisions matter.",
    },
  },
  {
    board: [], pot: '2bb', heroStack: '100bb', villainStack: '99bb',
    title: { fr: 'Décision pré-flop', en: 'Pre-flop decision' },
    text: {
      fr: "Le **BTN** se contente de **suivre (call)** 1 bb — il **ne relance pas**. Comme tu es à la BB et que **personne n'a relancé**, tu peux **checker** : rester en jeu **sans payer plus**. On check.",
      en: "The **BTN** just **calls** 1 bb — he **doesn't raise**. Since you're in the BB and **nobody raised**, you can **check**: stay in the hand **without paying more**. We check.",
    },
  },
  {
    board: FLOP, pot: '2bb', heroStack: '100bb', villainStack: '99bb',
    title: { fr: 'Le flop : A♦ T♠ 5♣', en: 'The flop: A♦ T♠ 5♣' },
    text: {
      fr: "Les **3 premières cartes communes** apparaissent. Elles appartiennent à **tout le monde**. Ce flop est **rainbow** (3 couleurs différentes) — donc **aucun tirage couleur** n'est possible pour l'instant.",
      en: "The **first 3 community cards** appear. They belong to **everyone**. This flop is **rainbow** (3 different suits) — so **no flush draw** is possible for now.",
    },
  },
  {
    board: FLOP, pot: '2bb', heroStack: '100bb', villainStack: '99bb',
    title: { fr: 'Ta combinaison : une paire d\'As', en: 'Your made hand: a pair of Aces' },
    text: {
      fr: "Tu combines tes 2 cartes avec le board. Ton **As** + l'**As** du flop = une **paire d'As** ! C'est la **paire la plus haute** possible ici (*top paire*), avec un **Roi** comme excellente carte d'appoint (*kicker*).",
      en: "You combine your 2 cards with the board. Your **Ace** + the flop **Ace** = a **pair of Aces**! That's the **highest pair** possible here (*top pair*), with a **King** as a great side card (*kicker*).",
    },
    combo: { cards: ['Ah', 'Ad'], label: { fr: "Paire d'As — top paire", en: 'Pair of Aces — top pair' } },
  },
  {
    board: FLOP, pot: '2bb', heroStack: '100bb', villainStack: '99bb',
    title: { fr: 'On continue prudemment', en: 'We continue carefully' },
    text: {
      fr: "Le **BTN check** (il ne mise pas). Tu décides de **checker** aussi, pour voir la **prochaine carte gratuitement** et garder l'adversaire dans le coup.",
      en: "The **BTN checks** (no bet). You also decide to **check**, to see the **next card for free** and keep your opponent in the hand.",
    },
  },
  {
    board: [...FLOP, TURN], pot: '2bb', heroStack: '100bb', villainStack: '99bb',
    title: { fr: 'La turn : encore un As !', en: 'The turn: another Ace!' },
    text: {
      fr: "La 4ᵉ carte commune est… un **autre As** ! Tu as maintenant **trois As** : un **brelan** (*trips*). C'est une main **très forte**, presque imbattable sur ce board.",
      en: "The 4th community card is… **another Ace**! You now have **three Aces**: **trips**. A **very strong** hand, nearly unbeatable on this board.",
    },
    combo: { cards: ['Ah', 'Ad', 'As'], label: { fr: "Brelan d'As — trois As", en: 'Trips — three Aces' } },
  },
  {
    board: [...FLOP, TURN], pot: '2bb', heroStack: '100bb', villainStack: '99bb',
    title: { fr: 'Le principe de la mise (bet)', en: 'The betting principle' },
    text: {
      fr: "Le **BTN check** encore. **Miser (bet)**, c'est poser des jetons pour **gagner le pot tout de suite** ou **faire payer** l'adversaire quand tu es devant. Ici ta main est si forte qu'on **check pour le piéger** (*slow-play*) et le laisser miser lui-même.",
      en: "The **BTN checks** again. **Betting** means putting chips in to **win the pot now** or **make your opponent pay** when you're ahead. Here your hand is so strong we **check to trap** (*slow-play*) and let him bet himself.",
    },
  },
  {
    board: [...FLOP, TURN, RIVER], pot: '2bb', heroStack: '100bb', villainStack: '0bb', villainBet: 'ALL-IN',
    title: { fr: 'La river : tapis !', en: 'The river: all-in!' },
    text: {
      fr: "Dernière carte commune (un **2**). Le **BTN fait tapis (all-in)** : il mise **tous ses jetons d'un coup**. C'est la mise maximale possible.",
      en: "Last community card (a **2**). The **BTN goes all-in**: he bets **all his chips at once**. It's the biggest possible bet.",
    },
  },
  {
    board: [...FLOP, TURN, RIVER], pot: '2bb', heroStack: '100bb', villainStack: '0bb', villainBet: 'ALL-IN',
    title: { fr: 'All-in : la décision', en: 'All-in: the decision' },
    text: {
      fr: "Un **all-in** met **tout ton stack** en jeu : si tu suis et que tu perds, tu perds tout. Mais avec ton **brelan d'As**, tu es presque **toujours devant** → tu **suis (call)** sans hésiter.",
      en: "An **all-in** puts **your whole stack** on the line: call and lose, you lose it all. But with your **trip Aces** you're almost **always ahead** → you **call** without hesitation.",
    },
  },
  {
    board: [...FLOP, TURN, RIVER], pot: '200bb', heroStack: '200bb', villainStack: '0bb', revealVillain: true,
    title: { fr: 'Abattage — tu gagnes ! 🏆', en: 'Showdown — you win! 🏆' },
    text: {
      fr: "Le BTN retourne **T♣ 5♥** : il n'avait que **deux paires** (Dix et Cinq). Ton **brelan d'As** est **bien plus fort** → tu remportes tout le pot ! Voilà une **main complète**, du pré-flop au showdown.",
      en: "The BTN reveals **T♣ 5♥**: only **two pair** (Tens and Fives). Your **trip Aces** are **much stronger** → you scoop the whole pot! That's a **full hand**, from pre-flop to showdown.",
    },
    combo: { cards: ['Ah', 'Ad', 'As'], label: { fr: "Brelan d'As — gagnant", en: 'Trip Aces — winner' } },
  },
];

interface GuidedHandProps {
  /** Called when the user finishes the walkthrough (→ usually rules). */
  onFinish: () => void;
  /** Called when the user skips out. */
  onSkip: () => void;
}

export function GuidedHand({ onFinish, onSkip }: GuidedHandProps) {
  const isEn = useLangStore(s => s.lang) === 'en';
  const isMobile = useIsMobile();
  const [i, setI] = useState(0);
  const step = STEPS[i];
  const isLast = i === STEPS.length - 1;

  const seatInfos: Partial<Record<Position, SeatInfo>> = {
    BB:  { stack: step.heroStack },
    BTN: { stack: step.villainStack, bet: step.villainBet },
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9998] flex flex-col bg-gray-950 overflow-y-auto"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 shrink-0">
        <span className="text-sm font-bold text-gold-400">
          {isEn ? 'Guided hand' : 'Main guidée'}
          <span className="text-gray-500 font-normal ml-2">{i + 1} / {STEPS.length}</span>
        </span>
        <button onClick={onSkip} className="text-gray-500 hover:text-white transition-colors p-1" title={isEn ? 'Skip' : 'Passer'}>
          <X size={18} />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-gray-800 shrink-0">
        <div className="h-full bg-gold-500 transition-all duration-300" style={{ width: `${((i + 1) / STEPS.length) * 100}%` }} />
      </div>

      <div className="flex-1 w-full max-w-xl lg:max-w-6xl mx-auto px-4 py-5 flex flex-col gap-5 lg:grid lg:grid-cols-2 lg:items-center lg:gap-10">

        {/* ── Table column ── */}
        <div className="w-full flex flex-col items-center gap-2">
          <div className="w-full max-w-lg lg:max-w-3xl mx-auto">
            <PokerTable
              heroPosition="BB"
              interactive={false}
              activePlayers={['BB', 'BTN']}
              potDisplay={step.pot}
              heroCards={HERO}
              boardCards={step.board}
              boardCardSize={isMobile ? 'sm' : 'lg'}
              compact={isMobile}
              seatInfos={seatInfos}
              showHeroStack
            />
          </div>

          {/* Hero cards at the BB seat — face-down until "Ta main" step (i >= 2) */}
          <div className="-mt-4 sm:-mt-5 flex gap-1.5 relative z-10">
            {HERO.map((c, k) =>
              i < 2 ? (
                <div
                  key={k}
                  style={{
                    width:        isMobile ? 26 : 36,
                    height:       isMobile ? 36 : 50,
                    borderRadius: isMobile ? 4 : 5,
                    background:   'linear-gradient(145deg, #1e3a6e 0%, #0f1e3d 100%)',
                    border:       '1.5px solid rgba(255,255,255,0.15)',
                    boxShadow:    '0 3px 8px rgba(0,0,0,0.8)',
                    flexShrink:   0,
                  }}
                />
              ) : (
                <Card
                  key={k}
                  card={c as CardStr}
                  size={isMobile ? 'sm' : 'md'}
                  animate={k === 0 && i === 2}
                />
              )
            )}
          </div>

          {/* Villain reveal at showdown */}
          {step.revealVillain && (
            <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
              <span>{isEn ? 'BTN shows:' : 'Le BTN montre :'}</span>
              <div className="flex gap-1">
                {VILLAIN.map((c, k) => <Card key={k} card={c as CardStr} size="sm" animate={false} />)}
              </div>
              <span className="text-gray-500">{isEn ? '(two pair)' : '(deux paires)'}</span>
            </div>
          )}
        </div>

        {/* ── Narration column ── */}
        <div className="w-full flex flex-col gap-4 lg:max-w-md">
          <AnimatePresence mode="wait">
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="w-full rounded-2xl border border-gray-700 bg-gray-900/70 p-4 sm:p-5 flex flex-col gap-3"
            >
              <h3 className="text-base sm:text-lg font-black text-white">{isEn ? step.title.en : step.title.fr}</h3>
              <RichText text={isEn ? step.text.en : step.text.fr} />

              {/* Combo highlight */}
              {step.combo && (
                <div className="flex flex-col items-center gap-1.5 mt-1 rounded-xl border border-gold-700/40 bg-gold-900/15 py-3">
                  <div className="flex gap-1.5">
                    {step.combo.cards.map((c, k) => (
                      <Card key={k} card={c as CardStr} size={isMobile ? 'sm' : 'md'} highlighted animate={false} />
                    ))}
                  </div>
                  <span className="text-xs font-bold text-gold-300">
                    {isEn ? step.combo.label.en : step.combo.label.fr}
                  </span>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="w-full flex items-center gap-3">
            {i > 0 && (
              <button
                onClick={() => setI(v => v - 1)}
                className="flex items-center gap-1 px-4 py-2.5 rounded-xl border border-gray-700 text-gray-300 hover:bg-gray-800 text-sm font-semibold transition-colors"
              >
                <ChevronLeft size={16} /> {isEn ? 'Back' : 'Retour'}
              </button>
            )}
            {isLast ? (
              <button
                onClick={onFinish}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gold-600 hover:bg-gold-500 text-gray-900 font-black transition-colors"
              >
                <BookOpen size={17} />
                {isEn ? 'See the full rules' : 'Voir les règles'}
                <ChevronRight size={17} />
              </button>
            ) : (
              <button
                onClick={() => setI(v => v + 1)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gold-600 hover:bg-gold-500 text-gray-900 font-black transition-colors"
              >
                {isEn ? 'Next' : 'Suivant'} <ChevronRight size={17} />
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
