import { Position, Position8, TableFormat, GameType, PreflopExercise, EquityExercise } from '../types';
import { dealHand, toHandNotation } from './poker/cards';
import { getCorrectAction } from './poker/ranges';
import { getRandomScenario, generateEasyPotOddsScenario, generateClosePotOddsScenario, generateImpliedOddsScenario, calculatePotOdds, buildEquityExplanation, buildThresholdExplanation, buildImpliedOddsExplanation } from './poker/potOdds';
import { getRandomOutsScenario, buildOutsOptions, buildOutsExplanation, estimateEquityFromOuts } from './poker/outs';
import { getBBDefenseAction, buildBBDefenseExplanation } from './poker/bbDefense';

const PLAYABLE_POSITIONS: Position[] = ['UTG', 'HJ', 'CO', 'BTN', 'SB'];
const PLAYABLE_POSITIONS_8: Position8[] = ['UTG', 'UTG1', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
const PLAYABLE_POSITIONS_3MAX: Position8[] = ['BTN', 'SB'];
const PLAYABLE_POSITIONS_HU: Position8[] = ['BTN'];

export function generatePreflopExercise(
  position?: Position8,
  lang: 'fr' | 'en' = 'fr',
  format: TableFormat = '6max',
  gameType: GameType = 'cashgame',
): PreflopExercise & { notation: string } {
  const playable = format === 'hu' ? PLAYABLE_POSITIONS_HU : format === '3max' ? PLAYABLE_POSITIONS_3MAX : format === '8max' ? PLAYABLE_POSITIONS_8 : PLAYABLE_POSITIONS;
  const pos = position || playable[Math.floor(Math.random() * playable.length)];

  // 80 % of the time force an in-range (raise) hand so fold drills are ~1 in 5.
  const wantInRange = Math.random() < 0.80;
  let [card1, card2] = dealHand();
  if (wantInRange) {
    for (let attempt = 0; attempt < 8 && getCorrectAction(pos, toHandNotation(card1, card2), format, gameType).action === 'fold'; attempt++) {
      [card1, card2] = dealHand();
    }
  }

  const notation = toHandNotation(card1, card2);
  const { action, frequency, isMixed } = getCorrectAction(pos, notation, format, gameType);
  const explanation = buildPreflopExplanation(notation, pos, action, frequency, isMixed, lang);

  return {
    hand: [card1, card2],
    notation,
    position: pos,
    heroStack: 100,
    potSize: pos === 'SB' ? 1.5 : 0,
    facing: 'none',
    tableType: format,
    correctAction: action,
    correctFrequency: frequency,
    explanation,
  };
}

function buildPreflopExplanation(
  notation: string,
  position: Position8,
  action: 'raise' | 'call' | 'fold',
  frequency: number,
  isMixed: boolean,
  lang: 'fr' | 'en' = 'fr'
): string {
  if (lang === 'en') return buildPreflopExplanationEn(notation, position, action, frequency, isMixed);
  return buildPreflopExplanationFr(notation, position, action, frequency, isMixed);
}

function buildPreflopExplanationFr(notation: string, position: Position8, action: 'raise' | 'call' | 'fold', frequency: number, isMixed: boolean): string {
  const posDesc: Record<Position8, string> = {
    UTG:  'Under the Gun (UTG) — premier à parler, range la plus serrée',
    UTG1: 'UTG+1 — early position, range très serrée',
    LJ:   'Lojack (LJ) — early/intermédiaire, range serrée',
    HJ:  'Hijack (HJ) — position intermédiaire, range modérée',
    CO:  'Cutoff (CO) — bonne position, range assez large',
    BTN: 'Button (BTN) — meilleure position, range la plus large',
    SB:  'Small Blind (SB) — désavantage de position post-flop',
    BB:  'Big Blind (BB) — mise forcée, décisions de défense',
  };

  const ranks: Record<string, string> = {
    'A': 'as', 'K': 'roi', 'Q': 'dame', 'J': 'valet',
    'T': 'dix', '9': 'neuf', '8': 'huit', '7': 'sept',
    '6': 'six', '5': 'cinq', '4': 'quatre', '3': 'trois', '2': 'deux',
  };

  const isPair = notation.length === 2;
  const isSuited = notation.endsWith('s');

  let handDesc = '';
  if (isPair) {
    handDesc = `Paire de ${ranks[notation[0]]}`;
  } else {
    const suit = isSuited ? ' assorties' : ' dépareillées';
    handDesc = `${ranks[notation[0]]}-${ranks[notation[1]]}${suit}`;
  }

  if (action === 'call') {
    return `${handDesc} → CALL (jeu mixte) depuis ${position}.\n\n${posDesc[position]}.\n\nFréquence GTO : jouer ${Math.round(frequency * 100)}% du temps. Cette main n'est pas assez forte pour relancer mais mérite d'être jouée passivement — entre passivement ou limp selon le contexte.`;
  }
  if (action === 'raise') {
    return `${handDesc} → RELANCER depuis ${position}.\n\n${posDesc[position]}.\n\nCette main a suffisamment d'équité et de playabilité pour ouvrir. Taille standard : 2-3 BB.`;
  }
  return `${handDesc} → COUCHER depuis ${position}.\n\n${posDesc[position]}.\n\nCette main n'est pas suffisamment forte pour ouvrir de cette position. Attends de meilleures opportunités.`;
}

function buildPreflopExplanationEn(notation: string, position: Position8, action: 'raise' | 'call' | 'fold', frequency: number, isMixed: boolean): string {
  const posDesc: Record<Position8, string> = {
    UTG:  'Under the Gun (UTG) — first to act, tightest position',
    UTG1: 'UTG+1 — early position, very tight range',
    LJ:   'Lojack (LJ) — early/middle position, tight range',
    HJ:  'Hijack (HJ) — middle position, moderate range',
    CO:  'Cutoff (CO) — good position, fairly wide range',
    BTN: 'Button (BTN) — best position, widest range',
    SB:  'Small Blind (SB) — positional disadvantage post-flop',
    BB:  'Big Blind (BB) — forced bet, defense decisions',
  };

  const ranks: Record<string, string> = {
    'A': 'ace', 'K': 'king', 'Q': 'queen', 'J': 'jack',
    'T': 'ten', '9': 'nine', '8': 'eight', '7': 'seven',
    '6': 'six', '5': 'five', '4': 'four', '3': 'three', '2': 'two',
  };

  const isPair = notation.length === 2;
  const isSuited = notation.endsWith('s');

  let handDesc = '';
  if (isPair) {
    handDesc = `Pocket ${ranks[notation[0]]}s`;
  } else {
    const suit = isSuited ? ' suited' : ' offsuit';
    handDesc = `${ranks[notation[0]]}-${ranks[notation[1]]}${suit}`;
  }

  if (action === 'call') {
    return `${handDesc} → CALL (mixed play) from ${position}.\n\n${posDesc[position]}.\n\nGTO frequency: play ${Math.round(frequency * 100)}% of the time. This hand isn't strong enough to raise but is worth playing passively — limp or call depending on the context.`;
  }
  if (action === 'raise') {
    return `${handDesc} → RAISE from ${position}.\n\n${posDesc[position]}.\n\nThis hand has sufficient equity and playability to open. Standard raise size: 2-3 BB.`;
  }
  return `${handDesc} → FOLD from ${position}.\n\n${posDesc[position]}.\n\nThis hand is not strong enough to open from this position. Wait for better spots.`;
}

export function generatePotOddsExercise(lang: 'fr' | 'en' = 'fr', level: 'basic' | 'advanced' | 'expert' = 'basic') {
  const scenario =
    level === 'expert'   ? generateImpliedOddsScenario(lang)
    : level === 'advanced' ? (Math.random() < 0.6 ? generateClosePotOddsScenario(lang) : getRandomScenario(Math.random() < 0.5 ? 'medium' : 'hard'))
    : (Math.random() < 0.6 ? generateEasyPotOddsScenario(lang) : getRandomScenario('easy'));
  const result = calculatePotOdds(scenario.potSize, scenario.betSize, scenario.heroEquity, lang);

  // Compute implied fields when present
  const impliedWinnings = scenario.impliedWinnings;
  const villainStackBehind = scenario.villainStackBehind;
  let impliedRequiredEquity: number | undefined;
  if (impliedWinnings !== undefined) {
    const call = scenario.betSize;
    const totalDirect = scenario.potSize + scenario.betSize + call;
    impliedRequiredEquity = Math.round((call / (totalDirect + impliedWinnings)) * 1000) / 10;
  }

  return {
    potSize: scenario.potSize,
    betSize: scenario.betSize,
    heroEquity: scenario.heroEquity,
    correctAction: scenario.correctAction,
    potOdds: result.potOdds,
    requiredEquity: result.requiredEquity,
    explanation: result.reasoning,
    difficulty: scenario.difficulty,
    context: lang === 'en' ? scenario.contextEn : scenario.context,
    heroCards: scenario.heroCards,
    board: scenario.board,
    street: scenario.street,
    outs: scenario.outs,
    equityExplanation: buildEquityExplanation(scenario, lang, 'beginner'),
    equityExplanationAdvanced: buildEquityExplanation(scenario, lang, 'advanced'),
    thresholdExplanation: buildThresholdExplanation(scenario.potSize, scenario.betSize, result.requiredEquity, scenario.heroEquity, lang, 'beginner'),
    thresholdExplanationAdvanced: buildThresholdExplanation(scenario.potSize, scenario.betSize, result.requiredEquity, scenario.heroEquity, lang, 'advanced'),
    ...(impliedWinnings !== undefined && {
      impliedWinnings,
      villainStackBehind,
      impliedRequiredEquity,
      impliedExplanation: buildImpliedOddsExplanation(scenario, lang),
    }),
  };
}

// ─── Equity: required-equity-to-call generator ───────────────────────────────

const EQUITY_STREETS  = ['flop', 'turn', 'river'] as const;
const EQUITY_BOUNTIES = [8, 10, 12, 15, 20, 25];
const ALL_POSITIONS: Position[] = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'];

// (pot, bet) pairs where bet/(pot+2*bet) rounds exactly to targetEquity/100 —
// generated algebraically (pot = bet × (100−2×equity)/equity) for every bet
// size in EQUITY_BET_RANGE, instead of a handful of hand-picked pairs. Keeps
// the explanation's displayed fraction (bet/totalPot ≈ target%) mathematically
// honest while giving each difficulty tier dozens of distinct spots per equity
// bucket — cuts the risk of seeing the same pot/bet numbers twice in a session.
interface EquityScenario { potBB: number; betBB: number; targetEquity: number; }

const EQUITY_BET_RANGE = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 20, 22, 24, 26, 28, 30];

function buildEquityPool(targets: number[]): EquityScenario[] {
  const seen = new Set<string>();
  const pool: EquityScenario[] = [];
  for (const targetEquity of targets) {
    for (const betBB of EQUITY_BET_RANGE) {
      const potBB = Math.round(betBB * (100 - 2 * targetEquity) / targetEquity);
      if (potBB < 4 || potBB > 90) continue;
      const actual = (betBB / (potBB + 2 * betBB)) * 100;
      if (Math.round(actual) !== targetEquity) continue; // fraction must round back to the label
      const key = `${potBB}-${betBB}`;
      if (seen.has(key)) continue;
      seen.add(key);
      pool.push({ potBB, betBB, targetEquity });
    }
  }
  return pool;
}

const BASIC_OPTIONS_POOL    = [10, 15, 20, 25, 30, 33];
const ADVANCED_OPTIONS_POOL = [12, 16, 18, 22, 28, 34];

const BASIC_EQUITY_SCENARIOS: EquityScenario[]    = buildEquityPool(BASIC_OPTIONS_POOL);
const ADVANCED_EQUITY_SCENARIOS: EquityScenario[] = buildEquityPool(ADVANCED_OPTIONS_POOL);

function buildLevelOptions(correct: number, pool: number[]): number[] {
  const others = pool.filter(v => v !== correct).sort(() => Math.random() - 0.5).slice(0, 3);
  return [...others, correct].sort((a, b) => a - b);
}

function buildEquityCallOptions(correctInt: number): number[] {
  const opts: number[] = [correctInt];
  for (const off of [-8, 8, -14, 14, -5, 5, -20, 20]) {
    if (opts.length >= 4) break;
    const v = Math.max(5, Math.min(50, correctInt + off));
    if (opts.every(o => Math.abs(o - v) >= 4)) opts.push(v);
  }
  return opts.sort((a, b) => a - b);
}

export function generateEquityExercise(
  lang: 'fr' | 'en' = 'fr',
  level: 'basic' | 'advanced' | 'expert' = 'basic',
): EquityExercise {
  const street = EQUITY_STREETS[Math.floor(Math.random() * EQUITY_STREETS.length)];
  const heroIdx = Math.floor(Math.random() * ALL_POSITIONS.length);
  const villainIdx = (heroIdx + 1 + Math.floor(Math.random() * (ALL_POSITIONS.length - 1))) % ALL_POSITIONS.length;
  const heroPosition = ALL_POSITIONS[heroIdx];
  const villainPosition = ALL_POSITIONS[villainIdx];
  const streetFr = { flop: 'flop', turn: 'turn', river: 'river' }[street];

  if (level === 'basic' || level === 'advanced') {
    const pool = level === 'basic' ? BASIC_EQUITY_SCENARIOS : ADVANCED_EQUITY_SCENARIOS;
    const optPool = level === 'basic' ? BASIC_OPTIONS_POOL : ADVANCED_OPTIONS_POOL;
    const sc = pool[Math.floor(Math.random() * pool.length)];
    const { potBB, betBB, targetEquity } = sc;
    const totalPot = potBB + 2 * betBB;
    const options = buildLevelOptions(targetEquity, optPool);
    const betLabel = `${Math.round((betBB / potBB) * 100)}% pot`;

    const explanation = lang === 'en'
      ? `**Required equity = call ÷ total pot** = ${betBB} ÷ (${potBB} + ${betBB} + ${betBB}) = ${betBB}/${totalPot} ≈ **${targetEquity}%**.\n\nWith at least ${targetEquity}% equity you break even in the long run. Below that, folding is the better mathematical play.`
      : `**Équité requise = appel ÷ pot total** = ${betBB} ÷ (${potBB} + ${betBB} + ${betBB}) = ${betBB}/${totalPot} ≈ **${targetEquity}%**.\n\nAvec au moins ${targetEquity}% d'équité vous êtes break-even sur le long terme. En dessous, coucher est le meilleur choix mathématique.`;

    const explanationAdvanced = lang === 'en'
      ? `Pot odds formula: **call / (pot + bet + call)** → ${betBB}/${totalPot} = **${targetEquity}%**.\n\nVillain bet on the ${street}. Any time you have more than ${targetEquity}% equity, calling has positive expected value.`
      : `Formule des cotes du pot : **appel / (pot + mise + appel)** → ${betBB}/${totalPot} = **${targetEquity}%**.\n\nVilain a misé au ${streetFr}. Dès lors que votre équité dépasse ${targetEquity}%, appeler a une espérance positive.`;

    return {
      street, potBB, betBB, villainPosition, heroPosition,
      betFractionLabel: betLabel,
      requiredEquity: targetEquity,
      options, explanation, explanationAdvanced,
      hasBounty: false, bountyBB: 0, requiredEquityBounty: 0,
    };
  }

  // Expert: advanced scenario + bounty calculation
  const sc = ADVANCED_EQUITY_SCENARIOS[Math.floor(Math.random() * ADVANCED_EQUITY_SCENARIOS.length)];
  const { potBB, betBB } = sc;
  const requiredEquity = Math.round(betBB / (potBB + 2 * betBB) * 1000) / 10;
  const bountyBB = EQUITY_BOUNTIES[Math.floor(Math.random() * EQUITY_BOUNTIES.length)];
  const requiredEquityBounty = Math.round(betBB / (potBB + 2 * betBB + bountyBB) * 1000) / 10;
  const options = buildEquityCallOptions(Math.round(requiredEquityBounty));
  const betLabel = `${Math.round((betBB / potBB) * 100)}% pot`;
  const totalPot = potBB + 2 * betBB;
  const totalPotBounty = potBB + 2 * betBB + bountyBB;
  const pct = requiredEquityBounty;

  const explanation = lang === 'en'
    ? `**Required equity with bounty** = ${betBB} ÷ (${potBB} + ${betBB} + ${betBB} + ${bountyBB}) = ${betBB}/${totalPotBounty} ≈ **${pct}%**.\n\nThe bounty (${bountyBB} BB) is added to the total pot, reducing the equity needed to call.`
    : `**Équité requise avec bounty** = ${betBB} ÷ (${potBB} + ${betBB} + ${betBB} + ${bountyBB}) = ${betBB}/${totalPotBounty} ≈ **${pct}%**.\n\nLe bounty (${bountyBB} BB) s'ajoute au pot total, ce qui réduit l'équité nécessaire pour suivre.`;

  const explanationAdvanced = lang === 'en'
    ? `Without bounty: ${betBB}/${totalPot} = ${requiredEquity}%. With bounty: ${betBB}/${totalPotBounty} = **${pct}%**.`
    : `Sans bounty : ${betBB}/${totalPot} = ${requiredEquity}%. Avec bounty : ${betBB}/${totalPotBounty} = **${pct}%**.`;

  return {
    street, potBB, betBB, villainPosition, heroPosition,
    betFractionLabel: betLabel,
    requiredEquity, options, explanation, explanationAdvanced,
    hasBounty: true, bountyBB, requiredEquityBounty,
  };
}

export function generateOutsExercise(lang: 'fr' | 'en' = 'fr', difficulty?: 'expert') {
  const scenario = getRandomOutsScenario(difficulty);
  const options = buildOutsOptions(scenario.outs, scenario.trap);
  const explanation = buildOutsExplanation(scenario, lang);
  const equityEstimate = estimateEquityFromOuts(scenario.outs, scenario.street);

  return {
    heroCards: scenario.heroCards,
    board: scenario.board,
    street: scenario.street,
    difficulty: scenario.difficulty,
    outs: scenario.outs,
    options,
    equityEstimate,
    draws: scenario.draws.map(d => (lang === 'en' ? d.en : d.fr)),
    explanation,
  };
}

export function generateBBDefenseExercise(lang: 'fr' | 'en' = 'fr') {
  const opener = 'BTN';
  const openSize = 2.5;
  const [card1, card2] = dealHand();
  const notation = toHandNotation(card1, card2);
  const cls = getBBDefenseAction(notation);
  const explanation = buildBBDefenseExplanation(notation, cls, opener, openSize, lang);

  return {
    hand: [card1, card2] as [string, string],
    notation,
    opener,
    openSize,
    correctAction: cls.action,
    altAction: cls.alt,
    isMixed: cls.isMixed,
    kind: cls.kind,
    explanation,
  };
}

export function calculateExerciseXP(isCorrect: boolean, timeTaken: number, isMixed: boolean): number {
  if (!isCorrect) return 5;
  const base = isMixed ? 20 : 15;
  const bonus = timeTaken < 5000 ? 10 : timeTaken < 10000 ? 5 : 0;
  return base + bonus;
}
