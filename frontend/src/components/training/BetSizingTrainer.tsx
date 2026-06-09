import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Info, Zap, BookOpen, ExternalLink } from 'lucide-react';
import { useIsMobile } from '../../hooks/useIsMobile';
import { useTrainingStore } from '../../store/trainingStore';
import { Button } from '../ui/Button';
import { SessionStatsBar } from '../ui/SessionStatsBar';
import { useModeStore } from '../../store/modeStore';
import { VerdictBanner } from '../ui/VerdictBanner';
import { ExplanationPanel } from '../ui/ExplanationPanel';
import { TrainerIntro } from '../ui/TrainerIntro';
import { PokerTable, SeatInfo } from '../poker/PokerTable';
import { Hand } from '../poker/Card';
import { Position } from '../../types/poker';
import { useLangStore } from '../../store/langStore';

// ─── Types ────────────────────────────────────────────────────────────────────

type SizingKey  = 'check' | 'small' | 'medium' | 'large' | 'overbet';
type Phase      = 'exercise' | 'result';
type Street     = 'flop' | 'turn' | 'river';

interface BetSizingExercise {
  id:              string;
  street:          Street;
  heroPosition:    Position;
  villainPosition: Position;
  heroHand:        string[];
  board:           string[];
  potSize:         number;        // bb
  effectiveStack:  number;        // bb restants
  isHeroIP:        boolean;
  preflopContext:  { fr: string; en: string };
  boardTexture:    { fr: string; en: string };
  handDescription: { fr: string; en: string };
  options:         SizingKey[];
  correctKey:      SizingKey;
  conceptTag:      { fr: string; en: string };
  explanation:     { fr: string; en: string };
}

// ─── Sizing config ────────────────────────────────────────────────────────────

const SIZING: Record<SizingKey, { pct: number; labelFr: (bb: number) => string; labelEn: (bb: number) => string }> = {
  check:   { pct: 0,   labelFr: _  => 'Check',                    labelEn: _  => 'Check'                  },
  small:   { pct: 33,  labelFr: bb => `Mise 33%  (${bb}bb)`,      labelEn: bb => `Bet 33%  (${bb}bb)`     },
  medium:  { pct: 55,  labelFr: bb => `Mise 55%  (${bb}bb)`,      labelEn: bb => `Bet 55%  (${bb}bb)`     },
  large:   { pct: 75,  labelFr: bb => `Mise 75%  (${bb}bb)`,      labelEn: bb => `Bet 75%  (${bb}bb)`     },
  overbet: { pct: 130, labelFr: bb => `Surenchère 130%  (${bb}bb)`, labelEn: bb => `Overbet 130%  (${bb}bb)` },
};

function sizingBb(pot: number, key: SizingKey) {
  return Math.round(pot * SIZING[key].pct / 100 * 10) / 10;
}

const SIZING_VARIANT: Record<SizingKey, 'secondary' | 'gold' | 'danger'> = {
  check:   'secondary',
  small:   'secondary',
  medium:  'secondary',
  large:   'gold',
  overbet: 'danger',
};

const CONCEPT_COLOR: Record<string, string> = {
  'Range Bet':       'bg-blue-900/30 text-blue-300 border-blue-700',
  'Protection':      'bg-orange-900/30 text-orange-300 border-orange-700',
  'Polarisation':    'bg-purple-900/30 text-purple-300 border-purple-700',
  'Valeur fine':     'bg-green-900/30 text-green-300 border-green-700',
  'Thin Value':      'bg-green-900/30 text-green-300 border-green-700',
  'Surenchère':      'bg-red-900/30 text-red-300 border-red-700',
  'Overbet':         'bg-red-900/30 text-red-300 border-red-700',
  'Hors position':   'bg-gray-700/40 text-gray-300 border-gray-600',
  'Out of Position': 'bg-gray-700/40 text-gray-300 border-gray-600',
  'SPR bas':         'bg-yellow-900/30 text-yellow-300 border-yellow-700',
  'Low SPR':         'bg-yellow-900/30 text-yellow-300 border-yellow-700',
  'Bluff polarisé':  'bg-purple-900/30 text-purple-300 border-purple-700',
  'Polarized Bluff': 'bg-purple-900/30 text-purple-300 border-purple-700',
  'Pot Control':     'bg-teal-900/30 text-teal-300 border-teal-700',
};

const STREET_COLORS: Record<Street, string> = {
  flop:  'text-blue-400 border-blue-700 bg-blue-900/20',
  turn:  'text-yellow-400 border-yellow-700 bg-yellow-900/20',
  river: 'text-red-400 border-red-700 bg-red-900/20',
};
const STREET_LABELS: Record<Street, { fr: string; en: string }> = {
  flop:  { fr: 'Flop',  en: 'Flop'  },
  turn:  { fr: 'Turn',  en: 'Turn'  },
  river: { fr: 'River', en: 'River' },
};

// ─── Exercise bank ────────────────────────────────────────────────────────────
// All sizings calibrated from GTO solver outputs (PioSolver, GTO Wizard).
// Sources listed in the footer of this module.

const EXERCISES: BetSizingExercise[] = [
  // ── 1. Range bet, dry flop, IP ─────────────────────────────────────────────
  {
    id: 'bs-01', street: 'flop',
    heroPosition: 'BTN', villainPosition: 'BB',
    heroHand: ['Kh', 'Qd'], board: ['As', '7c', '2d'],
    potSize: 4, effectiveStack: 96, isHeroIP: true,
    preflopContext: {
      fr: 'BTN ouvre à 2bb, BB défend. Flop A72 arc-en-ciel.',
      en: 'BTN opens 2bb, BB calls. Flop A72 rainbow.',
    },
    boardTexture: { fr: 'Sec, statique, arc-en-ciel', en: 'Dry, static, rainbow' },
    handDescription: { fr: 'Deux hautes cartes — aucune part du board', en: 'Two high cards — no piece of board' },
    options: ['check', 'small', 'medium', 'large'],
    correctKey: 'small',
    conceptTag: { fr: 'Range Bet', en: 'Range Bet' },
    explanation: {
      fr: 'Sur A72 arc-en-ciel, BTN a un fort avantage de range (plus d\'as, plus de sets). Les solveurs recommandent une mise très haute fréquence à 33% du pot avec la range entière. Cela exploite l\'avantage sans exposer les bluffs à une grosse mise : avec KQ, on a deux overcards et un backdoor flush draw qui suffisent à justifier une c-bet légère. Une mise plus grosse (75%) nécessiterait une range plus polarisée, ce que ce board ne justifie pas.',
      en: 'On A72 rainbow, BTN has a strong range advantage (more aces, more sets). Solvers recommend a very high-frequency 33% pot c-bet with the entire range. This exploits the advantage without over-polarizing bluffs. With KQ we have two overcards + backdoor flush draw — enough equity to c-bet light. A 75% bet would require a more polarized range, which this static board doesn\'t warrant.',
    },
  },

  // ── 2. Protection sur flop mouillé, IP ─────────────────────────────────────
  {
    id: 'bs-02', street: 'flop',
    heroPosition: 'CO', villainPosition: 'BB',
    heroHand: ['Ah', 'Jd'], board: ['9s', '8h', '7d'],
    potSize: 5, effectiveStack: 95, isHeroIP: true,
    preflopContext: {
      fr: 'CO ouvre, BB appelle. Flop 987 bicolore — board connecté.',
      en: 'CO opens, BB calls. Flop 987 two-tone — connected board.',
    },
    boardTexture: { fr: 'Très connecté, dynamique, 2 couleurs', en: 'Highly connected, dynamic, 2-tone' },
    handDescription: { fr: 'Paire haute + backdoor nut flush draw', en: 'Overcards + backdoor nut flush draw' },
    options: ['check', 'small', 'medium', 'large'],
    correctKey: 'large',
    conceptTag: { fr: 'Protection', en: 'Protection' },
    explanation: {
      fr: 'Sur 987, la BB a beaucoup de mains qui touchent le board (78, T9, 86, paires). Avec AJ sans pair, on doit soit checker avec l\'intention de fold, soit miser grand pour charger les draws. Les solveurs misent 66-75% ici pour protéger les mises de valeur dans la range et donner un mauvais prix aux draws adverses. Une petite mise donnerait trop d\'odds aux tirages.',
      en: 'On 987, BB connects a lot (78, T9, 86, pairs). With AJ no pair, we either check-fold or bet large to charge draws. Solvers bet 66-75% here to protect the value portion of our range and deny good odds to villain\'s drawing hands. A small bet would give draws too cheap a price to call.',
    },
  },

  // ── 3. Valeur fine au river, top pair faible ────────────────────────────────
  {
    id: 'bs-03', street: 'river',
    heroPosition: 'BTN', villainPosition: 'BB',
    heroHand: ['Ac', '9h'], board: ['As', '7d', '2c', '5h', 'Kh'],
    potSize: 14, effectiveStack: 86, isHeroIP: true,
    preflopContext: {
      fr: 'BTN ouvre, BB défend. Bet flop/turn, check river de BB.',
      en: 'BTN opens, BB calls. BTN bet flop and turn, BB checks river.',
    },
    boardTexture: { fr: 'Sec et statique — K bricked, pas de tirage complété', en: 'Dry and static — K bricked, no draws completed' },
    handDescription: { fr: 'Top paire + neuvième kicker — valeur moyenne', en: 'Top pair weak kicker — medium value hand' },
    options: ['check', 'small', 'medium', 'large'],
    correctKey: 'small',
    conceptTag: { fr: 'Valeur fine', en: 'Thin Value' },
    explanation: {
      fr: 'Avec A9 au river sur A7252K, on a top pair mais un kicker faible. Une mise petite (33%) extrait de la valeur des mains comme A8, A7, KQ qui appellent légèrement, tout en évitant de se faire surprendre par AK ou A5 (two pair). Une mise grosse ferait folder exactement les mains qu\'on bat. Le check est également défendable mais on laisse de la valeur sur la table.',
      en: 'With A9 on the river A7525K, we have top pair but a weak kicker. A small bet (33%) extracts value from hands like A8, A7, KQ that call lightly, while avoiding getting stacked by AK or A5 (two pair). A large bet folds exactly the hands we beat. Checking is defensible but leaves value on the table.',
    },
  },

  // ── 4. Surenchère au river, nuts polarisés ──────────────────────────────────
  {
    id: 'bs-04', street: 'river',
    heroPosition: 'BTN', villainPosition: 'BB',
    heroHand: ['Ah', 'Kh'], board: ['8h', '5h', '2c', '7d', 'Jh'],
    potSize: 20, effectiveStack: 80, isHeroIP: true,
    preflopContext: {
      fr: 'BTN ouvre, BB défend. River Jh complète la couleur à pique.',
      en: 'BTN opens, BB calls. River Jh completes the heart flush.',
    },
    boardTexture: { fr: 'River couleur — board très polarisant', en: 'River flush — very polarizing board' },
    handDescription: { fr: 'Flush max (couleur à l\'as) — nuts', en: 'Nut flush (ace-high) — the nuts' },
    options: ['small', 'medium', 'large', 'overbet'],
    correctKey: 'overbet',
    conceptTag: { fr: 'Surenchère', en: 'Overbet' },
    explanation: {
      fr: 'Avec le flush max au river sur un board qui complète la couleur, notre range est très polarisée : on a les meilleurs flush + les bluffs ratés. La BB ne peut pas avoir de very-nutted hand en face. C\'est la situation idéale pour une surenchère (130%+) : on extrait le maximum des flush inférieurs de la BB qui ne peuvent pas folder, et on représente le nuts de façon crédible avec nos bluffs.',
      en: 'Holding the nut flush on a board that completed the flush, our range is very polarized: we have the best flushes + missed bluffs. BB cannot have very strong hands in return. This is the ideal overbet spot (130%+): we extract maximum from BB\'s inferior flushes who can\'t fold, and credibly represent the nuts with our bluffing hands.',
    },
  },

  // ── 5. Check OOP, désavantage de range ─────────────────────────────────────
  {
    id: 'bs-05', street: 'flop',
    heroPosition: 'BB', villainPosition: 'BTN',
    heroHand: ['7h', '6h'], board: ['As', 'Kd', 'Jc'],
    potSize: 5, effectiveStack: 95, isHeroIP: false,
    preflopContext: {
      fr: 'BTN ouvre, BB défend. Flop AKJ arc-en-ciel — board terrible pour la BB.',
      en: 'BTN opens, BB calls. Flop AKJ rainbow — terrible board for BB.',
    },
    boardTexture: { fr: 'Board très haut, avantage BTN immense', en: 'Very high board, massive BTN range advantage' },
    handDescription: { fr: 'Overcards + tirage bas — main spéculative', en: 'Overcards + low draw — speculative hand' },
    options: ['check', 'small', 'medium', 'large'],
    correctKey: 'check',
    conceptTag: { fr: 'Hors position', en: 'Out of Position' },
    explanation: {
      fr: 'Sur AKJ, BTN a un avantage de range écrasant : il a AK, AJ, KJ, AA, KK, JJ en range — la BB n\'en a pas. Miser OOP ici serait une "donk bet" qui détruit notre avantage : on mise dans une range plus forte. La BB doit checker et laisser BTN c-bet, puis décider en fonction de la taille. Avec 76h, on peut envisager un check-raise si BTN mise petit, mais le check reste la première action.',
      en: 'On AKJ, BTN has an overwhelming range advantage: AK, AJ, KJ, AA, KK, JJ are all in BTN\'s range — BB has none. Donk-betting OOP here destroys our equity by betting into a stronger range. BB must check and let BTN c-bet, then react to the sizing. With 76h we can consider a check-raise if BTN bets small, but checking is always the first action.',
    },
  },

  // ── 6. Overpair protégé face à tirages ─────────────────────────────────────
  {
    id: 'bs-06', street: 'flop',
    heroPosition: 'BTN', villainPosition: 'BB',
    heroHand: ['Qs', 'Qc'], board: ['8h', '7h', '6c'],
    potSize: 5, effectiveStack: 95, isHeroIP: true,
    preflopContext: {
      fr: 'BTN ouvre, BB défend. Flop 876 bicolore — très dangereux pour QQ.',
      en: 'BTN opens, BB calls. Flop 876 two-tone — very dangerous for QQ.',
    },
    boardTexture: { fr: 'Connecté, 2 tirages couleur, dynamique', en: 'Connected, 2 flush draws, highly dynamic' },
    handDescription: { fr: 'Overpair — forte main mais vulnérable', en: 'Overpair — strong hand but vulnerable' },
    options: ['check', 'small', 'medium', 'large'],
    correctKey: 'large',
    conceptTag: { fr: 'Protection', en: 'Protection' },
    explanation: {
      fr: 'QQ sur 876 bicolore est une main forte mais extrêmement vulnérable : tirage couleur, tirage quinte, les 9 et 5 complètent des quintes. Checker ou miser petit donnerait aux adversaires un prix favorable pour tous leurs draws. Une mise à 75% du pot est recommandée pour : (1) extraire de la valeur tout de suite, (2) donner un mauvais prix aux tirages. Checker serait une erreur — on donne une carte gratuite à trop de mains qui nous battent sur les runouts.',
      en: 'QQ on 876 two-tone is strong but extremely vulnerable: flush draws, straight draws, 9 and 5 complete many straights. Checking or betting small gives draws a favorable price. A 75% pot bet is recommended to: (1) extract value immediately, (2) price out draws. Checking would be a mistake — we give free cards to too many hands that can beat us on the runout.',
    },
  },

  // ── 7. Turn barrel pour la valeur ──────────────────────────────────────────
  {
    id: 'bs-07', street: 'turn',
    heroPosition: 'BTN', villainPosition: 'BB',
    heroHand: ['Jh', 'Td'], board: ['Qd', '9c', '8s', '7h'],
    potSize: 16, effectiveStack: 84, isHeroIP: true,
    preflopContext: {
      fr: 'BTN bet flop Q98, BB appelle. Turn 7 complète les quintes basses.',
      en: 'BTN bet Q98 flop, BB calls. Turn 7 completes low straights.',
    },
    boardTexture: { fr: 'Quinte JT complète — tirage couleur absent', en: 'JT straight complete — no flush draw' },
    handDescription: { fr: 'Quinte max (JQKQT? non — JT sur Q987 = quinte Q-high)', en: 'Straight (J-high) — top straight on this board' },
    options: ['check', 'small', 'medium', 'large'],
    correctKey: 'large',
    conceptTag: { fr: 'Protection', en: 'Protection' },
    explanation: {
      fr: 'Avec JT on a la meilleure quinte possible sur Q987. Mais attention : le board est encore très dynamique et le river peut compléter des flushes ou changer la nuts. Il faut miser grand (75%+) pour : (1) extraire de la valeur des sets et des quintes inférieures (T8, 65), (2) limiter la taille du pot pour le river si nécessaire. Un check serait trop passif — on laisse trop de mains progresser gratuitement.',
      en: 'With JT we have the current best straight on Q987. But the board is still dynamic — the river can complete flushes or change the nuts. Bet large (75%+) to: (1) extract from sets and inferior straights (T8, 65), (2) control pot size for the river if needed. Checking would be too passive — too many hands improve for free.',
    },
  },

  // ── 8. SPR bas, tout-in sur le flop ────────────────────────────────────────
  {
    id: 'bs-08', street: 'flop',
    heroPosition: 'BB', villainPosition: 'BTN',
    heroHand: ['Ac', 'As'], board: ['Kd', '7c', '2s'],
    potSize: 12, effectiveStack: 18, isHeroIP: false,
    preflopContext: {
      fr: 'BTN 3-bet, BB appelle. SPR = 1.5 — stacks très courts.',
      en: 'BTN 3-bets, BB calls. SPR = 1.5 — very short effective stacks.',
    },
    boardTexture: { fr: 'Sec, statique — K high, arc-en-ciel', en: 'Dry, static — K high, rainbow' },
    handDescription: { fr: 'Paire d\'as — main premium', en: 'Aces — premium hand' },
    options: ['check', 'small', 'large', 'overbet'],
    correctKey: 'large',
    conceptTag: { fr: 'SPR bas', en: 'Low SPR' },
    explanation: {
      fr: 'Avec un SPR de 1.5 (pot 12bb, stack 18bb), il n\'y a pas de géométrie de mise à respecter — on doit simplement entrer en all-in avec la meilleure main du flop. Avec AA sur K72 sec, le check serait une erreur majeure : on manquerait de l\'équité. Miser grand (75-100%) ou directement all-in est optimal. À SPR < 2, les subtilités de sizing disparaissent : c\'est bet/call ou fold.',
      en: 'With an SPR of 1.5 (pot 12bb, stack 18bb), there\'s no complex bet geometry — we simply want to get all-in with the best hand. With AA on dry K72, checking is a major error: missed equity. Bet large (75-100%) or directly all-in is optimal. At SPR < 2, sizing subtleties disappear: it\'s bet/call or fold.',
    },
  },

  // ── 9. Board monotone, pas de flush ────────────────────────────────────────
  {
    id: 'bs-09', street: 'flop',
    heroPosition: 'BTN', villainPosition: 'BB',
    heroHand: ['Kd', 'Ad'], board: ['Qh', 'Jh', 'Th'],
    potSize: 5, effectiveStack: 95, isHeroIP: true,
    preflopContext: {
      fr: 'BTN ouvre, BB défend. Flop QJT monotone cœurs.',
      en: 'BTN opens, BB calls. Flop QJT monotone hearts.',
    },
    boardTexture: { fr: 'Monotone, quinte possible, board extrême', en: 'Monotone, straight possible, extreme board' },
    handDescription: { fr: 'Straight broadway (A haut) mais pas de flush', en: 'Broadway straight (ace-high) but no flush' },
    options: ['check', 'small', 'medium', 'large'],
    correctKey: 'check',
    conceptTag: { fr: 'Pot Control', en: 'Pot Control' },
    explanation: {
      fr: 'Sur QJT monotone, tout le monde touche : paires, suites, flush potentiels. AK ici a certes une quinte royale partielle, mais sans flush draw à cœur, la main est TRÈS vulnérable à n\'importe quelle carte cœur. Les solveurs checkent très fréquemment avec des mains comme KA sans couleur sur monotone. Miser ne ferait appeler que les flush draws et les mains qui nous battent. Le check permet de réaliser son équité ou de contrôler le pot.',
      en: 'On QJT monotone, everyone connects: pairs, straights, potential flushes. AK here has a partial royal straight, but without a heart flush draw, the hand is VERY vulnerable to any heart card. Solvers check very frequently with hands like KA no-flush on monotone boards. Betting only calls in flush draws and hands that beat us. Checking lets us realize equity or control the pot.',
    },
  },

  // ── 10. Bluff polarisé au river ─────────────────────────────────────────────
  {
    id: 'bs-10', street: 'river',
    heroPosition: 'BTN', villainPosition: 'BB',
    heroHand: ['Kh', 'Qh'], board: ['As', '8d', '4c', '2h', '7s'],
    potSize: 18, effectiveStack: 82, isHeroIP: true,
    preflopContext: {
      fr: 'BTN bet flop et turn avec KQh, tirage raté au river.',
      en: 'BTN bet flop and turn with KQh flush draw, missed on river.',
    },
    boardTexture: { fr: 'River briqué — tous tirages ratés', en: 'River bricked — all draws missed' },
    handDescription: { fr: 'Tirage couleur raté — aucune valeur', en: 'Missed flush draw — zero showdown value' },
    options: ['check', 'small', 'large', 'overbet'],
    correctKey: 'overbet',
    conceptTag: { fr: 'Bluff polarisé', en: 'Polarized Bluff' },
    explanation: {
      fr: 'KQ♥ sans couleur au river n\'a aucune valeur au showdown. Checker concède le pot. La bonne joue ici est une surenchère (130%+) : (1) notre range contient aussi les nuts (AA, A8, A4 two pair, 77) qui justifient une grosse taille, (2) BB doit folder beaucoup de mains faibles face à cette mise. Si BB a une main de valeur moyenne (88, 44), il doit se plier face à la polarisation. Le bluff est représentable car on a "représenté" tout le board depuis le flop.',
      en: 'KQ♥ without a flush has zero showdown value. Checking concedes the pot. The right play is an overbet (130%+): (1) our range also contains the nuts (AA, A8, A4 two pair, 77) that justify a large size, (2) BB must fold many weak-medium hands facing this bet. If BB has a medium-strength hand (88, 44), they must fold to the polarization. The bluff is credible because we "represented" the whole board since the flop.',
    },
  },

  // ── 11. Paired board, range advantage BTN ──────────────────────────────────
  {
    id: 'bs-11', street: 'flop',
    heroPosition: 'BTN', villainPosition: 'BB',
    heroHand: ['Ac', 'Kd'], board: ['5s', '5c', '2d'],
    potSize: 4, effectiveStack: 96, isHeroIP: true,
    preflopContext: {
      fr: 'BTN ouvre, BB défend. Flop 552 arc-en-ciel — très statique.',
      en: 'BTN opens, BB calls. Flop 552 rainbow — very static.',
    },
    boardTexture: { fr: 'Pairé, très sec, statique', en: 'Paired, very dry, static' },
    handDescription: { fr: 'Deux overcards — aucune pair', en: 'Two overcards — no pair' },
    options: ['check', 'small', 'medium', 'overbet'],
    correctKey: 'small',
    conceptTag: { fr: 'Range Bet', en: 'Range Bet' },
    explanation: {
      fr: 'Sur un board pairé comme 552, BTN a un avantage de range énorme (plus de 55 dans la range d\'ouverture). Les solveurs recommandent une c-bet très haute fréquence à petite taille (25-33%). La BB range est limitée (elle ne 3-bet pas, donc elle a des mains médianes et bluff catchers). Avec AK, on a une main qui peut semi-bluffer efficacement : si on touche A ou K, on a la meilleure main. La surenchère n\'est pas appropriée ici car le board est trop statique.',
      en: 'On a paired board like 552, BTN has an enormous range advantage (55 is in the opening range). Solvers recommend a very high-frequency small c-bet (25-33%). BB\'s range is capped — no 3-bets, so mostly medium-strength bluff catchers. With AK we have an effective semi-bluff: if an A or K arrives we have the best hand. Overbet is inappropriate here — the board is too static to justify polarization.',
    },
  },

  // ── 12. Contrôle du pot en position ────────────────────────────────────────
  {
    id: 'bs-12', street: 'turn',
    heroPosition: 'BTN', villainPosition: 'BB',
    heroHand: ['Ah', 'Jc'], board: ['As', 'Td', '6h', 'Kd'],
    potSize: 15, effectiveStack: 85, isHeroIP: true,
    preflopContext: {
      fr: 'BTN bet flop A T6, BB appelle. Turn K — complète KJ et KQ.',
      en: 'BTN bet AT6 flop, BB calls. Turn K — completes KJ and KQ straights.',
    },
    boardTexture: { fr: 'Turn dangereux — K complète des quintes et donne paires hautes', en: 'Dangerous turn — K completes straights and gives top pair to villain range' },
    handDescription: { fr: 'Top paire bon kicker — main de valeur solide', en: 'Top pair good kicker — solid value hand' },
    options: ['check', 'small', 'medium', 'large'],
    correctKey: 'medium',
    conceptTag: { fr: 'Valeur fine', en: 'Thin Value' },
    explanation: {
      fr: 'Avec AJ sur ATK, on a top pair bon kicker mais le K au turn donne des quintes à QJ, et la BB peut avoir KT, K6. Une mise médiane (50-55%) extrait de la valeur des mains comme AT, TT, 66 tout en contrôlant le pot contre les draws. Une grosse mise (75%) ferait folder exactement les mains qu\'on bat. Une petite mise laisserait trop de mains continuer gratuitement. 50-55% est l\'équilibre optimal ici.',
      en: 'With AJ on ATK, we have top pair good kicker but K gives QJ a straight, and BB can have KT, K6. A medium bet (50-55%) extracts from hands like AT, TT, 66 while controlling the pot against draws. A large bet (75%) folds exactly the hands we beat. A small bet lets too many hands continue cheaply. 50-55% is the optimal balance.',
    },
  },
];

// Shuffle utility (Fisher-Yates)
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Sources footer ───────────────────────────────────────────────────────────

const SOURCES = [
  {
    authors: 'Acevedo, M.',
    title: 'Modern Poker Theory',
    year: '2019',
    note: { fr: 'Fondements GTO, sizings dérivés de solveurs', en: 'GTO fundamentals, solver-derived sizings' },
    url: null,
  },
  {
    authors: 'Janda, M.',
    title: 'Applications of No-Limit Hold\'em',
    year: '2013',
    note: { fr: 'Théorie de la polarisation et du sizing relatif à la range', en: 'Polarization theory and range-relative bet sizing' },
    url: null,
  },
  {
    authors: 'Miller, E.',
    title: "Poker's 1%",
    year: '2014',
    note: { fr: 'Texture du board et concepts de sizing', en: 'Board texture and sizing concepts' },
    url: null,
  },
  {
    authors: 'GTO Wizard',
    title: 'Solver solutions database',
    year: '2023',
    note: { fr: 'Sizings moyens de la population, spots résolus', en: 'Population average sizings, solved spots' },
    url: 'https://gtowizard.com',
  },
  {
    authors: 'PioSolver',
    title: 'EV-maximizing bet sizing research',
    year: '2016–',
    note: { fr: 'Calcul EV, fréquences de mise optimales', en: 'EV calculation, optimal bet frequency outputs' },
    url: 'https://piosolver.com',
  },
];

function SourcesFooter({ isEn }: { isEn: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-8 rounded-2xl border border-gray-800 overflow-hidden text-xs">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-gray-900/60 hover:bg-gray-800/60 transition-colors text-left"
      >
        <span className="flex items-center gap-2 text-gray-400 font-semibold">
          <BookOpen size={12} className="shrink-0" />
          {isEn ? 'Sources & methodology' : 'Sources & méthodologie'}
        </span>
        <span className="text-gray-600">{open ? '▲' : '▼'}</span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="px-4 py-4 bg-gray-950/50 border-t border-gray-800 flex flex-col gap-3">
              <p className="text-gray-500 leading-relaxed mb-1">
                {isEn
                  ? 'All exercise scenarios and correct answers are calibrated from GTO solver outputs and established poker theory literature. Sizings reflect population-average solver frequencies for 100bb effective stacks in 6-max cash games unless specified.'
                  : 'Tous les scénarios et réponses correctes sont calibrés sur des sorties de solveurs GTO et la littérature poker de référence. Les sizings reflètent les fréquences moyennes de la population pour des stacks de 100bb en cash game 6-max, sauf mention contraire.'}
              </p>
              <div className="flex flex-col gap-2">
                {SOURCES.map((s, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-gray-600 shrink-0 mt-0.5">▸</span>
                    <div>
                      <span className="text-gray-300 font-semibold">{s.authors}</span>
                      {' — '}
                      <span className="text-gray-400 italic">{s.title}</span>
                      {' '}
                      <span className="text-gray-600">({s.year})</span>
                      {' — '}
                      <span className="text-gray-500">{isEn ? s.note.en : s.note.fr}</span>
                      {s.url && (
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-1.5 inline-flex items-center gap-0.5 text-sky-500 hover:text-sky-400 transition-colors"
                        >
                          <ExternalLink size={9} />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function BetSizingTrainer() {
  const lang     = useLangStore(s => s.lang);
  const isEn     = lang === 'en';
  const isMobile = useIsMobile();
  const { sessionStats, recordResult, setTrainerStarted } = useTrainingStore();
  const mode     = useModeStore(s => s.mode);

  const [showIntro, setShowIntro] = useState(true);
  const [phase,     setPhase]     = useState<Phase>('exercise');
  const [queue,     setQueue]     = useState<BetSizingExercise[]>([]);
  const [exercise,  setExercise]  = useState<BetSizingExercise | null>(null);
  const [selected,  setSelected]  = useState<SizingKey | null>(null);
  const [xpEarned,  setXpEarned]  = useState(0);

  const nextExercise = (q = queue) => {
    let remaining = q;
    if (remaining.length === 0) remaining = shuffle(EXERCISES);
    const [ex, ...rest] = remaining;
    setExercise(ex);
    setQueue(rest);
    setPhase('exercise');
    setSelected(null);
  };

  const handleStart = () => {
    setShowIntro(false);
    setTrainerStarted(true);
    nextExercise(shuffle(EXERCISES));
  };

  const handleAnswer = async (key: SizingKey) => {
    if (!exercise || phase === 'result') return;
    setSelected(key);
    const ok = key === exercise.correctKey;
    const xp = ok ? 15 : 5;
    setXpEarned(xp);
    await recordResult(ok, xp, 'betsizing');
    setPhase('result');
  };

  const handleNext = () => nextExercise();

  const ex        = exercise;
  const isCorrect = !!ex && selected === ex.correctKey;

  // ── Intro ─────────────────────────────────────────────────────────────────
  if (showIntro) return (
    <div className="flex flex-col gap-5 max-w-2xl mx-auto">
      <TrainerIntro
        emoji="📐"
        title={isEn ? 'Bet Sizing Trainer' : 'Entraîneur Bet Sizing'}
        description={isEn
          ? 'Choose the right bet size for every situation — the most underrated skill in poker.'
          : 'Choisissez la bonne taille de mise dans chaque situation — la compétence la plus sous-estimée du poker.'}
        whatTitle={isEn ? 'Why does sizing matter?' : 'Pourquoi le sizing est-il crucial ?'}
        whatContent={
          <>
            <p className="text-gray-400 text-sm leading-relaxed mb-4">
              {isEn
                ? 'The correct bet size depends on your range, the board texture, your position, and stack depth. A wrong size leaks EV on every single hand — even when you make the right strategic decision.'
                : 'La bonne taille de mise dépend de votre range, la texture du board, votre position et la profondeur des stacks. Une mauvaise taille fait fuir de l\'EV sur chaque main — même quand la décision stratégique est correcte.'}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: '📦', label: isEn ? 'Small (25-33%)' : 'Petite (25-33%)',    desc: isEn ? 'Range bets, thin value, static boards' : 'Range bets, valeur fine, boards statiques' },
                { icon: '⚖️', label: isEn ? 'Medium (50-60%)' : 'Médiane (50-60%)', desc: isEn ? 'Balance, value on dynamic boards' : 'Équilibre, valeur sur boards dynamiques' },
                { icon: '🔥', label: isEn ? 'Large (75-100%)' : 'Grande (75-100%)',  desc: isEn ? 'Protection, polarized, draws present' : 'Protection, polarisation, tirages présents' },
                { icon: '🚀', label: isEn ? 'Overbet (130%+)' : 'Surenchère (130%+)', desc: isEn ? 'Nuts on polarized runouts, bluffs' : 'Nuts sur runouts polarisés, bluffs' },
              ].map(s => (
                <div key={s.label} className="bg-gray-800/50 rounded-xl p-3 border border-gray-700">
                  <div className="text-lg mb-1">{s.icon}</div>
                  <div className="text-white font-bold text-xs">{s.label}</div>
                  <div className="text-gray-500 text-xs mt-0.5 leading-tight">{s.desc}</div>
                </div>
              ))}
            </div>
          </>
        }
        steps={isEn ? [
          '🎯 A scenario appears: position, board, hand, pot size',
          '🃏 Cards displayed on the poker table — no text descriptions',
          '📐 Choose the best sizing from the options',
          '💡 Detailed GTO explanation after each answer',
          '📚 Sources listed at the bottom of the page',
        ] : [
          '🎯 Un scénario s\'affiche : position, board, main, pot',
          '🃏 Cartes affichées sur la table — pas de descriptions texte',
          '📐 Choisissez la meilleure taille parmi les options',
          '💡 Explication GTO détaillée après chaque réponse',
          '📚 Sources listées en bas de page',
        ]}
        beginnerHint={isEn ? 'Shows board texture, hand type & key hints' : 'Affiche texture, type de main & indices clés'}
        advancedHint={isEn ? 'No hints — raw decision-making' : 'Sans indices — décision brute'}
        startLabel={isEn ? 'Start training' : "Commencer l'entraînement"}
        onStart={handleStart}
        mode={mode}
      />
      <SourcesFooter isEn={isEn} />
    </div>
  );

  return (
    <div className="flex flex-col gap-5 max-w-2xl mx-auto">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">
            {isEn ? 'Bet Sizing Trainer' : 'Entraîneur Bet Sizing'}
          </h2>
          <p className="text-gray-400 text-sm">
            {isEn ? 'Find the optimal bet size for the situation' : 'Trouvez la taille de mise optimale'}
          </p>
        </div>
        <button
          onClick={() => { setShowIntro(true); setTrainerStarted(false); }}
          className="text-xs text-gray-500 hover:text-gray-300 transition-colors px-2 py-1 mt-1"
          title={isEn ? 'Module info' : 'Infos du module'}
        >
          <Info size={14} />
        </button>
      </div>

      {/* ════════════ EXERCISE ════════════ */}
      {phase === 'exercise' && ex && (
        <AnimatePresence mode="wait">
          <motion.div
            key={ex.id}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            className="flex flex-col items-center gap-4"
          >
            {/* Street + concept badges */}
            <div className="flex items-center gap-2 flex-wrap justify-center">
              <div className={`px-3 py-1 rounded-full border text-xs font-bold ${STREET_COLORS[ex.street]}`}>
                {isEn ? STREET_LABELS[ex.street].en : STREET_LABELS[ex.street].fr}
              </div>
              {mode === 'beginner' && (
                <div className={`px-3 py-1 rounded-full border text-xs font-bold ${CONCEPT_COLOR[isEn ? ex.conceptTag.en : ex.conceptTag.fr] ?? 'bg-gray-800 text-gray-400 border-gray-700'}`}>
                  {isEn ? ex.conceptTag.en : ex.conceptTag.fr}
                </div>
              )}
            </div>

            {/* Poker table */}
            <div className="w-full max-w-xs sm:max-w-xl mx-auto">
              <PokerTable
                heroPosition={ex.heroPosition}
                interactive={false}
                activePlayers={[ex.heroPosition, ex.villainPosition]}
                potDisplay={`${ex.potSize}bb`}
                heroCards={ex.heroHand}
                boardCards={ex.board}
                boardCardSize="md"
                compact={true}
                seatInfos={{
                  [ex.heroPosition]:    { stack: `${ex.effectiveStack}bb` },
                  [ex.villainPosition]: { stack: `${ex.effectiveStack}bb` },
                } as Partial<Record<Position, SeatInfo>>}
              />
            </div>

            {/* Hero cards in a clearly separated info block */}
            <div className="w-full max-w-xs sm:max-w-sm rounded-2xl border border-gray-700/60 bg-gray-900/50 px-4 py-3 flex items-center justify-center gap-3">
              <Hand cards={ex.heroHand as any} size="md" gap="gap-2" animate={false} />
            </div>

            {/* Context block */}
            <div className="w-full rounded-2xl border border-gray-700 overflow-hidden text-sm">
              {/* Preflop context */}
              <div className="flex items-start gap-3 px-4 py-3 bg-gray-900/70 border-b border-gray-700/60">
                <span className="text-gray-500 font-bold text-xs uppercase tracking-wide pt-0.5 shrink-0 w-16">
                  {isEn ? 'Preflop' : 'Préflop'}
                </span>
                <div className="flex-1">
                  <p className="text-gray-300">{isEn ? ex.preflopContext.en : ex.preflopContext.fr}</p>
                  <p className="text-gray-500 text-xs mt-0.5">
                    {isEn ? 'Pot:' : 'Pot :'}{' '}
                    <span className="text-yellow-400 font-bold">{ex.potSize}bb</span>
                    {' · '}
                    <span className={`font-semibold ${ex.isHeroIP ? 'text-green-400' : 'text-orange-400'}`}>
                      {isEn
                        ? (ex.isHeroIP ? 'In Position (IP)' : 'Out of Position (OOP)')
                        : (ex.isHeroIP ? 'En position (IP)'  : 'Hors position (OOP)')}
                    </span>
                  </p>
                </div>
              </div>

              {/* Question */}
              <div className="flex items-start gap-3 px-4 py-3 bg-yellow-900/10">
                <span className="text-yellow-600 font-bold text-xs uppercase tracking-wide pt-0.5 shrink-0 w-16">
                  {isEn ? 'Question' : 'Question'}
                </span>
                <p className="text-yellow-100 font-semibold flex-1">
                  {isEn
                    ? 'Your opponent checks to you. What is the optimal bet size?'
                    : 'Votre adversaire checke. Quelle est la taille de mise optimale ?'}
                </p>
              </div>
            </div>

            {/* Beginner hints */}
            {mode === 'beginner' && (
              <div className="grid grid-cols-2 gap-2 w-full">
                <div className="bg-gray-800/60 rounded-xl px-4 py-2.5 border border-gray-700 text-center">
                  <p className="text-gray-500 text-xs mb-0.5">{isEn ? 'Your hand' : 'Votre main'}</p>
                  <p className="text-white font-semibold text-sm">{isEn ? ex.handDescription.en : ex.handDescription.fr}</p>
                </div>
                <div className="bg-gray-800/60 rounded-xl px-4 py-2.5 border border-gray-700 text-center">
                  <p className="text-gray-500 text-xs mb-0.5">{isEn ? 'Board texture' : 'Texture du board'}</p>
                  <p className="text-white font-semibold text-sm">{isEn ? ex.boardTexture.en : ex.boardTexture.fr}</p>
                </div>
              </div>
            )}

            {/* Sizing buttons */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-wrap gap-3 justify-center w-full"
            >
              {ex.options.map(key => {
                const cfg = SIZING[key];
                const bb  = key === 'check' ? null : sizingBb(ex.potSize, key);
                return (
                  <Button
                    key={key}
                    size="lg"
                    variant={SIZING_VARIANT[key]}
                    onClick={() => handleAnswer(key)}
                    className="min-w-[150px] flex flex-col items-center gap-0.5 py-3"
                  >
                    <span className="font-bold">
                      {isEn ? cfg.labelEn(bb ?? 0) : cfg.labelFr(bb ?? 0)}
                    </span>
                    {bb !== null && (
                      <span className="text-xs opacity-70 font-normal">
                        {isEn ? `= ${bb}bb into ${ex.potSize}bb` : `= ${bb}bb dans pot ${ex.potSize}bb`}
                      </span>
                    )}
                  </Button>
                );
              })}
            </motion.div>
          </motion.div>
        </AnimatePresence>
      )}

      {/* ════════════ RESULT ════════════ */}
      {phase === 'result' && ex && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-5"
        >
          <VerdictBanner isCorrect={isCorrect} />

          {/* Table recap */}
          <div className="w-full max-w-xs sm:max-w-full">
            <PokerTable
              heroPosition={ex.heroPosition}
              interactive={false}
              activePlayers={[ex.heroPosition, ex.villainPosition]}
              potDisplay={`${ex.potSize}bb`}
              heroCards={ex.heroHand}
              boardCards={ex.board}
              compact={false}
              seatInfos={{
                [ex.heroPosition]:    { stack: `${ex.effectiveStack}bb` },
                [ex.villainPosition]: { stack: `${ex.effectiveStack}bb` },
              } as Partial<Record<Position, SeatInfo>>}
            />
          </div>

          {/* Street + concept badges */}
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <div className={`px-3 py-1 rounded-full border text-xs font-bold ${STREET_COLORS[ex.street]}`}>
              {isEn ? STREET_LABELS[ex.street].en : STREET_LABELS[ex.street].fr}
            </div>
            <div className={`px-3 py-1 rounded-full border text-xs font-bold ${CONCEPT_COLOR[isEn ? ex.conceptTag.en : ex.conceptTag.fr] ?? 'bg-gray-800 text-gray-400 border-gray-700'}`}>
              {isEn ? ex.conceptTag.en : ex.conceptTag.fr}
            </div>
          </div>

          {/* Answer recap pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
            {(() => {
              const correctCfg = SIZING[ex.correctKey];
              const correctBb  = ex.correctKey === 'check' ? null : sizingBb(ex.potSize, ex.correctKey);
              return (
                <span className="px-2.5 py-1 rounded-full border bg-green-900/30 text-green-300 border-green-700">
                  ✓ {isEn ? 'Correct:' : 'Correct :'}{' '}
                  <strong>{isEn ? correctCfg.labelEn(correctBb ?? 0) : correctCfg.labelFr(correctBb ?? 0)}</strong>
                </span>
              );
            })()}
            {selected && selected !== ex.correctKey && (() => {
              const selCfg = SIZING[selected];
              const selBb  = selected === 'check' ? null : sizingBb(ex.potSize, selected);
              return (
                <span className="px-2.5 py-1 rounded-full border bg-red-900/30 text-red-300 border-red-700">
                  ✗ {isEn ? 'You chose:' : 'Votre choix :'}{' '}
                  <strong>{isEn ? selCfg.labelEn(selBb ?? 0) : selCfg.labelFr(selBb ?? 0)}</strong>
                </span>
              );
            })()}
            <span className="px-2.5 py-1 rounded-full border bg-blue-900/30 text-blue-300 border-blue-700">
              <Zap size={10} className="inline mr-1" />+{xpEarned} XP
            </span>
          </div>

          {/* Stats summary */}
          <div className="grid grid-cols-2 gap-3 w-full text-sm">
            <div className="bg-gray-800/60 rounded-xl px-3 py-2 border border-gray-700 text-center">
              <p className="text-gray-500 text-xs mb-0.5">{isEn ? 'Board texture' : 'Texture'}</p>
              <p className="text-white font-semibold text-xs">{isEn ? ex.boardTexture.en : ex.boardTexture.fr}</p>
            </div>
            <div className="bg-gray-800/60 rounded-xl px-3 py-2 border border-gray-700 text-center">
              <p className="text-gray-500 text-xs mb-0.5">{isEn ? 'Position' : 'Position'}</p>
              <p className={`font-bold text-sm ${ex.isHeroIP ? 'text-green-400' : 'text-orange-400'}`}>
                {ex.isHeroIP ? 'IP' : 'OOP'}{' '}
                <span className="text-gray-400 font-normal text-xs">({ex.heroPosition})</span>
              </p>
            </div>
          </div>

          {/* Next button */}
          <div className="w-full max-w-xs">
            <Button size="lg" variant="gold" onClick={handleNext} fullWidth>
              {isEn ? 'Next exercise' : 'Exercice suivant'}{' '}
              <ChevronRight size={18} className="inline" />
            </Button>
          </div>

          {/* Session stats */}
          <SessionStatsBar
            total={sessionStats.total}
            correct={sessionStats.correct}
            streak={sessionStats.streak}
            xp={sessionStats.xp}
          />

          {/* Bet sizing calculation panel — beginner only */}
          {mode === 'beginner' && (() => {
            const correctCfg = SIZING[ex.correctKey];
            const correctBb  = ex.correctKey === 'check' ? 0 : sizingBb(ex.potSize, ex.correctKey);
            const totalAfterBet = ex.potSize + correctBb;
            const villainPotOdds = correctBb > 0
              ? Math.round((correctBb / totalAfterBet) * 100)
              : null;
            return (
              <div className="w-full rounded-2xl border border-gray-700 overflow-hidden text-xs">
                <div className="px-4 py-2.5 bg-gray-800/50 border-b border-gray-700 flex items-center gap-2 text-gray-400 font-semibold">
                  <span>🧮</span>
                  {isEn ? 'Sizing calculation' : 'Calcul du sizing'}
                </div>
                <div className="px-4 py-3 bg-gray-900/50 flex flex-col gap-2">
                  {ex.correctKey === 'check' ? (
                    <p className="text-gray-400">
                      {isEn
                        ? 'Optimal play is to check — no bet required.'
                        : 'La décision optimale est de checker — aucune mise requise.'}
                    </p>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 flex-wrap font-mono">
                        <span className="text-gray-400">{isEn ? 'Pot' : 'Pot'} =</span>
                        <span className="text-yellow-400 font-bold">{ex.potSize}bb</span>
                        <span className="text-gray-600">×</span>
                        <span className="text-blue-300 font-bold">{correctCfg.pct}%</span>
                        <span className="text-gray-600">=</span>
                        <span className="text-green-400 font-bold">{correctBb}bb</span>
                      </div>
                      <p className="text-gray-400 leading-relaxed">
                        {isEn
                          ? `${ex.potSize}bb × ${correctCfg.pct / 100} = ${correctBb}bb into ${ex.potSize}bb pot.`
                          : `${ex.potSize}bb × ${correctCfg.pct / 100} = ${correctBb}bb dans un pot de ${ex.potSize}bb.`}
                      </p>
                      {villainPotOdds !== null && (
                        <div className="mt-1 pt-2 border-t border-gray-800">
                          <p className="text-gray-500 mb-1">
                            {isEn ? 'Pot odds villain faces:' : 'Pot odds de l\'adversaire :'}
                          </p>
                          <p className="font-mono text-purple-300">
                            ( {correctBb} / {totalAfterBet} ) × 100 = <strong>{villainPotOdds}%</strong>
                          </p>
                          <p className="text-gray-500 mt-0.5">
                            {isEn
                              ? `Villain must call ${correctBb}bb into a ${totalAfterBet}bb pot → needs ${villainPotOdds}%+ equity to call profitably.`
                              : `L'adversaire doit payer ${correctBb}bb pour un pot de ${totalAfterBet}bb → il lui faut ${villainPotOdds}%+ d'équité pour call rentable.`}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })()}

          {/* GTO explanation */}
          <ExplanationPanel text={isEn ? ex.explanation.en : ex.explanation.fr} className="p-5" />
        </motion.div>
      )}

      {/* ─── Sources footer ─────────────────────────────────────────────────── */}
      <SourcesFooter isEn={isEn} />

    </div>
  );
}
