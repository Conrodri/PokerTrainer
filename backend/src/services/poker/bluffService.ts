import { RANK_VALUE, RANKS, SUITS } from './cards';
import type { Rank, Suit } from '../../types';

// ─── Types ────────────────────────────────────────────────────────────────────

export type BluffAction = 'check-fold' | 'bluff-small' | 'bluff-medium' | 'bluff-large';
export type FactorScore = 'positive' | 'neutral' | 'negative';

interface Bi { fr: string; en: string }
interface Factor { score: FactorScore; fr: string; en: string }

export interface BluffExercise {
  heroHand:         string[];
  board:            string[];
  street:           'flop' | 'turn' | 'river';
  heroPosition:     string;
  villainPosition:  string;
  heroIsIP:         boolean;
  potBB:            number;
  stackBB:          number;
  preflopNarrative: Bi;
  streetNarrative:  Bi[];
  correctAction:    BluffAction;
  bluffAmountBB:    number;
  factors: {
    position:     Factor;
    board:        Factor;
    villainRange: Factor;
    heroHand:     Factor;
  };
  explanation: Bi;
  /** Which scenario builder produced this exercise — used to avoid repeating
   *  the same template twice in a row across consecutive fetches. */
  template: BluffTemplate;
}

export type BluffTemplate = 'dry' | 'wet' | 'semiBluff' | 'float' | 'oopMissed';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rv(r: string): number { return RANK_VALUE[r as Rank]; }
function rand<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function shuf<T>(arr: T[]): T[] { return [...arr].sort(() => Math.random() - 0.5); }

const SUIT_SYM: Record<string, string> = { h: '♥', d: '♦', c: '♣', s: '♠' };
function cd(c: string): string { return `${c[0]}${SUIT_SYM[c[1]]}`; }
function bd(board: string[]): string { return board.map(cd).join(' '); }

function allCards(): string[] {
  return RANKS.flatMap(r => SUITS.map(s => `${r}${s}` as string));
}
function avail(exclude: string[]): string[] {
  const ex = new Set(exclude);
  return allCards().filter(c => !ex.has(c));
}
function pickCards(n: number, pool: string[]): string[] {
  return shuf(pool).slice(0, n);
}

function potRange(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

// ─── Scenario 1 — IP C-bet on high dry board → bluff-small ───────────────────
// Hero raised BTN/CO/SB, villain BB called, flop is A/K/Q/J-high dry rainbow.
// BB checks. Hero should continuation-bet small (range bet, range advantage).

function buildIpCbetDry(): Omit<BluffExercise, 'template'> {
  const heroPositions = ['BTN', 'CO', 'SB'];
  const heroPos = rand(heroPositions);
  const villainPos = 'BB';

  // High-dry flop: top card J+, two unconnected low cards, rainbow
  let board: string[] = [];
  let attempts = 0;
  while (attempts++ < 50) {
    const highRank = rand(['A','K','Q','J'] as Rank[]);
    const lowRanks = ['2','3','4','5','6','7','8'] as Rank[];
    const l1 = rand(lowRanks);
    const l2 = rand(lowRanks.filter(r => r !== l1 && Math.abs(rv(r) - rv(l1)) > 1));
    if (!l2) continue;
    const suits = shuf([...SUITS]);
    const candidate = [`${highRank}${suits[0]}`, `${l1}${suits[1]}`, `${l2}${suits[2]}`];
    if (new Set(candidate).size === 3) { board = candidate; break; }
  }
  if (!board.length) board = ['Ah','8c','3d'];

  const topCard = board[0]; // highest by construction
  const topRank = topCard[0];

  // Hero hand: 60% blocker (holds the top rank), 40% pure air
  const used = [...board];
  let heroHand: string[];
  if (Math.random() < 0.60) {
    // Blocker: hold one card of top rank (but NOT the same card as on board)
    const blockerCards = avail(used).filter(c => c[0] === topRank);
    if (blockerCards.length >= 1) {
      const blocker = rand(blockerCards);
      used.push(blocker);
      const partner = rand(avail(used).filter(c => rv(c[0]) <= 8 && c[0] !== topRank));
      heroHand = partner ? [blocker, partner] : pickCards(2, avail(used));
    } else {
      heroHand = pickCards(2, avail(used).filter(c => rv(c[0]) <= 9));
    }
  } else {
    // Pure air: two low cards unrelated to board
    const airCards = avail(used).filter(c => rv(c[0]) <= 8 && !board.some(b => b[0] === c[0]));
    heroHand = airCards.length >= 2 ? pickCards(2, airCards) : pickCards(2, avail(used));
  }

  const potBB = potRange(7, 11);
  const stackBB = potRange(88, 100);
  const betBB = Math.round(potBB / 3);
  const isBlocker = heroHand.some(c => c[0] === topRank);
  const isSB = heroPos === 'SB';

  const preflopFr = isSB
    ? `Vous relancez depuis la SB à 3 BB, la BB suit. Pot : ${potBB} BB.`
    : `Vous relancez depuis le ${heroPos} à 2.5 BB, la BB suit. Pot : ${potBB} BB.`;
  const preflopEn = isSB
    ? `You open-raise from SB to 3 BB, BB calls. Pot: ${potBB} BB.`
    : `You open-raise from ${heroPos} to 2.5 BB, BB calls. Pot: ${potBB} BB.`;

  const rankNames: Record<string, string> = { A:'As', K:'Roi', Q:'Dame', J:'Valet', T:'Dix', '9':'Neuf', '8':'Huit', '7':'Sept' };
  const topName = rankNames[topRank] ?? topRank;

  const examplesMap: Record<string, string> = {
    A: 'AA, AK, AQ, AJ, A9s',
    K: 'KK, AK, KQ, KJ, K9s',
    Q: 'QQ, AQ, KQ, QJ, QTs',
    J: 'JJ, AJ, KJ, QJ, JTs',
  };
  const examples = examplesMap[topRank] ?? 'AK, KK, QQ';

  const handNote = isBlocker
    ? `Vous détenez un ${cd(heroHand[0])} — ce bloqueur réduit le nombre de combos ${topRank}${topRank} et A${topRank} que vilain peut avoir, renforçant légèrement la crédibilité de votre bluff.`
    : `Vous n'avez aucun équité sur ce board, mais votre range de relance ${heroPos} contient toutes les mains qui connectent avec ce board. C'est ce "range advantage" qui rend votre bluff profitable.`;

  const explFr = `**Situation**
Vous avez relancé depuis le ${heroPos} — l'une des positions les plus avantageuses en 6-max — et la BB a suivi. La BB défend avec environ 50% de ses mains (paires basses, connecteurs, broadways marginaux, etc.). Le pot est de ${potBB} BB.

**Analyse du board** [${bd(board)}]
Ce board est dit "sec" : pas de tirage couleur (rainbow), faible connectivité. La carte haute — ${topName} — est une carte qui appartient naturellement à votre range de relance ${heroPos}. Vous misez avec des mains comme ${examples}, que la BB ne peut pas avoir aussi fréquemment. Votre range "touche" ce board beaucoup plus souvent que la range de défense BB.

**Range de vilain**
La BB a checkflopé sur ce board ${topRank}-high. Sur un board sec avec une carte haute, ce check signifie souvent une main marginale : tirage inexistant, paire faible ou rien du tout. Ses mains les plus fortes sur ce board (comme ${topRank}8s, ${topRank}3s s'il les a défendues) représentent une minorité de sa range.

**Votre main** [${heroHand.map(cd).join(' ')}]
${handNote}

**Décision — Bluff ${betBB} BB (≈ 1/3 du pot)**
Sur un board sec où votre range a l'avantage, la "range bet" à 1/3 du pot est la stratégie optimale. Elle est :
• Difficile à exploiter : vous misez avec toutes vos mains (valeur ET bluffs), vilain ne peut pas trouver la bonne fréquence de défense
• Peu risquée : si vilain check-raise, vous vous couchez sans grosse perte
• Efficace : avec un seul tiers du pot, vous forcez vilain à se défendre ~75% du temps pour ne pas être exploité`;

  const explEn = `**Situation**
You raised from ${heroPos} — one of the strongest positions in 6-max — and BB called. BB defends with ~50% of hands (small pairs, connectors, marginal broadways). Pot is ${potBB} BB.

**Board Analysis** [${bd(board)}]
This is a "dry" board: no flush draw (rainbow), low connectivity. The top card — ${topRank} — belongs squarely in your ${heroPos} open-raising range (${examples}). BB cannot have those hands as often. You have a clear range advantage here.

**Villain Range**
BB checked this ${topRank}-high board. This usually means a missed flop: weak pair, gutshot, or complete air. Their strongest hands on this board are a small fraction of their defending range.

**Your hand** [${heroHand.map(cd).join(' ')}]
${isBlocker
  ? `You hold ${cd(heroHand[0])} — a blocker that reduces villain's combos of ${topRank}${topRank} and A${topRank}, slightly improving your bluff credibility.`
  : `You have no equity on this board, but your ${heroPos} opening range contains all the hands that connect with it. This range advantage makes the bluff profitable.`}

**Decision — Bluff ${betBB} BB (≈ 1/3 pot)**
On a dry board with range advantage, the "range bet" at 1/3 pot is optimal. It's hard to exploit (you bet your entire range), low-risk, and forces villain to defend ~75% of the time or get exploited.`;

  return {
    heroHand,
    board,
    street: 'flop',
    heroPosition: heroPos,
    villainPosition: villainPos,
    heroIsIP: true,
    potBB,
    stackBB,
    preflopNarrative: { fr: preflopFr, en: preflopEn },
    streetNarrative:  [{ fr: 'La BB checke le flop.', en: 'BB checks the flop.' }],
    correctAction: 'bluff-small',
    bluffAmountBB: betBB,
    factors: {
      position:     { score: 'positive', fr: `IP (${heroPos}) — vous agissez en dernier, avantage informationnel maximum`, en: `IP (${heroPos}) — you act last, maximum information advantage` },
      board:        { score: 'positive', fr: `Board sec ${topRank}-high — favorise votre range de relance ${heroPos}`, en: `Dry ${topRank}-high board — favors your ${heroPos} raising range` },
      villainRange: { score: 'positive', fr: 'BB défend large (50%) mais rate souvent les boards hauts et secs', en: 'BB defends wide (~50%) but often misses high dry boards' },
      heroHand:     { score: isBlocker ? 'positive' : 'neutral', fr: isBlocker ? `Bloqueur ${topRank} — réduit les combos forts de vilain` : 'Air total — mais range advantage compense entièrement', en: isBlocker ? `${topRank} blocker — reduces villain's strong combos` : 'Complete air — but range advantage fully compensates' },
    },
    explanation: { fr: explFr, en: explEn },
  };
}

// ─── Scenario 2 — IP C-bet on low wet board → check-fold ─────────────────────
// Hero raised BTN, BB called, flop is low connected two-tone.
// BB checks. Hero should check-fold (villain's range smashes this board).

function buildIpCbetWet(): Omit<BluffExercise, 'template'> {
  const heroPos = 'BTN';
  const villainPos = 'BB';

  // Connected low board: 3 cards in a 4-card window (e.g. 678, 789, 8T9), two-tone
  let board: string[] = [];
  let attempts = 0;
  while (attempts++ < 50) {
    const base = 4 + Math.floor(Math.random() * 5); // indices 4-8 → ranks 6-T
    const r1 = RANKS[base - 2] as Rank;
    const r2 = RANKS[base - 1] as Rank;
    const r3 = RANKS[base]     as Rank;
    const suit1 = rand(SUITS);
    const suit2 = rand(SUITS.filter(s => s !== suit1));
    // Two of the same suit (two-tone)
    const candidate = [`${r1}${suit1}`, `${r2}${suit2}`, `${r3}${suit1}`];
    if (new Set(candidate).size === 3) { board = candidate; break; }
  }
  if (!board.length) board = ['8h','7d','6h'];

  // Hero hand: overcards with no draw (AK, AQ, KQ on low board)
  const used = [...board];
  const broadwayPairs = [['A','K'],['A','Q'],['A','J'],['K','Q'],['K','J']];
  const chosen = rand(broadwayPairs);
  const heroSuits = shuf([...SUITS]);
  let heroHand: string[] = [];
  const c1 = avail(used).find(c => c[0] === chosen[0] && c[1] === heroSuits[0]);
  const c2 = c1 ? avail([...used, c1]).find(c => c[0] === chosen[1] && c[1] === heroSuits[1]) : null;
  if (c1 && c2) {
    heroHand = [c1, c2];
  } else {
    heroHand = pickCards(2, avail(used).filter(c => rv(c[0]) >= 11));
  }

  const potBB = potRange(7, 11);
  const stackBB = potRange(88, 100);
  const boardNums = board.map(c => rv(c[0]));
  const topBoardRank = board.find(c => rv(c[0]) === Math.max(...boardNums))![0];
  const suits = board.map(c => c[1]);
  const suitSet = new Set(suits);
  const twoSuit = [...suits].sort().find(s => suits.filter(x => x === s).length === 2)!;
  const suitName: Record<string, string> = { h:'♥', d:'♦', c:'♣', s:'♠' };
  const twoSuitSym = suitName[twoSuit];

  const handFr = heroHand.map(cd).join(' ');
  const boardStr = bd(board);

  const explFr = `**Situation**
Vous avez relancé depuis le BTN, la BB a suivi. Pot : ${potBB} BB.

**Analyse du board** [${boardStr}]
Ce board est à l'opposé du board sec. Il est "mouillé" (wet) : cartes connectées (${board[0][0]}-${board[1][0]}-${board[2][0]}), deux cartes ${twoSuitSym} créant un tirage couleur potentiel. Ce type de board est un cauchemar pour le relanceur BTN.

**Range de vilain**
La BB défend avec ~50% de ses mains, incluant TOUS les connecteurs bas et moyens : ${RANKS[parseInt(board[0][0]) - 2]}${RANKS[parseInt(board[0][0]) - 1]}s, ${board[1][0]}${board[2][0]}s, paires basses (66, 77, 88)... Ces mains connectent PARFAITEMENT avec ce board : deux paires, sets, tirages à la suite, tirages couleur. Vilain a une densité très élevée de mains fortes sur ce type de flop.

**Votre main** [${handFr}]
Vous avez des "overcards" (${heroHand[0][0]}${heroHand[1][0]}) — deux cartes plus hautes que le board — mais aucun tirage. Même si vous touchez une paire sur le turn (comme une paire d'As), vous seriez souvent derrière les deux paires ou le set de vilain.

**Décision — Checker / Abandonner**
Sur ce board connecté, votre range de relance BTN ne "touche" pas bien : vous avez peu de deux paires, peu de sets (vous auriez besoin de 66-TT dans votre range), et peu de tirages. En revanche, la BB a toutes ces mains. Le "range disadvantage" est clair : checker et abandonner si vilain mise est la décision correcte. Bluffer ici serait tenter de pousser vilain à se coucher avec des mains qu'il ne quittera jamais.`;

  const explEn = `**Situation**
You raised from BTN, BB called. Pot: ${potBB} BB.

**Board Analysis** [${boardStr}]
This is the opposite of a dry board. It's "wet": connected cards (${board[0][0]}-${board[1][0]}-${board[2][0]}), plus a flush draw (two ${twoSuitSym}). This type of board is a nightmare for BTN continuation bets.

**Villain Range**
BB defends ~50% including ALL low/mid connectors: ${board[0][0]}${board[1][0]}s, ${board[1][0]}${board[2][0]}s, small pairs (66, 77, 88)... These hands connect PERFECTLY with this board: two pairs, sets, straight draws, flush draws. Villain has a very high density of strong hands on this flop.

**Your hand** [${handFr}]
You have overcards (${heroHand[0][0]}${heroHand[1][0]}) — two cards higher than the board — but no draw. Even if you pair up on the turn, you'd often be behind villain's two pair or set.

**Decision — Check / Fold**
On this connected board, your BTN raising range doesn't connect well: you have few two-pair hands, few sets, few draws. BB has all of those. The range disadvantage is clear: check-fold is correct. Bluffing here means trying to push villain off hands they will never fold.`;

  return {
    heroHand,
    board,
    street: 'flop',
    heroPosition: heroPos,
    villainPosition: villainPos,
    heroIsIP: true,
    potBB,
    stackBB,
    preflopNarrative: { fr: `Vous relancez BTN à 2.5 BB, la BB suit. Pot : ${potBB} BB.`, en: `You raise BTN to 2.5 BB, BB calls. Pot: ${potBB} BB.` },
    streetNarrative: [{ fr: 'La BB checke le flop.', en: 'BB checks the flop.' }],
    correctAction: 'check-fold',
    bluffAmountBB: 0,
    factors: {
      position:     { score: 'positive', fr: 'IP (BTN) — avantage de position conservé', en: 'IP (BTN) — position advantage maintained' },
      board:        { score: 'negative', fr: `Board mouillé ${board[0][0]}-${board[1][0]}-${board[2][0]} — désavantageux pour la range BTN`, en: `Wet board ${board[0][0]}-${board[1][0]}-${board[2][0]} — bad for BTN raising range` },
      villainRange: { score: 'negative', fr: 'BB touche ce board très fortement (connecteurs, paires basses)', en: 'BB connects hard with this board (connectors, small pairs)' },
      heroHand:     { score: 'negative', fr: `Overcards ${heroHand.map(c => c[0]).join('')} sans tirage — équité très limitée`, en: `Overcards ${heroHand.map(c => c[0]).join('')} with no draw — very limited equity` },
    },
    explanation: { fr: explFr, en: explEn },
  };
}

// ─── Scenario 3 — IP semi-bluff with flush draw → bluff-medium ───────────────
// Hero raised BTN, BB called, flop is two-tone. Hero has flush draw (same suit).
// BB checks. Hero should bet 2/3 pot (semi-bluff with ~36% equity).

function buildIpSemiBluff(): Omit<BluffExercise, 'template'> {
  const heroPos = rand(['BTN', 'CO'] as string[]);
  const villainPos = 'BB';
  const flushSuit = rand([...SUITS]) as Suit;

  // Two-tone board: 2 cards of flushSuit + 1 offsuit card, medium range
  let board: string[] = [];
  let attempts = 0;
  while (attempts++ < 50) {
    const midRanks = ['4','5','6','7','8','9','T','J','Q'] as Rank[];
    const shuffled = shuf(midRanks);
    const r1 = shuffled[0];
    const r2 = shuffled.find(r => Math.abs(rv(r) - rv(r1)) >= 2 && r !== r1) as Rank | undefined;
    if (!r2) continue;
    const offSuit = rand(SUITS.filter(s => s !== flushSuit)) as Suit;
    const r3 = shuffled.find(r => r !== r1 && r !== r2) as Rank | undefined;
    if (!r3) continue;
    const candidate = [`${r1}${flushSuit}`, `${r2}${flushSuit}`, `${r3}${offSuit}`];
    if (new Set(candidate).size === 3) { board = candidate; break; }
  }
  if (!board.length) board = [`Jh`, `8h`, `3d`];

  // Hero hand: 2 cards of flushSuit (flush draw)
  const used = [...board];
  const flushCards = avail(used).filter(c => c[1] === flushSuit);
  let heroHand: string[];
  if (flushCards.length >= 2) {
    heroHand = pickCards(2, flushCards);
  } else {
    heroHand = pickCards(2, avail(used));
  }

  const potBB = potRange(7, 11);
  const stackBB = potRange(88, 100);
  const betBB = Math.round(potBB * 2 / 3);
  const suitName: Record<string, string> = { h:'♥', d:'♦', c:'♣', s:'♠' };
  const suitSym = suitName[flushSuit];

  const handFr = heroHand.map(cd).join(' ');
  const boardStr = bd(board);

  // Is the flush draw a nut draw? (hero holds A of that suit)
  const isNutDraw = heroHand.some(c => c[0] === 'A' && c[1] === flushSuit);
  const drawQuality = isNutDraw ? 'tirage à la couleur max (nut flush draw)' : `tirage à la couleur ${suitSym}`;

  const explFr = `**Situation**
Vous avez relancé depuis le ${heroPos}, la BB a suivi. Pot : ${potBB} BB.

**Analyse du board** [${boardStr}]
Le board est "two-tone" : deux cartes ${suitSym} (${board.filter(c => c[1] === flushSuit).map(cd).join(' ')}). Vous avez un tirage à la couleur actif.

**Votre main** [${handFr}]
Excellent ! Vous avez deux cartes ${suitSym} — un ${drawQuality}. Avec 9 tirages restants dans le deck, vous avez environ 36% d'équité sur le turn (règle des 4 : 9 outs × 4 ≈ 36%) et 18% d'équité si vous voyez uniquement le river.

**Le semi-bluff : double bénéfice**
Miser ici vous donne DEUX façons de gagner :
1. **Vilain se couche** → vous gagnez le pot immédiatement
2. **Vilain suit et vous améliorez** → vous gagnez une grosse main

Contrairement au bluff pur, vous avez une "assurance" : même si vilain suit, vous avez ~1 chance sur 3 de compléter votre tirage.

**Range de vilain**
La BB a checkflopé. Ses mains les plus fortes (paires hautes) sont minoritaires. La majorité de sa range de défense est composée de paires moyennes et de mains marginales — des mains qui n'apprécient pas un bet de taille moyenne car elles n'ont pas assez d'équité pour call.

**Décision — Bluff ${betBB} BB (≈ 2/3 du pot)**
Sur un board two-tone avec un tirage, la taille de 2/3 pot est optimale car :
• Elle maximalise l'équité requise de vilain pour caller (${Math.round(betBB / (potBB + betBB) * 100)}% d'équité nécessaire)
• Elle annonce la force de votre range (vous représentez les mains qui ont touché ce board)
• Si vilain call et que vous complétez → vous gagnez une très grosse main
• Si vilain fold → pot gagné immédiatement`;

  const explEn = `**Situation**
You raised from ${heroPos}, BB called. Pot: ${potBB} BB.

**Board Analysis** [${boardStr}]
The board is "two-tone": two ${suitSym} cards (${board.filter(c => c[1] === flushSuit).map(cd).join(' ')}). You have an active flush draw.

**Your hand** [${handFr}]
You have two ${suitSym} cards — a ${isNutDraw ? 'nut flush draw' : `flush draw to ${suitSym}`}. With 9 outs remaining, you have ~36% equity on the turn (rule of 4: 9 outs × 4 ≈ 36%) and ~18% equity if you see only the river.

**The semi-bluff: double benefit**
Betting here gives you TWO ways to win:
1. **Villain folds** → you win the pot immediately
2. **Villain calls and you improve** → you win a big hand

Unlike a pure bluff, you have "insurance": even if villain calls, you have ~1 in 3 chance of completing your flush.

**Villain Range**
BB checked the flop. Their strongest hands (top pairs) are a minority. Most of their defending range consists of medium pairs and marginal hands that can't profitably call a medium-sized bet.

**Decision — Bluff ${betBB} BB (≈ 2/3 pot)**
With a flush draw on a two-tone board, 2/3 pot is optimal: it maximizes fold equity, represents your range's strong hands, and builds a big pot for when your flush completes.`;

  return {
    heroHand,
    board,
    street: 'flop',
    heroPosition: heroPos,
    villainPosition: villainPos,
    heroIsIP: true,
    potBB,
    stackBB,
    preflopNarrative: { fr: `Vous relancez ${heroPos} à 2.5 BB, la BB suit. Pot : ${potBB} BB.`, en: `You raise ${heroPos} to 2.5 BB, BB calls. Pot: ${potBB} BB.` },
    streetNarrative: [{ fr: 'La BB checke le flop.', en: 'BB checks the flop.' }],
    correctAction: 'bluff-medium',
    bluffAmountBB: betBB,
    factors: {
      position:     { score: 'positive', fr: `IP (${heroPos}) — vous agissez en dernier`, en: `IP (${heroPos}) — you act last` },
      board:        { score: 'neutral', fr: `Board two-tone ${suitSym} — tirage couleur actif pour vous`, en: `Two-tone ${suitSym} board — active flush draw for you` },
      villainRange: { score: 'positive', fr: 'BB checke = range souvent marginale, peu de mains très fortes', en: 'BB checks = often marginal range, few very strong hands' },
      heroHand:     { score: 'positive', fr: `${drawQuality} — 9 outs, ≈36% équité sur le turn`, en: `${isNutDraw ? 'Nut flush draw' : 'Flush draw'} — 9 outs, ~36% equity on the turn` },
    },
    explanation: { fr: explFr, en: explEn },
  };
}

// ─── Scenario 4 — Float steal on turn (villain showed weakness) → bluff-medium ─
// Villain raised from OOP position (UTG/HJ/CO), hero called from BTN.
// Flop: villain c-bet (expected), hero called (floating for position).
// Turn: blank card, villain checks → hero steals with delayed c-bet.

function buildFloatSteal(): Omit<BluffExercise, 'template'> {
  const villainPositions = ['UTG', 'HJ', 'CO'];
  const villainPos = rand(villainPositions);
  const heroPos = 'BTN';

  // Preflop: villain raised → hero called BTN
  // Flop: low-dry board (misses villain's tight UTG/HJ range)
  let flop: string[] = [];
  let attempts = 0;
  while (attempts++ < 50) {
    const lowRanks = ['2','3','4','5','6','7','8'] as Rank[];
    const r1 = rand(lowRanks);
    const rest1 = lowRanks.filter(r => r !== r1 && Math.abs(rv(r) - rv(r1)) > 1);
    if (!rest1.length) continue;
    const r2 = rand(rest1);
    const rest2 = rest1.filter(r => r !== r2 && Math.abs(rv(r) - rv(r2)) > 1);
    if (!rest2.length) continue;
    const r3 = rand(rest2);
    const suits = shuf([...SUITS]);
    const candidate = [`${r1}${suits[0]}`, `${r2}${suits[1]}`, `${r3}${suits[2]}`];
    if (new Set(candidate).size === 3) { flop = candidate; break; }
  }
  if (!flop.length) flop = ['7h','4c','2d'];

  // Turn: blank card (unrelated to flop, medium rank)
  const used = [...flop];
  const blankRanks = ['8','9','T'] as Rank[];
  const turnRank = rand(blankRanks.filter(r => !flop.some(c => c[0] === r)));
  const turnSuit = rand(SUITS.filter(s => !flop.slice(0,2).map(c => c[1]).includes(s))) as Suit;
  const turnCard = turnRank ? `${turnRank}${turnSuit}` : rand(avail(used));
  const board = [...flop, turnCard];
  used.push(turnCard);

  // Hero hand: overcards (A + medium, or K + medium) — hero called with speculative/overcard hand
  const overPairs = [['A','9'],['A','T'],['K','9'],['K','T'],['A','J'],['Q','J']];
  const chosen = rand(overPairs);
  const heroSuits = shuf([...SUITS]);
  const h1 = avail(used).find(c => c[0] === chosen[0] && c[1] === heroSuits[0]);
  const h2 = h1 ? avail([...used, h1]).find(c => c[0] === chosen[1] && c[1] === heroSuits[1]) : null;
  const heroHand = (h1 && h2) ? [h1, h2] : pickCards(2, avail(used).filter(c => rv(c[0]) >= 9));

  const potBB = potRange(16, 24); // pot grew after flop action
  const stackBB = potRange(80, 95);
  const betBB = Math.round(potBB * 0.60);

  // Villain position descriptions
  const villainRangeFr: Record<string, string> = {
    UTG: 'très serrée (TT+, AK, AQ, AJs, KQs) — environ 15% des mains',
    HJ: 'serrée (88+, AJ+, KQ, QJs, JTs) — environ 20% des mains',
    CO: 'modérée (77+, AJ+, KQ, QTs, JTs) — environ 25% des mains',
  };
  const villainRangeEn: Record<string, string> = {
    UTG: 'very tight (TT+, AK, AQ, AJs, KQs) — ~15% of hands',
    HJ: 'tight (88+, AJ+, KQ, QJs, JTs) — ~20% of hands',
    CO: 'moderate (77+, AJ+, KQ, QTs, JTs) — ~25% of hands',
  };

  const flopStr = bd(flop);
  const turnStr = cd(turnCard);
  const handFr = heroHand.map(cd).join(' ');

  const explFr = `**Situation**
Vilain a relancé depuis ${villainPos} (range ${villainRangeFr[villainPos]}), vous avez suivi depuis le BTN avec ${handFr}. Cette call est une "float" : vous avez la position et comptez prendre le pot si vilain montre de la faiblesse.

**Ce que la position signifie ici**
Vilain a relancé HORS POSITION (OOP) — il doit agir AVANT vous sur chaque street. Vous, au BTN, agissez en DERNIER. C'est un avantage énorme post-flop : vous pouvez réagir à ses actions plutôt que d'agir dans le vide.

**Flop** [${flopStr}]
Vilain a continué bet au flop (c-bet). C'est attendu : le relanceur doit c-bet ~70% du temps pour protéger sa range. Vous avez callé (float) : vous avez des overcards et la position.

Ce board bas ${flop[0][0]}-${flop[1][0]}-${flop[2][0]} rainbow EST intéressant : la range ${villainPos} (TT+, AK, AQ...) ne touche PAS ce board ! ${villainPos} ne relance pas UTG avec 74, 72 ou 42.

**Turn** [${turnStr}] — Vilain checke
C'est le moment clé. Vilain a misé au flop, puis CHECK au turn. Ce check révèle qu'il est souvent en difficulté :
• Ses mains fortes (QQ, KK, AA) auraient souvent continué à miser
• Son c-bet au flop était souvent "automatique" avec sa range
• Son check turn = il ne veut plus investir, il "abandonne" souvent le pot

**Votre main** [${handFr}]
Vous avez des overcards — ${heroHand[0][0]}${heroHand[1][0]} — au-dessus de tout le board. Même si vilain call, vous avez des outs pour améliorer (paire d'As ou paire de ${heroHand[1][0]}).

**Décision — Bluff ${betBB} BB (≈ 60% du pot)**
C'est le "delayed c-bet" ou "float steal". Vous prenez l'initiative au turn après que vilain ait montré de la faiblesse. Vilain doit maintenant décider avec peu d'information sur votre range (vous avez callé au flop, donc vous pouvez avoir des mains très fortes comme des sets, des deux-paires, ou exactement ce que vous avez : des overcards).`;

  const explEn = `**Situation**
Villain raised from ${villainPos} (range: ${villainRangeEn[villainPos]}), you called BTN with ${handFr}. This call is a "float": you have position and plan to take the pot if villain shows weakness.

**What position means here**
Villain raised OUT OF POSITION (OOP) — they must act BEFORE you on every street. You, on the BTN, act LAST. This is a huge post-flop advantage: you can react to their actions instead of acting blind.

**Flop** [${flopStr}]
Villain c-bet the flop — expected, they should c-bet ~70% of the time to protect their range. You called (float): you have overcards and position.

This low board ${flop[0][0]}-${flop[1][0]}-${flop[2][0]} rainbow is key: villain's ${villainPos} range (TT+, AK, AQ...) does NOT connect with it. ${villainPos} doesn't raise with 74, 72, or 42.

**Turn** [${turnStr}] — Villain checks
This is the key moment. Villain bet the flop, then CHECKED the turn. This check reveals weakness:
• Their strong hands (QQ, KK, AA) would often continue betting
• Their flop c-bet was often "automatic" with their range
• Checking the turn = they often want to give up or pot-control

**Your hand** [${handFr}]
You have overcards — ${heroHand[0][0]}${heroHand[1][0]} — above the entire board. Even if villain calls, you have outs to improve.

**Decision — Bluff ${betBB} BB (≈ 60% pot)**
This is the "delayed c-bet" or "float steal." You take initiative on the turn after villain showed weakness. Villain must now decide with little information about your range — you called the flop, so you could have sets, two pairs, or exactly what you have: overcards.`;

  return {
    heroHand,
    board,
    street: 'turn',
    heroPosition: heroPos,
    villainPosition: villainPos,
    heroIsIP: true,
    potBB,
    stackBB,
    preflopNarrative: {
      fr: `${villainPos} relance à 2.5 BB, vous suivez BTN. Pot : ${Math.round(potBB * 0.45)} BB.`,
      en: `${villainPos} raises to 2.5 BB, you call BTN. Pot: ${Math.round(potBB * 0.45)} BB.`,
    },
    streetNarrative: [
      { fr: `Flop [${flopStr}] : ${villainPos} mise ${Math.round(potBB * 0.3)} BB, vous suivez.`, en: `Flop [${flopStr}]: ${villainPos} bets ${Math.round(potBB * 0.3)} BB, you call.` },
      { fr: `Turn [${turnStr}] : ${villainPos} checke.`, en: `Turn [${turnStr}]: ${villainPos} checks.` },
    ],
    correctAction: 'bluff-medium',
    bluffAmountBB: betBB,
    factors: {
      position:     { score: 'positive', fr: `IP (BTN vs ${villainPos} OOP) — vous avez agi APRÈS vilain depuis le début`, en: `IP (BTN vs ${villainPos} OOP) — you've acted after villain from the start` },
      board:        { score: 'positive', fr: `Board bas ${flop[0][0]}-${flop[1][0]}-${flop[2][0]} — rate la range serrée ${villainPos}`, en: `Low board ${flop[0][0]}-${flop[1][0]}-${flop[2][0]} — misses ${villainPos}'s tight range` },
      villainRange: { score: 'positive', fr: `Vilain ${villainPos} a checké le turn après c-bet flop = faiblesse confirmée`, en: `Villain ${villainPos} checked turn after flop c-bet = confirmed weakness` },
      heroHand:     { score: 'neutral', fr: `Overcards ${heroHand[0][0]}${heroHand[1][0]} — quelques outs si appelé`, en: `Overcards ${heroHand[0][0]}${heroHand[1][0]} — some outs if called` },
    },
    explanation: { fr: explFr, en: explEn },
  };
}

// ─── Scenario 5 — OOP missed flop → check/fold ───────────────────────────────
// Hero raised UTG/HJ (tight range), BTN called (wide range, IP).
// Flop: mid-connected two-tone — BTN's range connects perfectly.
// Hero checks. BTN bets. Hero should fold.

function buildOopMissedFlop(): Omit<BluffExercise, 'template'> {
  const heroPos = rand(['UTG', 'HJ'] as string[]);
  const villainPos = 'BTN';

  let board: string[] = [];
  let attempts = 0;
  while (attempts++ < 50) {
    const base = 4 + Math.floor(Math.random() * 5);
    const r1 = RANKS[base - 2] as Rank;
    const r2 = RANKS[base - 1] as Rank;
    const r3 = RANKS[base] as Rank;
    const suit1 = rand(SUITS);
    const suit2 = rand(SUITS.filter(s => s !== suit1));
    const candidate = [`${r1}${suit1}`, `${r2}${suit2}`, `${r3}${suit1}`];
    if (new Set(candidate).size === 3) { board = candidate; break; }
  }
  if (!board.length) board = ['9h','8d','7h'];

  const used = [...board];
  const pairs = [['A','K'],['A','Q'],['K','Q'],['A','J'],['K','J']] as [Rank, Rank][];
  const chosen = rand(pairs);
  const heroSuits = shuf([...SUITS]);
  let heroHand: string[] = [];
  const c1 = avail(used).find(c => c[0] === chosen[0] && c[1] === heroSuits[0]);
  const c2 = c1 ? avail([...used, c1]).find(c => c[0] === chosen[1] && c[1] === heroSuits[1]) : null;
  heroHand = (c1 && c2) ? [c1, c2] : pickCards(2, avail(used).filter(c => rv(c[0]) >= 11));

  const potBB = potRange(7, 12);
  const stackBB = potRange(88, 100);
  const villainBet = Math.round(potBB * 0.6);
  const boardStr = bd(board);
  const handFr = heroHand.map(cd).join(' ');
  const rangeDescFr = heroPos === 'UTG' ? 'très serrée (TT+, AK, AQ, AJs, KQs)' : 'serrée (88+, AJ+, KQ, QJs, JTs)';
  const rangeDescEn = heroPos === 'UTG' ? 'very tight (TT+, AK, AQ, AJs, KQs)' : 'tight (88+, AJ+, KQ, QJs, JTs)';

  const explFr = `**Situation**
Vous avez ouvert depuis ${heroPos} (range ${rangeDescFr}), le BTN a suivi (~30% des mains). Vous agissez EN PREMIER sur chaque street — vous êtes hors position (OOP).

**Analyse du board** [${boardStr}]
Board connecté et two-tone : il favorise massivement la range BTN. Le BTN suit avec des connecteurs (${board[0][0]}${board[1][0]}s, ${board[1][0]}${board[2][0]}s), des paires basses... qui touchent parfaitement ces 3 cartes. Votre range ${heroPos} — broadways et grosses paires — rate complètement.

**Le problème OOP**
Être OOP sur un board hostile vous place dans une double impasse :
1. Vous devez agir EN PREMIER sans information
2. Si vous misez et vilain relance, vous avez perdu le contrôle du pot
Bluffer OOP contre une range qui connecte = EV très négatif.

**Votre main** [${handFr}]
Overcards sans tirage. Même une paire vous laisserait souvent derrière deux paires ou un set de vilain.

**Décision — Checker / Abandonner**
OOP sur un board hostile : checker s'impose. Quand le BTN mise ${villainBet} BB, fold est la bonne réponse. Tenter un check-raise bluff ici serait une erreur grave — vilain call (ou re-raise) trop souvent avec ses mains qui connectent.`;

  const explEn = `**Situation**
You opened from ${heroPos} (${rangeDescEn}), BTN called (~30% of hands). You act FIRST on every street — you are out of position (OOP).

**Board Analysis** [${boardStr}]
Connected two-tone board: massively favors BTN's range. BTN calls with connectors (${board[0][0]}${board[1][0]}s, ${board[1][0]}${board[2][0]}s), small pairs... which hit this board perfectly. Your ${heroPos} range — broadways and big pairs — misses entirely.

**The OOP problem**
Being OOP on a hostile board creates a double bind:
1. You must act FIRST without any information
2. If you bet and villain raises, you've lost pot control
Bluffing OOP into a range that connects = very negative EV.

**Your hand** [${handFr}]
Overcards with no draw. Even a pair would often leave you behind villain's two pair or set.

**Decision — Check / Fold**
OOP on a hostile board: checking is mandatory. When BTN bets ${villainBet} BB, fold is correct. Attempting a check-raise bluff here is a serious mistake — villain calls (or re-raises) too often with their connecting hands.`;

  return {
    heroHand,
    board,
    street: 'flop',
    heroPosition: heroPos,
    villainPosition: villainPos,
    heroIsIP: false,
    potBB,
    stackBB,
    preflopNarrative: {
      fr: `Vous ouvrez depuis ${heroPos} à 2.5 BB, le BTN suit. Pot : ${potBB} BB.`,
      en: `You open from ${heroPos} to 2.5 BB, BTN calls. Pot: ${potBB} BB.`,
    },
    streetNarrative: [
      { fr: `Flop [${boardStr}] : vous checkez. Le BTN mise ${villainBet} BB.`, en: `Flop [${boardStr}]: you check. BTN bets ${villainBet} BB.` },
    ],
    correctAction: 'check-fold',
    bluffAmountBB: 0,
    factors: {
      position:     { score: 'negative', fr: `OOP (${heroPos} vs BTN) — vous agissez en premier, désavantage total`, en: `OOP (${heroPos} vs BTN) — you act first, total disadvantage` },
      board:        { score: 'negative', fr: `Board connecté ${board[0][0]}-${board[1][0]}-${board[2][0]} — favorable à la range large BTN`, en: `Connected board ${board[0][0]}-${board[1][0]}-${board[2][0]} — favors BTN's wide range` },
      villainRange: { score: 'negative', fr: 'BTN connecte fortement (connecteurs, paires basses, tirages)', en: 'BTN connects strongly (connectors, small pairs, draws)' },
      heroHand:     { score: 'negative', fr: `Overcards ${heroHand.map(c => c[0]).join('')} sans tirage — aucune équité sur ce board`, en: `Overcards ${heroHand.map(c => c[0]).join('')} with no draws — no equity on this board` },
    },
    explanation: { fr: explFr, en: explEn },
  };
}

// ─── Main export ──────────────────────────────────────────────────────────────

const BUILDERS: Record<BluffTemplate, () => Omit<BluffExercise, 'template'>> = {
  dry:       buildIpCbetDry,
  wet:       buildIpCbetWet,
  semiBluff: buildIpSemiBluff,
  float:     buildFloatSteal,
  oopMissed: buildOopMissedFlop,
};

function pickTemplate(mode?: string): BluffTemplate {
  const r = Math.random();
  if (mode === 'expert') {
    // Expert: heavier weight on harder spots — OOP scenarios, float steal, wet c-bet.
    if (r < 0.24) return 'wet';
    if (r < 0.46) return 'float';
    if (r < 0.68) return 'oopMissed';
    if (r < 0.90) return 'semiBluff';
    return 'dry';
  }
  // Basic / advanced: all 5 templates, weighted towards the easier dry c-bet.
  if (r < 0.26) return 'dry';
  if (r < 0.46) return 'wet';
  if (r < 0.66) return 'semiBluff';
  if (r < 0.86) return 'float';
  return 'oopMissed';
}

export function generateBluffExercise(mode?: string, avoidTemplate?: string): BluffExercise {
  let template = pickTemplate(mode);
  // Re-roll once if it would repeat the previous exercise's template — a
  // second draw from the full distribution, not a forced switch, so the
  // weighting above is preserved.
  if (template === avoidTemplate) template = pickTemplate(mode);
  return { ...BUILDERS[template](), template };
}
