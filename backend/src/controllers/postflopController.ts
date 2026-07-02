import { Request, Response } from 'express';
import * as fs   from 'fs';
import * as path from 'path';
import { Card, HandRank, Position } from '../types';
import { createDeck, shuffleDeck, removeCards, toHandNotation, RANK_VALUE, SUIT_SYMBOL } from '../services/poker/cards';
import { calculateEquity, EquityResult } from '../services/poker/equity';
import { evaluateBestHand } from '../services/poker/handEvaluator';
import { OPEN_RAISE } from '../services/poker/ranges';

const PREGEN_FILE = path.resolve(__dirname, '../../data/pregenerated.json');

function loadPregen(): { flop: object[]; expertFlop: object[]; fullHand: object[] } {
  try {
    const raw = JSON.parse(fs.readFileSync(PREGEN_FILE, 'utf8'));
    return { flop: raw.flop ?? [], expertFlop: raw.expertFlop ?? [], fullHand: raw.fullHand ?? [] };
  } catch {
    return { flop: [], expertFlop: [], fullHand: [] };
  }
}

// ─── Shared constants & helpers ───────────────────────────────────────────────

const MATCHUPS = [
  { hero: 'BTN', villain: 'BB', heroIP: true,  potBB: 7, descFr: 'BTN relance 3bb, BB appelle',         descEn: 'BTN raised 3bb, BB called' },
  { hero: 'CO',  villain: 'BB', heroIP: true,  potBB: 7, descFr: 'CO relance 3bb, BB appelle',          descEn: 'CO raised 3bb, BB called' },
  { hero: 'BTN', villain: 'SB', heroIP: true,  potBB: 7, descFr: 'BTN relance 3bb, SB appelle',         descEn: 'BTN raised 3bb, SB called' },
  { hero: 'BB',  villain: 'BTN', heroIP: false, potBB: 7, descFr: 'BTN relance 3bb, vous appelez en BB', descEn: 'BTN raised 3bb, you called OOP' },
  { hero: 'BB',  villain: 'CO',  heroIP: false, potBB: 7, descFr: 'CO relance 3bb, vous appelez en BB',  descEn: 'CO raised 3bb, you called OOP' },
];

const RFI_MATCHUPS = [
  { hero: 'UTG', villain: 'BB', heroIP: true,  potBB: 7, descFr: 'UTG (vous) ouvre 3bb, BB appelle',  descEn: 'UTG (you) raises 3bb, BB calls' },
  { hero: 'HJ',  villain: 'BB', heroIP: true,  potBB: 7, descFr: 'HJ (vous) ouvre 3bb, BB appelle',   descEn: 'HJ (you) raises 3bb, BB calls' },
  { hero: 'CO',  villain: 'BB', heroIP: true,  potBB: 7, descFr: 'CO (vous) ouvre 3bb, BB appelle',   descEn: 'CO (you) raises 3bb, BB calls' },
  { hero: 'BTN', villain: 'BB', heroIP: true,  potBB: 7, descFr: 'BTN (vous) ouvre 3bb, BB appelle',  descEn: 'BTN (you) raises 3bb, BB calls' },
  { hero: 'BTN', villain: 'SB', heroIP: true,  potBB: 7, descFr: 'BTN (vous) ouvre 3bb, SB appelle',  descEn: 'BTN (you) raises 3bb, SB calls' },
  { hero: 'SB',  villain: 'BB', heroIP: false, potBB: 7, descFr: 'SB (vous) ouvre 3bb, BB appelle',   descEn: 'SB (you) raises 3bb, BB calls' },
];

const STREETS = ['flop', 'turn', 'river'] as const;
const RANKS_DISPLAY = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];

type ActionKey = 'fold' | 'check' | 'call' | 'raise' | 'bet' | 'bet_33' | 'bet_67' | 'bet_100';

function getBoardTexture(board: Card[]): {
  label: { fr: string; en: string };
  context: { fr: string; en: string };
  score: 0 | 1 | 2;
} {
  const flop3 = board.slice(0, 3);
  const suits = flop3.map(c => c[1]);
  const vals = flop3.map(c => RANK_VALUE[c[0] as keyof typeof RANK_VALUE]).sort((a, b) => b - a);
  const suitMap: Record<string, number> = {};
  suits.forEach(s => { suitMap[s] = (suitMap[s] || 0) + 1; });
  const hasFD = Object.values(suitMap).some(c => c >= 2);
  const hasSD = vals.length >= 3 && (vals[0] - vals[vals.length - 1]) <= 4;
  const score = ((hasFD ? 1 : 0) + (hasSD ? 1 : 0)) as 0 | 1 | 2;
  if (score === 0) return {
    label:   { fr: 'Sec (peu de tirages)',       en: 'Dry (few draws)' },
    context: {
      fr: 'board sec : peu de tirages possibles, les mains adverses qui continuent ont souvent déjà une combinaison réelle.',
      en: 'dry board: few draws possible, villain\'s continuing range is mostly made hands.',
    },
    score,
  };
  if (score === 1) return {
    label:   { fr: 'Semi-dynamique',             en: 'Semi-wet' },
    context: {
      fr: 'board semi-dynamique : quelques tirages couleur ou suite possibles. Il faut prendre en compte les mains adverses en tirage.',
      en: 'semi-wet board: some flush or straight draws possible. Factor in villain\'s drawing hands.',
    },
    score,
  };
  return {
    label:   { fr: 'Dynamique (nombreux tirages)', en: 'Wet (many draws)' },
    context: {
      fr: 'board très dynamique : nombreux tirages. Miser gros protège votre avantage en refusant une carte gratuite aux tirages adverses.',
      en: 'wet board: many draws. Betting big denies free cards to villain\'s drawing hands.',
    },
    score,
  };
}

function handRankLabel(rank: HandRank): { fr: string; en: string } {
  const labels: Record<number, { fr: string; en: string }> = {
    [HandRank.HIGH_CARD]:       { fr: 'Carte haute',         en: 'High card' },
    [HandRank.PAIR]:            { fr: 'Paire',               en: 'Pair' },
    [HandRank.TWO_PAIR]:        { fr: 'Double paire',        en: 'Two pair' },
    [HandRank.THREE_OF_A_KIND]: { fr: 'Brelan',              en: 'Trips' },
    [HandRank.STRAIGHT]:        { fr: 'Suite',               en: 'Straight' },
    [HandRank.FLUSH]:           { fr: 'Couleur',             en: 'Flush' },
    [HandRank.FULL_HOUSE]:      { fr: 'Full house',          en: 'Full house' },
    [HandRank.FOUR_OF_A_KIND]:  { fr: 'Carré',               en: 'Quads' },
    [HandRank.STRAIGHT_FLUSH]:  { fr: 'Quinte flush',        en: 'Straight flush' },
    [HandRank.ROYAL_FLUSH]:     { fr: 'Quinte flush royale', en: 'Royal flush' },
  };
  return labels[rank] ?? { fr: 'Main inconnue', en: 'Unknown hand' };
}

const EQUITY_SAMPLES     = 8;    // villain hands sampled (expert)
const EQUITY_RUNS        = 300;  // runouts per sample (expert) → 8 × 300 = 2 400 total

// ─── Threat analysis ──────────────────────────────────────────────────────────
// Analyse the remaining deck to identify which villain hand categories beat hero,
// and estimate combo counts for each category.

function buildThreatAnalysis(
  hero: [Card, Card],
  board: Card[],
  heroRank: HandRank,
): { fr: string; en: string } {
  const RANKS = ['A','K','Q','J','T','9','8','7','6','5','4','3','2'];

  const remaining = removeCards(createDeck(), [...hero, ...board]);
  const N = remaining.length;
  const totalPossible = Math.floor(N * (N - 1) / 2);

  // Remaining copies per rank (villain hand draws from these)
  const remByRank: Record<string, number> = {};
  RANKS.forEach(r => { remByRank[r] = 0; });
  remaining.forEach(c => { remByRank[c[0]]++; });

  const boardCnt: Record<string, number> = {};
  board.forEach(c => { boardCnt[c[0]] = (boardCnt[c[0]] || 0) + 1; });

  const heroCnt: Record<string, number> = {};
  hero.forEach(c => { heroCnt[c[0]] = (heroCnt[c[0]] || 0) + 1; });

  // Combos where villain holds ≥1 card of rank r
  const atLeastOne = (r: string): number => {
    const rem = remByRank[r];
    if (!rem) return 0;
    return totalPossible - Math.floor((N - rem) * (N - rem - 1) / 2);
  };

  // Combos for villain to hold a pocket pair of rank r
  const ppCombos = (r: string): number => {
    const rem = remByRank[r];
    return rem >= 2 ? Math.floor(rem * (rem - 1) / 2) : 0;
  };

  const entries: { fr: string; en: string; combos: number }[] = [];

  const boardPairRanks   = RANKS.filter(r => (boardCnt[r] ?? 0) >= 2);
  const boardSingleRanks = RANKS.filter(r => (boardCnt[r] ?? 0) === 1);
  const heroPairRanks    = RANKS.filter(r => (heroCnt[r] ?? 0) >= 2);
  const hasPocketPair    = heroPairRanks.length > 0;

  if (heroRank === HandRank.HIGH_CARD) {
    // Any board hit or pocket pair beats hero
    RANKS.filter(r => boardCnt[r]).forEach(r => {
      const c = atLeastOne(r);
      if (!c) return;
      const isBP = (boardCnt[r] ?? 0) >= 2;
      entries.push({
        fr: `Toute carte **${r}** → **${isBP ? 'Brelan' : 'Paire'}** (${remByRank[r]} restante${remByRank[r] > 1 ? 's' : ''}, ~${c} combos)`,
        en: `Any **${r}** → **${isBP ? 'Trips' : 'Pair'}** (${remByRank[r]} remaining, ~${c} combos)`,
        combos: c,
      });
    });
    let ppTotal = 0;
    RANKS.forEach(r => { if (!boardCnt[r]) ppTotal += ppCombos(r); });
    if (ppTotal > 0) entries.push({
      fr: `**Paire de poche** (n'importe quelle paire en main) → **Paire** (~${ppTotal} combos)`,
      en: `**Any pocket pair** → **Pair** (~${ppTotal} combos)`,
      combos: ppTotal,
    });

  } else if (heroRank === HandRank.PAIR) {
    // Trips: any board-paired rank
    boardPairRanks.forEach(r => {
      const c = atLeastOne(r);
      if (c > 0) entries.push({
        fr: `Toute carte **${r}** → **Brelan de ${r}** (${remByRank[r]} restante${remByRank[r] > 1 ? 's' : ''}, ~${c} combos)`,
        en: `Any **${r}** → **Trips of ${r}** (${remByRank[r]} remaining, ~${c} combos)`,
        combos: c,
      });
    });
    // Two pair: any board-single rank
    boardSingleRanks.forEach(r => {
      const c = atLeastOne(r);
      if (c > 0) entries.push({
        fr: `Toute carte **${r}** → **Deux paires** avec le board (~${c} combos)`,
        en: `Any **${r}** → **Two pair** with the board (~${c} combos)`,
        combos: c,
      });
    });
    // Pocket pairs
    if (boardPairRanks.length > 0 && !hasPocketPair) {
      // Hero's pair comes from the board pair → any pocket pair makes two pair
      let ppTotal = 0;
      RANKS.forEach(r => { if (!boardCnt[r]) ppTotal += ppCombos(r); });
      if (ppTotal > 0) entries.push({
        fr: `**Toute paire de poche** → **Deux paires** avec la paire du board (~${ppTotal} combos)`,
        en: `**Any pocket pair** → **Two pair** with the board pair (~${ppTotal} combos)`,
        combos: ppTotal,
      });
    } else if (hasPocketPair) {
      // Hero has pocket pair: higher pocket pairs beat us
      const heroPairRank = heroPairRanks[0];
      const idx = RANKS.indexOf(heroPairRank);
      let higherPP = 0;
      RANKS.slice(0, idx).forEach(r => { if (!boardCnt[r]) higherPP += ppCombos(r); });
      if (higherPP > 0) entries.push({
        fr: `**Paire de poche supérieure** (rang > ${heroPairRank}) → **Paire plus haute** (~${higherPP} combos)`,
        en: `**Higher pocket pair** (rank > ${heroPairRank}) → **Higher pair** (~${higherPP} combos)`,
        combos: higherPP,
      });
    }

  } else if (heroRank === HandRank.TWO_PAIR) {
    // Trips: board pair rank
    boardPairRanks.forEach(r => {
      const c = atLeastOne(r);
      if (c > 0) entries.push({
        fr: `Toute carte **${r}** → **Brelan de ${r}** (~${c} combos)`,
        en: `Any **${r}** → **Trips of ${r}** (~${c} combos)`,
        combos: c,
      });
    });
    // Sets: pocket pair matching board single
    boardSingleRanks.forEach(r => {
      const c = ppCombos(r);
      if (c > 0) entries.push({
        fr: `Paire de poche **${r}${r}** → **Set de ${r}** (${c} combo${c !== 1 ? 's' : ''})`,
        en: `Pocket pair **${r}${r}** → **Set of ${r}** (${c} combo${c !== 1 ? 's' : ''})`,
        combos: c,
      });
    });

  } else if (heroRank === HandRank.THREE_OF_A_KIND) {
    // Full house: pocket pair matching any board rank
    RANKS.filter(r => boardCnt[r]).forEach(r => {
      const c = ppCombos(r);
      if (c > 0) entries.push({
        fr: `Paire de poche **${r}${r}** → **Full house** (${c} combo${c !== 1 ? 's' : ''})`,
        en: `Pocket pair **${r}${r}** → **Full house** (${c} combo${c !== 1 ? 's' : ''})`,
        combos: c,
      });
    });

  } else {
    // STRAIGHT, FLUSH, FULL_HOUSE, QUADS: very few hands beat you
    return {
      fr: `\n\n**🃏 Ce qui vous bat :** Très peu de combinaisons — vous êtes en excellente position.`,
      en: `\n\n**🃏 What beats you:** Very few combinations — you're in excellent shape.`,
    };
  }

  if (!entries.length) return { fr: '', en: '' };

  entries.sort((a, b) => b.combos - a.combos);
  const top = entries.slice(0, 5);

  return {
    fr: `\n\n**🃏 Ce qui vous bat sur ce board :**\n${top.map(e => `• ${e.fr}`).join('\n')}\n\n*(Sur ~${totalPossible} combos possibles pour le villain dans le deck restant)*`,
    en: `\n\n**🃏 What beats you on this board:**\n${top.map(e => `• ${e.en}`).join('\n')}\n\n*(Out of ~${totalPossible} possible villain combos from the remaining deck)*`,
  };
}

/** Format a card as a readable string, e.g. "As" → "A♠" */
function cardStr(c: Card): string {
  return `${c[0]}${SUIT_SYMBOL[c[1] as keyof typeof SUIT_SYMBOL] ?? c[1]}`;
}

/** Format an array of cards */
function cardsStr(cards: Card[]): string {
  return cards.map(cardStr).join(' ');
}

/** Estimate equity vs random range. Returns equity % + raw counts + one concrete example for transparency. */
function estimateEquityVsRange(
  hero: [Card, Card],
  board: Card[],
  samples = EQUITY_SAMPLES,
  runs = EQUITY_RUNS,
): {
  equity: number;
  wins: number;
  ties: number;
  total: number;
  example: { fr: string; en: string };
} {
  let winSum = 0;
  let tieSum = 0;
  const used = [...hero, ...board];

  // ── First iteration: save details for the example ─────────────────────────
  const exDeck    = shuffleDeck(removeCards(createDeck(), used));
  const exVillain: [Card, Card] = [exDeck[0], exDeck[1]];

  // Fill remaining board cards for this example (we need full 5-card board)
  const remainingNeeded = 5 - board.length;
  const exRunout: Card[] = exDeck.slice(2, 2 + remainingNeeded);
  const exBoard: Card[]  = [...board, ...exRunout];

  const exHeroEval    = evaluateBestHand([...hero,    ...exBoard]);
  const exVillainEval = evaluateBestHand([...exVillain, ...exBoard]);
  const exHeroWins    = exHeroEval.score > exVillainEval.score;
  const exTie         = exHeroEval.score === exVillainEval.score;

  // Over all samples (including the first one)
  const exEq = calculateEquity(hero, exVillain, board, runs);
  winSum += exEq.hand1WinPct;
  tieSum += exEq.tiePct;

  for (let i = 1; i < samples; i++) {
    const deck = shuffleDeck(removeCards(createDeck(), used));
    const villain: [Card, Card] = [deck[0], deck[1]];
    const eq: EquityResult = calculateEquity(hero, villain, board, runs);
    winSum += eq.hand1WinPct;
    tieSum += eq.tiePct;
  }
  const equity = Math.round((winSum + tieSum * 0.5) / samples);

  // ── Build the concrete example explanation ────────────────────────────────
  const heroCards    = cardsStr([...hero]);
  const boardCards   = cardsStr([...board]);
  const villainCards = cardsStr([...exVillain]);
  const runoutCards  = exRunout.length > 0 ? cardsStr(exRunout) : '';
  const fullBoard    = cardsStr(exBoard);

  const outcome      = exHeroWins ? '✅ VOUS GAGNEZ' : exTie ? '🤝 ÉGALITÉ' : '❌ VILLAIN GAGNE';
  const outcomeEn    = exHeroWins ? '✅ YOU WIN'     : exTie ? '🤝 TIE'     : '❌ VILLAIN WINS';

  const boardStreet  = board.length === 3 ? 'flop' : board.length === 4 ? 'turn' : 'river';
  const runoutLabel  = board.length === 3 ? 'Turn + River' : board.length === 4 ? 'River' : '—';

  // Equity method depends on the street: flop is sampled (EQUITY_RUNS runouts),
  // turn enumerates all ~44 runouts exactly, river is deterministic. Keep the
  // explanation honest about which one ran.
  const isExactEq      = remainingNeeded <= 1;
  const runsPerVillain = remainingNeeded === 0 ? 1 : remainingNeeded === 1 ? (52 - 4 - board.length) : runs;
  const totalRuns      = samples * runsPerVillain;

  const fr = [
    `📋 **Comment on calcule votre équité de ${equity}% :**`,
    ``,
    `**Étape 1 — Vos cartes + board visible**`,
    `Votre main : ${heroCards}  |  Board (${boardStreet}) : ${boardCards}`,
    ``,
    `**Étape 2 — On distribue 2 cartes AU HASARD au villain**`,
    `Le villain reçoit n'importe quelles 2 cartes parmi les ${52 - 2 - board.length} restantes dans le deck. On ne tient PAS compte de sa range (les mains qu'il aurait "normalement"). C'est une approximation conservative.`,
    ``,
    `**Étape 3 — On tire les cartes manquantes (runout)**`,
    `${remainingNeeded > 0 ? `Les ${remainingNeeded} carte(s) restante(s) du board (${runoutLabel}) sont tirées au hasard.` : `Toutes les cartes du board sont visibles — pas de runout.`}`,
    ``,
    `**Étape 4 — On compare les meilleures mains**`,
    `On détermine qui a la meilleure combinaison sur 5 cartes parmi les 7 disponibles (2 en main + 5 au board).`,
    ``,
    `**Exemple réel (${isExactEq ? 'évaluation' : 'simulation'} n°1 de vos ${totalRuns.toLocaleString('fr-FR')}) :**`,
    `→ Villain reçoit : ${villainCards}`,
    `${runoutCards ? `→ ${runoutLabel} tiré(s) : ${runoutCards}` : ''}`,
    `→ Board complet : ${fullBoard}`,
    `→ Votre meilleure main : ${exHeroEval.description}`,
    `→ Meilleure main du villain : ${exVillainEval.description}`,
    `→ Résultat : **${outcome}**`,
    ``,
    isExactEq
      ? (remainingNeeded === 1
          ? `**Étape 5 — On teste TOUS les ${runsPerVillain} runouts possibles, pour chacune des ${samples} mains adverses**`
          : `**Étape 5 — On compare directement sur ${samples} mains adverses (board déjà complet)**`)
      : `**Étape 5 — On répète ${samples} fois × ${runs} runouts**`,
    `Total : ${totalRuns.toLocaleString('fr-FR')} ${isExactEq ? 'évaluations exactes' : 'simulations'}. Votre équité = nombre de fois que vous gagnez ÷ total = **${equity}%**.`,
  ].filter(l => l !== '' || true).join('\n');

  const en = [
    `📋 **How your equity of ${equity}% is calculated:**`,
    ``,
    `**Step 1 — Your cards + visible board**`,
    `Your hand: ${heroCards}  |  Board (${boardStreet}): ${boardCards}`,
    ``,
    `**Step 2 — 2 RANDOM cards are dealt to villain**`,
    `Villain gets any 2 cards from the ${52 - 2 - board.length} remaining in the deck. We do NOT use villain's range (the hands they'd "normally" have). This is a conservative approximation.`,
    ``,
    `**Step 3 — Missing board cards are dealt (runout)**`,
    `${remainingNeeded > 0 ? `The ${remainingNeeded} remaining board card(s) (${runoutLabel}) are drawn at random.` : `All board cards are visible — no runout needed.`}`,
    ``,
    `**Step 4 — Best hands are compared**`,
    `We find who has the best 5-card hand from 7 available cards (2 hole + 5 board).`,
    ``,
    `**Real example (${isExactEq ? 'evaluation' : 'simulation'} #1 of your ${totalRuns.toLocaleString()}):**`,
    `→ Villain gets: ${villainCards}`,
    `${runoutCards ? `→ ${runoutLabel} drawn: ${runoutCards}` : ''}`,
    `→ Full board: ${fullBoard}`,
    `→ Your best hand: ${exHeroEval.description}`,
    `→ Villain's best hand: ${exVillainEval.description}`,
    `→ Result: **${outcomeEn}**`,
    ``,
    isExactEq
      ? (remainingNeeded === 1
          ? `**Step 5 — Test ALL ${runsPerVillain} possible runouts, for each of the ${samples} villain hands**`
          : `**Step 5 — Compare directly across ${samples} villain hands (board already complete)**`)
      : `**Step 5 — Repeat ${samples} times × ${runs} runouts**`,
    `Total: ${totalRuns.toLocaleString()} ${isExactEq ? 'exact evaluations' : 'simulations'}. Your equity = times you win ÷ total = **${equity}%**.`,
  ].filter(l => l !== '' || true).join('\n');

  return {
    equity,
    wins:  Math.round(winSum / samples),
    ties:  Math.round(tieSum / samples),
    total: samples,
    example: { fr, en },
  };
}

/** Exact equity vs a specific villain hand. Used in full-hand exercises. */
function equityVsVillain(hero: [Card, Card], villain: [Card, Card], board: Card[]): number {
  const eq = calculateEquity(hero, villain, board, 400);
  return Math.round(eq.hand1WinPct + eq.tiePct * 0.5);
}

// ─── Bet-sizing logic ─────────────────────────────────────────────────────────
//
// Four hand-strength tiers drive sizing when villain checks:
//   MONSTER  (≥ THREE_OF_A_KIND) : bet_100 on wet boards or very high equity,
//                                   bet_67  on dry boards
//   TWO_PAIR                     : bet_100 wet+high equity, bet_67 default,
//                                   bet_33 / check when equity is weak
//   PAIR                         : bet_67 only when strong IP, bet_33 thin value IP,
//                                   check OOP or weak equity
//   HIGH_CARD                    : bet_33 blocker bet IP on dry boards only,
//                                   check everywhere else
//
// When villain bets:  pot-odds math decides fold / call / raise.

function buildDecision(
  heroEquity: number,
  isHeroIP: boolean,
  potSize: number,
  villainAction: 'check' | 'bet',
  villainBetSize: number,
  handRank: HandRank,
  texture?: ReturnType<typeof getBoardTexture>,
  equityDetail?: { wins: number; ties: number; total: number },
  expert = false,
) {
  const handLbl  = handRankLabel(handRank);

  // Hand-strength tiers
  const isMonster = handRank >= HandRank.THREE_OF_A_KIND;
  const isTwoPair = handRank === HandRank.TWO_PAIR;
  const isPair    = handRank === HandRank.PAIR;
  // handRank === HandRank.HIGH_CARD is the fallthrough

  const textureScore = texture?.score ?? 0;
  const textureCtxFr = texture?.context.fr ?? '';
  const textureCtxEn = texture?.context.en ?? '';

  let correct: ActionKey;
  let options: { key: ActionKey; labelFr: string; labelEn: string }[];
  let reasonFr: string;
  let reasonEn: string;

  const bet33  = Math.max(1, Math.round(potSize * 0.33));
  const bet67  = Math.max(1, Math.round(potSize * 0.67));
  const bet100 = Math.max(1, potSize);

  // Equity detail text (injected into every explanation)
  const eqSrc = equityDetail
    ? `(équité vs ${equityDetail.total} mains adverses aléatoires — runouts échantillonnés au flop, exacts au turn/river)`
    : `(estimé par Monte Carlo)`;
  const eqSrcEn = equityDetail
    ? `(equity vs ${equityDetail.total} random villain hands — runouts sampled on the flop, exact on turn/river)`
    : `(estimated via Monte Carlo)`;

  // ── Villain bet → pot-odds decision ─────────────────────────────────────────
  if (villainAction === 'bet') {
    const totalPot = potSize + villainBetSize;
    const potOdds  = Math.round((villainBetSize / (potSize + villainBetSize * 2)) * 100);
    options = [
      { key: 'fold',  labelFr: 'Fold',                    labelEn: 'Fold' },
      { key: 'call',  labelFr: `Call ${villainBetSize}bb`, labelEn: `Call ${villainBetSize}bb` },
      { key: 'raise', labelFr: 'Relancer',                 labelEn: 'Raise' },
    ];

    // Raise: monster hand or massive equity edge
    if (isMonster || heroEquity >= 70) {
      correct = 'raise';
      const raiseSize = villainBetSize * 3;
      reasonFr = `**Équité calculée : ${heroEquity}%** ${eqSrc}\n\nVotre main est ${handLbl.fr}. Vous êtes un favori très net face à la mise du villain.\n\n**Calcul des pot-odds :** Villain mise ${villainBetSize}bb dans un pot de ${potSize}bb. Vous payez ${villainBetSize}bb pour gagner ${totalPot}bb → **${potOdds}% d'équité requise** pour break-even. Vous avez ${heroEquity - potOdds}% de marge.\n\n**Pourquoi relancer à ~${raiseSize}bb ?** Call serait rentable, mais relancer force le villain à payer très cher avec ses tirages ou mains moyennes. Avec ${heroEquity}% d'équité, chaque bb supplémentaire misé est rentable. EV estimé du raise vs call : **+${Math.round((heroEquity / 100) * raiseSize)}bb** supplémentaires en moyenne.`;
      reasonEn = `**Calculated equity: ${heroEquity}%** ${eqSrcEn}\n\nYour hand is ${handLbl.en}. You're a clear favorite against villain's bet.\n\n**Pot-odds calculation:** Villain bets ${villainBetSize}bb into a ${potSize}bb pot. You pay ${villainBetSize}bb to win ${totalPot}bb → **${potOdds}% equity required** to break even. You have ${heroEquity - potOdds}% margin.\n\n**Why raise to ~${raiseSize}bb?** Calling is profitable, but raising forces villain to pay a high price with draws or marginal hands. With ${heroEquity}% equity every extra bb bet is +EV. Estimated raise vs call extra EV: **+${Math.round((heroEquity / 100) * raiseSize)}bb** on average.`;

    // Call: profitable pot-odds, not strong enough to raise
    } else if (heroEquity >= potOdds + 5) {
      correct = 'call';
      const ev = Math.round((heroEquity / 100) * (potSize + villainBetSize * 2) - villainBetSize);
      reasonFr = `**Équité calculée : ${heroEquity}%** ${eqSrc}\n\nVotre main est ${handLbl.fr}.\n\n**Calcul des pot-odds :** Villain mise ${villainBetSize}bb dans un pot de ${potSize}bb. Vous payez ${villainBetSize}bb pour gagner ${potSize + villainBetSize * 2}bb → **${potOdds}% d'équité requise**. Votre ${heroEquity}% dépasse le seuil de ${potOdds + 5}% avec confort.\n\n**Pourquoi call ?** EV moyen de ce call : **+${ev}bb** par street. Relancer ici ferait fuir les mains que vous battez sans rajouter de valeur. Folder est une erreur coûteuse.`;
      reasonEn = `**Calculated equity: ${heroEquity}%** ${eqSrcEn}\n\nYour hand is ${handLbl.en}.\n\n**Pot-odds calculation:** Villain bets ${villainBetSize}bb into a ${potSize}bb pot. You pay ${villainBetSize}bb to win ${potSize + villainBetSize * 2}bb → **${potOdds}% required**. Your ${heroEquity}% comfortably clears the ${potOdds + 5}% threshold.\n\n**Why call?** Average EV of this call: **+${ev}bb** per street. Raising would fold out the hands you beat without adding value. Folding is a costly mistake.`;

    // Fold: not enough equity
    } else {
      correct = 'fold';
      const loss = Math.round(villainBetSize - (heroEquity / 100) * (potSize + villainBetSize * 2));
      reasonFr = `**Équité calculée : ${heroEquity}%** ${eqSrc}\n\nVotre main est ${handLbl.fr}.\n\n**Calcul des pot-odds :** Villain mise ${villainBetSize}bb dans un pot de ${potSize}bb. Vous payez ${villainBetSize}bb pour gagner ${potSize + villainBetSize * 2}bb → **${potOdds}% d'équité requise**. Il vous manque **${potOdds - heroEquity}%** pour atteindre le break-even.\n\n**Pourquoi fold ?** Appeler coûte en moyenne **-${loss}bb** à chaque fois. Sur 100 mains identiques vous perdez ${loss * 100}bb de plus qu'en foldant. Préserver votre stack pour une meilleure situation est toujours la bonne décision à long terme.`;
      reasonEn = `**Calculated equity: ${heroEquity}%** ${eqSrcEn}\n\nYour hand is ${handLbl.en}.\n\n**Pot-odds calculation:** Villain bets ${villainBetSize}bb into a ${potSize}bb pot. You pay ${villainBetSize}bb to win ${potSize + villainBetSize * 2}bb → **${potOdds}% required**. You're **${potOdds - heroEquity}%** short of the break-even threshold.\n\n**Why fold?** Calling loses an average of **-${loss}bb** every time. Over 100 identical hands you lose ${loss * 100}bb more than folding. Preserving your stack for a better spot is always the long-term correct play.`;
    }

  // ── Villain checks → hero choisit : Check ou Bet ─────────────────────────────
  } else {
    options = [
      { key: 'check', labelFr: 'Check', labelEn: 'Check' },
      { key: 'bet',   labelFr: 'Bet',   labelEn: 'Bet' },
    ];

    // Taille recommandée (pédagogique — mentionnée dans l'explication)
    const recPct    = isMonster
                        ? (textureScore >= 1 || heroEquity >= 78 ? 100 : 67)
                        : isTwoPair
                          ? (textureScore >= 1 && heroEquity >= 68 ? 100 : heroEquity >= 55 ? 67 : 33)
                          : isPair
                            ? (heroEquity >= 70 && isHeroIP ? 67 : 33)
                            : 33; // high card / semi-bluff
    const recSize   = Math.max(1, Math.round(potSize * recPct / 100));

    // ── MONSTER ────────────────────────────────────────────────────────────────
    if (isMonster) {
      correct = 'bet';
      if (textureScore >= 1 || heroEquity >= 78) {
        reasonFr = `**Équité calculée : ${heroEquity}%** ${eqSrc}\n\nVotre main est un **${handLbl.fr}** — une main très forte.\n\n**Texture :** ${textureCtxFr}\n\n**Pourquoi miser ?** Sur un board dynamique, les tirages adverses ont ~33-38% d'équité. En misantun gros bet (~${recSize}bb, soit ~${recPct}% du pot), vous leur refusez une carte gratuite ET vous maximisez la valeur. Checker laisserait le villain améliorer gratuitement.`;
        reasonEn = `**Calculated equity: ${heroEquity}%** ${eqSrcEn}\n\nYour hand is a **${handLbl.en}** — a very strong hand.\n\n**Texture:** ${textureCtxEn}\n\n**Why bet?** On a dynamic board, villain's draws have ~33-38% equity. Betting big (~${recSize}bb ≈ ${recPct}% pot) denies free cards AND maximizes value. Checking gives villain a free shot to improve.`;
      } else {
        reasonFr = `**Équité calculée : ${heroEquity}%** ${eqSrc}\n\nVotre main est un **${handLbl.fr}** — une main très forte.\n\n**Texture :** ${textureCtxFr}\n\n**Pourquoi miser ?** Board sec = peu de tirages adverses. Une mise (~${recSize}bb, ~${recPct}% du pot) garde les paires et tirages faibles dans le pot. Checker laisserait le villain réaliser son équité gratuitement et vous privez de valeur.`;
        reasonEn = `**Calculated equity: ${heroEquity}%** ${eqSrcEn}\n\nYour hand is a **${handLbl.en}** — a very strong hand.\n\n**Texture:** ${textureCtxEn}\n\n**Why bet?** Dry board = few villain draws. A bet (~${recSize}bb ≈ ${recPct}% pot) keeps pairs and weak draws in the pot. Checking lets villain realize equity for free and you miss value.`;
      }

    // ── TWO PAIR ───────────────────────────────────────────────────────────────
    } else if (isTwoPair) {
      if (heroEquity >= 55 || (isHeroIP && heroEquity >= 45)) {
        correct = 'bet';
        if (textureScore >= 1 && heroEquity >= 68) {
          reasonFr = `**Équité calculée : ${heroEquity}%** ${eqSrc}\n\nVotre main est une **${handLbl.fr}** — forte, mais vulnérable aux tirages.\n\n**Texture :** ${textureCtxFr}\n\n**Pourquoi miser ?** Deux paires sur un board dynamique se protègent avec un bet significatif (~${recSize}bb, ~${recPct}% du pot). Les tirages couleur/suite ont ~35% d'équité — miser leur coûte cher pour continuer. Checker leur donnerait une carte gratuite.`;
          reasonEn = `**Calculated equity: ${heroEquity}%** ${eqSrcEn}\n\nYour hand is **${handLbl.en}** — strong, but vulnerable to draws.\n\n**Texture:** ${textureCtxEn}\n\n**Why bet?** Two pair on a dynamic board wants protection (~${recSize}bb ≈ ${recPct}% pot). Flush/straight draws have ~35% equity — charging them to continue is correct. Checking gives them a free card.`;
        } else {
          reasonFr = `**Équité calculée : ${heroEquity}%** ${eqSrc}\n\nVotre main est une **${handLbl.fr}** avec ${heroEquity}% d'équité.\n\n**Texture :** ${textureCtxFr}\n\n**Pourquoi miser ?** Value bet standard : vos deux paires battent toutes les paires simples. Une mise (~${recSize}bb, ~${recPct}% du pot) extrait de la valeur des mains qui sont derrière. ${isHeroIP ? 'En position, cette mise est encore plus forte.' : ''}`;
          reasonEn = `**Calculated equity: ${heroEquity}%** ${eqSrcEn}\n\nYour hand is **${handLbl.en}** with ${heroEquity}% equity.\n\n**Texture:** ${textureCtxEn}\n\n**Why bet?** Standard value bet: your two pair beats all single pairs. A bet (~${recSize}bb ≈ ${recPct}% pot) extracts value from hands behind you. ${isHeroIP ? 'Being in position makes this bet even stronger.' : ''}`;
        }
      } else {
        correct = 'check';
        reasonFr = `**Équité calculée : ${heroEquity}%** ${eqSrc}\n\nVotre main est une **${handLbl.fr}** mais avec seulement ${heroEquity}% d'équité${!isHeroIP ? ' hors position' : ''} — la range adverse est forte ici.\n\n**Texture :** ${textureCtxFr}\n\n**Pourquoi checker ?** Miser avec une équité faible risque de vous faire relancer et mettre en difficulté. Checker et réagir à l'action adverse contrôle mieux le pot.`;
        reasonEn = `**Calculated equity: ${heroEquity}%** ${eqSrcEn}\n\nYour hand is **${handLbl.en}** but with only ${heroEquity}% equity${!isHeroIP ? ' out of position' : ''} — villain's range is strong here.\n\n**Texture:** ${textureCtxEn}\n\n**Why check?** Betting with weak equity risks a raise that puts you in a tough spot. Checking and reacting to villain's action better controls the pot.`;
      }

    // ── PAIR ───────────────────────────────────────────────────────────────────
    } else if (isPair) {
      if (heroEquity >= 70 && isHeroIP) {
        correct = 'bet';
        reasonFr = `**Équité calculée : ${heroEquity}%** ${eqSrc}\n\nVotre main est une **${handLbl.fr}** très solide avec ${heroEquity}% d'équité en position.\n\n**Texture :** ${textureCtxFr}\n\n**Pourquoi miser ?** Votre paire domine la majorité des mains adverses. Un bet (~${recSize}bb ≈ ${recPct}% du pot) extrait de la valeur des paires plus faibles qui ne peuvent pas se coucher. Checker back avec cette main serait une erreur d'EV.`;
        reasonEn = `**Calculated equity: ${heroEquity}%** ${eqSrcEn}\n\nYour hand is a very solid **${handLbl.en}** with ${heroEquity}% equity in position.\n\n**Texture:** ${textureCtxEn}\n\n**Why bet?** Your pair dominates most of villain's range. A bet (~${recSize}bb ≈ ${recPct}% pot) extracts value from weaker pairs that can't fold. Checking back with this hand is an EV mistake.`;
      } else if (heroEquity >= 58 && isHeroIP) {
        correct = 'bet';
        reasonFr = `**Équité calculée : ${heroEquity}%** ${eqSrc}\n\nVotre main est une **${handLbl.fr}** avec ${heroEquity}% d'équité en position.\n\n**Texture :** ${textureCtxFr}\n\n**Pourquoi miser ?** Thin value bet en position : vous êtes devant mais pas massivement. Une petite mise (~${recSize}bb ≈ ${recPct}% du pot) extrait de la valeur sans sur-exposer votre main. Si le villain relance fort, vous pouvez vous coucher sans catastrophe.`;
        reasonEn = `**Calculated equity: ${heroEquity}%** ${eqSrcEn}\n\nYour hand is a **${handLbl.en}** with ${heroEquity}% equity in position.\n\n**Texture:** ${textureCtxEn}\n\n**Why bet?** Thin value bet in position: you're ahead but not massively so. A small bet (~${recSize}bb ≈ ${recPct}% pot) extracts value without over-exposing your hand. If villain raises big, you can fold without disaster.`;
      } else if (heroEquity >= 70 && !isHeroIP) {
        correct = 'bet';
        reasonFr = `**Équité calculée : ${heroEquity}%** ${eqSrc}\n\nVotre main est une **${handLbl.fr}** avec ${heroEquity}% d'équité, hors position.\n\n**Texture :** ${textureCtxFr}\n\n**Pourquoi miser ?** Avec une paire très forte OOP, un petit bet (~${recSize}bb ≈ ${recPct}% du pot) est acceptable : il représente de la valeur et refuse une carte gratuite. Miser trop gros OOP avec une paire serait dangereux si le villain relance.`;
        reasonEn = `**Calculated equity: ${heroEquity}%** ${eqSrcEn}\n\nYour hand is a **${handLbl.en}** with ${heroEquity}% equity, out of position.\n\n**Texture:** ${textureCtxEn}\n\n**Why bet?** With a very strong pair OOP, a small bet (~${recSize}bb ≈ ${recPct}% pot) is correct: it builds value and denies a free card. Betting too big OOP with just one pair is dangerous if villain raises.`;
      } else {
        correct = 'check';
        const checkReasonFr = !isHeroIP
          ? `Hors position avec ${heroEquity}% d'équité, miser risque de se faire relancer. Checker contrôle le pot et vous laisse réagir à l'action du villain.`
          : `En position avec seulement ${heroEquity}% d'équité, miser n'est pas rentable. Checker back garde le pot petit et vous offre une carte gratuite.`;
        const checkReasonEn = !isHeroIP
          ? `Out of position with ${heroEquity}% equity, betting risks being raised. Checking lets you control the pot and react to villain's action.`
          : `In position with only ${heroEquity}% equity, betting is not profitable. Checking back keeps the pot small and lets you see a free card.`;
        reasonFr = `**Équité calculée : ${heroEquity}%** ${eqSrc}\n\nVotre main est une **${handLbl.fr}**.\n\n**Texture :** ${textureCtxFr}\n\n**Pourquoi checker ?** ${checkReasonFr}`;
        reasonEn = `**Calculated equity: ${heroEquity}%** ${eqSrcEn}\n\nYour hand is a **${handLbl.en}**.\n\n**Texture:** ${textureCtxEn}\n\n**Why check?** ${checkReasonEn}`;
      }

    // ── HIGH CARD ──────────────────────────────────────────────────────────────
    } else {
      if (heroEquity >= 60 && isHeroIP && textureScore === 0) {
        correct = 'bet';
        reasonFr = `**Équité calculée : ${heroEquity}%** ${eqSrc}\n\nVotre main est **${handLbl.fr}** — pas de combinaison réalisée, mais ${heroEquity}% d'équité en position sur un board sec.\n\n**Texture :** ${textureCtxFr}\n\n**Pourquoi miser ?** Semi-bluff / blocker bet (~${recSize}bb ≈ ${recPct}% du pot) : board sec = peu de mains adverses faites. Une petite mise force le villain à décider avec des mains marginales qui se coucheront souvent. Votre forte équité vous protège si appelé.`;
        reasonEn = `**Calculated equity: ${heroEquity}%** ${eqSrcEn}\n\nYour hand is **${handLbl.en}** — no made hand, but ${heroEquity}% equity in position on a dry board.\n\n**Texture:** ${textureCtxEn}\n\n**Why bet?** Semi-bluff / blocker bet (~${recSize}bb ≈ ${recPct}% pot): dry board = few villain made hands. A small bet forces villain to decide with marginal holdings that often fold. Your high equity protects you if called.`;
      } else {
        correct = 'check';
        reasonFr = `**Équité calculée : ${heroEquity}%** ${eqSrc}\n\nVotre main est **${handLbl.fr}** — aucune combinaison réalisée.\n\n**Texture :** ${textureCtxFr}\n\n**Pourquoi checker ?** Miser sans combinaison est un bluff. Bluffer n'est rentable que si le villain fold suffisamment. ${!isHeroIP ? 'Hors position, les bluffs sont encore plus risqués.' : 'Ici l\'équité et le board ne justifient pas un bluff.'} En checkant, vous voyez une carte gratuite et évitez de brûler des bbs.`;
        reasonEn = `**Calculated equity: ${heroEquity}%** ${eqSrcEn}\n\nYour hand is **${handLbl.en}** — no made hand.\n\n**Texture:** ${textureCtxEn}\n\n**Why check?** Betting without a hand is a bluff. Bluffing is only profitable if villain folds enough. ${!isHeroIP ? 'Out of position, bluffs are even riskier.' : "Here the equity and board don't justify a bluff."} Checking lets you see a free card and avoids burning bbs.`;
      }
    }
  }

  // Expert mode: when villain checked and correct is 'bet', replace the 2-option
  // Check/Bet with 4 sizing choices so the player must pick the right bet size.
  if (expert && villainAction === 'check' && correct === 'bet') {
    const recPct = isMonster
      ? (textureScore >= 1 || heroEquity >= 78 ? 100 : 67)
      : isTwoPair
        ? (textureScore >= 1 && heroEquity >= 68 ? 100 : heroEquity >= 55 ? 67 : 33)
        : isPair
          ? (heroEquity >= 70 && isHeroIP ? 67 : 33)
          : 33;
    const sz33  = Math.max(1, Math.round(potSize * 0.33));
    const sz67  = Math.max(1, Math.round(potSize * 0.67));
    const sz100 = Math.max(1, potSize);
    correct = `bet_${recPct}` as ActionKey;
    options = [
      { key: 'check',   labelFr: 'Check',                      labelEn: 'Check' },
      { key: 'bet_33',  labelFr: `Bet 33% du pot (${sz33}bb)`,  labelEn: `Bet 33% pot (${sz33}bb)` },
      { key: 'bet_67',  labelFr: `Bet 67% du pot (${sz67}bb)`,  labelEn: `Bet 67% pot (${sz67}bb)` },
      { key: 'bet_100', labelFr: `Bet 100% du pot (${sz100}bb)`, labelEn: `Bet 100% pot (${sz100}bb)` },
    ];
  }

  return { correct, options, reasonFr, reasonEn };
}

/** Update pot based on the action that occurred */
function nextPot(pot: number, correctAction: ActionKey, villainAction: 'check' | 'bet', villainBetSize: number): number {
  if (villainAction === 'bet') {
    if (correctAction === 'call')  return pot + villainBetSize * 2;
    if (correctAction === 'raise') return pot + villainBetSize * 4; // simplified 3x raise
    return pot; // fold
  }
  const betAmt = correctAction === 'bet' ? Math.round(pot * 0.67) : 0;
  return pot + betAmt * 2; // hero bet + villain call (67% par défaut)
}

/** Get hero hand's frequency in a position's opening range */
function getHandRangeFreq(hand: [Card, Card], position: string): number {
  const r1 = RANKS_DISPLAY.indexOf(hand[0][0]);
  const r2 = RANKS_DISPLAY.indexOf(hand[1][0]);
  if (r1 === -1 || r2 === -1) return 0;
  const isSuited = hand[0][1] === hand[1][1];
  const hiIdx = Math.min(r1, r2);
  const loIdx = Math.max(r1, r2);
  let row: number, col: number;
  if (r1 === r2)     { row = r1; col = r2; }           // pair: diagonal
  else if (isSuited) { row = hiIdx; col = loIdx; }      // suited: above diagonal (i < j)
  else               { row = loIdx; col = hiIdx; }      // offsuit: below diagonal (i > j)
  const matrix = (OPEN_RAISE as Record<string, number[][]>)[position];
  if (!matrix || !matrix[row]) return 0;
  return matrix[row][col] ?? 0;
}

/** Build the full decision data for one post-flop street */
function buildStreetDecision(
  hero: [Card, Card],
  villain: [Card, Card],
  board: Card[],
  currentPot: number,
  isHeroIP: boolean,
  villainPosition: string,
) {
  const heroEquityRaw = equityVsVillain(hero, villain, board);
  // For full-hand we don't have detail, build a compatible object
  const equityDetail = { wins: heroEquityRaw, ties: 0, total: 400 };
  const heroEquity = heroEquityRaw;
  const villainEquity = 100 - heroEquity;
  const texture = getBoardTexture(board);
  const evalResult = evaluateBestHand([...hero, ...board]);

  // Villain action: bets when they have equity advantage
  const villainBets = villainEquity > 55
    ? (Math.random() < 0.65)
    : (Math.random() < 0.18);
  const villainAction: 'check' | 'bet' = villainBets ? 'bet' : 'check';
  const betPcts = [0.33, 0.50, 0.67];
  const villainBetSize = villainAction === 'bet'
    ? Math.max(1, Math.round(currentPot * betPcts[Math.floor(Math.random() * betPcts.length)]))
    : 0;

  const decision = buildDecision(heroEquity, isHeroIP, currentPot, villainAction, villainBetSize, evalResult.rank, texture, equityDetail);
  const threat   = buildThreatAnalysis(hero, board, evalResult.rank);

  return {
    heroEquity,
    heroHandRank: evalResult.rank,
    heroHandLabel: handRankLabel(evalResult.rank),
    heroHandDescription: evalResult.description,
    boardTexture: texture.label,
    potSize: currentPot,
    isHeroIP,
    villainPosition,
    villainAction,
    villainBetSize,
    correctAction: decision.correct,
    options: decision.options,
    explanation: {
      fr: decision.reasonFr + threat.fr,
      en: decision.reasonEn + threat.en,
    },
  };
}

// ─── Flop exercise pool ───────────────────────────────────────────────────────
// Pre-generates non-expert flop exercises at startup so requests are served
// instantly instead of waiting ~40ms for the Monte Carlo equity calculation.

const POOL_TARGET            = 20;
const POOL_REFILL_THRESHOLD  = 5;
const flopPool: object[]     = [];
let   poolRefilling          = false;

export function buildFlopExercise(): object {
  const eqSamples = 4;
  const eqRuns    = 150;

  const matchup      = MATCHUPS[Math.floor(Math.random() * MATCHUPS.length)];
  const fullDeck     = shuffleDeck(createDeck());
  const heroHand: [Card, Card] = [fullDeck[0], fullDeck[1]];
  const remaining    = shuffleDeck(removeCards(createDeck(), [...heroHand]));
  const board        = remaining.slice(0, 3) as Card[];

  const evalResult   = evaluateBestHand([...heroHand, ...board]);
  const equityResult = estimateEquityVsRange(heroHand, board, eqSamples, eqRuns);
  const heroEquity   = equityResult.equity;

  const villainBets    = matchup.heroIP ? (Math.random() < 0.3) : (Math.random() < 0.5);
  const villainAction: 'check' | 'bet' = villainBets ? 'bet' : 'check';
  const villainBetPct  = [0.33, 0.50, 0.67][Math.floor(Math.random() * 3)];
  const villainBetSize = villainAction === 'bet'
    ? Math.max(1, Math.round(matchup.potBB * villainBetPct))
    : 0;

  const texture  = getBoardTexture(board);
  const decision = buildDecision(
    heroEquity, matchup.heroIP, matchup.potBB,
    villainAction, villainBetSize, evalResult.rank,
    texture, equityResult, false,
  );
  const threat   = buildThreatAnalysis(heroHand, board, evalResult.rank);
  const notation = toHandNotation(heroHand[0], heroHand[1]);

  return {
    street:      'flop',
    streetLabel: { fr: 'Flop', en: 'Flop' },
    heroPosition:    matchup.hero,
    villainPosition: matchup.villain,
    heroHand,
    heroNotation: notation,
    board,
    potSize:        matchup.potBB,
    effectiveStack: 100 - matchup.potBB,
    heroEquity,
    equityDetail: {
      wins:             equityResult.wins,
      ties:             equityResult.ties,
      samples:          equityResult.total,
      runsPerSample:    eqRuns,
      totalSimulations: equityResult.total * eqRuns,
      example:          equityResult.example,
    },
    heroHandRank:        evalResult.rank,
    heroHandLabel:       handRankLabel(evalResult.rank).fr,
    heroHandLabelI18n:   handRankLabel(evalResult.rank),
    heroHandDescription: evalResult.description,
    boardTexture:   texture.label,
    isHeroIP:       matchup.heroIP,
    preflopContext: { fr: matchup.descFr, en: matchup.descEn },
    villainAction,
    villainBetSize,
    correctAction: decision.correct,
    options:       decision.options,
    explanation: {
      fr: decision.reasonFr + threat.fr,
      en: decision.reasonEn + threat.en,
    },
  };
}

async function refillFlopPool(): Promise<void> {
  if (poolRefilling) return;
  poolRefilling = true;
  try {
    while (flopPool.length < POOL_TARGET) {
      flopPool.push(buildFlopExercise());
      // Yield to the event loop between each ~40ms CPU burst so requests aren't blocked
      await new Promise(resolve => setImmediate(resolve));
    }
  } finally {
    poolRefilling = false;
  }
}

/** Call once from server.ts after startup to warm the flop exercise pool. */
export function initFlopPool(): void {
  const { flop } = loadPregen();
  if (flop.length > 0) {
    flopPool.push(...flop.slice(0, POOL_TARGET));
    console.log(`[flopPool] loaded ${flopPool.length} pre-generated exercises from file`);
  }
  if (flopPool.length < POOL_TARGET) {
    refillFlopPool().catch(err => console.error('[flopPool] init error:', err));
  }
}

// ─── Expert flop pool ─────────────────────────────────────────────────────────
// Same pattern as flopPool but with 8×300 = 2400 sims (~57ms each).
// Expert flop generation averages ~46ms (measured) — the most expensive
// exercise type in the app. A wider target/threshold gives more burst
// headroom for rapid-fire sprint sessions before falling back to on-demand
// generation. Mostly backed by data/pregenerated.json at startup (near-zero
// cost); only the shortfall (if any) is generated live.
const EXPERT_POOL_TARGET    = 30;
const EXPERT_POOL_THRESHOLD = 10;
const expertFlopPool: object[] = [];
let   expertPoolRefilling    = false;

export function buildExpertFlopExercise(): object {
  const eqSamples = 8;
  const eqRuns    = 300;

  const matchup      = MATCHUPS[Math.floor(Math.random() * MATCHUPS.length)];
  const fullDeck     = shuffleDeck(createDeck());
  const heroHand: [Card, Card] = [fullDeck[0], fullDeck[1]];
  const remaining    = shuffleDeck(removeCards(createDeck(), [...heroHand]));
  const board        = remaining.slice(0, 3) as Card[];

  const evalResult   = evaluateBestHand([...heroHand, ...board]);
  const equityResult = estimateEquityVsRange(heroHand, board, eqSamples, eqRuns);
  const heroEquity   = equityResult.equity;

  const villainBets    = matchup.heroIP ? (Math.random() < 0.3) : (Math.random() < 0.5);
  const villainAction: 'check' | 'bet' = villainBets ? 'bet' : 'check';
  const villainBetPct  = [0.33, 0.50, 0.67][Math.floor(Math.random() * 3)];
  const villainBetSize = villainAction === 'bet'
    ? Math.max(1, Math.round(matchup.potBB * villainBetPct))
    : 0;

  const texture  = getBoardTexture(board);
  const decision = buildDecision(
    heroEquity, matchup.heroIP, matchup.potBB,
    villainAction, villainBetSize, evalResult.rank,
    texture, equityResult, true,
  );
  const threat   = buildThreatAnalysis(heroHand, board, evalResult.rank);
  const notation = toHandNotation(heroHand[0], heroHand[1]);

  return {
    street:      'flop',
    streetLabel: { fr: 'Flop', en: 'Flop' },
    heroPosition:    matchup.hero,
    villainPosition: matchup.villain,
    heroHand,
    heroNotation: notation,
    board,
    potSize:        matchup.potBB,
    effectiveStack: 100 - matchup.potBB,
    heroEquity,
    equityDetail: {
      wins:             equityResult.wins,
      ties:             equityResult.ties,
      samples:          equityResult.total,
      runsPerSample:    eqRuns,
      totalSimulations: equityResult.total * eqRuns,
      example:          equityResult.example,
    },
    heroHandRank:        evalResult.rank,
    heroHandLabel:       handRankLabel(evalResult.rank).fr,
    heroHandLabelI18n:   handRankLabel(evalResult.rank),
    heroHandDescription: evalResult.description,
    boardTexture:   texture.label,
    isHeroIP:       matchup.heroIP,
    preflopContext: { fr: matchup.descFr, en: matchup.descEn },
    villainAction,
    villainBetSize,
    correctAction: decision.correct,
    options:       decision.options,
    explanation: {
      fr: decision.reasonFr + threat.fr,
      en: decision.reasonEn + threat.en,
    },
  };
}

async function refillExpertFlopPool(): Promise<void> {
  if (expertPoolRefilling) return;
  expertPoolRefilling = true;
  try {
    while (expertFlopPool.length < EXPERT_POOL_TARGET) {
      expertFlopPool.push(buildExpertFlopExercise());
      await new Promise(resolve => setImmediate(resolve));
    }
  } finally {
    expertPoolRefilling = false;
  }
}

/** Call once from server.ts after startup to warm the expert flop pool. */
export function initExpertFlopPool(): void {
  const { expertFlop } = loadPregen();
  if (expertFlop.length > 0) {
    expertFlopPool.push(...expertFlop.slice(0, EXPERT_POOL_TARGET));
    console.log(`[expertFlopPool] loaded ${expertFlopPool.length} pre-generated exercises from file`);
  }
  if (expertFlopPool.length < EXPERT_POOL_TARGET) {
    refillExpertFlopPool().catch(err => console.error('[expertFlopPool] init error:', err));
  }
}

// ─── Full hand pool ───────────────────────────────────────────────────────────
// Full-hand exercises use deterministic equity (no Monte Carlo) so they're only
// ~11ms each, but we still pool them for zero-latency responses.

const FULLHAND_POOL_TARGET    = 20;
const FULLHAND_POOL_THRESHOLD = 5;
const fullHandPool: object[]  = [];
let   fullHandRefilling       = false;

export function buildFullHandExercise(): object {
  const matchup     = RFI_MATCHUPS[Math.floor(Math.random() * RFI_MATCHUPS.length)];
  const wantInRange = Math.random() < 0.80;
  let deck          = shuffleDeck(createDeck());
  let heroHand: [Card, Card] = [deck[0], deck[1]];
  let rangeFreq     = getHandRangeFreq(heroHand, matchup.hero);

  if (wantInRange && rangeFreq < 0.3) {
    for (let attempt = 0; attempt < 8 && rangeFreq < 0.3; attempt++) {
      deck     = shuffleDeck(createDeck());
      heroHand = [deck[0], deck[1]];
      rangeFreq = getHandRangeFreq(heroHand, matchup.hero);
    }
  }

  const villainHand: [Card, Card]       = [deck[2], deck[3]];
  const flop:        [Card, Card, Card] = [deck[4], deck[5], deck[6]];
  const turn:        Card               = deck[7];
  const river:       Card               = deck[8];

  const isInRange        = rangeFreq >= 0.3;
  const preflopCorrect: 'fold' | 'raise' = isInRange ? 'raise' : 'fold';
  const notation         = toHandNotation(heroHand[0], heroHand[1]);

  const preflopDecision = {
    correctAction: preflopCorrect,
    rangeFreq,
    isInRange,
    options: [
      { key: 'fold',  labelFr: 'Fold',          labelEn: 'Fold' },
      { key: 'raise', labelFr: 'Open raise 3bb', labelEn: 'Open raise 3bb' },
    ],
    explanation: {
      fr: isInRange
        ? `**${notation}** est dans la range ${matchup.hero} (fréquence ${Math.round(rangeFreq * 100)}%). L'open raise est la bonne action ici.`
        : `**${notation}** n'est pas dans la range ${matchup.hero} (fréquence ${Math.round(rangeFreq * 100)}%). Le fold est correct — cette main n'est pas assez forte pour ouvrir depuis cette position.`,
      en: isInRange
        ? `**${notation}** is in the ${matchup.hero} opening range (${Math.round(rangeFreq * 100)}% frequency). Open raising is correct here.`
        : `**${notation}** is not in the ${matchup.hero} opening range (${Math.round(rangeFreq * 100)}% frequency). Fold is correct — this hand isn't strong enough to open from this position.`,
    },
  };

  let pot = matchup.potBB;

  const flopDecision = buildStreetDecision(heroHand, villainHand, flop, pot, matchup.heroIP, matchup.villain);
  pot = nextPot(pot, flopDecision.correctAction, flopDecision.villainAction, flopDecision.villainBetSize);

  let turnDecision:  ReturnType<typeof buildStreetDecision> | null = null;
  let riverDecision: ReturnType<typeof buildStreetDecision> | null = null;
  let lastStreet: 'flop' | 'turn' | 'river' = 'flop';

  if (flopDecision.correctAction !== 'fold') {
    lastStreet   = 'turn';
    turnDecision = buildStreetDecision(heroHand, villainHand, [...flop, turn], pot, matchup.heroIP, matchup.villain);
    pot = nextPot(pot, turnDecision.correctAction, turnDecision.villainAction, turnDecision.villainBetSize);

    if (turnDecision.correctAction !== 'fold') {
      lastStreet    = 'river';
      riverDecision = buildStreetDecision(heroHand, villainHand, [...flop, turn, river], pot, matchup.heroIP, matchup.villain);
    }
  }

  const community    = [flop[0], flop[1], flop[2], turn, river];
  const heroFinal    = evaluateBestHand([...heroHand, ...community]);
  const villainFinal = evaluateBestHand([...villainHand, ...community]);
  const heroWins     = heroFinal.score > villainFinal.score;
  const isTie        = heroFinal.score === villainFinal.score;

  return {
    heroPosition:    matchup.hero,
    villainPosition: matchup.villain,
    heroHand,
    heroNotation:    notation,
    villainHand,
    villainNotation: toHandNotation(villainHand[0], villainHand[1]),
    flop,
    turn,
    river,
    isHeroIP:       matchup.heroIP,
    preflopContext: { fr: matchup.descFr, en: matchup.descEn },
    lastStreet,
    preflopDecision,
    flopDecision,
    turnDecision,
    riverDecision,
    showdown: {
      heroWins,
      isTie,
      heroHandDescription:    heroFinal.description,
      villainHandDescription: villainFinal.description,
    },
  };
}

async function refillFullHandPool(): Promise<void> {
  if (fullHandRefilling) return;
  fullHandRefilling = true;
  try {
    while (fullHandPool.length < FULLHAND_POOL_TARGET) {
      fullHandPool.push(buildFullHandExercise());
      await new Promise(resolve => setImmediate(resolve));
    }
  } finally {
    fullHandRefilling = false;
  }
}

/** Call once from server.ts after startup to warm the full hand pool. */
export function initFullHandPool(): void {
  const { fullHand } = loadPregen();
  if (fullHand.length > 0) {
    fullHandPool.push(...fullHand.slice(0, FULLHAND_POOL_TARGET));
    console.log(`[fullHandPool] loaded ${fullHandPool.length} pre-generated exercises from file`);
  }
  if (fullHandPool.length < FULLHAND_POOL_TARGET) {
    refillFullHandPool().catch(err => console.error('[fullHandPool] init error:', err));
  }
}

// ─── Single-street exercise ───────────────────────────────────────────────────

export async function getPostflopExercise(req: Request, res: Response): Promise<void> {
  try {
    const requestedStreet = req.query.street as string;
    const level    = req.query.level as string | undefined;
    const isExpert = level === 'expert';
    // Expert: full 8×300 for accuracy; non-expert: 4×150 = 600 sims (4× faster, plenty for action decision)
    const eqSamples = isExpert ? 8 : 4;
    const eqRuns    = isExpert ? 300 : 150;

    const street: typeof STREETS[number] =
      requestedStreet && (STREETS as readonly string[]).includes(requestedStreet)
        ? (requestedStreet as typeof STREETS[number])
        : STREETS[Math.floor(Math.random() * STREETS.length)];

    // Serve from pool for flop requests (avoids Monte Carlo wait)
    if (street === 'flop' && !isExpert && flopPool.length > 0) {
      const data = flopPool.shift()!;
      if (flopPool.length < POOL_REFILL_THRESHOLD) {
        refillFlopPool().catch(err => console.error('[flopPool] refill error:', err));
      }
      return void res.json({ success: true, data });
    }
    if (street === 'flop' && isExpert && expertFlopPool.length > 0) {
      const data = expertFlopPool.shift()!;
      if (expertFlopPool.length < EXPERT_POOL_THRESHOLD) {
        refillExpertFlopPool().catch(err => console.error('[expertFlopPool] refill error:', err));
      }
      return void res.json({ success: true, data });
    }

    // On-demand generation (turn, river, expert flop, or empty pool fallback)
    const matchup = MATCHUPS[Math.floor(Math.random() * MATCHUPS.length)];

    const fullDeck = shuffleDeck(createDeck());
    const heroHand: [Card, Card] = [fullDeck[0], fullDeck[1]];
    const boardCount = street === 'flop' ? 3 : street === 'turn' ? 4 : 5;
    const remaining = shuffleDeck(removeCards(createDeck(), [...heroHand]));
    const board = remaining.slice(0, boardCount) as Card[];

    const evalResult    = evaluateBestHand([...heroHand, ...board]);
    const equityResult  = estimateEquityVsRange(heroHand, board, eqSamples, eqRuns);
    const heroEquity    = equityResult.equity;

    const villainBets = matchup.heroIP ? (Math.random() < 0.3) : (Math.random() < 0.5);
    const villainAction: 'check' | 'bet' = villainBets ? 'bet' : 'check';
    const villainBetPct = [0.33, 0.50, 0.67][Math.floor(Math.random() * 3)];
    const villainBetSize = villainAction === 'bet'
      ? Math.max(1, Math.round(matchup.potBB * villainBetPct))
      : 0;

    const texture  = getBoardTexture(board);
    const decision = buildDecision(
      heroEquity, matchup.heroIP, matchup.potBB,
      villainAction, villainBetSize, evalResult.rank,
      texture, equityResult, isExpert,
    );
    const threat   = buildThreatAnalysis(heroHand, board, evalResult.rank);
    const notation = toHandNotation(heroHand[0], heroHand[1]);

    const streetLabels: Record<string, { fr: string; en: string }> = {
      flop:  { fr: 'Flop',  en: 'Flop' },
      turn:  { fr: 'Turn',  en: 'Turn' },
      river: { fr: 'River', en: 'River' },
    };

    res.json({
      success: true,
      data: {
        street,
        streetLabel: streetLabels[street],
        heroPosition: matchup.hero,
        villainPosition: matchup.villain,
        heroHand,
        heroNotation: notation,
        board,
        potSize: matchup.potBB,
        effectiveStack: 100 - matchup.potBB,
        heroEquity,
        equityDetail: {
          wins:             equityResult.wins,
          ties:             equityResult.ties,
          samples:          equityResult.total,
          runsPerSample:    eqRuns,
          totalSimulations: equityResult.total * eqRuns,
          example:          equityResult.example,
        },
        heroHandRank: evalResult.rank,
        heroHandLabel: handRankLabel(evalResult.rank).fr, // kept for backward compat
        heroHandLabelI18n: handRankLabel(evalResult.rank),
        heroHandDescription: evalResult.description,
        boardTexture: texture.label,
        isHeroIP: matchup.heroIP,
        preflopContext: { fr: matchup.descFr, en: matchup.descEn },
        villainAction,
        villainBetSize,
        correctAction: decision.correct,
        options: decision.options,
        explanation: {
          fr: decision.reasonFr + threat.fr,
          en: decision.reasonEn + threat.en,
        },
      },
    });
  } catch (error) {
    console.error('postflop error', error);
    res.status(500).json({ success: false, error: 'Failed to generate exercise' });
  }
}

// ─── Full hand scenario ───────────────────────────────────────────────────────

export async function getFullHandScenario(req: Request, res: Response): Promise<void> {
  try {
    const level = req.query.level as string | undefined;
    const isExpert = level === 'expert';
    const isBasic  = level === 'basic';

    // Serve from pool when available — skip pool for expert to ensure harder scenarios
    if (fullHandPool.length > 0 && !isExpert) {
      const data = fullHandPool.shift()!;
      if (fullHandPool.length < FULLHAND_POOL_THRESHOLD) {
        refillFullHandPool().catch(err => console.error('[fullHandPool] refill error:', err));
      }
      return void res.json({ success: true, data });
    }

    // On-demand generation
    const matchup = RFI_MATCHUPS[Math.floor(Math.random() * RFI_MATCHUPS.length)];

    // Expert: 50/50 in-range vs fold (more decision variety)
    // Basic: 90% in-range (more action, easier practice)
    // Advanced: 80% in-range (original default)
    const inRangeProb = isExpert ? 0.50 : isBasic ? 0.90 : 0.80;
    const wantInRange = Math.random() < inRangeProb;
    let deck = shuffleDeck(createDeck());
    let heroHand: [Card, Card] = [deck[0], deck[1]];
    let rangeFreq = getHandRangeFreq(heroHand, matchup.hero);

    if (wantInRange && rangeFreq < 0.3) {
      for (let attempt = 0; attempt < 8 && rangeFreq < 0.3; attempt++) {
        deck = shuffleDeck(createDeck());
        heroHand = [deck[0], deck[1]];
        rangeFreq = getHandRangeFreq(heroHand, matchup.hero);
      }
    }

    const villainHand: [Card, Card]          = [deck[2], deck[3]];
    const flop:        [Card, Card, Card]    = [deck[4], deck[5], deck[6]];
    const turn:        Card                  = deck[7];
    const river:       Card                  = deck[8];

    // ── Preflop ────────────────────────────────────────────────────────────────
    const isInRange   = rangeFreq >= 0.3;
    const preflopCorrect: 'fold' | 'raise' = isInRange ? 'raise' : 'fold';
    const notation = toHandNotation(heroHand[0], heroHand[1]);

    const preflopDecision = {
      correctAction: preflopCorrect,
      rangeFreq,
      isInRange,
      options: [
        { key: 'fold',  labelFr: 'Fold',          labelEn: 'Fold' },
        { key: 'raise', labelFr: 'Open raise 3bb', labelEn: 'Open raise 3bb' },
      ],
      explanation: {
        fr: isInRange
          ? `**${notation}** est dans la range ${matchup.hero} (fréquence ${Math.round(rangeFreq * 100)}%). L'open raise est la bonne action ici.`
          : `**${notation}** n'est pas dans la range ${matchup.hero} (fréquence ${Math.round(rangeFreq * 100)}%). Le fold est correct — cette main n'est pas assez forte pour ouvrir depuis cette position.`,
        en: isInRange
          ? `**${notation}** is in the ${matchup.hero} opening range (${Math.round(rangeFreq * 100)}% frequency). Open raising is correct here.`
          : `**${notation}** is not in the ${matchup.hero} opening range (${Math.round(rangeFreq * 100)}% frequency). Fold is correct — this hand isn't strong enough to open from this position.`,
      },
    };

    // ── Post-flop streets ──────────────────────────────────────────────────────
    let pot = matchup.potBB;

    // Flop is ALWAYS computed
    const flopDecision = buildStreetDecision(heroHand, villainHand, flop, pot, matchup.heroIP, matchup.villain);
    pot = nextPot(pot, flopDecision.correctAction, flopDecision.villainAction, flopDecision.villainBetSize);

    let turnDecision: ReturnType<typeof buildStreetDecision> | null = null;
    let riverDecision: ReturnType<typeof buildStreetDecision> | null = null;
    let lastStreet: 'flop' | 'turn' | 'river' = 'flop';

    if (flopDecision.correctAction !== 'fold') {
      lastStreet = 'turn';
      turnDecision = buildStreetDecision(heroHand, villainHand, [...flop, turn], pot, matchup.heroIP, matchup.villain);
      pot = nextPot(pot, turnDecision.correctAction, turnDecision.villainAction, turnDecision.villainBetSize);

      if (turnDecision.correctAction !== 'fold') {
        lastStreet = 'river';
        riverDecision = buildStreetDecision(heroHand, villainHand, [...flop, turn, river], pot, matchup.heroIP, matchup.villain);
      }
    }

    // ── Showdown ───────────────────────────────────────────────────────────────
    const community = [flop[0], flop[1], flop[2], turn, river];
    const heroFinal    = evaluateBestHand([...heroHand, ...community]);
    const villainFinal = evaluateBestHand([...villainHand, ...community]);
    const heroWins = heroFinal.score > villainFinal.score;
    const isTie    = heroFinal.score === villainFinal.score;

    res.json({
      success: true,
      data: {
        heroPosition: matchup.hero,
        villainPosition: matchup.villain,
        heroHand,
        heroNotation: notation,
        villainHand,
        villainNotation: toHandNotation(villainHand[0], villainHand[1]),
        flop,
        turn,
        river,
        isHeroIP: matchup.heroIP,
        preflopContext: { fr: matchup.descFr, en: matchup.descEn },
        lastStreet,
        preflopDecision,
        flopDecision,
        turnDecision,
        riverDecision,
        showdown: {
          heroWins,
          isTie,
          heroHandDescription:    heroFinal.description,
          villainHandDescription: villainFinal.description,
        },
      },
    });
  } catch (error) {
    console.error('full hand error', error);
    res.status(500).json({ success: false, error: 'Failed to generate full hand scenario' });
  }
}
