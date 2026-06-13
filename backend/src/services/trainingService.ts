import { Card, Position, PreflopExercise, EquityExercise } from '../types';
import { dealHand, dealBoard, toHandNotation } from './poker/cards';
import { getCorrectAction } from './poker/ranges';
import { calculateEquity } from './poker/equity';
import { getRandomScenario, calculatePotOdds, buildEquityExplanation, buildThresholdExplanation } from './poker/potOdds';
import { generateEquityExplanation } from './poker/equityAnalyzer';
import { getRandomOutsScenario, buildOutsOptions, buildOutsExplanation, estimateEquityFromOuts } from './poker/outs';
import { getBBDefenseAction, buildBBDefenseExplanation } from './poker/bbDefense';

const PLAYABLE_POSITIONS: Position[] = ['UTG', 'HJ', 'CO', 'BTN', 'SB'];

export function generatePreflopExercise(position?: Position, lang: 'fr' | 'en' = 'fr'): PreflopExercise & { notation: string } {
  const pos = position || PLAYABLE_POSITIONS[Math.floor(Math.random() * PLAYABLE_POSITIONS.length)];
  const [card1, card2] = dealHand();
  const notation = toHandNotation(card1, card2);
  const { action, frequency, isMixed } = getCorrectAction(pos, notation);
  const explanation = buildPreflopExplanation(notation, pos, action, frequency, isMixed, lang);

  return {
    hand: [card1, card2],
    notation,
    position: pos,
    heroStack: 100,
    potSize: pos === 'SB' ? 1.5 : 0,
    facing: 'none',
    tableType: '6max',
    correctAction: action,
    correctFrequency: frequency,
    explanation,
  };
}

function buildPreflopExplanation(
  notation: string,
  position: Position,
  action: 'raise' | 'fold',
  frequency: number,
  isMixed: boolean,
  lang: 'fr' | 'en' = 'fr'
): string {
  if (lang === 'en') return buildPreflopExplanationEn(notation, position, action, frequency, isMixed);
  return buildPreflopExplanationFr(notation, position, action, frequency, isMixed);
}

function buildPreflopExplanationFr(notation: string, position: Position, action: 'raise' | 'fold', frequency: number, isMixed: boolean): string {
  const posDesc: Record<Position, string> = {
    UTG: 'Under the Gun (UTG) — premier à parler, range la plus serrée',
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

  if (isMixed) {
    return `${handDesc} est une main à stratégie MIXTE depuis ${position}.\n\nFréquence GTO : relancer ${Math.round(frequency * 100)}% du temps.\n\n${posDesc[position]}.\n\nLes mains mixtes signifient que tu dois parfois relancer, parfois se coucher. En pratique, penche-toi vers la relance sauf raison spécifique de folder.\n\n⚠️ Simplification : pour rester lisible, ces mains mixtes sont affichées en jaune (Call) dans la grille. Ce n'est pas exactement ce que ferait la GTO, qui randomise relance/fold précisément à ${Math.round(frequency * 100)}%.`;
  }
  if (action === 'raise') {
    return `${handDesc} → RELANCER depuis ${position}.\n\n${posDesc[position]}.\n\nCette main a suffisamment d'équité et de playabilité pour ouvrir. Taille standard : 2-3 BB.`;
  }
  return `${handDesc} → COUCHER depuis ${position}.\n\n${posDesc[position]}.\n\nCette main n'est pas suffisamment forte pour ouvrir de cette position. Attends de meilleures opportunités.`;
}

function buildPreflopExplanationEn(notation: string, position: Position, action: 'raise' | 'fold', frequency: number, isMixed: boolean): string {
  const posDesc: Record<Position, string> = {
    UTG: 'Under the Gun (UTG) — first to act, tightest position',
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

  if (isMixed) {
    return `${handDesc} is a MIXED strategy hand from ${position}.\n\nGTO frequency: raise ${Math.round(frequency * 100)}% of the time.\n\n${posDesc[position]}.\n\nMixed hands mean you should sometimes raise, sometimes fold. In practice, lean toward raising unless you have a specific reason to fold.\n\n⚠️ Simplification: to keep the grid readable, these mixed hands are shown in yellow (Call). This isn't exactly what GTO would do — GTO randomizes raise/fold precisely at ${Math.round(frequency * 100)}%.`;
  }
  if (action === 'raise') {
    return `${handDesc} → RAISE from ${position}.\n\n${posDesc[position]}.\n\nThis hand has sufficient equity and playability to open. Standard raise size: 2-3 BB.`;
  }
  return `${handDesc} → FOLD from ${position}.\n\n${posDesc[position]}.\n\nThis hand is not strong enough to open from this position. Wait for better spots.`;
}

export function generatePotOddsExercise(lang: 'fr' | 'en' = 'fr') {
  const scenario = getRandomScenario();
  const result = calculatePotOdds(scenario.potSize, scenario.betSize, scenario.heroEquity, lang);

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
  };
}

export function generateEquityExercise(lang: 'fr' | 'en' = 'fr', mode: 'beginner' | 'advanced' = 'beginner'): EquityExercise & {
  hand1Notation: string;
  hand2Notation: string;
  explanation: string;
  explanationAdvanced: string;
} {
  const hand1 = dealHand();
  const hand2 = dealHand([...hand1]);
  const board: Card[] = [];

  if (Math.random() > 0.5) {
    board.push(...dealBoard([...hand1, ...hand2], 3));
  }

  const equity = calculateEquity(hand1, hand2, board, 3000);
  const hand1Notation = toHandNotation(hand1[0], hand1[1]);
  const hand2Notation = toHandNotation(hand2[0], hand2[1]);

  const explanation = generateEquityExplanation(
    hand1, hand2, board, equity.hand1WinPct, equity.hand2WinPct, lang, 'beginner'
  );
  const explanationAdvanced = generateEquityExplanation(
    hand1, hand2, board, equity.hand1WinPct, equity.hand2WinPct, lang, 'advanced'
  );

  return {
    hand1, hand2, board,
    hand1Equity: equity.hand1WinPct,
    hand2Equity: equity.hand2WinPct,
    question: 'which_better',
    hand1Notation, hand2Notation, explanation, explanationAdvanced,
  };
}

export function generateOutsExercise(lang: 'fr' | 'en' = 'fr') {
  const scenario = getRandomOutsScenario();
  const options = buildOutsOptions(scenario.outs);
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
