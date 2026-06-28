import { Position, Position8, TableFormat, GameType, PreflopExercise, EquityExercise } from '../types';
import { dealHand, toHandNotation } from './poker/cards';
import { getCorrectAction } from './poker/ranges';
import { getRandomScenario, generateClosePotOddsScenario, generateImpliedOddsScenario, calculatePotOdds, buildEquityExplanation, buildThresholdExplanation, buildImpliedOddsExplanation } from './poker/potOdds';
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

export function generatePotOddsExercise(lang: 'fr' | 'en' = 'fr', difficulty?: 'expert') {
  // Expert → implied odds scenarios (direct odds vs implied winnings).
  const isExpert = difficulty === 'expert';
  const scenario = isExpert ? generateImpliedOddsScenario(lang) : getRandomScenario();
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
// Pure math — no Monte Carlo needed. O(1) per exercise.

const EQUITY_POTS     = [6, 8, 9, 10, 12, 14, 15, 18, 20, 24, 25, 28, 30, 36, 40, 50];
const EQUITY_BETS     = [
  { label: '1/3 pot',   labelEn: '1/3 pot',   frac: 1 / 3  },
  { label: '1/2 pot',   labelEn: '1/2 pot',   frac: 1 / 2  },
  { label: '2/3 pot',   labelEn: '2/3 pot',   frac: 2 / 3  },
  { label: 'pot',       labelEn: 'pot',        frac: 1      },
  { label: '1.25x pot', labelEn: '1.25x pot',  frac: 1.25   },
];
const EQUITY_STREETS  = ['flop', 'turn', 'river'] as const;
const EQUITY_BOUNTIES = [8, 10, 12, 15, 20, 25];
const ALL_POSITIONS: Position[] = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'];

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
  _mode: 'beginner' | 'advanced' = 'beginner',
  difficulty?: 'expert',
): EquityExercise {
  const potBB  = EQUITY_POTS[Math.floor(Math.random() * EQUITY_POTS.length)];
  const betCfg = EQUITY_BETS[Math.floor(Math.random() * EQUITY_BETS.length)];
  const betBB  = Math.max(1, Math.round(potBB * betCfg.frac));

  // Required equity = call / (pot_after_call) = bet / (pot + 2*bet)
  const requiredEquity = Math.round(betBB / (potBB + 2 * betBB) * 1000) / 10;
  const options        = buildEquityCallOptions(Math.round(requiredEquity));

  const street        = EQUITY_STREETS[Math.floor(Math.random() * EQUITY_STREETS.length)];
  const heroIdx       = Math.floor(Math.random() * ALL_POSITIONS.length);
  const villainIdx    = (heroIdx + 1 + Math.floor(Math.random() * (ALL_POSITIONS.length - 1))) % ALL_POSITIONS.length;
  const heroPosition  = ALL_POSITIONS[heroIdx];
  const villainPosition = ALL_POSITIONS[villainIdx];

  const hasBounty          = difficulty === 'expert';
  const bountyBB           = hasBounty ? EQUITY_BOUNTIES[Math.floor(Math.random() * EQUITY_BOUNTIES.length)] : 0;
  const requiredEquityBounty = hasBounty
    ? Math.round(betBB / (potBB + 2 * betBB + bountyBB) * 1000) / 10
    : 0;

  const betLabel = lang === 'en' ? betCfg.labelEn : betCfg.label;
  const streetFr = { flop: 'flop', turn: 'turn', river: 'river' }[street];
  const streetEn = street;

  const totalPot = potBB + 2 * betBB;
  const pct      = requiredEquity;

  const explanation = lang === 'en'
    ? `**Required equity = call ÷ total pot** = ${betBB} ÷ (${potBB} + ${betBB} + ${betBB}) = ${betBB}/${totalPot} ≈ **${pct}%**.\n\nWith at least ${pct}% equity you break even in the long run. Below that, folding is the better mathematical play.`
    : `**Équité requise = appel ÷ pot total** = ${betBB} ÷ (${potBB} + ${betBB} + ${betBB}) = ${betBB}/${totalPot} ≈ **${pct}%**.\n\nAvec au moins ${pct}% d'équité vous êtes break-even sur le long terme. En dessous, coucher est le meilleur choix mathématique.`;

  const explanationAdvanced = lang === 'en'
    ? `Pot odds formula: **call / (pot + bet + call)** → ${betBB}/${totalPot} = **${pct}%**.\n\nVillain bet ${betCfg.labelEn} on the ${streetEn}. Any time you have more than ${pct}% equity, calling has positive expected value.`
    : `Formule des cotes du pot : **appel / (pot + mise + appel)** → ${betBB}/${totalPot} = **${pct}%**.\n\nVilain a misé ${betLabel} au ${streetFr}. Dès lors que votre équité dépasse ${pct}%, appeler a une espérance positive.`;

  return {
    street, potBB, betBB, villainPosition, heroPosition,
    betFractionLabel: betLabel,
    requiredEquity, options,
    explanation, explanationAdvanced,
    hasBounty, bountyBB, requiredEquityBounty,
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
