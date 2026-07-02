import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Zap, BookOpen, ExternalLink, Lightbulb } from 'lucide-react';
import { useIsMobile } from '../../hooks/useIsMobile';
import { useExerciseLock } from '../../hooks/useExerciseLock';
import { useExamRunner } from '../../hooks/useExamRunner';
import { SprintTimer } from '../ui/SprintTimer';
import { ExamLauncher, ExamHud, ExamResult } from './ExamMode';
import { useShallow } from 'zustand/react/shallow';
import { useTrainingStore } from '../../store/trainingStore';
import { Button } from '../ui/Button';
import { SessionStatsBar } from '../ui/SessionStatsBar';
import { useModeStore } from '../../store/modeStore';
import { VerdictBanner } from '../ui/VerdictBanner';
import { ExplanationPanel } from '../ui/ExplanationPanel';
import { RichLine } from '../ui/RichText';
import { BeginnerGuide } from '../ui/BeginnerGuide';
import { SpoilableHint } from '../ui/SpoilableHint';
import { TrainerIntro } from '../ui/TrainerIntro';
import { QuotaLockPanel } from '../ui/QuotaLockPanel';
import { useAuthStore } from '../../store/authStore';
import { useQuotaStore } from '../../store/quotaStore';
import { quotaApi } from '../../services/api';
import { PokerTable, SeatInfo } from '../poker/PokerTable';
import { Hand } from '../poker/Card';
import { Position } from '../../types/poker';
import { useLangStore } from '../../store/langStore';

// ─── Types ────────────────────────────────────────────────────────────────────

type SizingKey  = 'check' | 'small' | 'medium' | 'large' | 'overbet';
type Phase      = 'exercise' | 'result';
type Street     = 'flop' | 'turn' | 'river';

type FreqKey = '0%' | '33%' | '67%' | '100%';

interface BaseExercise {
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
  conceptTag:      { fr: string; en: string };
  explanation:     { fr: string; en: string };
  difficulty:      'normal' | 'hard';
}

interface SizingExercise extends BaseExercise {
  frequencyMode?: false;
  options:    SizingKey[];
  correctKey: SizingKey;
}

interface FrequencyExercise extends BaseExercise {
  frequencyMode: true;
  correctFrequency: FreqKey;
}

type BetSizingExercise = SizingExercise | FrequencyExercise;

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

const FREQ_OPTIONS: { key: FreqKey; labelFr: string; labelEn: string }[] = [
  { key: '0%',   labelFr: 'Jamais (0%)',      labelEn: 'Never (0%)' },
  { key: '33%',  labelFr: 'Rarement (33%)',   labelEn: 'Rarely (33%)' },
  { key: '67%',  labelFr: 'Souvent (67%)',    labelEn: 'Often (67%)' },
  { key: '100%', labelFr: 'Toujours (100%)',  labelEn: 'Always (100%)' },
];

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
    id: 'bs-01', street: 'flop', difficulty: 'normal',
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
    id: 'bs-02', street: 'flop', difficulty: 'normal',
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
    id: 'bs-03', street: 'river', difficulty: 'normal',
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
    id: 'bs-04', street: 'river', difficulty: 'hard',
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
    id: 'bs-05', street: 'flop', difficulty: 'normal',
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
    id: 'bs-06', street: 'flop', difficulty: 'normal',
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
    id: 'bs-07', street: 'turn', difficulty: 'hard',
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
    id: 'bs-08', street: 'flop', difficulty: 'normal',
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
    id: 'bs-09', street: 'flop', difficulty: 'hard',
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
    id: 'bs-10', street: 'river', difficulty: 'hard',
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
    id: 'bs-11', street: 'flop', difficulty: 'normal',
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
    id: 'bs-12', street: 'turn', difficulty: 'hard',
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

  // ── 13. Pot 3-bet, set, board sec ──────────────────────────────────────────
  {
    id: 'bs-13', street: 'flop', difficulty: 'hard',
    heroPosition: 'BTN', villainPosition: 'BB',
    heroHand: ['Ts', 'Tc'], board: ['Th', '5d', '2c'],
    potSize: 20, effectiveStack: 80, isHeroIP: true,
    preflopContext: {
      fr: 'BTN 3-bet à 9bb, BB appelle. Pot 3-bet de 20bb, SPR = 4.',
      en: 'BTN 3-bets to 9bb, BB calls. 3-bet pot of 20bb, SPR = 4.',
    },
    boardTexture: { fr: 'Très sec, T high, arc-en-ciel — set de dix', en: 'Very dry, T-high rainbow — set of tens' },
    handDescription: { fr: 'Set de dix — main très forte', en: 'Set of tens — very strong hand' },
    options: ['check', 'small', 'medium', 'large'],
    correctKey: 'medium',
    conceptTag: { fr: 'Valeur fine', en: 'Thin Value' },
    explanation: {
      fr: 'Dans un pot 3-bet avec un set sur un board sec, on pourrait vouloir miser gros — mais le SPR de 4 change le calcul. La range de la BB est plus forte (elle a appelé un 3-bet, donc elle a des paires, des broadways). Une mise médiane (50-55%) extrait de la valeur des KK/QQ/JJ qui pensent être ahead et construit le pot pour l\'all-in naturel au turn. Miser 75% force souvent folder les mains qui payeraient un turn. Checker serait une erreur de valeur majeure avec cette main.',
      en: 'In a 3-bet pot with a set on a dry board, you might want to bet big — but SPR of 4 changes the math. BB\'s range is stronger (she called a 3-bet, so she has pairs, broadways). A medium bet (50-55%) extracts from KK/QQ/JJ that think they\'re ahead and builds toward a natural all-in on the turn. 75% often folds the hands that would pay the turn. Checking is a major value error with this hand.',
    },
  },

  // ── 14. River, villain capped, surenchère value ─────────────────────────────
  {
    id: 'bs-14', street: 'river', difficulty: 'hard',
    heroPosition: 'BTN', villainPosition: 'BB',
    heroHand: ['As', 'Ks'], board: ['Qs', 'Js', 'Ts', '3c', '7h'],
    potSize: 22, effectiveStack: 78, isHeroIP: true,
    preflopContext: {
      fr: 'BTN bet flop et turn. La BB check le river avec une range cappée (sans flush, sans quinte haute).',
      en: 'BTN bet flop and turn. BB checks river with a capped range (no flush, no top straight).',
    },
    boardTexture: { fr: 'River final — couleur complétée, quinte broadway possible', en: 'River final — flush completed, broadway straight possible' },
    handDescription: { fr: 'Royal flush (quinte flush royale) — main absolue', en: 'Royal flush — the absolute nuts' },
    options: ['small', 'medium', 'large', 'overbet'],
    correctKey: 'overbet',
    conceptTag: { fr: 'Surenchère', en: 'Overbet' },
    explanation: {
      fr: 'Avec la quinte flush royale, on détient la main absolue. La BB a checkté river ce qui indique une range cappée — elle ne peut pas avoir le flush max (elle l\'aurait check-raised au turn ou bet river). C\'est la situation idéale pour une surenchère (130%+) : notre range est très polarisée ici, la BB doit payer avec ses secondes meilleures mains. Une mise plus petite sous-extrait massivement de la valeur.',
      en: 'Holding the royal flush, we have the absolute nuts. BB checked river indicating a capped range — she can\'t have the nut flush (she\'d have check-raised the turn or bet river). This is the ideal overbet spot (130%+): our range is very polarized here, BB must call with her second-best hands. A smaller bet massively under-extracts value.',
    },
  },

  // ── 15. Flop, deux overcards + tirage couleur, OOP ─────────────────────────
  {
    id: 'bs-15', street: 'flop', difficulty: 'normal',
    heroPosition: 'BB', villainPosition: 'BTN',
    heroHand: ['Ah', '9h'], board: ['Kh', '7d', '4h'],
    potSize: 6, effectiveStack: 94, isHeroIP: false,
    preflopContext: {
      fr: 'BTN ouvre, BB défend. Flop K74 bicolore cœurs.',
      en: 'BTN opens, BB calls. Flop K74 two-tone hearts.',
    },
    boardTexture: { fr: 'Semi-humide, tirage couleur A-high, K sur le board', en: 'Semi-wet, A-high flush draw, K on board' },
    handDescription: { fr: 'Overcard A + tirage couleur nut — semi-bluff', en: 'Ace overcard + nut flush draw — semi-bluff' },
    options: ['check', 'small', 'medium', 'large'],
    correctKey: 'check',
    conceptTag: { fr: 'Hors position', en: 'Out of Position' },
    explanation: {
      fr: 'Avec Ah9h sur K74 bicolore, on a un tirage couleur nut et un overcard. En apparence, une c-bet (donk bet) semble attrayante — mais hors position, la range de la BB n\'est pas assez forte sur ce board (le BTN a plus de K, plus de sets). Checker et check-call si BTN mise petit, ou check-raise si BTN mise gros, est optimal. Cela réalise l\'équité du tirage gratuitement tout en évitant de bloquer les mises de valeur adverses dans une range plus forte.',
      en: 'With Ah9h on K74 two-tone, we have a nut flush draw and an overcard. A donk-bet looks tempting — but out of position, BB\'s range isn\'t strong enough on this board (BTN has more Ks, more sets). Check and check-call if BTN bets small, or check-raise if BTN bets big, is optimal. This realizes flush draw equity for free while avoiding blocking villain\'s value bets with a stronger range.',
    },
  },

  // ── 16. Turn barrel bluff, tirage raté ─────────────────────────────────────
  {
    id: 'bs-16', street: 'turn', difficulty: 'hard',
    heroPosition: 'CO', villainPosition: 'BB',
    heroHand: ['Jh', 'Th'], board: ['Ks', '8h', '2h', '6d'],
    potSize: 18, effectiveStack: 82, isHeroIP: true,
    preflopContext: {
      fr: 'CO bet le flop K82 avec tirage couleur, BB appelle. Turn 6 — tirage toujours vivant.',
      en: 'CO bet K82 flop with flush draw, BB calls. Turn 6 — flush draw still live.',
    },
    boardTexture: { fr: 'Turn neutre, tirage couleur toujours vivant, range BB cappée', en: 'Neutral turn, flush draw still live, BB range capped' },
    handDescription: { fr: 'Tirage couleur nut (flush draw) + gutshot — semi-bluff', en: 'Nut flush draw + gutshot — semi-bluff' },
    options: ['check', 'small', 'medium', 'large'],
    correctKey: 'large',
    conceptTag: { fr: 'Protection', en: 'Protection' },
    explanation: {
      fr: 'Avec JhTh sur Ks-8h-2h-6d, on a un flush draw nut (9 outs) et un gutshot (4 outs partiellement overlappants). C\'est 11-12 outs effectifs, soit ~24% d\'équité sur la river. En position, cette main semi-bluff avec une grosse mise (75%+) : (1) on fold immédiatement si villain relance, (2) si villain call, on réalise son équité river, (3) une petite mise donnerait de trop bons pot-odds aux mains qui nous battent actuellement.',
      en: 'With JhTh on Ks-8h-2h-6d, we have a nut flush draw (9 outs) and a gutshot (4 partially overlapping outs). That\'s 11-12 effective outs, ~24% river equity. In position, this hand semi-bluffs with a large bet (75%+): (1) we fold immediately if villain raises, (2) if villain calls, we realize river equity, (3) a small bet gives too good pot-odds to hands currently beating us.',
    },
  },

  // ── 17. River check avec flush non-nut ─────────────────────────────────────
  {
    id: 'bs-17', street: 'river', difficulty: 'hard',
    heroPosition: 'BB', villainPosition: 'BTN',
    heroHand: ['9h', '8h'], board: ['Kh', '5h', '3d', '2c', 'Jh'],
    potSize: 24, effectiveStack: 76, isHeroIP: false,
    preflopContext: {
      fr: 'BTN ouvre, BB défend. River Jh complète la couleur — pas le nut flush.',
      en: 'BTN opens, BB calls. River Jh completes flush — not the nut flush.',
    },
    boardTexture: { fr: 'River couleur complétée — flush 9-high (non-nut)', en: 'River flush completed — 9-high flush (non-nut)' },
    handDescription: { fr: 'Flush 9-high — non-nut, vulnerable aux flush supérieurs', en: '9-high flush — non-nut, vulnerable to higher flushes' },
    options: ['check', 'small', 'medium', 'large'],
    correctKey: 'check',
    conceptTag: { fr: 'Pot Control', en: 'Pot Control' },
    explanation: {
      fr: 'Avec 9h8h sur un board monotone cœurs au river, on a un flush — mais pas le nut flush. Le BTN peut avoir Ah, Kh, Qh, Jh, Th facilement. Miser OOP avec un flush non-nut est dangereux : si le BTN raise, on est dans une situation terrible. Les solveurs checkent très fréquemment ici pour contrôler le pot. Si BTN bet, on call. Si BTN check back, on a gagné. Miser serait offrir à BTN une décision parfaite : call avec ses flush inférieurs, raise avec le nut.',
      en: 'With 9h8h on a monotone heart board on the river, we have a flush — but not the nut flush. BTN can easily have Ah, Kh, Qh, Jh, Th. Betting OOP with a non-nut flush is dangerous: if BTN raises, we\'re in a terrible spot. Solvers check very frequently here to control the pot. If BTN bets, we call. If BTN checks back, we win. Betting offers BTN a perfect decision: call with inferior flushes, raise with the nuts.',
    },
  },

  // ── 18. Set au flop, board dynamique, protection max ───────────────────────
  {
    id: 'bs-18', street: 'flop', difficulty: 'normal',
    heroPosition: 'CO', villainPosition: 'BB',
    heroHand: ['6s', '6c'], board: ['6h', '7d', '8s'],
    potSize: 5, effectiveStack: 95, isHeroIP: true,
    preflopContext: {
      fr: 'CO ouvre, BB défend. Flop 678 bigarré — set de 6, mais board très connecté.',
      en: 'CO opens, BB calls. Flop 678 rainbow — set of sixes, but highly connected board.',
    },
    boardTexture: { fr: 'Connecté, plusieurs quintes possibles (45, 59, T9), semi-sec', en: 'Connected, multiple straight draws (45, 59, T9), semi-dry' },
    handDescription: { fr: 'Set de 6 — main très forte mais vulnérable aux quintes', en: 'Set of sixes — very strong but vulnerable to straights' },
    options: ['check', 'small', 'medium', 'large'],
    correctKey: 'large',
    conceptTag: { fr: 'Protection', en: 'Protection' },
    explanation: {
      fr: 'Le set de 6 sur 6-7-8 est une main très forte, mais le board est dangereux : 45, 59, T9 ont tous des quintes ou tirages de quinte. Checker ou miser petit permettrait à ces draws de réaliser leur équité gratuitement ou à bon prix. Une mise grande (75%+) : (1) extrait de la valeur de toutes les paires et draws, (2) donne un mauvais prix aux 8 outs des tirages OESD. L\'objectif est de protéger le set ET d\'extraire de la valeur — ces deux objectifs nécessitent une grosse mise.',
      en: 'Set of sixes on 6-7-8 is a very strong hand, but the board is dangerous: 45, 59, T9 all have straights or straight draws. Checking or small betting lets these draws realize equity for free or at a good price. A large bet (75%+): (1) extracts from all pairs and draws, (2) gives poor odds to 8-out OESD draws. The goal is to protect the set AND extract value — both objectives require a big bet.',
    },
  },

  // ── 19. River value bet vs range cappée ────────────────────────────────────
  {
    id: 'bs-19', street: 'river', difficulty: 'hard',
    heroPosition: 'BTN', villainPosition: 'SB',
    heroHand: ['Ad', 'Kc'], board: ['Ac', 'Td', '4s', '2h', '9c'],
    potSize: 28, effectiveStack: 72, isHeroIP: true,
    preflopContext: {
      fr: 'BTN ouvre, SB 3-bet, BTN appelle. BTN bet flop AT4, SB call. Turn 2 checké par les deux. River 9.',
      en: 'BTN opens, SB 3-bets, BTN calls. BTN bets AT4 flop, SB calls. Turn 2 both check. River 9.',
    },
    boardTexture: { fr: 'River brick, board sec — SB a checkté le turn (range cappée)', en: 'River brick, dry board — SB checked turn (capped range)' },
    handDescription: { fr: 'Top paire top kicker (TPTK) — excellente main de valeur', en: 'Top pair top kicker (TPTK) — excellent value hand' },
    options: ['check', 'small', 'medium', 'large'],
    correctKey: 'medium',
    conceptTag: { fr: 'Valeur fine', en: 'Thin Value' },
    explanation: {
      fr: 'AK sur A-T-4-2-9 avec le SB qui a checkté le turn — sa range est plafonnée. Il ne peut pas avoir AA/KK (il aurait 3-bet/bet le turn). Une mise médiane (50-55%) extrait de la valeur de AT, TT, T9, A9, etc. qui peuvent appeler. Une grosse mise (75%) polarise trop et fait folder exactement les bluff-catchers que la SB tiendrait. Une petite mise (33%) sous-extrait. La clé est que la SB peut quand même avoir de bonnes mains (AT, TT) qui ne peuvent pas folder face à 50%.',
      en: 'AK on A-T-4-2-9 with SB having checked the turn — their range is capped. They can\'t have AA/KK (they\'d have bet the turn). A medium bet (50-55%) extracts from AT, TT, T9, A9, etc. that can call. A large bet (75%) over-polarizes and folds exactly the bluff-catchers SB would hold. A small bet (33%) under-extracts. The key: SB can still have good hands (AT, TT) that can\'t fold to 50%.',
    },
  },

  // ── 20. Flop 3-bet pot, tirage couleur nut + overcard ──────────────────────
  {
    id: 'bs-20', street: 'flop', difficulty: 'hard',
    heroPosition: 'BB', villainPosition: 'BTN',
    heroHand: ['As', 'Ks'], board: ['Js', '8s', '3d'],
    potSize: 20, effectiveStack: 80, isHeroIP: false,
    preflopContext: {
      fr: 'BB 3-bet, BTN appelle. Pot 3-bet de 20bb. Flop Js-8s-3d.',
      en: 'BB 3-bets, BTN calls. 3-bet pot of 20bb. Flop Js-8s-3d.',
    },
    boardTexture: { fr: 'Semi-sec, tirage couleur nut disponible, BTN range forte', en: 'Semi-dry, nut flush draw available, BTN has strong calling range' },
    handDescription: { fr: 'Deux overcards + tirage couleur nut — semi-bluff fort', en: 'Two overcards + nut flush draw — strong semi-bluff' },
    options: ['check', 'small', 'medium', 'large'],
    correctKey: 'large',
    conceptTag: { fr: 'Polarisation', en: 'Polarisation' },
    explanation: {
      fr: 'En tant que 3-betteur OOP dans un pot 3-bet avec AsKs, on a une main qui ne réalise pas son équité en checkant (AK sans pair au flop). Le tirage couleur nut (9 outs) + deux overcards (6 outs) = ~15 outs effectifs. Dans un pot 3-bet, notre range est plus polarisée : on 3-bets AA, KK, AK — donc le board nous favorise (range advantage du 3-betteur). Une mise grande (75%) avec AK ici est un bet à forte valeur attendue : soit villain fold, soit on réalise son équité avec un tirage nut.',
      en: 'As the 3-bettor OOP in a 3-bet pot with AsKs, we have a hand that doesn\'t realize equity by checking (AK no pair on flop). Nut flush draw (9 outs) + two overcards (6 outs) = ~15 effective outs. In a 3-bet pot, our range is more polarized: we 3-bet AA, KK, AK — so the board favors us (3-bettor range advantage). A large bet (75%) with AK here is high-EV: either villain folds, or we realize equity with a nut draw.',
    },
  },
];

// ─── Frequency exercises (expert only) ───────────────────────────────────────
// Instead of "what sizing?", expert must answer "how often (%) should you bet?"
// 4 possible answers: 0% / 33% / 67% / 100%

const FREQUENCY_EXERCISES: FrequencyExercise[] = [
  // F01: Range bet dry board IP (100%)
  {
    id: 'bf-01', street: 'flop', difficulty: 'hard', frequencyMode: true,
    heroPosition: 'BTN', villainPosition: 'BB',
    heroHand: ['Kh', 'Qd'], board: ['As', '7c', '2d'],
    potSize: 4, effectiveStack: 96, isHeroIP: true,
    preflopContext: { fr: 'BTN ouvre à 2bb, BB défend. Flop A72 arc-en-ciel.', en: 'BTN opens 2bb, BB defends. Flop A72 rainbow.' },
    boardTexture: { fr: 'Sec, statique, arc-en-ciel', en: 'Dry, static, rainbow' },
    handDescription: { fr: 'KQ — overcards, aucune paire, aucun tirage', en: 'KQ — overcards, no pair, no draw' },
    conceptTag: { fr: 'Range Bet', en: 'Range Bet' },
    correctFrequency: '100%',
    explanation: {
      fr: 'Sur A72 arc-en-ciel, le BTN a un avantage de range massif (AA, AK, AQ, A7s, A2s). La BB a très peu d\'As en défense. GTO : le BTN mise **100% de sa range** à un sizing petit (~33%). Même KQ sans paire profite du fold equity. Ne pas miser serait une erreur d\'EV : on abandonne l\'avantage de range.',
      en: 'On A72 rainbow, BTN has a massive range advantage (AA, AK, AQ, A7s, A2s). BB has very few Aces in defense range. GTO: BTN bets **100% of their range** at a small sizing (~33%). Even KQ with no pair benefits from fold equity. Not betting is an EV mistake: you abandon the range advantage.',
    },
  },
  // F02: OOP air on highly connected board (0%)
  {
    id: 'bf-02', street: 'flop', difficulty: 'hard', frequencyMode: true,
    heroPosition: 'BB', villainPosition: 'BTN',
    heroHand: ['6c', '2s'], board: ['9h', '8c', '7d'],
    potSize: 5, effectiveStack: 95, isHeroIP: false,
    preflopContext: { fr: 'BTN ouvre, BB défend. Flop 9-8-7 très connecté.', en: 'BTN opens, BB defends. Flop 9-8-7 highly connected.' },
    boardTexture: { fr: 'Hautement connecté, multiples quintes', en: 'Highly connected, multiple straight draws' },
    handDescription: { fr: '62 — aucune main, aucun tirage réel', en: '62 — no hand, no real draw' },
    conceptTag: { fr: 'Hors position', en: 'Out of Position' },
    correctFrequency: '0%',
    explanation: {
      fr: 'Avec 62 sur 9-8-7 très connecté, hors position, on n\'a **aucune équité** : pas de paire, pas de tirage exploitable. Miser serait un bluff sur le board qui favorise le plus le BTN (T7, T9, 65, 56 pour des quintes). GTO : checker **100% du temps**. Bluffer avec la main la plus faible sur le board le plus dangereux est la pire erreur.',
      en: 'With 62 on 9-8-7 highly connected, out of position, we have **zero equity**: no pair, no meaningful draw. Betting is a pure bluff on the board that most favors BTN (T7, T9, 65, 56 for straights). GTO: check **100% of the time**. Bluffing with the weakest hand on the most dangerous board is the worst mistake.',
    },
  },
  // F03: IP nut flush draw + overcard (100%)
  {
    id: 'bf-03', street: 'flop', difficulty: 'hard', frequencyMode: true,
    heroPosition: 'BTN', villainPosition: 'BB',
    heroHand: ['Ah', 'Qh'], board: ['7h', '8h', 'Kd'],
    potSize: 5, effectiveStack: 95, isHeroIP: true,
    preflopContext: { fr: 'BTN ouvre, BB défend. Flop K-8-7 bicolore cœur.', en: 'BTN opens, BB defends. Flop K-8-7 two-tone hearts.' },
    boardTexture: { fr: 'Bicolore, semi-connecté, tirage couleur nut', en: 'Two-tone, semi-connected, nut flush draw' },
    handDescription: { fr: 'AhQh — flush draw nut (9 outs) + overcard As', en: 'AhQh — nut flush draw (9 outs) + Ace overcard' },
    conceptTag: { fr: 'Polarisation', en: 'Polarisation' },
    correctFrequency: '100%',
    explanation: {
      fr: 'AhQh sur 7h-8h-Kd : flush draw nut (9 outs) + As overcard (~3 outs). ~30% d\'équité brute. En position avec ce draw nut, GTO : miser **100% du temps**. (1) Énorme fold equity sur le villain. (2) En position, si villain call, on réalise avec le meilleur flush possible. Ne pas miser serait abandonner un avantage massif.',
      en: 'AhQh on 7h-8h-Kd: nut flush draw (9 outs) + Ace overcard (~3 outs). ~30% raw equity. In position with this nut draw, GTO: bet **100% of the time**. (1) Enormous fold equity against villain. (2) In position, if villain calls, we realize with the best possible flush. Not betting abandons a massive advantage.',
    },
  },
  // F04: OOP weak overcards on high board (33%)
  {
    id: 'bf-04', street: 'flop', difficulty: 'hard', frequencyMode: true,
    heroPosition: 'BB', villainPosition: 'BTN',
    heroHand: ['Jd', '6d'], board: ['Kh', 'Tc', '4s'],
    potSize: 5, effectiveStack: 95, isHeroIP: false,
    preflopContext: { fr: 'BTN ouvre, BB défend. Flop K-T-4 arc-en-ciel.', en: 'BTN opens, BB defends. Flop K-T-4 rainbow.' },
    boardTexture: { fr: 'Sec, board haut — K et T favorisent le BTN', en: 'Dry, high board — K and T favor BTN' },
    handDescription: { fr: 'J6 — aucune paire, cartes sous le board', en: 'J6 — no pair, undercards to board' },
    conceptTag: { fr: 'Hors position', en: 'Out of Position' },
    correctFrequency: '33%',
    explanation: {
      fr: 'J6 OOP sur K-T-4 : aucune paire, range du BTN très forte (Kx, Tx, paires). Miser serait principalement un bluff peu efficace. GTO : checker **~67%** du temps (contrôle du pot) et parfois donk-bet sparse (~33%) pour garder la range non-exploitable. La ligne majoritaire est le check.',
      en: 'J6 OOP on K-T-4: no pair, BTN range is very strong (Kx, Tx, pairs). Betting would mainly be an inefficient bluff. GTO: check **~67%** of the time (pot control) and occasionally donk-bet sparse (~33%) to keep the range unexploitable. The default line is check.',
    },
  },
  // F05: IP underpair on connected board (33%)
  {
    id: 'bf-05', street: 'flop', difficulty: 'hard', frequencyMode: true,
    heroPosition: 'CO', villainPosition: 'BB',
    heroHand: ['5h', '5c'], board: ['Js', '9d', '6h'],
    potSize: 5, effectiveStack: 95, isHeroIP: true,
    preflopContext: { fr: 'CO ouvre, BB défend. Flop J-9-6 bigarré.', en: 'CO opens, BB defends. Flop J-9-6 rainbow.' },
    boardTexture: { fr: 'Semi-connecté — J96 — quintes possibles (T8, 87)', en: 'Semi-connected — J96 — straight draws possible (T8, 87)' },
    handDescription: { fr: '55 — paire en dessous du board (underpair)', en: '55 — underpair to the board' },
    conceptTag: { fr: 'Pot Control', en: 'Pot Control' },
    correctFrequency: '33%',
    explanation: {
      fr: 'Paire de 5 sur J-9-6 : underpair à tous les overcards. En position, valeur de showdown mais main vulnérable. GTO : **checker ~67%** du temps (contrôle du pot), parfois petit bet blocker (~33%). Miser gros et se faire relancer = situation impossible. La ligne la plus fréquente est checker, mais pas à 100% pour rester équilibré.',
      en: 'Pocket fives on J-9-6: underpair to all board overcards. In position, showdown value but vulnerable hand. GTO: **check ~67%** of the time (pot control), occasionally small blocking bet (~33%). Betting big and being raised = impossible spot. The most frequent line is checking, but not 100% to stay balanced.',
    },
  },
  // F06: OOP two pair on wet board (67%)
  {
    id: 'bf-06', street: 'flop', difficulty: 'hard', frequencyMode: true,
    heroPosition: 'BB', villainPosition: 'BTN',
    heroHand: ['9s', '8s'], board: ['9d', '8c', 'Jh'],
    potSize: 5, effectiveStack: 95, isHeroIP: false,
    preflopContext: { fr: 'BTN ouvre, BB défend. Flop J-9-8 bicolore.', en: 'BTN opens, BB defends. Flop J-9-8 two-tone.' },
    boardTexture: { fr: 'Connecté, dangereux (flush + quinte), board dynamique', en: 'Connected, dangerous (flush + straight draws), dynamic board' },
    handDescription: { fr: '98 — deux paires (neuvièmes et huitièmes)', en: '98 — two pair (nines and eights)' },
    conceptTag: { fr: 'Protection', en: 'Protection' },
    correctFrequency: '67%',
    explanation: {
      fr: 'Deux paires OOP sur J-9-8 ultra-dynamique. Les flush draws ont ~35% d\'équité, les quintes ~30%. GTO : **miser ~67%** pour la protection + valeur. Checker à 100% donnerait trop de cartes gratuites aux draws. Miser à 100% surexpose dans un spot où check-raise est parfois optimal. La ligne correcte : bet souvent, parfois check-raise.',
      en: 'Two pair OOP on ultra-dynamic J-9-8. Flush draws have ~35% equity, straights ~30%. GTO: **bet ~67%** for protection + value. Checking 100% gives too many free cards to draws. Betting 100% over-exposes in a spot where check-raise is sometimes optimal. Correct line: bet often, sometimes check-raise.',
    },
  },
  // F07: IP top pair weak kicker semi-dynamic (67%)
  {
    id: 'bf-07', street: 'flop', difficulty: 'hard', frequencyMode: true,
    heroPosition: 'BTN', villainPosition: 'BB',
    heroHand: ['Kd', '3d'], board: ['Ks', '8h', '7s'],
    potSize: 5, effectiveStack: 95, isHeroIP: true,
    preflopContext: { fr: 'BTN ouvre, BB défend. Flop K-8-7 deux tons piques.', en: 'BTN opens, BB defends. Flop K-8-7 two-tone spades.' },
    boardTexture: { fr: 'Semi-dynamique — tirage couleur pique, quelques quintes', en: 'Semi-dynamic — spade flush draw, some straight draws' },
    handDescription: { fr: 'K3 — top paire, kicker faible (3)', en: 'K3 — top pair, weak kicker (3)' },
    conceptTag: { fr: 'Protection', en: 'Protection' },
    correctFrequency: '67%',
    explanation: {
      fr: 'K3 sur K-8-7 deux tons : top paire kicker faible, board semi-dynamique. GTO : **miser ~67%** (valeur + protection). Miser 100% exposerait trop (parfois check-call est mieux vs certaines ranges). Checker 100% laisserait trop de cartes gratuites aux draws. Fréquence élevée mais pas totale : l\'underkicker rend la main vulnérable aux relances.',
      en: 'K3 on K-8-7 two-tone: top pair weak kicker, semi-dynamic board. GTO: **bet ~67%** (value + protection). Betting 100% over-exposes (sometimes check-call is better vs certain ranges). Checking 100% gives too many free cards to draws. High but not total frequency: the weak kicker makes the hand vulnerable to raises.',
    },
  },
  // F08: River air with no pair (0%)
  {
    id: 'bf-08', street: 'river', difficulty: 'hard', frequencyMode: true,
    heroPosition: 'BTN', villainPosition: 'BB',
    heroHand: ['Kd', 'Jc'], board: ['Ah', 'Td', '5s', '2c', '9s'],
    potSize: 20, effectiveStack: 80, isHeroIP: true,
    preflopContext: { fr: 'BTN ouvre, BB défend. River KJ sans amélioration sur A-T-5-2-9.', en: 'BTN opens, BB defends. River KJ unimproved on A-T-5-2-9.' },
    boardTexture: { fr: 'River brick, board sec — KJ sans paire', en: 'River brick, dry board — KJ no pair' },
    handDescription: { fr: 'KJ — carte haute, aucune combinaison sur ce board', en: 'KJ — high card, no made hand on this board' },
    conceptTag: { fr: 'Pot Control', en: 'Pot Control' },
    correctFrequency: '0%',
    explanation: {
      fr: 'KJ sur A-T-5-2-9 à la river : aucune combinaison. En position, bluffer ici n\'est jamais rentable : la BB a des Ax et Tx facilement, KJ ne bloque pas ces mains. GTO : checker **100% du temps** pour le showdown gratuit. Un bluff ici = perdre le pot vs toutes les mains de valeur que la BB tient.',
      en: 'KJ on A-T-5-2-9 at the river: no made hand. In position, bluffing here is never profitable: BB easily has Ax and Tx, KJ doesn\'t block those hands. GTO: check **100% of the time** for a free showdown. Bluffing here = losing the pot against all the value hands BB holds.',
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
  const { sessionStats, recordResult, setTrainerStarted } = useTrainingStore(
    useShallow(s => ({ sessionStats: s.sessionStats, recordResult: s.recordResult, setTrainerStarted: s.setTrainerStarted }))
  );
  const mode     = useModeStore(s => s.mode);

  const user      = useAuthStore(s => s.user);
  const isPremium = true;
  const loggedIn  = !!user;
  const quota     = useQuotaStore();
  const freeRemaining = Infinity;
  const [quotaBlocked, setQuotaBlocked] = useState(false);

  const [showIntro, setShowIntro] = useState(true);
  const [phase,     setPhase]     = useState<Phase>('exercise');
  const [queue,     setQueue]     = useState<BetSizingExercise[]>([]);
  const [exercise,  setExercise]  = useState<BetSizingExercise | null>(null);
  const [selected,  setSelected]  = useState<string | null>(null);
  const [xpEarned,  setXpEarned]  = useState(0);

  // Refresh free-quota counts when a non-premium user opens the module
  useEffect(() => {
    if (loggedIn && !isPremium) quota.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedIn, isPremium]);

  // Listen for global back-to-intro event
  useEffect(() => {
    const onBack = () => { backToIntro(); };
    window.addEventListener('training:back', onBack);
    return () => window.removeEventListener('training:back', onBack);
  }, []);

  // Lock mode switching while a question is on screen.
  useExerciseLock(!showIntro && phase === 'exercise' && !!exercise);

  // Exam mode — premium only here (each exercise consumes a credit for free users).
  const { examActive, examFinished, startRun, quitRun, recordAnswer } = useExamRunner('betsizing');

  // Bet sizing is generated client-side, so we explicitly spend a credit
  // server-side before revealing each exercise (premium users never consume).
  const buildPool = (): BetSizingExercise[] => {
    if (mode === 'expert') {
      // All sizing exercises + the frequency-quiz ones (expert only) — each
      // appears once per pass, so a sprint never repeats the same exercise
      // before the full 28-item pool has been seen.
      return shuffle([...EXERCISES, ...FREQUENCY_EXERCISES]);
    }
    return shuffle(EXERCISES as BetSizingExercise[]);
  };

  const nextExercise = async (q = queue) => {
    if (!isPremium) {
      try {
        const r = await quotaApi.consume('betsizing');
        if (r && !r.unlimited && typeof r.remaining === 'number') quota.set('betsizing', r.remaining);
      } catch (e: any) {
        if (e?.response?.status === 402) { quota.set('betsizing', 0); setQuotaBlocked(true); }
        return; // network/other error: don't reveal an exercise off the books
      }
    }
    let remaining = q;
    if (remaining.length === 0) remaining = buildPool();
    const [ex, ...rest] = remaining;
    setExercise(ex);
    setQueue(rest);
    setPhase('exercise');
    setSelected(null);
  };

  const handleStart = () => {
    quitRun();              // clear any leftover exam state — normal mode never shows the lives HUD / auto-advance
    setShowIntro(false);
    setTrainerStarted(true);
    nextExercise(buildPool());
  };

  const backToIntro = () => {
    setQuotaBlocked(false);
    setShowIntro(true);
    setTrainerStarted(false);
  };

  const handleAnswer = async (key: string) => {
    if (!exercise || phase === 'result') return;
    setSelected(key);
    const ok = exercise.frequencyMode
      ? key === exercise.correctFrequency
      : key === exercise.correctKey;
    const xp = ok ? 15 : 5;
    setXpEarned(xp);
    await recordResult(ok, xp, 'betsizing');
    setPhase('result');
    if (examActive) recordAnswer(ok, handleNext);
  };

  // Expert sprint: no decision within 30 s → submit a wrong answer (a miss).
  const handleTimeout = () => {
    if (!exercise || phase !== 'exercise') return;
    if (exercise.frequencyMode) {
      const wrong = FREQ_OPTIONS.find(o => o.key !== exercise.correctFrequency);
      if (wrong) handleAnswer(wrong.key);
    } else {
      const wrong = exercise.options.find(k => k !== exercise.correctKey);
      if (wrong) handleAnswer(wrong);
    }
  };

  const handleNext = () => nextExercise();

  const handleStartExam = () => {
    startRun();
    setQuotaBlocked(false);
    setShowIntro(false);
    setTrainerStarted(true);
    nextExercise(buildPool());
  };

  const handleQuitExam = () => {
    quitRun();
    setShowIntro(true);
    setTrainerStarted(false);
  };

  const ex        = exercise;
  const isCorrect = !!ex && (
    ex.frequencyMode ? selected === ex.correctFrequency : selected === ex.correctKey
  );

  // ── Intro ─────────────────────────────────────────────────────────────────
  if (showIntro) return (
    <div className="flex flex-col gap-3 sm:gap-4 max-w-2xl mx-auto">
      <TrainerIntro
        emoji="📐"
        title={isEn ? 'Bet Sizing Trainer' : 'Entraîneur Bet Sizing'}
        description={isEn
          ? 'Choose the right bet size — the most underrated skill in poker.'
          : 'Choisissez la bonne taille de mise — la compétence la plus sous-estimée.'}
        whatTitle={isEn ? 'Why does sizing matter?' : 'Pourquoi le sizing est-il crucial ?'}
        whatContent={
          <>
            <p className="text-gray-400 text-xs leading-snug mb-2">
              <RichLine text={isEn
                ? 'A wrong bet size leaks EV on every hand — even when the strategic decision is right. It depends on your range, board texture, position and stack depth.'
                : 'Une mauvaise taille fait fuir de l\'EV sur chaque main — même quand la décision est correcte. Elle dépend de votre range, la texture du board, votre position et les stacks.'} />
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { pct: 29, color: 'bg-blue-500', border: 'border-blue-900/50', bg: 'bg-blue-950/20', label: isEn ? 'Small — 25–33%' : 'Petite — 25–33%', desc: isEn ? 'Range bets, thin value' : 'Range bets, valeur fine' },
                { pct: 55, color: 'bg-green-500', border: 'border-green-900/50', bg: 'bg-green-950/20', label: isEn ? 'Medium — 50–60%' : 'Médiane — 50–60%', desc: isEn ? 'Balanced, dynamic boards' : 'Équilibre, boards dynamiques' },
                { pct: 87, color: 'bg-orange-500', border: 'border-orange-900/50', bg: 'bg-orange-950/20', label: isEn ? 'Large — 75–100%' : 'Grande — 75–100%', desc: isEn ? 'Protection, polarized' : 'Protection, polarisation' },
                { pct: 100, color: 'bg-red-500', border: 'border-red-900/50', bg: 'bg-red-950/20', label: isEn ? 'Overbet — 130%+' : 'Surenchère — 130%+', desc: isEn ? 'Nuts, bluffs' : 'Nuts, bluffs' },
              ].map(s => (
                <div key={s.label} className={`rounded-lg border px-2 py-1.5 ${s.border} ${s.bg}`}>
                  <div className="text-white font-bold text-[11px] leading-tight mb-0.5">{s.label}</div>
                  <div className="text-gray-500 text-[10px] leading-tight mb-1">{s.desc}</div>
                  <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                    <div className={`h-full ${s.color} rounded-full`} style={{ width: `${s.pct}%` }} />
                  </div>
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
        ] : [
          '🎯 Un scénario s\'affiche : position, board, main, pot',
          '🃏 Cartes affichées sur la table — pas de descriptions texte',
          '📐 Choisissez la meilleure taille parmi les options',
          '💡 Explication GTO détaillée après chaque réponse',
        ]}
        beginnerHint={isEn ? 'Shows board texture, hand type & key hints' : 'Affiche texture, type de main & indices clés'}
        advancedHint={isEn ? 'No hints — raw decision-making' : 'Sans indices — décision brute'}
        expertHint={isEn ? 'Advanced GTO spots — no hints, no texture shown, raw sizing decision' : 'Spots GTO avancés — aucun indice, aucune texture affichée, décision de sizing pure'}
        startLabel={isEn ? 'Start training' : "Commencer l'entraînement"}
        onStart={handleStart}
        mode={mode}
        locked={!isPremium && (!loggedIn || freeRemaining <= 0)}
        lockedVariant={!loggedIn ? 'login' : 'quota'}
        freeInfo={!isPremium && loggedIn && freeRemaining > 0
          ? { remaining: freeRemaining, limit: quota.limit }
          : undefined}
        examSlot={<ExamLauncher module="betsizing" onStart={handleStartExam} />}
      />
    </div>
  );

  if (examFinished) {
    return (
      <div className="flex flex-col gap-5 max-w-2xl mx-auto pt-4">
        <ExamResult module="betsizing" onRetry={handleStartExam} onQuit={handleQuitExam} />
      </div>
    );
  }

  if (quotaBlocked) {
    return (
      <div className="flex flex-col gap-5 max-w-2xl mx-auto">
        <QuotaLockPanel limit={quota.limit} onBackToIntro={backToIntro} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 max-w-2xl mx-auto">

      {/* ── Header — lives HUD during an exam ── */}
      {examActive && <ExamHud onQuit={handleQuitExam} />}

      {/* Expert sprint countdown */}
      {phase === 'exercise' && ex && (
        <SprintTimer
          active={examActive && (mode === 'advanced' || mode === 'expert')}
          resetKey={ex.id}
          onTimeout={handleTimeout}
          seconds={30}
        />
      )}

      {/* ════════════ EXERCISE ════════════ */}
      {phase === 'exercise' && ex && (
        <AnimatePresence mode="wait">
          <motion.div
            key={ex.id}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            className="flex flex-col items-center gap-2"
          >
            {/* Street badge — scenario context */}
            <div className="flex items-center gap-2 flex-wrap justify-center">
              <div className={`px-3 py-1 rounded-full border text-xs font-bold ${STREET_COLORS[ex.street]}`}>
                {isEn ? STREET_LABELS[ex.street].en : STREET_LABELS[ex.street].fr}
              </div>
            </div>

            {/* Poker table */}
            <div className="w-full max-w-[260px] sm:max-w-sm mx-auto">
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
            <div className="w-full max-w-xs sm:max-w-sm rounded-2xl border border-gray-700/60 bg-gray-900/50 px-4 py-2 flex items-center justify-center gap-2">
              <Hand cards={ex.heroHand as any} size="sm" gap="gap-2" animate={false} />
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
                  {ex.frequencyMode
                    ? (isEn
                        ? 'Villain checks. How often (%) should you bet in this spot? (GTO frequency)'
                        : 'Villain checke. À quelle fréquence (%) faut-il miser dans ce spot ? (fréquence GTO)')
                    : (isEn
                        ? 'Your opponent checks to you. What is the optimal bet size?'
                        : 'Votre adversaire checke. Quelle est la taille de mise optimale ?')}
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-wrap gap-3 justify-center w-full"
            >
              {ex.frequencyMode ? (
                FREQ_OPTIONS.map(opt => (
                  <Button
                    key={opt.key}
                    size="lg"
                    variant="secondary"
                    onClick={() => handleAnswer(opt.key)}
                    className="min-w-[150px]"
                  >
                    {isEn ? opt.labelEn : opt.labelFr}
                  </Button>
                ))
              ) : (
                ex.options.map(key => {
                  const cfg = SIZING[key];
                  const bb  = key === 'check' ? null : sizingBb(ex.potSize, key);
                  return (
                    <Button
                      key={key}
                      size="lg"
                      variant={SIZING_VARIANT[key]}
                      onClick={() => handleAnswer(key)}
                      className="min-w-[150px] flex flex-col items-center gap-0.5 py-2"
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
                })
              )}
            </motion.div>

            {/* ── Indices — below the decision. Beginner shows them; advanced
                reveals behind a streak-breaking spoiler; expert hides them. ── */}
            <SpoilableHint resetKey={ex.id} className="w-full">
              <div className="flex flex-col gap-2 w-full">
                {/* Concrete coaching hint — sizing logic for this spot */}
                <div className="w-full rounded-xl border border-amber-700/40 bg-amber-950/30 px-4 py-3 flex items-start gap-2 text-left">
                  <Lightbulb size={15} className="text-amber-400 mt-0.5 shrink-0" />
                  <div className="text-xs text-gray-300 leading-relaxed">
                    <p className="font-bold text-amber-300 mb-1">{isEn ? 'Hint' : 'Indice'}</p>
                    <p>{isEn
                      ? `Theme: ${ex.conceptTag.en}. Size to the board: dry/static boards → bet small (¼–⅓ pot, you can bet your whole range); wet boards with draws → bet big (⅔–pot) to charge them; a very strong hand on a dynamic board can overbet for max value. Position matters: you can go thinner in position.`
                      : `Thème : ${ex.conceptTag.fr}. Adapte au board : board sec/statique → mise petit (¼–⅓ pot, tu peux miser toute ta range) ; board humide avec tirages → mise gros (⅔–pot) pour les faire payer ; une main très forte sur board dynamique peut surmiser (overbet) pour un max de valeur. La position compte : tu peux miser plus fin en position.`}</p>
                  </div>
                </div>
                <div className="flex justify-center">
                  <div className={`px-3 py-1 rounded-full border text-xs font-bold ${CONCEPT_COLOR[isEn ? ex.conceptTag.en : ex.conceptTag.fr] ?? 'bg-gray-800 text-gray-400 border-gray-700'}`}>
                    {isEn ? ex.conceptTag.en : ex.conceptTag.fr}
                  </div>
                </div>
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
              </div>
            </SpoilableHint>

            {/* Guidance below the decision — no scrolling needed to answer. */}
            <BeginnerGuide
              title={isEn ? 'What you must do' : 'Ce qu\'on te demande'}
              text={isEn
                ? `You have decided to **bet** — but the big question is: **how much**?\nThe pot is **${ex.potSize}bb**. You can bet a small, medium or large slice of it (or sometimes more than the pot = an overbet). Each size sends a different message and gives your opponent different odds.\n👉 Your job: pick the bet size that fits the situation. Look at the hints above — your hand strength and the board texture — to decide.\n💡 Rule of thumb: bet **small** on calm boards, **big** when there are draws to charge or when you have the nuts.`
                : `Tu as décidé de **miser** — mais la grande question est : **combien** ?\nLe pot est de **${ex.potSize}bb**. Tu peux en miser une petite, moyenne ou grande part (ou parfois plus que le pot = une surenchère). Chaque taille envoie un message différent et donne des cotes différentes à l'adversaire.\n👉 Ton travail : choisis la taille de mise adaptée à la situation. Regarde les indices ci-dessus — la force de ta main et la texture du board — pour décider.\n💡 Règle simple : mise **petit** sur les boards calmes, **gros** quand il y a des tirages à faire payer ou quand tu as les nuts.`}
            />
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
            {ex.frequencyMode ? (
              <>
                <span className="px-2.5 py-1 rounded-full border bg-green-900/30 text-green-300 border-green-700">
                  ✓ {isEn ? 'Correct:' : 'Correct :'} <strong>{ex.correctFrequency}</strong>
                </span>
                {selected && selected !== ex.correctFrequency && (
                  <span className="px-2.5 py-1 rounded-full border bg-red-900/30 text-red-300 border-red-700">
                    ✗ {isEn ? 'You chose:' : 'Votre choix :'} <strong>{selected}</strong>
                  </span>
                )}
              </>
            ) : (() => {
              const ck = ex.correctKey as SizingKey;
              const sk = selected as SizingKey | null;
              const correctCfg = SIZING[ck];
              const correctBb  = ck === 'check' ? null : sizingBb(ex.potSize, ck);
              return (
                <>
                  <span className="px-2.5 py-1 rounded-full border bg-green-900/30 text-green-300 border-green-700">
                    ✓ {isEn ? 'Correct:' : 'Correct :'}{' '}
                    <strong>{isEn ? correctCfg.labelEn(correctBb ?? 0) : correctCfg.labelFr(correctBb ?? 0)}</strong>
                  </span>
                  {sk && sk !== ck && (() => {
                    const selCfg = SIZING[sk];
                    const selBb  = sk === 'check' ? null : sizingBb(ex.potSize, sk);
                    return (
                      <span className="px-2.5 py-1 rounded-full border bg-red-900/30 text-red-300 border-red-700">
                        ✗ {isEn ? 'You chose:' : 'Votre choix :'}{' '}
                        <strong>{isEn ? selCfg.labelEn(selBb ?? 0) : selCfg.labelFr(selBb ?? 0)}</strong>
                      </span>
                    );
                  })()}
                </>
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

          {/* Next + stats — hidden during an exam (auto-advances) */}
          {!examActive && (
            <>
              <div className="w-full max-w-xs">
                <Button size="lg" variant="gold" onClick={handleNext} fullWidth>
                  {isEn ? 'Next exercise' : 'Exercice suivant'}{' '}
                  <ChevronRight size={18} className="inline" />
                </Button>
              </div>
              <SessionStatsBar
                total={sessionStats.total}
                correct={sessionStats.correct}
                xp={sessionStats.xp}
              />
            </>
          )}

          {/* Bet sizing calculation panel — beginner + sizing exercises only */}
          {mode === 'basic' && !ex.frequencyMode && (() => {
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
          {!examActive && <ExplanationPanel text={isEn ? ex.explanation.en : ex.explanation.fr} className="p-5" />}
        </motion.div>
      )}

      {/* ─── Sources footer ─────────────────────────────────────────────────── */}
      <SourcesFooter isEn={isEn} />

    </div>
  );
}

